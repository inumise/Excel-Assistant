import crypto from 'node:crypto'
import { Workflow, WorkflowNode } from '@/types/workflow'

export interface OwnerTemplateDefinition {
  id: string
  name: string
  description: string
  size: 'small' | 'medium' | 'large'
  departments: string[]
  create: (userId: string) => Workflow
}

function tsNow() {
  return new Date().toISOString()
}

function createNode(params: {
  id: string
  type: WorkflowNode['type']
  x: number
  y: number
  label: string
  prompt: string
  workerType: string
}) {
  return {
    id: params.id,
    type: params.type,
    position: { x: params.x, y: params.y },
    data: {
      label: params.label,
      role: params.type === 'group' ? 'manager' : params.type,
      workerType: params.workerType,
      prompt: params.prompt,
      capabilities: [],
      errorHandler: { retryCount: 2, notifyWhatsapp: true },
      errorCheckEnabled: true,
      monitoring: 'none',
      ...(params.type === 'code'
        ? {
            codeSnippet: {
              language: 'typescript' as const,
              content: 'export const runTask = () => "template task";\n',
            },
          }
        : {}),
    },
  } satisfies WorkflowNode
}

function createWorkflowBase(userId: string, name: string, description: string): Workflow {
  const now = tsNow()
  return {
    id: `workflow-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID().slice(0, 8)}`,
    userId,
    name,
    description,
    nodes: [],
    edges: [],
    createdAt: now,
    updatedAt: now,
  }
}

function buildCorporateStructure(userId: string) {
  const workflow = createWorkflowBase(
    userId,
    'Corporate HQ Structure',
    'CEO-led structure for finance, HR, sales, support, and legal operations.'
  )

  workflow.nodes = [
    createNode({
      id: 'ceo',
      type: 'manager',
      x: 0,
      y: 0,
      label: 'CEO Manager AI',
      workerType: 'Executive Manager',
      prompt: 'Coordinate all departments, review priorities, and approve escalations.',
    }),
    createNode({
      id: 'finance',
      type: 'manager',
      x: 320,
      y: -180,
      label: 'Finance Manager',
      workerType: 'Finance Controller',
      prompt: 'Own cashflow, forecast, and reporting workflow.',
    }),
    createNode({
      id: 'hr',
      type: 'programmer',
      x: 320,
      y: -40,
      label: 'HR Recruiter',
      workerType: 'HR Operations',
      prompt: 'Manage hiring pipeline and onboarding stages.',
    }),
    createNode({
      id: 'sales',
      type: 'programmer',
      x: 320,
      y: 100,
      label: 'Sales Strategist',
      workerType: 'Revenue Team',
      prompt: 'Build outreach cadences and conversion plans.',
    }),
    createNode({
      id: 'support',
      type: 'programmer',
      x: 320,
      y: 240,
      label: 'Support Desk',
      workerType: 'Customer Success',
      prompt: 'Handle tickets and SLA communication.',
    }),
    createNode({
      id: 'ops-code',
      type: 'code',
      x: 640,
      y: 60,
      label: 'Shared Operations Code',
      workerType: 'Automation Function',
      prompt: 'Automate recurring tasks for all departments.',
    }),
  ]

  workflow.edges = [
    { id: 'e-ceo-finance', source: 'ceo', target: 'finance', dataType: 'ai', label: 'delegate' },
    { id: 'e-ceo-hr', source: 'ceo', target: 'hr', dataType: 'ai', label: 'delegate' },
    { id: 'e-ceo-sales', source: 'ceo', target: 'sales', dataType: 'ai', label: 'delegate' },
    { id: 'e-ceo-support', source: 'ceo', target: 'support', dataType: 'ai', label: 'delegate' },
    { id: 'e-finance-code', source: 'finance', target: 'ops-code', dataType: 'code', label: 'automation' },
    { id: 'e-sales-code', source: 'sales', target: 'ops-code', dataType: 'code', label: 'automation' },
    { id: 'e-support-code', source: 'support', target: 'ops-code', dataType: 'api', label: 'service API' },
  ]

  return workflow
}

