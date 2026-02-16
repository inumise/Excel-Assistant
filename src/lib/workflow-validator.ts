import { Workflow, WorkflowEdge, WorkflowNode, WorkflowNodeData } from '@/types/workflow'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface WorkflowValidationIssue {
  code: string
  severity: ValidationSeverity
  message: string
  nodeId?: string
  edgeId?: string
  fixable?: boolean
}

export interface WorkflowValidationSummary {
  errors: number
  warnings: number
  infos: number
}

export interface WorkflowValidationReport {
  score: number
  safeToRun: boolean
  summary: WorkflowValidationSummary
  issues: WorkflowValidationIssue[]
  generatedAt: string
}

const DEFAULT_CODE_SNIPPET = `export function runTask() {
  return "autofixed code node";
}
`

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function addIssue(
  issues: WorkflowValidationIssue[],
  issue: WorkflowValidationIssue
) {
  issues.push(issue)
}

function detectCycles(workflow: Workflow) {
  const nodeIds = new Set(workflow.nodes.map((node) => node.id))
  const adjacency = new Map<string, string[]>()
  workflow.nodes.forEach((node) => adjacency.set(node.id, []))
  workflow.edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return
    adjacency.get(edge.source)?.push(edge.target)
  })

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const cycleNodes = new Set<string>()

  const walk = (nodeId: string, path: string[]) => {
    if (visiting.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId)
      path.slice(Math.max(0, cycleStart)).forEach((id) => cycleNodes.add(id))
      return
    }
    if (visited.has(nodeId)) return
    visiting.add(nodeId)
    const nextPath = [...path, nodeId]
    for (const next of adjacency.get(nodeId) || []) {
      walk(next, nextPath)
    }
    visiting.delete(nodeId)
    visited.add(nodeId)
  }

  workflow.nodes.forEach((node) => walk(node.id, []))
  return [...cycleNodes]
}

function computeSummary(issues: WorkflowValidationIssue[]): WorkflowValidationSummary {
  return issues.reduce(
    (acc, issue) => {
      if (issue.severity === 'error') acc.errors += 1
      else if (issue.severity === 'warning') acc.warnings += 1
      else acc.infos += 1
      return acc
    },
    { errors: 0, warnings: 0, infos: 0 } satisfies WorkflowValidationSummary
  )
}

function scoreFromSummary(summary: WorkflowValidationSummary) {
  const raw = 100 - summary.errors * 18 - summary.warnings * 6 - summary.infos * 2
  return clamp(raw, 0, 100)
}

function hasUsableCode(node: WorkflowNode) {
  if (node.data.role !== 'code') return true
  return Boolean(node.data.codeSnippet?.content?.trim())
}

function hasUsableText(node: WorkflowNode) {
  if (node.data.role !== 'text') return true
  return Boolean(node.data.textContent?.trim() || node.data.label?.trim())
}

