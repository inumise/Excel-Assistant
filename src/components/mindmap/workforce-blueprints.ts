import { XYPosition } from 'reactflow'
import {
  MindMapEdge,
  MindMapMessageType,
  MindMapNode,
  NodeTemplateDefinition,
  NODE_TEMPLATES,
  createMindMapNode,
} from '@/components/mindmap/types'

type BlueprintId = 'lean-core' | 'growth-pod' | 'enterprise-grid'

interface BlueprintNodeSpec {
  key: string
  templateId: NodeTemplateDefinition['id']
  x: number
  y: number
  label: string
  workerType: string
  notes: string
  prompt?: string
  model?: string
  temperature?: number
  routing?: 'direct' | 'buffered' | 'storage'
  useMemoryVault?: boolean
  memoryScope?: 'session' | 'workflow' | 'global'
  code?: string
}

interface BlueprintEdgeSpec {
  from: string
  to: string
  messageType: MindMapMessageType
  channel?: string
}

interface BlueprintDefinition {
  id: BlueprintId
  title: string
  description: string
  nodes: BlueprintNodeSpec[]
  edges: BlueprintEdgeSpec[]
}

export interface WorkforceBlueprintSummary {
  id: BlueprintId
  title: string
  description: string
  nodeCount: number
}

const BLUEPRINTS: BlueprintDefinition[] = [
  {
    id: 'lean-core',
    title: 'Lean Core Team',
    description: 'Fast startup structure with manager + core departments.',
    nodes: [
      {
        key: 'manager',
        templateId: 'ai-box',
        x: 0,
        y: 0,
        label: 'Executive Manager',
        workerType: 'manager',
        notes: 'Routes work, tracks priorities, and resolves blockers.',
        prompt:
          'You are the executive manager. Split incoming work into concrete tasks and route to specialists with clear acceptance criteria.',
        model: 'gpt-4.1-mini',
        routing: 'direct',
        useMemoryVault: true,
        memoryScope: 'workflow',
      },
      {
        key: 'sales',
        templateId: 'ai-box',
        x: 270,
        y: -180,
        label: 'Sales Lead',
        workerType: 'sales',
        notes: 'Outbound messaging, qualification, and pipeline updates.',
        prompt:
          'Handle sales outreach and qualification. Return concise lead status updates and next actions.',
        model: 'gpt-4.1-mini',
      },
      {
        key: 'support',
        templateId: 'ai-box',
        x: 320,
        y: -35,
        label: 'Support Lead',
        workerType: 'support',
        notes: 'Customer responses and ticket triage.',
        prompt:
          'Resolve support requests with calm, clear messaging and route technical issues to operations.',
        model: 'gpt-4.1-mini',
      },
      {
        key: 'ops',
        templateId: 'ai-box',
        x: 300,
        y: 125,
        label: 'Operations Lead',
        workerType: 'operations',
        notes: 'Process control, delivery timing, and quality checks.',
        prompt:
          'Coordinate operations execution, monitor delays, and return process-level status.',
        model: 'gpt-4.1-mini',
        routing: 'buffered',
      },
      {
        key: 'finance',
        templateId: 'ai-box',
        x: 120,
        y: 220,
        label: 'Finance Analyst',
        workerType: 'finance',
        notes: 'Budget updates, spend tracking, and forecast summaries.',
        prompt: 'Track budget and produce clean, auditable financial snapshots.',
        model: 'gpt-4.1-mini',
      },
      {
        key: 'pr',
        templateId: 'ai-box',
        x: -90,
        y: 215,
        label: 'PR + Messaging',
        workerType: 'pr',
        notes: 'Public statements and campaign messaging.',
        prompt: 'Draft external communication in a confident and brand-safe tone.',
        model: 'gpt-4.1-mini',
      },
      {
        key: 'automation',
        templateId: 'function-box',
        x: 70,
        y: -170,
        label: 'Automation Function',
        workerType: 'function',
        notes: 'Reusable script logic for repetitive tasks.',
        code:
          'export function run(input: string) {\n  return `Automated action completed: ${input}`\n}\n',
      },
      {
        key: 'shared-store',
        templateId: 'storage',
        x: 510,
        y: 88,
        label: 'Shared Memory Store',
        workerType: 'storage',
        notes: 'Cross-team memory snapshots and summaries.',
      },
    ],
    edges: [
      { from: 'manager', to: 'sales', messageType: 'prompt' },
      { from: 'manager', to: 'support', messageType: 'prompt' },
      { from: 'manager', to: 'ops', messageType: 'context' },
      { from: 'manager', to: 'finance', messageType: 'memory' },
      { from: 'manager', to: 'pr', messageType: 'prompt' },
      { from: 'ops', to: 'shared-store', messageType: 'memory' },
      { from: 'sales', to: 'shared-store', messageType: 'event' },
      { from: 'support', to: 'shared-store', messageType: 'event' },
      { from: 'automation', to: 'ops', messageType: 'code' },
    ],
  },
  {
    id: 'growth-pod',
    title: 'Growth Pod',
    description: 'Lean core plus marketing, recruitment, and QA.',
    nodes: [
      {
        key: 'manager',
        templateId: 'ai-box',
        x: 0,
        y: 0,
        label: 'Growth Manager',
        workerType: 'manager',
        notes: 'Coordinates growth workstreams and hiring pipeline.',
        prompt:
          'Prioritize growth tasks across acquisition, retention, and hiring. Route tasks with clear KPIs.',
        model: 'gpt-4.1-mini',
        useMemoryVault: true,
        memoryScope: 'workflow',
      },
      {
        key: 'marketing',
        templateId: 'ai-box',
        x: 250,
        y: -170,
        label: 'Marketing Strategist',
        workerType: 'marketing',
        notes: 'Campaign planning and content scheduling.',
        prompt: 'Design measurable campaigns with channel-specific copy and KPI tracking.',
      },
      {
        key: 'sales',
        templateId: 'ai-box',
        x: 325,
        y: -35,
        label: 'Sales Strategist',
        workerType: 'sales',
        notes: 'Lead generation and conversion follow-up.',
        prompt: 'Convert qualified leads with targeted messaging and concise follow-up.',
      },
      {
        key: 'recruiting',
        templateId: 'ai-box',
        x: 270,
        y: 125,
        label: 'Recruiting Agent',
        workerType: 'recruiting',
        notes: 'Candidate pipeline and screening support.',
        prompt: 'Manage candidate pipeline and return short, decision-ready summaries.',
      },
      {
        key: 'qa',
        templateId: 'ai-box',
        x: 85,
        y: 230,
        label: 'QA Auditor',
        workerType: 'qa',
        notes: 'Checks quality of outputs from all growth lanes.',
        prompt: 'Audit output quality and return actionable fixes.',
        routing: 'buffered',
      },
      {
        key: 'finance',
        templateId: 'ai-box',
        x: -95,
        y: 205,
        label: 'Budget Controller',
        workerType: 'finance',
        notes: 'Budget checks for each campaign/hiring action.',
        prompt: 'Approve or reject spending requests based on ROI targets.',
      },
      {
        key: 'buffer',
        templateId: 'buffer',
        x: 500,
        y: 30,
        label: 'Approval Buffer',
        workerType: 'buffer',
        notes: 'Queues approvals before publication/deploy.',
      },
      {
        key: 'storage',
        templateId: 'storage',
        x: 640,
        y: 150,
        label: 'Growth Knowledge Store',
        workerType: 'storage',
        notes: 'Centralized campaign and hiring memory.',
      },
    ],
    edges: [
      { from: 'manager', to: 'marketing', messageType: 'prompt' },
      { from: 'manager', to: 'sales', messageType: 'prompt' },
      { from: 'manager', to: 'recruiting', messageType: 'context' },
      { from: 'marketing', to: 'qa', messageType: 'event' },
      { from: 'sales', to: 'qa', messageType: 'event' },
      { from: 'recruiting', to: 'qa', messageType: 'event' },
      { from: 'qa', to: 'buffer', messageType: 'context' },
      { from: 'buffer', to: 'storage', messageType: 'memory' },
      { from: 'finance', to: 'buffer', messageType: 'prompt' },
    ],
  },
  {
    id: 'enterprise-grid',
    title: 'Enterprise Grid',
    description: 'Larger orchestration grid for cross-department automation.',
    nodes: [
      {
        key: 'manager',
        templateId: 'ai-box',
        x: 0,
        y: 0,
        label: 'Enterprise Director',
        workerType: 'manager',
        notes: 'Top-level orchestration across all business lanes.',
        prompt:
          'Direct cross-functional execution with strict priorities, ownership, and measurable outcomes.',
        useMemoryVault: true,
        memoryScope: 'workflow',
      },
      {
        key: 'ops',
        templateId: 'ai-box',
        x: 260,
        y: -190,
        label: 'Operations Command',
        workerType: 'operations',
        notes: 'Delivery control + escalation.',
        prompt: 'Run operations command and flag blockers instantly.',
      },
      {
        key: 'sales',
        templateId: 'ai-box',
        x: 350,
        y: -60,
        label: 'Revenue Command',
        workerType: 'sales',
        notes: 'Pipeline and closing workflow.',
        prompt: 'Drive revenue with pipeline discipline and conversion summaries.',
      },
      {
        key: 'pr',
        templateId: 'ai-box',
        x: 340,
        y: 80,
        label: 'Public Communications',
        workerType: 'pr',
        notes: 'External messaging and incident communication.',
        prompt: 'Maintain clear public communication aligned with policy and risk controls.',
      },
      {
        key: 'finance',
        templateId: 'ai-box',
        x: 230,
        y: 210,
        label: 'Finance Control',
        workerType: 'finance',
        notes: 'Forecasting and governance controls.',
        prompt: 'Issue budget and risk decisions with executive-level clarity.',
      },
      {
        key: 'hr',
        templateId: 'ai-box',
        x: 40,
        y: 250,
        label: 'HR + Talent',
        workerType: 'hr',
        notes: 'Staffing and capability planning.',
        prompt: 'Manage hiring and capability planning based on workload projections.',
      },
      {
        key: 'dev',
        templateId: 'function-box',
        x: 90,
        y: -220,
        label: 'Automation Runtime',
        workerType: 'function',
        notes: 'Enterprise automation logic.',
        code:
          'export function run(input: string) {\n  return `Enterprise workflow executed for: ${input}`\n}\n',
      },
      {
        key: 'buffer',
        templateId: 'buffer',
        x: 510,
        y: -10,
        label: 'Command Buffer',
        workerType: 'buffer',
        notes: 'Rate-limits and queues command propagation.',
      },
      {
        key: 'storage',
        templateId: 'storage',
        x: 680,
        y: 120,
        label: 'Enterprise Memory Hub',
        workerType: 'storage',
        notes: 'Long-running cross-department memory.',
      },
    ],
    edges: [
      { from: 'manager', to: 'ops', messageType: 'prompt' },
      { from: 'manager', to: 'sales', messageType: 'prompt' },
      { from: 'manager', to: 'pr', messageType: 'context' },
      { from: 'manager', to: 'finance', messageType: 'memory' },
      { from: 'manager', to: 'hr', messageType: 'prompt' },
      { from: 'dev', to: 'ops', messageType: 'code' },
      { from: 'ops', to: 'buffer', messageType: 'event' },
      { from: 'sales', to: 'buffer', messageType: 'event' },
      { from: 'pr', to: 'buffer', messageType: 'context' },
      { from: 'buffer', to: 'storage', messageType: 'memory' },
      { from: 'finance', to: 'storage', messageType: 'memory' },
    ],
  },
]

