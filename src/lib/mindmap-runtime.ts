import {
  NodeMemoryScope,
  NodeRoutingMode,
  Workflow,
  WorkflowGlobalDefaults,
  WorkflowNode,
} from '@/types/workflow'

export interface MindMapNodeRuntimeConfig {
  systemPrompt?: string
  model?: string
  temperature?: number
  routing: NodeRoutingMode
  useMemoryVault: boolean
  memoryScope: NodeMemoryScope
  code?: string
}

export interface MindMapValidationResult {
  safeToRun: boolean
  summary: string
  nodeIssues: Record<string, string[]>
  issueCount: number
}

export function isAINode(node: WorkflowNode) {
  return (
    node.data.nodeKind === 'ai' ||
    node.data.role === 'manager' ||
    node.data.role === 'programmer' ||
    node.data.role === 'code'
  )
}

export function resolveNodeConfig(node: WorkflowNode, globalDefaults: WorkflowGlobalDefaults) {
  const ai = node.data.aiConfig || {}
  const tempCandidate = ai.temperature ?? globalDefaults.temperature
  const temperature =
    typeof tempCandidate === 'number' && Number.isFinite(tempCandidate)
      ? Math.min(1, Math.max(0.1, tempCandidate))
      : undefined

  return {
    systemPrompt: ai.systemPrompt?.trim() || node.data.prompt?.trim() || globalDefaults.systemPrompt,
    model: ai.model?.trim() || globalDefaults.model,
    temperature,
    routing: ai.routing || globalDefaults.routing || 'direct',
    useMemoryVault: ai.useMemoryVault ?? globalDefaults.useMemoryVault ?? false,
    memoryScope: ai.memoryScope || globalDefaults.memoryScope || 'workflow',
    code: ai.code?.trim() || node.data.codeSnippet?.content?.trim(),
  } satisfies MindMapNodeRuntimeConfig
}

export function validateMindMapWorkflow(workflow: Workflow): MindMapValidationResult {
  const globalDefaults = workflow.globalDefaults || {}
  const nodeIssues: Record<string, string[]> = {}
  const nodeIdSet = new Set(workflow.nodes.map((node) => node.id))
  const issueList: string[] = []

  const outgoingByNode = new Map<string, Workflow['edges']>()
  workflow.edges.forEach((edge) => {
    const row = outgoingByNode.get(edge.source) || []
    row.push(edge)
    outgoingByNode.set(edge.source, row)
    if (!nodeIdSet.has(edge.source) || !nodeIdSet.has(edge.target)) {
      issueList.push(`edge ${edge.id} references missing node`)
    }
  })

  workflow.nodes.forEach((node) => {
    const issues: string[] = []
    if (!node.data.label?.trim()) issues.push('Title is missing.')

    if (isAINode(node)) {
      const resolved = resolveNodeConfig(node, globalDefaults)
      if (!resolved.systemPrompt?.trim()) issues.push('System prompt is missing (node + global default).')
      if (!resolved.model?.trim()) issues.push('Model is missing (node + global default).')
      if (typeof resolved.temperature === 'number' && (resolved.temperature < 0.1 || resolved.temperature > 1)) {
        issues.push('Temperature must be between 0.1 and 1.0.')
      }

      const outgoing = outgoingByNode.get(node.id) || []
      if (resolved.routing === 'buffered') {
        const bufferedTypedEdges = outgoing.filter(
          (edge) => edge.dataType === 'context' || edge.dataType === 'event'
        )
        if (outgoing.length > 0 && bufferedTypedEdges.length === 0) {
          issues.push('Routing is buffered but no outgoing edge is typed as context/event.')
        }
        const hasBufferTarget = outgoing.some((edge) => {
          const target = workflow.nodes.find((candidate) => candidate.id === edge.target)
          return target?.data.role === 'buffer'
        })
        if (!hasBufferTarget && outgoing.length > 0) {
          issues.push('Routing is buffered but no outgoing edge targets a buffer node.')
        }
      }

      if (resolved.routing === 'storage') {
        const memoryTypedEdges = outgoing.filter((edge) => edge.dataType === 'memory')
        if (outgoing.length > 0 && memoryTypedEdges.length === 0) {
          issues.push('Routing is storage but no outgoing edge is typed as memory.')
        }
        const hasStorageTarget = outgoing.some((edge) => {
          const target = workflow.nodes.find((candidate) => candidate.id === edge.target)
          return target?.data.role === 'storage'
        })
        if (!hasStorageTarget && outgoing.length > 0) {
          issues.push('Routing is storage but no outgoing edge targets a storage node.')
        }
      }

      if (resolved.useMemoryVault && !resolved.memoryScope) {
        issues.push('Memory Vault enabled but scope is not configured.')
      }
    }

    if (issues.length > 0) {
      nodeIssues[node.id] = issues
      issueList.push(...issues.map((item) => `${node.data.label || node.id}: ${item}`))
    }
  })

  const summary =
    issueList.length === 0
      ? `Map looks healthy. ${workflow.nodes.length} node(s) checked.`
      : `${issueList.length} issue(s) found across ${Object.keys(nodeIssues).length} node(s).`

  return {
    safeToRun: issueList.length === 0,
    summary,
    nodeIssues,
    issueCount: issueList.length,
  }
}

export function getMemoryNamespace(params: {
  scope: NodeMemoryScope
  sessionId: string
  workflowId: string
}) {
  if (params.scope === 'session') return `session:${params.sessionId}`
  if (params.scope === 'global') return 'global'
  return `workflow:${params.workflowId}`
}

export function safeValuePreview(value: unknown) {
  if (typeof value === 'string') return value.slice(0, 120)
  try {
    return JSON.stringify(value).slice(0, 120)
  } catch {
    return String(value).slice(0, 120)
  }
}