export function validateWorkflow(workflow: Workflow): WorkflowValidationReport {
  const issues: WorkflowValidationIssue[] = []
  const nodeIds = new Set(workflow.nodes.map((node) => node.id))
  const edgeIdSeen = new Set<string>()
  const managerCount = workflow.nodes.filter((node) => node.data.role === 'manager').length
  const executableNodeCount = workflow.nodes.filter((node) => node.data.role !== 'text').length

  if (workflow.nodes.length === 0) {
    addIssue(issues, {
      code: 'workflow.empty',
      severity: 'error',
      message: 'Workflow has no nodes.',
    })
  }

  if (workflow.nodes.length > 180) {
    addIssue(issues, {
      code: 'workflow.size.large',
      severity: 'warning',
      message: `Workflow has ${workflow.nodes.length} nodes; consider splitting into subflows.`,
    })
  }

  if (managerCount === 0 && executableNodeCount > 0) {
    addIssue(issues, {
      code: 'workflow.manager.missing',
      severity: 'warning',
      message: 'No manager node detected. Coordination quality may degrade.',
      fixable: true,
    })
  }

  workflow.nodes.forEach((node) => {
    if (!node.data.label?.trim()) {
      addIssue(issues, {
        code: 'node.label.missing',
        severity: 'error',
        nodeId: node.id,
        message: 'Node label is required.',
        fixable: true,
      })
    }

    if ((node.data.role === 'manager' || node.data.role === 'programmer') && !node.data.prompt?.trim()) {
      addIssue(issues, {
        code: 'node.prompt.missing',
        severity: 'warning',
        nodeId: node.id,
        message: 'Worker prompt is empty.',
        fixable: true,
      })
    }

    if (!hasUsableText(node)) {
      addIssue(issues, {
        code: 'node.text.missing',
        severity: 'warning',
        nodeId: node.id,
        message: 'Text node has no content.',
        fixable: true,
      })
    }

    if (!hasUsableCode(node)) {
      addIssue(issues, {
        code: 'node.code.missing',
        severity: 'warning',
        nodeId: node.id,
        message: 'Code node has no executable snippet.',
        fixable: true,
      })
    }

    if (node.data.errorHandler.retryCount < 0 || node.data.errorHandler.retryCount > 10) {
      addIssue(issues, {
        code: 'node.retry.invalid',
        severity: 'warning',
        nodeId: node.id,
        message: 'Retry count should be within 0-10.',
        fixable: true,
      })
    }
  })

  workflow.edges.forEach((edge) => {
    if (edgeIdSeen.has(edge.id)) {
      addIssue(issues, {
        code: 'edge.id.duplicate',
        severity: 'warning',
        edgeId: edge.id,
        message: 'Duplicate edge id detected.',
        fixable: true,
      })
    } else {
      edgeIdSeen.add(edge.id)
    }

    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      addIssue(issues, {
        code: 'edge.dangling',
        severity: 'error',
        edgeId: edge.id,
        message: 'Edge points to missing source or target node.',
        fixable: true,
      })
    }

    if (edge.source === edge.target) {
      addIssue(issues, {
        code: 'edge.self_loop',
        severity: 'warning',
        edgeId: edge.id,
        message: 'Self-loop edge detected.',
        fixable: true,
      })
    }
  })

  const cycleNodes = detectCycles(workflow)
  cycleNodes.forEach((nodeId) => {
    addIssue(issues, {
      code: 'workflow.cycle.detected',
      severity: 'error',
      nodeId,
      message: 'Cycle detected in workflow graph.',
      fixable: false,
    })
  })

  const connectedNodeIds = new Set<string>()
  workflow.edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return
    connectedNodeIds.add(edge.source)
    connectedNodeIds.add(edge.target)
  })

  workflow.nodes.forEach((node) => {
    if (workflow.nodes.length > 1 && !connectedNodeIds.has(node.id)) {
      addIssue(issues, {
        code: 'node.isolated',
        severity: 'info',
        nodeId: node.id,
        message: 'Node is isolated and will execute outside graph context.',
      })
    }
  })

  const summary = computeSummary(issues)
  const score = scoreFromSummary(summary)

  return {
    score,
    safeToRun: summary.errors === 0,
    summary,
    issues,
    generatedAt: new Date().toISOString(),
  }
}

function createDefaultPrompt(role: WorkflowNodeData['role']) {
  if (role === 'manager') {
    return 'Coordinate workers, prioritize tasks, and report concise status.'
  }
  if (role === 'programmer') {
    return 'Generate implementation steps and return concise output updates.'
  }
  if (role === 'text') {
    return ''
  }
  return 'Execute function logic and return deterministic results.'
}

