import { NextResponse } from 'next/server'
import { executeWorkflow } from '@/lib/workflow-engine'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  getMemoryNamespace,
  isAINode,
  resolveNodeConfig,
  safeValuePreview,
  validateMindMapWorkflow,
} from '@/lib/mindmap-runtime'
import {
  addAuditLog,
  getUserSettings,
  listMemoryRecords,
  upsertMemoryRecord,
} from '@/lib/server-store'
import { resolveUserId } from '@/lib/user-context'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { Workflow } from '@/types/workflow'

interface RunPayload {
  workflow?: Workflow
  userId?: string
  triggerText?: string
  sessionId?: string
}

export async function POST(request: Request) {
  let body: RunPayload
  try {
    body = (await request.json()) as RunPayload
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!body.workflow) {
    return NextResponse.json({ success: false, message: 'workflow is required.' }, { status: 400 })
  }

  const workflow = body.workflow
  const userId = resolveUserId(body.userId || workflow.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const rateLimit = checkRateLimit(`mindmap-run:${userId}`, 16, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, message: 'Rate limit exceeded.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
      }
    )
  }

  const validation = validateMindMapWorkflow(workflow)
  if (!validation.safeToRun) {
    return NextResponse.json(
      {
        success: false,
        message: 'Map has blocking validation issues.',
        ...validation,
      },
      { status: 422 }
    )
  }

  const sessionId = body.sessionId?.trim() || 'anonymous-session'
  const triggerText = (body.triggerText || 'run mind map').slice(0, 1500)
  const settings = await getUserSettings(userId)
  const preparedWorkflow = JSON.parse(JSON.stringify(workflow)) as Workflow
  const globalDefaults = preparedWorkflow.globalDefaults || {}

  const namespaceCache = new Map<string, Awaited<ReturnType<typeof listMemoryRecords>>>()
  for (const node of preparedWorkflow.nodes) {
    if (!isAINode(node)) continue
    const resolved = resolveNodeConfig(node, globalDefaults)

    // Runtime precedence: node config -> global defaults. This is what execution consumes.
    node.data.prompt = resolved.systemPrompt || ''

    if (!resolved.useMemoryVault) continue
    const namespace = getMemoryNamespace({
      scope: resolved.memoryScope,
      sessionId,
      workflowId: preparedWorkflow.id,
    })
    const workflowIdForScope = resolved.memoryScope === 'workflow' ? preparedWorkflow.id : undefined
    const cacheKey = `${workflowIdForScope || ''}::${namespace}`
    if (!namespaceCache.has(cacheKey)) {
      namespaceCache.set(
        cacheKey,
        await listMemoryRecords({
          userId,
          workflowId: workflowIdForScope,
          namespace,
        })
      )
    }
    const records = namespaceCache.get(cacheKey) || []
    const context = records
      .slice(0, 10)
      .map((record) => `${record.key}: ${safeValuePreview(record.value)}`)
      .join('\n')
      .slice(0, 1800)
    if (context) {
      node.data.prompt = `${node.data.prompt}\n\nMemory Vault Context:\n${context}`.trim()
    }
  }

  let result: Awaited<ReturnType<typeof executeWorkflow>>
  try {
    result = await executeWorkflow({
      workflow: preparedWorkflow,
      settings,
      triggerText,
    })
  } catch (error) {
    await addAuditLog(userId, preparedWorkflow.id, 'mindmap.run.error', {
      triggerText,
      message: error instanceof Error ? error.message : 'Execution failed',
    })
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Execution failed',
      },
      { status: 500 }
    )
  }

  const resultByNodeId = new Map(result.nodeResults.map((entry) => [entry.nodeId, entry]))
  for (const node of preparedWorkflow.nodes) {
    if (!isAINode(node)) continue
    const resolved = resolveNodeConfig(node, globalDefaults)
    if (!resolved.useMemoryVault) continue

    const namespace = getMemoryNamespace({
      scope: resolved.memoryScope,
      sessionId,
      workflowId: preparedWorkflow.id,
    })
    const workflowIdForScope = resolved.memoryScope === 'workflow' ? preparedWorkflow.id : undefined
    const nodeResult = resultByNodeId.get(node.id)

    await upsertMemoryRecord({
      userId,
      workflowId: workflowIdForScope,
      namespace,
      key: `node:${node.id}`,
      value: {
        summary: nodeResult?.summary || 'No output',
        output: nodeResult?.output || null,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  const sessionMemory = await listMemoryRecords({
    userId,
    namespace: getMemoryNamespace({
      scope: 'session',
      sessionId,
      workflowId: preparedWorkflow.id,
    }),
  })

  await addAuditLog(userId, preparedWorkflow.id, 'mindmap.run', {
    triggerText,
    success: result.success,
    nodeCount: preparedWorkflow.nodes.length,
    edgeCount: preparedWorkflow.edges.length,
    communicationCount: result.communications.length,
  })

  return NextResponse.json({
    ...result,
    validation,
    memoryTable: sessionMemory,
  })
}