function getTemplate(templateId: NodeTemplateDefinition['id']) {
  return NODE_TEMPLATES.find((item) => item.id === templateId) || NODE_TEMPLATES[0]
}

export function listWorkforceBlueprints(): WorkforceBlueprintSummary[] {
  return BLUEPRINTS.map((blueprint) => ({
    id: blueprint.id,
    title: blueprint.title,
    description: blueprint.description,
    nodeCount: blueprint.nodes.length,
  }))
}

export function buildWorkforceBlueprint(params: { blueprintId: BlueprintId; origin: XYPosition }) {
  const blueprint = BLUEPRINTS.find((item) => item.id === params.blueprintId) || BLUEPRINTS[0]
  const nodeByKey = new Map<string, MindMapNode>()

  for (const spec of blueprint.nodes) {
    const template = getTemplate(spec.templateId)
    const node = createMindMapNode(template, {
      x: params.origin.x + spec.x,
      y: params.origin.y + spec.y,
    })

    node.data.label = spec.label
    node.data.workerType = spec.workerType
    node.data.notes = spec.notes
    node.data.prompt = spec.prompt || ''
    node.data.aiConfig = {
      ...(node.data.aiConfig || {}),
      systemPrompt: spec.prompt || '',
      model: spec.model || node.data.aiConfig?.model || '',
      temperature: spec.temperature,
      routing: spec.routing,
      useMemoryVault: spec.useMemoryVault,
      memoryScope: spec.memoryScope,
      code: spec.code || node.data.aiConfig?.code || '',
    }
    if (spec.code) {
      node.data.codeSnippet = {
        language: 'typescript',
        content: spec.code,
      }
    }
    nodeByKey.set(spec.key, node)
  }

  const edges: MindMapEdge[] = blueprint.edges
    .map((edgeSpec) => {
      const sourceNode = nodeByKey.get(edgeSpec.from)
      const targetNode = nodeByKey.get(edgeSpec.to)
      if (!sourceNode || !targetNode) return null
      return {
        id: `edge-${sourceNode.id}-${targetNode.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        type: 'default',
        label: edgeSpec.messageType,
        animated: false,
        data: {
          messageType: edgeSpec.messageType,
          channel: edgeSpec.channel || 'default',
        },
      } satisfies MindMapEdge
    })
    .filter((edge): edge is MindMapEdge => Boolean(edge))

  return {
    blueprint,
    nodes: Array.from(nodeByKey.values()),
    edges,
  }
}