function normalizeNode(node: WorkflowNode, index: number) {
  const next: WorkflowNode = JSON.parse(JSON.stringify(node)) as WorkflowNode
  const fixes: string[] = []
  const expectedRole = node.type === 'group' ? 'manager' : node.type

  if (!next.data.label?.trim()) {
    next.data.label = `Worker ${index + 1}`
    fixes.push(`label:${next.id}`)
  }

  if (!next.data.role || next.data.role !== expectedRole) {
    next.data.role = expectedRole
    fixes.push(`role:${next.id}`)
  }

  if (!next.data.prompt?.trim() && next.data.role !== 'code' && next.data.role !== 'text') {
    next.data.prompt = createDefaultPrompt(next.data.role)
    fixes.push(`prompt:${next.id}`)
  }

  next.data.errorHandler = {
    retryCount: clamp(Number(next.data.errorHandler?.retryCount ?? 1), 0, 10),
    notifyWhatsapp: Boolean(next.data.errorHandler?.notifyWhatsapp),
  }
  next.data.errorCheckEnabled = next.data.errorCheckEnabled ?? true
  next.data.monitoring = next.data.monitoring || 'none'

  if (next.data.role === 'code' && !next.data.codeSnippet?.content?.trim()) {
    next.data.codeSnippet = {
      language: 'typescript',
      content: DEFAULT_CODE_SNIPPET,
    }
    fixes.push(`code:${next.id}`)
  }

  if (next.data.role === 'text' && !next.data.textContent?.trim()) {
    next.data.textContent = next.data.label || 'Text note'
    next.data.textStyle = {
      fontFamily: next.data.textStyle?.fontFamily || 'Inter',
      fontSize: next.data.textStyle?.fontSize || 18,
      fontWeight: next.data.textStyle?.fontWeight || '600',
      color: next.data.textStyle?.color || '#0F172A',
      backgroundColor: next.data.textStyle?.backgroundColor || 'transparent',
      align: next.data.textStyle?.align || 'left',
      italic: Boolean(next.data.textStyle?.italic),
      underline: Boolean(next.data.textStyle?.underline),
      uppercase: Boolean(next.data.textStyle?.uppercase),
      letterSpacing: next.data.textStyle?.letterSpacing || 0,
      lineHeight: next.data.textStyle?.lineHeight || 1.3,
      shadow: Boolean(next.data.textStyle?.shadow),
    }
    fixes.push(`text:${next.id}`)
  }

  return { node: next, fixes }
}

function normalizeEdges(edges: WorkflowEdge[], nodeIds: Set<string>) {
  const dedupe = new Set<string>()
  const idSeen = new Set<string>()
  const normalized: WorkflowEdge[] = []
  const fixes: string[] = []

  edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      fixes.push(`remove_dangling_edge:${edge.id}`)
      return
    }
    if (edge.source === edge.target) {
      fixes.push(`remove_self_loop:${edge.id}`)
      return
    }

    const signature = `${edge.source}->${edge.target}:${edge.dataType}`
    if (dedupe.has(signature)) {
      fixes.push(`remove_duplicate_connection:${edge.id}`)
      return
    }
    dedupe.add(signature)

    const nextEdge = { ...edge }
    if (idSeen.has(nextEdge.id) || !nextEdge.id.trim()) {
      nextEdge.id = `${nextEdge.id || 'edge'}-${index + 1}`
      fixes.push(`edge_id:${nextEdge.source}->${nextEdge.target}`)
    }
    idSeen.add(nextEdge.id)
    normalized.push(nextEdge)
  })

  return { edges: normalized, fixes }
}

export function autoRepairWorkflow(workflow: Workflow) {
  const draft = JSON.parse(JSON.stringify(workflow)) as Workflow
  const appliedFixes: string[] = []

  draft.nodes = draft.nodes.map((node, index) => {
    const normalized = normalizeNode(node, index)
    appliedFixes.push(...normalized.fixes)
    return normalized.node
  })

  const nodeIds = new Set(draft.nodes.map((node) => node.id))
  const normalizedEdges = normalizeEdges(draft.edges, nodeIds)
  draft.edges = normalizedEdges.edges
  appliedFixes.push(...normalizedEdges.fixes)

  const hasManager = draft.nodes.some((node) => node.data.role === 'manager')
  const hasExecutable = draft.nodes.some((node) => node.data.role !== 'text')
  if (!hasManager && hasExecutable && draft.nodes.length > 0) {
    draft.nodes[0] = {
      ...draft.nodes[0],
      type: 'manager',
      data: {
        ...draft.nodes[0].data,
        role: 'manager',
        prompt: draft.nodes[0].data.prompt || createDefaultPrompt('manager'),
      },
    }
    appliedFixes.push(`promote_manager:${draft.nodes[0].id}`)
  }

  draft.updatedAt = new Date().toISOString()

  return {
    workflow: draft,
    appliedFixes,
  }
}
