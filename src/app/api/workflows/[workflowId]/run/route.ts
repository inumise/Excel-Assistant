import { NextResponse } from 'next/server'
import {
  addAuditLog,
  getUserSettings,
  getWorkflowById,
  listMemoryRecords,
  saveWorkflow,
  upsertMemoryRecord,
} from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { executeWorkflow } from '@/lib/workflow-engine'
import { sendWhatsAppMessage } from '@/lib/whatsapp-service'
import { resolveUserId } from '@/lib/user-context'
import { checkRateLimit } from '@/lib/rate-limit'
import { autoRepairWorkflow, validateWorkflow } from '@/lib/workflow-validator'

interface RunRequest {
  userId?: string
  triggerText?: string
  notifyWhatsapp?: boolean
  whatsappNumber?: string
}

function safeStringify(value: unknown) {
  try {
    const serialized = JSON.stringify(value)
    if (!serialized) return ''
    return serialized.length > 380 ? `${serialized.slice(0, 380)}...` : serialized
  } catch {
    return String(value)
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await context.params
  let body: RunRequest
  try {
    body = (await request.json()) as RunRequest
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 })
  }
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Valid userId is required.' }, { status: 400 })
  }
  const triggerText = body.triggerText || `run ${workflowId}`

  const rateLimit = checkRateLimit(`workflow-run:${userId}`, 20, 60_000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, message: 'Rate limit exceeded.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
      }
    )
  }

  const [workflow, settings] = await Promise.all([
    getWorkflowById(userId, workflowId),
    getUserSettings(userId),
  ])

  if (!workflow) {
    return NextResponse.json({ success: false, message: 'Workflow not found.' }, { status: 404 })
  }

  let effectiveWorkflow = workflow
  const repairResult = autoRepairWorkflow(workflow)
  if (repairResult.appliedFixes.length > 0) {
    effectiveWorkflow = await saveWorkflow(repairResult.workflow)
    await addAuditLog(userId, workflowId, 'workflow.auto_repair.before_run', {
      appliedFixes: repairResult.appliedFixes,
    })
  }

  const validation = validateWorkflow(effectiveWorkflow)
  if (!validation.safeToRun) {
    return NextResponse.json(
      {
        success: false,
        message: 'Workflow has blocking validation issues.',
        validation,
      },
      { status: 422 }
    )
  }

  const memoryRows = await listMemoryRecords({ userId, workflowId })
  const memoryContext = memoryRows
    .slice(0, 12)
    .map((row) => `${row.namespace}/${row.key}: ${safeStringify(row.value)}`)
    .join('\n')
    .slice(0, 2800)

  try {
    const result = await executeWorkflow({
      workflow: effectiveWorkflow,
      settings,
      triggerText: memoryContext
        ? `${triggerText.slice(0, 1200)}\n\nMemory Vault Context:\n${memoryContext}`
        : triggerText.slice(0, 1200),
    })

    await addAuditLog(userId, workflowId, 'workflow.run', {
      triggerText,
      success: result.success,
      nodeResults: result.nodeResults,
      communicationCount: result.communications.length,
      validationScore: validation.score,
    })

    await Promise.allSettled([
      upsertMemoryRecord({
        userId,
        workflowId,
        namespace: 'runtime',
        key: 'last_run',
        value: {
          success: result.success,
          output: result.output,
          communicationCount: result.communications.length,
          at: new Date().toISOString(),
        },
      }),
      ...result.nodeResults.map((nodeResult) =>
        upsertMemoryRecord({
          userId,
          workflowId,
          namespace: `node:${nodeResult.nodeId}`,
          key: 'last_summary',
          value: {
            success: nodeResult.success,
            summary: nodeResult.summary,
            error: nodeResult.error || null,
            output: nodeResult.output || null,
          },
        })
      ),
    ])

    const shouldNotify = body.notifyWhatsapp || settings.whatsappNumber
    if (shouldNotify && (body.whatsappNumber || settings.whatsappNumber)) {
      await sendWhatsAppMessage({
        to: body.whatsappNumber || settings.whatsappNumber || '',
        message: result.success
          ? `Workflow ${effectiveWorkflow.name} finished successfully.\n${result.output}`
          : `Workflow ${effectiveWorkflow.name} failed.\n${result.output}`,
      })
    }

    return NextResponse.json({
      ...result,
      validation,
      autoRepaired: repairResult.appliedFixes.length > 0,
      appliedFixes: repairResult.appliedFixes,
    })
  } catch (error) {
    await addAuditLog(userId, workflowId, 'workflow.run.error', {
      triggerText,
      error: error instanceof Error ? error.message : 'Unknown execution failure',
    })
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Workflow execution failed.',
        validation,
      },
      { status: 500 }
    )
  }
}
