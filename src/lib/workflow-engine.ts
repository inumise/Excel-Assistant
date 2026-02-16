import { generateAIText } from '@/lib/ai-manager'
import { executeJavaScriptSandbox } from '@/lib/code-sandbox'
import {
  UserAISettings,
  Workflow,
  WorkflowCommunicationEvent,
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
  const validEdges = params.workflow.edges.filter(
    (edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target)
  )

  const registerCommunications = (sourceNodeId: string, message: string) => {
    const outgoing = validEdges.filter((edge) => edge.source === sourceNodeId)
    const createdAt = new Date().toISOString()
    outgoing.forEach((edge, index) => {
      communications.push({
        id: `${edge.id}-${Date.now()}-${index}`,
        edgeId: edge.id,
        source: edge.source,
        target: edge.target,
        dataType: edge.dataType,
        message,
        createdAt,
      })
    })
  }

  for (const node of orderedNodes) {
    if (node.type === 'group') {
      nodeResults.push({
        nodeId: node.id,
        role: 'manager',
        success: true,
        summary: `Entered manager scope: ${node.data.label}`,
      })
      registerCommunications(node.id, `Manager scope entered: ${node.data.label}`)
      continue
    }

    if (node.data.role === 'manager') {
      const childSummaries = nodeResults.map((result) => `${result.nodeId}: ${result.summary}`).join('\n')
      const managerPlan = await generateAIText({
        settings: params.settings,
        prompt: `Incoming request: ${params.triggerText}
Current execution context:
${childSummaries || '(none)'}

Node manager prompt:
${node.data.prompt}

Return concise orchestration status.`,
      })

      nodeResults.push({
        nodeId: node.id,
        role: node.data.role,
        success: true,
        summary: managerPlan || 'Manager completed orchestration.',
      })
      registerCommunications(node.id, managerPlan || 'Manager completed orchestration.')
      continue
    }

    if (node.data.role === 'programmer') {
      const programmerSummary = await generateAIText({
        settings: params.settings,
        prompt: `You are Programmer AI.
Task from trigger: ${params.triggerText}
Node prompt: ${node.data.prompt}
Provide a short coding execution summary.`,
      })

      nodeResults.push({
        nodeId: node.id,
        role: node.data.role,
        success: true,
        summary: programmerSummary || 'Programmer generated implementation steps.',
      })
      registerCommunications(
        node.id,
        programmerSummary || 'Programmer generated implementation steps.'
      )
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
      registerCommunications(node.id, textSummary)
      continue
    }

    const code = node.data.codeSnippet?.content || ''
    if (!code.trim()) {
      nodeResults.push({
        nodeId: node.id,
        role: node.data.role,
        success: false,
        summary: 'Code node has no code to execute.',
        error: 'Missing code_snippet',
      })
      registerCommunications(node.id, 'Code node missing snippet.')
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
      registerCommunications(
        node.id,
        'Python snippet prepared. Runtime execution disabled in sandbox.'
      )
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
    registerCommunications(
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
