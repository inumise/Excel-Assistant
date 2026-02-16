import { XYPosition } from 'reactflow'
import { MindMapEdge, MindMapNode, NODE_TEMPLATES, createMindMapNode } from '@/components/mindmap/types'

export type CompanyScale = 'startup' | 'growth' | 'enterprise'
export type CompanyFocus = 'balanced' | 'revenue' | 'operations' | 'innovation'

export interface CompanyComposerInput {
  objective: string
  scale: CompanyScale
  focus: CompanyFocus
  includeFunctionRuntime: boolean
  includeCompliance: boolean
}

export interface CompanyCompositionResult {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  summary: string
}

interface RoleSpec {
  key: string
  templateId: string
  label: string
  workerType: string
  notes: string
  prompt: string
  model: string
  routing?: 'direct' | 'buffered' | 'storage'
  useMemoryVault?: boolean
  memoryScope?: 'session' | 'workflow' | 'global'
  angle: number
  radius: number
}

function pickTemplate(templateId: string) {
  return NODE_TEMPLATES.find((item) => item.id === templateId) || NODE_TEMPLATES[0]
}

function composeRoles(input: CompanyComposerInput): RoleSpec[] {
  const objective = input.objective.trim() || 'Build a resilient automated company.'

  const baseRoles: RoleSpec[] = [
    {
      key: 'director',
      templateId: 'ai-box',
      label: 'AI Director',
      workerType: 'manager',
      notes: 'Top-level planner and routing manager.',
      prompt: `You are the AI Director. Objective: ${objective}. Break work into clear tasks and assign to the right units with measurable outcomes.`,
      model: 'gpt-4.1-mini',
      routing: 'direct',
      useMemoryVault: true,
      memoryScope: 'workflow',
      angle: -140,
      radius: 0,
    },
    {
      key: 'sales',
      templateId: 'ai-box',
      label: 'Revenue Unit',
      workerType: 'sales',
      notes: 'Pipeline, offers, and conversion operations.',
      prompt: `Drive revenue execution for: ${objective}. Return concise lead, conversion, and next-step actions.`,
      model: 'gpt-4.1-mini',
      routing: input.focus === 'revenue' ? 'buffered' : 'direct',
      useMemoryVault: true,
      memoryScope: 'workflow',
      angle: -40,
      radius: 320,
    },
    {
      key: 'operations',
      templateId: 'ai-box',
      label: 'Operations Unit',
      workerType: 'operations',
      notes: 'Delivery flow, process reliability, and escalation handling.',
      prompt: `Manage operational flow for: ${objective}. Detect blockers early and return execution status updates.`,
      model: 'gpt-4.1-mini',
      routing: input.focus === 'operations' ? 'buffered' : 'direct',
      useMemoryVault: true,
      memoryScope: 'workflow',
      angle: 30,
      radius: 320,
    },
    {
      key: 'finance',
      templateId: 'ai-box',
      label: 'Finance Unit',
      workerType: 'finance',
      notes: 'Budget control, ROI checks, and forecast snapshots.',
      prompt: `Control budgets and ROI for: ${objective}. Return explicit approve/reject recommendations.`,
      model: 'gpt-4.1-mini',
      routing: 'storage',
      useMemoryVault: true,
      memoryScope: 'workflow',
      angle: 95,
      radius: 290,
    },
    {
      key: 'support',
      templateId: 'ai-box',
      label: 'Customer Unit',
      workerType: 'support',
      notes: 'Customer communication, issue triage, and retention.',
      prompt: `Handle customer interactions for: ${objective}. Be concise, calm, and action-oriented.`,
      model: 'gpt-4.1-mini',
      routing: 'direct',
      useMemoryVault: true,
      memoryScope: 'workflow',
      angle: 160,
      radius: 260,
    },
    {
      key: 'memory-hub',
      templateId: 'storage',
      label: 'Memory Hub',
      workerType: 'storage',
      notes: 'Shared memory and reporting snapshots.',
      prompt: '',
      model: 'gpt-4.1-mini',
      angle: 72,
      radius: 520,
    },
    {
      key: 'routing-buffer',
      templateId: 'buffer',
      label: 'Routing Buffer',
      workerType: 'buffer',
      notes: 'Queue for staged routing and anti-overload handling.',
      prompt: '',
      model: 'gpt-4.1-mini',
      angle: -10,
      radius: 510,
    },
  ]

  const growthRoles: RoleSpec[] = [
    {
      key: 'marketing',
      templateId: 'ai-box',
      label: 'Marketing Unit',
      workerType: 'marketing',
      notes: 'Campaign design, positioning, and growth messaging.',
      prompt: `Build and optimize campaigns for: ${objective}. Output KPI-ready campaign plans.`,
      model: 'gpt-4.1-mini',
      routing: input.focus === 'revenue' ? 'buffered' : 'direct',
      useMemoryVault: true,
      memoryScope: 'workflow',
      angle: -82,
      radius: 360,
    },
    {
      key: 'talent',
      templateId: 'ai-box',
      label: 'Talent Unit',
      workerType: 'hr',
      notes: 'Recruiting, capacity planning, and staffing.',
      prompt: `Plan hiring and staffing for: ${objective}. Return concise staffing actions.`,
      model: 'gpt-4.1-mini',
      routing: 'direct',
      useMemoryVault: true,
      memoryScope: 'workflow',
      angle: 128,
      radius: 365,
    },
  ]

  const enterpriseRoles: RoleSpec[] = [
    {
      key: 'legal',
      templateId: 'ai-box',
      label: 'Legal Unit',
      workerType: 'legal',
      notes: 'Contract review and policy compliance guardrails.',
      prompt: `Review legal/compliance implications for: ${objective}. Return risks and mandatory controls.`,
      model: 'gpt-4.1-mini',
      routing: 'storage',
      useMemoryVault: true,
      memoryScope: 'workflow',
      angle: 210,
      radius: 410,
    },
    {
      key: 'quality',
      templateId: 'ai-box',
      label: 'Quality Unit',
      workerType: 'qa',
      notes: 'Cross-team quality assurance and outcome auditing.',
      prompt: `Audit all outputs for: ${objective}. Return strict issue lists and remediations.`,
      model: 'gpt-4.1-mini',
      routing: 'buffered',
      useMemoryVault: true,
      memoryScope: 'workflow',
      angle: 10,
      radius: 430,
    },
  ]

  const roleSet = [...baseRoles]
  if (input.scale !== 'startup') roleSet.push(...growthRoles)
  if (input.scale === 'enterprise') roleSet.push(...enterpriseRoles)
  if (input.includeCompliance && input.scale !== 'enterprise') {
    roleSet.push({
      key: 'compliance',
      templateId: 'ai-box',
      label: 'Compliance Unit',
      workerType: 'compliance',
      notes: 'Policy checks and audit-safe governance tracking.',
      prompt: `Check governance and policy alignment for: ${objective}.`,
      model: 'gpt-4.1-mini',
      routing: 'storage',
      useMemoryVault: true,
      memoryScope: 'workflow',
      angle: 200,
      radius: 340,
    })
  }
  if (input.includeFunctionRuntime) {
    roleSet.push({
      key: 'runtime',
      templateId: 'function-box',
      label: 'Automation Runtime',
      workerType: 'function',
      notes: 'Executable function layer for deterministic automations.',
      prompt: '',
      model: 'gpt-4.1-mini',
      angle: -165,
      radius: 300,
    })
  }

  return roleSet
}