function buildGrowthStructure(userId: string) {
  const workflow = createWorkflowBase(
    userId,
    'Growth Engine',
    'Growth-focused org for marketing, product messaging, and conversion optimization.'
  )

  workflow.nodes = [
    createNode({
      id: 'gm',
      type: 'manager',
      x: 0,
      y: 0,
      label: 'Growth Manager',
      workerType: 'Growth Lead',
      prompt: 'Align channels, budget, and experiments toward growth targets.',
    }),
    createNode({
      id: 'pr',
      type: 'programmer',
      x: 300,
      y: -120,
      label: 'PR Writer Agent',
      workerType: 'PR + Messaging',
      prompt: 'Generate channel-ready messaging and announcements.',
    }),
    createNode({
      id: 'marketing',
      type: 'programmer',
      x: 300,
      y: 20,
      label: 'Marketing Analyst',
      workerType: 'Campaign Ops',
      prompt: 'Plan and score campaign performance.',
    }),
    createNode({
      id: 'design',
      type: 'programmer',
      x: 300,
      y: 160,
      label: 'Brand Designer',
      workerType: 'Creative Studio',
      prompt: 'Create visual direction and campaign assets.',
    }),
    createNode({
      id: 'growth-code',
      type: 'code',
      x: 620,
      y: 20,
      label: 'A/B Automation Code',
      workerType: 'Growth Automation',
      prompt: 'Run and evaluate conversion experiments.',
    }),
  ]

  workflow.edges = [
    { id: 'e-gm-pr', source: 'gm', target: 'pr', dataType: 'ai', label: 'brief' },
    { id: 'e-gm-marketing', source: 'gm', target: 'marketing', dataType: 'ai', label: 'targets' },
    { id: 'e-gm-design', source: 'gm', target: 'design', dataType: 'ai', label: 'creative direction' },
    { id: 'e-marketing-code', source: 'marketing', target: 'growth-code', dataType: 'code', label: 'analysis' },
    { id: 'e-pr-code', source: 'pr', target: 'growth-code', dataType: 'api', label: 'distribution' },
  ]

  return workflow
}

function buildOperationsStructure(userId: string) {
  const workflow = createWorkflowBase(
    userId,
    'Operations Command Center',
    'Reliability-oriented structure for security, QA, devops, and support.'
  )

  workflow.nodes = [
    createNode({
      id: 'ops-manager',
      type: 'manager',
      x: 0,
      y: 0,
      label: 'Operations Director',
      workerType: 'Ops Manager',
      prompt: 'Coordinate reliability and incident response.',
    }),
    createNode({
      id: 'devops',
      type: 'code',
      x: 320,
      y: -140,
      label: 'DevOps Engineer',
      workerType: 'Platform Ops',
      prompt: 'Automate deployments and rollback actions.',
    }),
    createNode({
      id: 'qa',
      type: 'code',
      x: 320,
      y: 0,
      label: 'QA Tester',
      workerType: 'Quality Gate',
      prompt: 'Run release checks and regression coverage.',
    }),
    createNode({
      id: 'security',
      type: 'manager',
      x: 320,
      y: 140,
      label: 'Security Monitor',
      workerType: 'Security Office',
      prompt: 'Handle risk posture and remediation plans.',
    }),
    createNode({
      id: 'support',
      type: 'programmer',
      x: 620,
      y: 0,
      label: 'Support Coordinator',
      workerType: 'Support Ops',
      prompt: 'Communicate incidents and status updates to customers.',
    }),
  ]

  workflow.edges = [
    { id: 'e-ops-devops', source: 'ops-manager', target: 'devops', dataType: 'ai', label: 'runbook' },
    { id: 'e-ops-qa', source: 'ops-manager', target: 'qa', dataType: 'ai', label: 'quality gates' },
    { id: 'e-ops-security', source: 'ops-manager', target: 'security', dataType: 'ai', label: 'security posture' },
    { id: 'e-devops-support', source: 'devops', target: 'support', dataType: 'api', label: 'deployment status' },
    { id: 'e-security-support', source: 'security', target: 'support', dataType: 'ai', label: 'incident brief' },
    { id: 'e-qa-support', source: 'qa', target: 'support', dataType: 'code', label: 'release notes' },
  ]

  return workflow
}

export const ownerTemplates: OwnerTemplateDefinition[] = [
  {
    id: 'corporate-hq',
    name: 'Corporate HQ Structure',
    description: 'Balanced cross-department employee AI structure for company owners.',
    size: 'large',
    departments: ['finance', 'hr', 'sales', 'support', 'operations'],
    create: buildCorporateStructure,
  },
  {
    id: 'growth-engine',
    name: 'Growth Engine',
    description: 'Marketing and messaging structure optimized for revenue expansion.',
    size: 'medium',
    departments: ['growth', 'marketing', 'design', 'pr'],
    create: buildGrowthStructure,
  },
  {
    id: 'operations-command',
    name: 'Operations Command Center',
    description: 'Reliability-first structure for large multi-team technical operations.',
    size: 'medium',
    departments: ['ops', 'qa', 'devops', 'security', 'support'],
    create: buildOperationsStructure,
  },
]
