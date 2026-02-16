import { generateAIText } from '@/lib/ai-manager'
import { executeJavaScriptSandbox } from '@/lib/code-sandbox'
import {
  EdgeDataType,
  UserAISettings,
  Workflow,
  WorkflowCommunicationEvent,
  WorkflowEdge,
  WorkflowNode,
} from '@/types/workflow'

export interface NodeExecutionResult {
  nodeId: string
  role: WorkflowNode['data']['role']
  success: boolean
  summary: string
  output?: string
  error?: string
}

export interface WorkflowExecutionResult {
  success: boolean
  output: string
  nodeResults: NodeExecutionResult[]
  communications: WorkflowCommunicationEvent[]
}

interface ChannelMessage {
  fromNodeId: string
  edgeId: string
  dataType: EdgeDataType
  content: string
  createdAt: string
}

function getExecutionOrder(workflow: Workflow): WorkflowNode[] {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()
  const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]))
  const validNodeIds = new Set(workflow.nodes.map((node) => node.id))

  workflow.nodes.forEach((node) => {
    inDegree.set(node.id, 0)
    adjacency.set(node.id, [])
  })

  workflow.edges.forEach((edge) => {
    if (!validNodeIds.has(edge.source) || !validNodeIds.has(edge.target)) return
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
  })

  const queue = workflow.nodes
    .filter((node) => (inDegree.get(node.id) || 0) === 0)
    .sort((a, b) => a.position.x - b.position.x)
  const ordered: WorkflowNode[] = []

  while (queue.length > 0) {
    const node = queue.shift()
    if (!node) break

    ordered.push(node)
    adjacency.get(node.id)?.forEach((targetId) => {
      inDegree.set(targetId, (inDegree.get(targetId) || 0) - 1)
      if ((inDegree.get(targetId) || 0) === 0) {
        const targetNode = nodeMap.get(targetId)
        if (targetNode) queue.push(targetNode)
      }
    })
  }

  if (ordered.length !== workflow.nodes.length) {
    return [...workflow.nodes].sort((a, b) => a.position.x - b.position.x)
  }

  return ordered
}