function polarToPosition(origin: XYPosition, radius: number, angleDegrees: number) {
  const radians = (angleDegrees * Math.PI) / 180
  return {
    x: origin.x + Math.cos(radians) * radius,
    y: origin.y + Math.sin(radians) * radius,
  }
}

export function composeCompanyGraph(params: {
  input: CompanyComposerInput
  origin: XYPosition
}): CompanyCompositionResult {
  const roles = composeRoles(params.input)
  const roleNodeId = new Map<string, string>()

  const nodes = roles.map((role) => {
    const template = pickTemplate(role.templateId)
    const position = polarToPosition(params.origin, role.radius, role.angle)
    const node = createMindMapNode(template, position)
    node.data.label = role.label
    node.data.workerType = role.workerType
    node.data.notes = role.notes
    node.data.prompt = role.prompt
    if (role.workerType === 'manager') node.data.role = 'manager'
    if (role.templateId === 'function-box') node.data.role = 'code'
    if (role.templateId === 'storage') node.data.role = 'storage'
    if (role.templateId === 'buffer') node.data.role = 'buffer'
    node.data.aiConfig = {
      ...(node.data.aiConfig || {}),
      systemPrompt: role.prompt,
      model: role.model,
      routing: role.routing,
      useMemoryVault: role.useMemoryVault,
      memoryScope: role.memoryScope,
    }
    if (role.templateId === 'function-box') {
      const functionCode = `export function run(input: string) {\n  return {\n    ok: true,\n    objective: ${JSON.stringify(params.input.objective || 'automation')},\n    output: input,\n  }\n}\n`
      node.data.aiConfig.code = functionCode
      node.data.codeSnippet = {
        language: 'typescript',
        content: functionCode,
      }
    }
    roleNodeId.set(role.key, node.id)
    return node
  })

  const directorId = roleNodeId.get('director') || nodes[0]?.id
  const bufferId = roleNodeId.get('routing-buffer')
  const storageId = roleNodeId.get('memory-hub')
  const runtimeId = roleNodeId.get('runtime')

  const edges: MindMapEdge[] = []
  nodes.forEach((node) => {
    if (!directorId || node.id === directorId) return
    const workerType = node.data.workerType || ''
    if (workerType === 'storage' || workerType === 'buffer') return
    edges.push({
      id: `edge-${directorId}-${node.id}`,
      source: directorId,
      target: node.id,
      type: 'default',
      animated: false,
      label: 'prompt',
      data: { messageType: 'prompt', channel: 'management' },
    })
  })

  nodes.forEach((node) => {
    if (!bufferId || node.id === bufferId) return
    const workerType = node.data.workerType || ''
    if (workerType === 'storage' || workerType === 'buffer') return
    edges.push({
      id: `edge-${node.id}-${bufferId}`,
      source: node.id,
      target: bufferId,
      type: 'default',
      animated: false,
      label: 'event',
      data: { messageType: 'event', channel: 'status' },
    })
  })

  if (bufferId && storageId) {
    edges.push({
      id: `edge-${bufferId}-${storageId}`,
      source: bufferId,
      target: storageId,
      type: 'default',
      animated: false,
      label: 'memory',
      data: { messageType: 'memory', channel: 'shared-memory' },
    })
  }

  if (storageId && directorId) {
    edges.push({
      id: `edge-${storageId}-${directorId}`,
      source: storageId,
      target: directorId,
      type: 'default',
      animated: false,
      label: 'context',
      data: { messageType: 'context', channel: 'executive-report' },
    })
  }

  if (runtimeId && directorId) {
    edges.push({
      id: `edge-${runtimeId}-${directorId}`,
      source: runtimeId,
      target: directorId,
      type: 'default',
      animated: false,
      label: 'code',
      data: { messageType: 'code', channel: 'automation' },
    })
  }

  const summary = `Generated ${nodes.length} units and ${edges.length} routed connections for ${params.input.scale} scale (${params.input.focus} focus).`
  return { nodes, edges, summary }
}

export function previewCompositionSize(input: CompanyComposerInput) {
  const roles = composeRoles(input)
  return {
    nodes: roles.length,
    aiNodes: roles.filter((role) => role.templateId === 'ai-box' || role.templateId === 'function-box').length,
  }
}