export async function executeWorkflow(params: {
  workflow: Workflow
  settings: UserAISettings
  triggerText: string
}) {
  const orderedNodes = getExecutionOrder(params.workflow)
  const nodeResults: NodeExecutionResult[] = []
  const communications: WorkflowCommunicationEvent[] = []
  const validNodeIds = new Set(params.workflow.nodes.map((node) => node.id))
  const nodeById = new Map(params.workflow.nodes.map((node) => [node.id, node]))
  const globalDefaults = params.workflow.globalDefaults || {}
  const validEdges = params.workflow.edges.filter(
    (edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
  )
  const outgoingBySource = new Map<string, WorkflowEdge[]>()
  const incomingByTarget = new Map<string, WorkflowEdge[]>()
  validEdges.forEach((edge) => {
    const source = outgoingBySource.get(edge.source) || []
    source.push(edge)
    outgoingBySource.set(edge.source, source)

    const target = incomingByTarget.get(edge.target) || []
    target.push(edge)
    incomingByTarget.set(edge.target, target)
  })

  const inboxByNode = new Map<string, ChannelMessage[]>()
  const bufferQueues = new Map<string, ChannelMessage[]>()
  const heldBufferByEdge = new Map<string, ChannelMessage[]>()
  const storageState = new Map<
    string,
    {
      storageType: 'database' | 'text' | 'excel'
      key: string
      values: string[]
      updatedAt: string
    }
  >()

  const appendInbox = (nodeId: string, messages: ChannelMessage[]) => {
    const existing = inboxByNode.get(nodeId) || []
    inboxByNode.set(nodeId, [...existing, ...messages].slice(-200))
  }

  const normalizeMessage = (input: string) => input.trim().slice(0, 600)

  const resolveNodeRuntimeConfig = (node: WorkflowNode) => {
    const aiConfig = node.data.aiConfig || {}
    const resolvedTemperature = Number(
      aiConfig.temperature ?? globalDefaults.temperature ?? params.settings.creativityTemp
    )
    return {
      systemPrompt: aiConfig.systemPrompt?.trim() || node.data.prompt?.trim() || globalDefaults.systemPrompt,
      model: aiConfig.model?.trim() || globalDefaults.model,
      temperature: Number.isFinite(resolvedTemperature)
        ? Math.min(1, Math.max(0.1, resolvedTemperature))
        : Math.min(1, Math.max(0.1, params.settings.creativityTemp)),
      routing: aiConfig.routing || globalDefaults.routing || 'direct',
      useMemoryVault: aiConfig.useMemoryVault ?? globalDefaults.useMemoryVault ?? false,
      memoryScope: aiConfig.memoryScope || globalDefaults.memoryScope || 'workflow',
      code: aiConfig.code?.trim() || '',
    }
  }

  const resolveOutgoingByRouting = (sourceNodeId: string) => {
    const sourceNode = nodeById.get(sourceNodeId)
    const outgoing = outgoingBySource.get(sourceNodeId) || []
    if (!sourceNode || outgoing.length === 0) return outgoing
    const routing = resolveNodeRuntimeConfig(sourceNode).routing
    if (routing === 'direct') return outgoing

    const preferredRole = routing === 'buffered' ? 'buffer' : 'storage'
    const preferredEdges = outgoing.filter(
      (edge) => nodeById.get(edge.target)?.data.role === preferredRole
    )
    return preferredEdges.length > 0 ? preferredEdges : outgoing
  }

  const registerCommunications = (
    sourceNodeId: string,
    message: string,
    overrideEdges?: WorkflowEdge[]
  ) => {
    const outgoing = overrideEdges || outgoingBySource.get(sourceNodeId) || []
    const safeMessage = normalizeMessage(message)
    const createdAt = new Date().toISOString()
    outgoing.forEach((edge, index) => {
      communications.push({
        id: `${edge.id}-${Date.now()}-${index}`,
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        dataType: edge.dataType,
        message: safeMessage,
        createdAt,
      })
    })
  }

  const dispatchNodeOutput = (sourceNodeId: string, message: string) => {
    const outgoing = resolveOutgoingByRouting(sourceNodeId)
    if (outgoing.length === 0) return
    const safeMessage = normalizeMessage(message)
    const createdAt = new Date().toISOString()
    outgoing.forEach((edge) => {
      appendInbox(edge.target, [
        {
          fromNodeId: sourceNodeId,
          edgeId: edge.id,
          dataType: edge.dataType,
          content: safeMessage,
          createdAt,
        },
      ])
    })
    registerCommunications(sourceNodeId, safeMessage, outgoing)
  }

  const releaseHeldBuffersForNode = (nodeId: string) => {
    const incoming = incomingByTarget.get(nodeId) || []
    incoming.forEach((edge) => {
      const held = heldBufferByEdge.get(edge.id)
      if (!held || held.length === 0) return
      appendInbox(nodeId, held)
      heldBufferByEdge.delete(edge.id)
    })
  }

  const summarizeIncoming = (nodeId: string) => {
    const incoming = inboxByNode.get(nodeId) || []
    const rows = incoming.slice(-8).map((entry) => `[${entry.dataType}] ${entry.content}`)
    return {
      incoming,
      contextText: rows.join('\n'),
    }
  }

  for (const node of orderedNodes) {
    releaseHeldBuffersForNode(node.id)
    const incomingSummary = summarizeIncoming(node.id)

    if (node.type === 'group') {
      nodeResults.push({
        nodeId: node.id,
        role: 'manager',
        success: true,
        summary: `Entered manager scope: ${node.data.label}`,
      })
      dispatchNodeOutput(node.id, `Manager scope entered: ${node.data.label}`)
      continue
    }

    if (node.data.role === 'manager') {
      const runtimeConfig = resolveNodeRuntimeConfig(node)
      const childSummaries = nodeResults.map((result) => `${result.nodeId}: ${result.summary}`).join('\n')
      const managerPlan = await generateAIText({
        settings: params.settings,
        temperature: runtimeConfig.temperature,
        preferredModel: runtimeConfig.model,
        extraSystemPrompt: runtimeConfig.systemPrompt,
        prompt: `Incoming request: ${params.triggerText}
Current execution context:
${childSummaries || '(none)'}

Incoming channels:
${incomingSummary.contextText || '(none)'}

Node manager prompt:
${runtimeConfig.systemPrompt || node.data.prompt || '(none)'}

Return concise orchestration status.`,
      })

      nodeResults.push({
        nodeId: node.id,
        role: node.data.role,
        success: true,
        summary:
          managerPlan ||
          `Manager completed orchestration (model ${runtimeConfig.model || 'default'}).`,
      })
      dispatchNodeOutput(node.id, managerPlan || 'Manager completed orchestration.')
      continue
    }

    if (node.data.role === 'programmer') {
      const runtimeConfig = resolveNodeRuntimeConfig(node)
      const programmerSummary = await generateAIText({
        settings: params.settings,
        temperature: runtimeConfig.temperature,
        preferredModel: runtimeConfig.model,
        extraSystemPrompt: runtimeConfig.systemPrompt,
        prompt: `You are Programmer AI.
Task from trigger: ${params.triggerText}
Node prompt: ${runtimeConfig.systemPrompt || '(none)'}
Node notes: ${node.data.notes || '(none)'}
Routing mode: ${runtimeConfig.routing}
Incoming channels:
${incomingSummary.contextText || '(none)'}
Node code context:
${runtimeConfig.code || '(none)'}
Provide a short coding execution summary.`,
      })

      nodeResults.push({
        nodeId: node.id,
        role: node.data.role,
        success: true,
        summary:
          programmerSummary ||
          `Programmer generated implementation steps (model ${runtimeConfig.model || 'default'}).`,
      })
      dispatchNodeOutput(node.id, programmerSummary || 'Programmer generated implementation steps.')
      continue
    }

    if (node.data.role === 'text') {
      const textSummary = node.data.textContent?.trim()
        ? `Text annotation shared: ${node.data.textContent.slice(0, 120)}`
        : `Text annotation: ${node.data.label}`
      nodeResults.push({
        nodeId: node.id,
        role: node.data.role,
        success: true,
        summary: textSummary,
      })
      dispatchNodeOutput(node.id, textSummary)
      continue
    }

    if (node.data.role === 'buffer') {
      const config = {
        maxItems: Math.max(1, Math.min(500, Number(node.data.bufferConfig?.maxItems || 25))),
        releaseMode: node.data.bufferConfig?.releaseMode || 'when-target-ready',
        dropPolicy: node.data.bufferConfig?.dropPolicy || 'oldest',
      }

      const currentQueue = bufferQueues.get(node.id) || []
      let mergedQueue = [...currentQueue, ...incomingSummary.incoming]

      if (mergedQueue.length > config.maxItems) {
        if (config.dropPolicy === 'oldest') {
          mergedQueue = mergedQueue.slice(-config.maxItems)
        } else if (config.dropPolicy === 'newest') {
          mergedQueue = mergedQueue.slice(0, config.maxItems)
        } else {
          mergedQueue = mergedQueue.slice(0, config.maxItems)
        }
      }

      const outgoing = outgoingBySource.get(node.id) || []
      let released = 0

      if (outgoing.length > 0 && mergedQueue.length > 0) {
        if (config.releaseMode === 'immediate') {
          const createdAt = new Date().toISOString()
          outgoing.forEach((edge) => {
            const payload = mergedQueue.map((item) => ({
              fromNodeId: node.id,
              edgeId: edge.id,
              dataType: edge.dataType,
              content: item.content,
              createdAt,
            }))
            appendInbox(edge.target, payload)
            released += payload.length
          })
          registerCommunications(
            node.id,
            `Buffer released ${mergedQueue.length} queued prompt(s).`,
            outgoing
          )
          mergedQueue = []
        } else {
          const createdAt = new Date().toISOString()
          outgoing.forEach((edge) => {
            heldBufferByEdge.set(
              edge.id,
              mergedQueue.map((item) => ({
                fromNodeId: node.id,
                edgeId: edge.id,
                dataType: edge.dataType,
                content: item.content,
                createdAt,
              }))
            )
            released += mergedQueue.length
          })
          registerCommunications(
            node.id,
            `Buffer armed ${mergedQueue.length} prompt(s), waiting for downstream readiness.`,
            outgoing
          )
          mergedQueue = []
        }
      }

      bufferQueues.set(node.id, mergedQueue)
      nodeResults.push({
        nodeId: node.id,
        role: node.data.role,
        success: true,
        summary: `Buffer queued ${mergedQueue.length} prompt(s); ${released} dispatched.`,
      })
      continue
    }

    if (node.data.role === 'storage') {
      const config = {
        storageType: node.data.storageConfig?.storageType || 'database',
        key: node.data.storageConfig?.key?.trim() || `storage-${node.id}`,
        allowWrite: node.data.storageConfig?.allowWrite !== false,
        allowRead: node.data.storageConfig?.allowRead !== false,
      } as const

      const current =
        storageState.get(config.key) ||
        {
          storageType: config.storageType,
          key: config.key,
          values: [] as string[],
          updatedAt: new Date().toISOString(),
        }

      const writes = config.allowWrite
        ? incomingSummary.incoming.map((entry) => entry.content).filter(Boolean)
        : []

      if (writes.length > 0) {
        current.values = [...current.values, ...writes].slice(-250)
      }
      current.updatedAt = new Date().toISOString()
      storageState.set(config.key, current)

      const outgoing = outgoingBySource.get(node.id) || []
      let snapshot = ''
      const preview = current.values.slice(-12)
      if (config.storageType === 'excel') {
        snapshot = preview.map((entry, index) => `row_${index + 1}\t${entry}`).join('\n')
      } else if (config.storageType === 'text') {
        snapshot = preview.join('\n')
      } else {
        snapshot = JSON.stringify(
          preview.map((entry, index) => ({ id: index + 1, value: entry })),
          null,
          2
        )
      }

      if (config.allowRead && outgoing.length > 0) {
        const message = `Storage(${config.storageType}:${config.key}) snapshot:\n${snapshot || '(empty)'}`.slice(
          0,
          700
        )
        const createdAt = new Date().toISOString()
        outgoing.forEach((edge) => {
          appendInbox(edge.target, [
            {
              fromNodeId: node.id,
              edgeId: edge.id,
              dataType: edge.dataType,
              content: message,
              createdAt,
            },
          ])
        })
        registerCommunications(node.id, message, outgoing)
      }

      nodeResults.push({
        nodeId: node.id,
        role: node.data.role,
        success: true,
        summary: `Storage ${config.key} (${config.storageType}) wrote ${writes.length} and served ${outgoing.length} output lane(s).`,
        output: snapshot || '(empty)',
      })
      continue
    }

    const runtimeConfig = resolveNodeRuntimeConfig(node)
    const code = runtimeConfig.code || node.data.codeSnippet?.content || ''
    if (!code.trim()) {
      nodeResults.push({
        nodeId: node.id,
        role: node.data.role,
        success: false,
        summary: 'Code node has no code to execute.',
        error: 'Missing code_snippet',
      })
      dispatchNodeOutput(node.id, 'Code node missing snippet.')
      continue
    }

    if (node.data.codeSnippet?.language === 'python') {
      nodeResults.push({
        nodeId: node.id,
        role: node.data.role,
        success: true,
        summary: 'Python snippet prepared. Runtime execution is disabled in this sandbox.',
        output: code,
      })
      dispatchNodeOutput(node.id, 'Python snippet prepared. Runtime execution disabled in sandbox.')
      continue
    }

    let execution = executeJavaScriptSandbox(code)
    let attempt = 0
    const retries = Math.max(0, node.data.errorHandler.retryCount || 0)

    while (!execution.ok && attempt < retries) {
      attempt += 1
      execution = executeJavaScriptSandbox(code)
    }

    nodeResults.push({
      nodeId: node.id,
      role: node.data.role,
      success: execution.ok,
      summary: execution.ok
        ? 'Code executed inside sandbox.'
        : `Execution failed after ${attempt + 1} attempt(s): ${execution.error || 'unknown error'}`,
      output: execution.output,
      error: execution.error,
    })
    dispatchNodeOutput(
      node.id,
      execution.ok ? 'Code execution succeeded.' : `Code execution failed: ${execution.error || 'unknown'}`
    )
  }

  const failed = nodeResults.find((result) => !result.success)
  const output = nodeResults.map((result) => `• ${result.nodeId}: ${result.summary}`).join('\n')

  return {
    success: !failed,
    output,
    nodeResults,
    communications,
  } satisfies WorkflowExecutionResult
}
