'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  Handle,
  MiniMap,
  Node,
  NodeChange,
  NodeProps,
  Position,
  ReactFlowInstance,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Calculator,
  Code2,
  Database,
  Eraser,
  FileSpreadsheet,
  Handshake,
  Headset,
  KanbanSquare,
  Loader2,
  MessageSquare,
  Megaphone,
  MousePointer2,
  Palette,
  PanelsTopLeft,
  Pencil,
  PlusCircle,
  Settings2,
  Save,
  Scale,
  Send,
  ServerCog,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  TestTube2,
  UserRoundPlus,
  Type,
  Workflow as WorkflowIcon,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CodeBlock } from '@/components/Node/CodeBlock'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import {
  calculateMindMapLayout,
  getDescendantIds,
  inferMindMapRoot,
} from '@/lib/mind-map-layout'
import {
  EdgeDataType,
  MemoryRecord,
  NodeRole,
  UserAISettings,
  Workflow,
  WorkflowCommunicationEvent,
  WorkflowEdge,
  WorkflowNodeData,
  WorkflowTextStyle,
} from '@/types/workflow'

interface FlowNodeData extends WorkflowNodeData {
  userId: string
  workflowId: string
  onPatchNode: (nodeId: string, patch: Partial<WorkflowNodeData>) => void
}

interface LibraryItem {
  id: string
  label: string
  category: 'worker' | 'tool' | 'function'
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  role: NodeRole
  edgeType: EdgeDataType
  defaultPrompt: string
  defaultCapabilities: string[]
}

interface RunWorkflowResponse {
  output?: string
  message?: string
  communications?: WorkflowCommunicationEvent[]
  validation?: WorkflowValidationReport
  autoRepaired?: boolean
  appliedFixes?: string[]
}

type ValidationSeverity = 'error' | 'warning' | 'info'

interface WorkflowValidationIssue {
  code: string
  severity: ValidationSeverity
  message: string
  nodeId?: string
  edgeId?: string
  fixable?: boolean
}

interface WorkflowValidationReport {
  score: number
  safeToRun: boolean
  summary: {
    errors: number
    warnings: number
    infos: number
  }
  issues: WorkflowValidationIssue[]
  generatedAt: string
}

type HealthStatus = 'ok' | 'warning' | 'error'

interface SystemHealthCheck {
  id: string
  label: string
  status: HealthStatus
  detail: string
}

interface SystemHealthResponse {
  success: boolean
  status: 'healthy' | 'degraded' | 'critical'
  checks: SystemHealthCheck[]
  generatedAt: string
}

type OwnerPanelMode = 'prompts' | 'todo' | 'output' | 'inspect'
type LayoutPreset = 'focus' | 'balanced' | 'wide'

interface SettingsResponse {
  settings?: UserAISettings
}

type CanvasTool = 'select' | 'text' | 'pencil' | 'eraser'

interface DrawingPoint {
  x: number
  y: number
}

interface DrawingStroke {
  id: string
  color: string
  width: number
  points: DrawingPoint[]
}

const edgePalette: Record<EdgeDataType, string> = {
  api: '#2563EB',
  code: '#059669',
  ai: '#7C3AED',
  prompt: '#7C3AED',
  context: '#EA580C',
  event: '#0F766E',
  memory: '#1D4ED8',
}

const textFontOptions = [
  'Inter',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
]

const defaultTextStyle: WorkflowTextStyle = {
  fontFamily: 'Inter',
  fontSize: 20,
  fontWeight: '600',
  italic: false,
  underline: false,
  uppercase: false,
  align: 'left',
  color: '#0F172A',
  backgroundColor: 'transparent',
  letterSpacing: 0,
  lineHeight: 1.3,
  shadow: false,
}

const inHandleClass = '!bg-[#0F172A] !h-3 !w-3 !border-2 !border-white'
const outHandleClass = '!bg-[#DC2626] !h-3 !w-3 !border-2 !border-white'

const libraryItems: LibraryItem[] = [
  {
    id: 'manager-core',
    label: 'Manager AI',
    category: 'worker',
    description: 'CEO-level orchestrator for departments and escalation trees.',
    icon: BriefcaseBusiness,
    accent: '#F59E0B',
    role: 'manager',
    edgeType: 'ai',
    defaultPrompt: 'Coordinate all specialist workers and track strategic goals.',
    defaultCapabilities: ['planning', 'delegation', 'escalation'],
  },
  {
    id: 'excel-assistant',
    label: 'Excel Assistant',
    category: 'worker',
    description: 'Builds reports, formulas, pivots, reconciliations, and board sheets.',
    icon: FileSpreadsheet,
    accent: '#2563EB',
    role: 'code',
    edgeType: 'api',
    defaultPrompt: 'Automate spreadsheet operations and executive dashboards.',
    defaultCapabilities: ['formulas', 'pivots', 'reporting'],
  },
  {
    id: 'pr-writer',
    label: 'PR Writer Agent',
    category: 'worker',
    description: 'Drafts messages, outreach, announcements, and media statements.',
    icon: Megaphone,
    accent: '#A855F7',
    role: 'programmer',
    edgeType: 'ai',
    defaultPrompt: 'Create channel-specific messaging with tone controls.',
    defaultCapabilities: ['copywriting', 'outreach', 'brand voice'],
  },
  {
    id: 'accountant',
    label: 'Accountant Agent',
    category: 'worker',
    description: 'Handles P&L, forecast, budget variance, and reconciliations.',
    icon: Calculator,
    accent: '#059669',
    role: 'code',
    edgeType: 'api',
    defaultPrompt: 'Generate monthly financial packages and variance summaries.',
    defaultCapabilities: ['forecast', 'reconciliation', 'budgeting'],
  },
  {
    id: 'sales',
    label: 'Sales Strategist',
    category: 'worker',
    description: 'Improves conversion, outreach cadences, and CRM actions.',
    icon: Handshake,
    accent: '#EAB308',
    role: 'programmer',
    edgeType: 'ai',
    defaultPrompt: 'Design winning outreach flows and qualification scripts.',
    defaultCapabilities: ['crm', 'outbound', 'follow-up'],
  },
  {
    id: 'hr',
    label: 'HR Recruiter',
    category: 'worker',
    description: 'Runs hiring pipeline, scorecards, and onboarding checklists.',
    icon: UserRoundPlus,
    accent: '#F97316',
    role: 'programmer',
    edgeType: 'ai',
    defaultPrompt: 'Screen candidates and manage interview operations.',
    defaultCapabilities: ['screening', 'onboarding', 'interviewing'],
  },
  {
    id: 'legal',
    label: 'Legal Compliance',
    category: 'worker',
    description: 'Tracks contracts, policy obligations, and risk controls.',
    icon: Scale,
    accent: '#EF4444',
    role: 'manager',
    edgeType: 'api',
    defaultPrompt: 'Maintain compliance posture and legal readiness.',
    defaultCapabilities: ['contracts', 'policy', 'risk'],
  },
  {
    id: 'support',
    label: 'Support Agent',
    category: 'worker',
    description: 'Handles inbound requests, SLA routing, and customer updates.',
    icon: Headset,
    accent: '#0EA5E9',
    role: 'programmer',
    edgeType: 'ai',
    defaultPrompt: 'Triages support tickets and drafts responses.',
    defaultCapabilities: ['triage', 'sla', 'knowledge base'],
  },
  {
    id: 'marketing',
    label: 'Marketing Analyst',
    category: 'worker',
    description: 'Builds campaign plans, calendars, and KPI analysis.',
    icon: BarChart3,
    accent: '#EC4899',
    role: 'programmer',
    edgeType: 'ai',
    defaultPrompt: 'Design growth experiments and report channel metrics.',
    defaultCapabilities: ['campaigns', 'analytics', 'content'],
  },
  {
    id: 'security',
    label: 'Security Monitor',
    category: 'worker',
    description: 'Monitors incidents, controls, and vulnerability posture.',
    icon: ShieldCheck,
    accent: '#10B981',
    role: 'manager',
    edgeType: 'api',
    defaultPrompt: 'Track security events and enforce remediation workflows.',
    defaultCapabilities: ['security', 'alerts', 'audit'],
  },
  {
    id: 'devops',
    label: 'DevOps Engineer',
    category: 'worker',
    description: 'Manages CI/CD pipelines, infra health, and releases.',
    icon: ServerCog,
    accent: '#6366F1',
    role: 'code',
    edgeType: 'code',
    defaultPrompt: 'Automate deployment, rollback, and platform reliability.',
    defaultCapabilities: ['ci/cd', 'infra', 'observability'],
  },
  {
    id: 'qa',
    label: 'QA Tester',
    category: 'worker',
    description: 'Builds regression tests, acceptance tests, and release checks.',
    icon: TestTube2,
    accent: '#14B8A6',
    role: 'code',
    edgeType: 'code',
    defaultPrompt: 'Execute automated and exploratory validation plans.',
    defaultCapabilities: ['testing', 'validation', 'quality gate'],
  },
  {
    id: 'designer',
    label: 'Brand Designer',
    category: 'worker',
    description: 'Creates design systems, assets, and visual direction.',
    icon: Palette,
    accent: '#8B5CF6',
    role: 'programmer',
    edgeType: 'ai',
    defaultPrompt: 'Produce premium visual output and design specs.',
    defaultCapabilities: ['design system', 'assets', 'ui/ux'],
  },
  {
    id: 'finance-controller',
    label: 'Finance Controller',
    category: 'worker',
    description: 'Tracks runway, cashflow, and spend governance.',
    icon: BadgeDollarSign,
    accent: '#16A34A',
    role: 'manager',
    edgeType: 'api',
    defaultPrompt: 'Oversee spend controls and forecast runway shifts.',
    defaultCapabilities: ['cashflow', 'governance', 'runway'],
  },
  {
    id: 'procurement',
    label: 'Procurement Agent',
    category: 'worker',
    description: 'Compares vendors, RFQs, and supply decisions.',
    icon: ShoppingCart,
    accent: '#FB7185',
    role: 'code',
    edgeType: 'api',
    defaultPrompt: 'Optimize purchasing with vendor score comparisons.',
    defaultCapabilities: ['vendor scoring', 'rfq', 'purchasing'],
  },
  {
    id: 'browser-automation',
    label: 'Browser Automation Tool',
    category: 'tool',
    description: 'Performs agentic web actions and multi-step UI tasks.',
    icon: WorkflowIcon,
    accent: '#2563EB',
    role: 'code',
    edgeType: 'code',
    defaultPrompt: 'Run browser-based workflows and scripted operations.',
    defaultCapabilities: ['web actions', 'playwright', 'rpa'],
  },
  {
    id: 'text-label',
    label: 'Text Label',
    category: 'tool',
    description: 'Styled text block for notes, headings, and design annotations.',
    icon: Type,
    accent: '#0F172A',
    role: 'text',
    edgeType: 'ai',
    defaultPrompt: '',
    defaultCapabilities: ['annotation', 'heading', 'notes'],
  },
  {
    id: 'buffer-queue',
    label: 'Buffer Queue Block',
    category: 'tool',
    description: 'Holds prompts/messages until output target is ready.',
    icon: KanbanSquare,
    accent: '#B45309',
    role: 'buffer',
    edgeType: 'ai',
    defaultPrompt: '',
    defaultCapabilities: ['queue', 'wait', 'release-control'],
  },
  {
    id: 'storage-database',
    label: 'Storage: Database',
    category: 'tool',
    description: 'Shared structured storage for many AI workers.',
    icon: Database,
    accent: '#0F766E',
    role: 'storage',
    edgeType: 'api',
    defaultPrompt: '',
    defaultCapabilities: ['shared memory', 'json', 'multi-reader'],
  },
  {
    id: 'storage-text',
    label: 'Storage: Text Vault',
    category: 'tool',
    description: 'Shared plain-text storage for writing and reading context.',
    icon: Database,
    accent: '#0EA5E9',
    role: 'storage',
    edgeType: 'ai',
    defaultPrompt: '',
    defaultCapabilities: ['notes', 'transcript', 'context'],
  },
  {
    id: 'storage-excel',
    label: 'Storage: Excel Table',
    category: 'tool',
    description: 'Shared tabular storage for spreadsheet-style rows.',
    icon: FileSpreadsheet,
    accent: '#16A34A',
    role: 'storage',
    edgeType: 'api',
    defaultPrompt: '',
    defaultCapabilities: ['table rows', 'excel mode', 'multi-reader'],
  },
  {
    id: 'universal-function',
    label: 'Universal Function Node',
    category: 'function',
    description: 'Blank function block for any custom operation imaginable.',
    icon: Code2,
    accent: '#1D4ED8',
    role: 'code',
    edgeType: 'code',
    defaultPrompt: 'Implement custom function logic for this branch.',
    defaultCapabilities: ['custom logic', 'api integration', 'transform'],
  },
]

function getEdgeStyle(edge: WorkflowEdge | Edge) {
  const edgeDataType =
    'dataType' in edge
      ? edge.dataType
      : ((edge as Edge).data as { dataType?: EdgeDataType } | undefined)?.dataType
  const dataType = (edgeDataType || 'ai') as EdgeDataType
  const existingData =
    'data' in edge ? ((edge as Edge).data as Record<string, unknown> | undefined) : undefined
  const isPulsing = Boolean(existingData?.isPulsing)
  const strokeColor = isPulsing ? '#F97316' : edgePalette[dataType]

  return {
    ...edge,
    animated: dataType === 'ai' || isPulsing,
    label: edge.label || dataType.toUpperCase(),
    className: isPulsing ? 'edge-pulse-signal' : undefined,
    style: {
      stroke: strokeColor,
      strokeWidth: isPulsing ? 3.6 : 2.4,
      strokeDasharray: isPulsing ? '8 6' : undefined,
      filter: isPulsing ? 'drop-shadow(0 0 6px rgba(249, 115, 22, 0.65))' : undefined,
    },
    markerEnd: {
      type: 'arrowclosed',
      color: strokeColor,
    },
    data: { ...(existingData || {}), dataType, isPulsing },
  } as Edge
}

function formatMemoryValue(value: unknown) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function NodeShell({
  title,
  subtitle,
  children,
  selected,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  selected?: boolean
}) {
  return (
    <div
      className={`rgb-node-shell min-w-[280px] rounded-2xl p-3 shadow-xl ${
        selected ? 'ring-2 ring-[#4338CA]/40' : ''
      }`}
    >
      <div className="mb-2">
        <div className="text-sm font-semibold text-[#0F172A]">{title}</div>
        <p className="text-[11px] text-[#334155]">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function ManagerNode({ id, data, selected }: NodeProps<FlowNodeData>) {
  return (
    <NodeShell title={data.label} subtitle={data.workerType || 'Manager Node'} selected={selected}>
      <Handle type="target" position={Position.Left} className={inHandleClass} />
      <p className="mb-2 text-xs text-[#1F2937]">{data.prompt}</p>
      <div className="rounded-lg border border-[#FCD34D]/50 bg-[#FFFBEB] p-2 text-[11px] text-[#92400E]">
        Controls strategy, budgets, priorities, and cross-team escalation.
      </div>
      <Handle type="source" position={Position.Right} className={outHandleClass} />
    </NodeShell>
  )
}

function ProgrammerNode({ id, data, selected }: NodeProps<FlowNodeData>) {
  return (
    <NodeShell title={data.label} subtitle={data.workerType || 'Programmer Node'} selected={selected}>
      <Handle type="target" position={Position.Left} className={inHandleClass} />
      <p className="mb-2 text-xs text-[#1F2937]">{data.prompt}</p>
      <div className="rounded-lg border border-[#C4B5FD]/60 bg-[#F5F3FF] p-2 text-[11px] text-[#5B21B6]">
        Handles logic, content generation, and process automation orchestration.
      </div>
      <Handle type="source" position={Position.Right} className={outHandleClass} />
    </NodeShell>
  )
}

function CodeNode({ id, data, selected }: NodeProps<FlowNodeData>) {
  return (
    <NodeShell title={data.label} subtitle={data.workerType || 'Function Node'} selected={selected}>
      <Handle type="target" position={Position.Left} className={inHandleClass} />
      <CodeBlock
        userId={data.userId}
        workflowId={data.workflowId}
        nodeId={id}
        language={data.codeSnippet?.language || 'typescript'}
        code={data.codeSnippet?.content || ''}
        prompt={data.prompt}
        testsPassed={data.testsPassed}
        bugStatus={data.bugStatus}
        errorCheckEnabled={data.errorCheckEnabled}
        onChange={(nextCode) =>
          data.onPatchNode(id, {
            codeSnippet: {
              language: data.codeSnippet?.language || 'typescript',
              content: nextCode,
            },
            testsPassed: false,
            bugStatus: 'idle',
          })
        }
        onStatusChange={(status) => data.onPatchNode(id, status)}
      />
      <Handle type="source" position={Position.Right} className={outHandleClass} />
    </NodeShell>
  )
}

function TextNode({ data, selected }: NodeProps<FlowNodeData>) {
  const style = { ...defaultTextStyle, ...(data.textStyle || {}) }
  return (
    <NodeShell title={data.label || 'Text'} subtitle={data.workerType || 'Text Label'} selected={selected}>
      <Handle type="target" position={Position.Left} className={inHandleClass} />
      <div
        className="min-w-[220px] rounded-lg border border-[#E2E8F0] bg-white/95 px-3 py-2"
        style={{
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          fontStyle: style.italic ? 'italic' : 'normal',
          textDecoration: style.underline ? 'underline' : 'none',
          textTransform: style.uppercase ? 'uppercase' : 'none',
          textAlign: style.align,
          color: style.color,
          backgroundColor: style.backgroundColor,
          letterSpacing: `${style.letterSpacing || 0}px`,
          lineHeight: style.lineHeight,
          textShadow: style.shadow ? '0 1px 3px rgba(15,23,42,0.28)' : 'none',
        }}
      >
        {data.textContent?.trim() || 'Text label'}
      </div>
      <Handle type="source" position={Position.Right} className={outHandleClass} />
    </NodeShell>
  )
}

function BufferNode({ data, selected }: NodeProps<FlowNodeData>) {
  const config = {
    maxItems: data.bufferConfig?.maxItems || 25,
    releaseMode: data.bufferConfig?.releaseMode || 'when-target-ready',
    dropPolicy: data.bufferConfig?.dropPolicy || 'oldest',
  }

  return (
    <NodeShell title={data.label} subtitle={data.workerType || 'Buffer Queue'} selected={selected}>
      <Handle type="target" id="in-a" position={Position.Left} style={{ top: '35%' }} className={inHandleClass} />
      <Handle type="target" id="in-b" position={Position.Left} style={{ top: '70%' }} className={inHandleClass} />
      <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-2 text-[11px] text-[#92400E]">
        Queue size: {config.maxItems} • Mode: {config.releaseMode} • Drop: {config.dropPolicy}
      </div>
      <p className="mt-2 text-[11px] text-[#92400E]">
        Buffers incoming prompts and releases based on readiness mode.
      </p>
      <Handle type="source" id="out-a" position={Position.Right} style={{ top: '35%' }} className={outHandleClass} />
      <Handle type="source" id="out-b" position={Position.Right} style={{ top: '70%' }} className={outHandleClass} />
    </NodeShell>
  )
}

function StorageNode({ data, selected }: NodeProps<FlowNodeData>) {
  const config = {
    storageType: data.storageConfig?.storageType || 'database',
    key: data.storageConfig?.key || 'shared-storage',
    allowWrite: data.storageConfig?.allowWrite !== false,
    allowRead: data.storageConfig?.allowRead !== false,
    schemaHint: data.storageConfig?.schemaHint || 'json',
  }

  return (
    <NodeShell title={data.label} subtitle={data.workerType || 'Storage Block'} selected={selected}>
      <Handle type="target" id="in-a" position={Position.Left} style={{ top: '28%' }} className={inHandleClass} />
      <Handle type="target" id="in-b" position={Position.Left} style={{ top: '55%' }} className={inHandleClass} />
      <Handle type="target" id="in-c" position={Position.Left} style={{ top: '82%' }} className={inHandleClass} />
      <div className="rounded-lg border border-[#6EE7B7] bg-[#ECFDF5] p-2 text-[11px] text-[#065F46]">
        Type: {config.storageType} • Key: {config.key}
        <br />
        Write: {config.allowWrite ? 'on' : 'off'} • Read: {config.allowRead ? 'on' : 'off'} • Hint:{' '}
        {config.schemaHint}
      </div>
      <p className="mt-2 text-[11px] text-[#047857]">
        Shared storage lane with multiple in/out ports for many AI readers/writers.
      </p>
      <Handle type="source" id="out-a" position={Position.Right} style={{ top: '28%' }} className={outHandleClass} />
      <Handle type="source" id="out-b" position={Position.Right} style={{ top: '55%' }} className={outHandleClass} />
      <Handle type="source" id="out-c" position={Position.Right} style={{ top: '82%' }} className={outHandleClass} />
    </NodeShell>
  )
}

const nodeTypes = {
  manager: ManagerNode,
  programmer: ProgrammerNode,
  code: CodeNode,
  text: TextNode,
  buffer: BufferNode,
  storage: StorageNode,
}

function toSerializableWorkflow(params: {
  workflow: Workflow
  nodes: Node<FlowNodeData>[]
  edges: Edge[]
}) {
  const { workflow, nodes, edges } = params

  return {
    ...workflow,
    updatedAt: new Date().toISOString(),
    nodes: nodes.map((node) => ({
      id: node.id,
      type: (node.type as Workflow['nodes'][number]['type']) || 'code',
      position: node.position,
      parentNode: node.parentNode,
      extent: node.extent as 'parent' | undefined,
      style: node.style as Record<string, unknown> | undefined,
      data: {
        label: node.data.label,
        role: node.data.role,
        workerType: node.data.workerType,
        prompt: node.data.prompt,
        textContent: node.data.textContent,
        textStyle: node.data.textStyle,
        bufferConfig: node.data.bufferConfig,
        storageConfig: node.data.storageConfig,
        capabilities: node.data.capabilities,
        codeSnippet: node.data.codeSnippet,
        testsPassed: node.data.testsPassed,
        bugStatus: node.data.bugStatus,
        errorHandler: node.data.errorHandler,
        errorCheckEnabled: node.data.errorCheckEnabled,
        monitoring: node.data.monitoring,
        parentWorkflowId: node.data.parentWorkflowId,
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      label: typeof edge.label === 'string' ? edge.label : undefined,
      dataType:
        ((edge.data as { dataType?: EdgeDataType } | undefined)?.dataType as EdgeDataType) ||
        'ai',
    })),
  } satisfies Workflow
}

function parseCapabilities(input: string) {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function WorkflowCanvas({ userId = DEMO_USER_ID }: { userId?: string }) {
  const [loading, setLoading] = useState(true)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [activeWorkflowId, setActiveWorkflowId] = useState('')
  const [ownerPanelMode, setOwnerPanelMode] = useState<OwnerPanelMode>('prompts')
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(true)
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>('focus')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<string[]>([])
  const [librarySearch, setLibrarySearch] = useState('')
  const [selectedLibraryId, setSelectedLibraryId] = useState(libraryItems[0].id)
  const [autoConnectFromSelection, setAutoConnectFromSelection] = useState(true)
  const [connectType, setConnectType] = useState<EdgeDataType>('ai')
  const [customWorkerName, setCustomWorkerName] = useState('Custom Specialist')
  const [customWorkerPrompt, setCustomWorkerPrompt] = useState(
    'Define custom responsibilities and measurable objectives.'
  )
  const [customWorkerRole, setCustomWorkerRole] = useState<NodeRole>('programmer')
  const [customCapabilitiesText, setCustomCapabilitiesText] = useState('custom-task')
  const [runInput, setRunInput] = useState('run current board')
  const [activeTool, setActiveTool] = useState<CanvasTool>('select')
  const [drawColor, setDrawColor] = useState('#111827')
  const [drawWidth, setDrawWidth] = useState(3)
  const [drawStrokes, setDrawStrokes] = useState<DrawingStroke[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [activeStrokeId, setActiveStrokeId] = useState<string | null>(null)
  const [globalPromptDraft, setGlobalPromptDraft] = useState('')
  const [promptProfileTitle, setPromptProfileTitle] = useState('Owner Direction')
  const [ownerTodoText, setOwnerTodoText] = useState('')
  const [ownerAsyncNote, setOwnerAsyncNote] = useState('')
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [isSavingPrompts, setIsSavingPrompts] = useState(false)
  const [runOutput, setRunOutput] = useState('')
  const [runningThoughts, setRunningThoughts] = useState<string[]>([])
  const [auditRows, setAuditRows] = useState<
    Array<{ id: string; action: string; createdAt: string; payload: Record<string, unknown> }>
  >([])
  const [isDirty, setIsDirty] = useState(false)
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [toasts, setToasts] = useState<
    Array<{ id: number; type: 'success' | 'error' | 'info'; message: string }>
  >([])
  const toastIdRef = useRef(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [signalScore, setSignalScore] = useState(0)
  const [activeSignalCount, setActiveSignalCount] = useState(0)
  const [lastSignalAt, setLastSignalAt] = useState<string | null>(null)
  const [lastRunCommunications, setLastRunCommunications] = useState<WorkflowCommunicationEvent[]>(
    []
  )
  const [validationReport, setValidationReport] = useState<WorkflowValidationReport | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [systemHealthStatus, setSystemHealthStatus] = useState<'healthy' | 'degraded' | 'critical'>(
    'healthy'
  )
  const [systemHealthChecks, setSystemHealthChecks] = useState<SystemHealthCheck[]>([])
  const [isHealthLoading, setIsHealthLoading] = useState(false)
  const [memoryRecords, setMemoryRecords] = useState<MemoryRecord[]>([])
  const [memoryNamespace, setMemoryNamespace] = useState('general')
  const [memoryKey, setMemoryKey] = useState('')
  const [memoryValue, setMemoryValue] = useState('')
  const [isMemoryLoading, setIsMemoryLoading] = useState(false)
  const [isMemorySaving, setIsMemorySaving] = useState(false)

  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null)
  const flowWrapperRef = useRef<HTMLDivElement | null>(null)
  const pulseTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const activeWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === activeWorkflowId) || null,
    [workflows, activeWorkflowId]
  )

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) || null : null),
    [nodes, selectedNodeId]
  )

  const layoutGridClass =
    layoutPreset === 'balanced'
      ? 'lg:grid-cols-[300px_minmax(0,1fr)_360px]'
      : layoutPreset === 'wide'
      ? 'lg:grid-cols-[360px_minmax(0,1fr)_360px]'
      : 'lg:grid-cols-[260px_minmax(0,1fr)_420px]'

  const filteredLibrary = useMemo(() => {
    const query = librarySearch.trim().toLowerCase()
    if (!query) return libraryItems
    return libraryItems.filter((item) =>
      `${item.label} ${item.description} ${item.category}`.toLowerCase().includes(query)
    )
  }, [librarySearch])

  const pushToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = ++toastIdRef.current
      setToasts((prev) => [...prev, { id, type, message }].slice(-4))
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      }, 3600)
    },
    []
  )

  const getRelativePoint = useCallback((clientX: number, clientY: number): DrawingPoint | null => {
    const bounds = flowWrapperRef.current?.getBoundingClientRect()
    if (!bounds) return null
    return {
      x: clientX - bounds.left,
      y: clientY - bounds.top,
    }
  }, [])

  const pointNearStroke = useCallback((point: DrawingPoint, stroke: DrawingStroke, threshold = 16) => {
    const sq = threshold * threshold
    return stroke.points.some((candidate) => {
      const dx = candidate.x - point.x
      const dy = candidate.y - point.y
      return dx * dx + dy * dy <= sq
    })
  }, [])

  const clearSignalTimers = useCallback(() => {
    pulseTimersRef.current.forEach((timer) => clearTimeout(timer))
    pulseTimersRef.current = []
    setActiveSignalCount(0)
    setEdges((prev) =>
      prev.map((edge) => {
        const data = (edge.data as Record<string, unknown> | undefined) || {}
        if (!data.isPulsing) return edge
        return getEdgeStyle({
          ...edge,
          data: { ...data, isPulsing: false },
        } as Edge)
      })
    )
  }, [setEdges])

  const playCommunicationSignals = useCallback(
    (communications: WorkflowCommunicationEvent[]) => {
      if (communications.length === 0) return

      clearSignalTimers()
      setSignalScore((prev) => prev + communications.length)
      setActiveSignalCount(communications.length)
      setLastSignalAt(new Date().toISOString())

      communications.slice(0, 120).forEach((communication, index) => {
        const activateTimer = setTimeout(() => {
          setEdges((prev) =>
            prev.map((edge) => {
              if (edge.id !== communication.edgeId) return edge
              const data = (edge.data as Record<string, unknown> | undefined) || {}
              return getEdgeStyle({
                ...edge,
                data: { ...data, dataType: communication.dataType, isPulsing: true },
              } as Edge)
            })
          )
        }, index * 170)

        const deactivateTimer = setTimeout(() => {
          setEdges((prev) =>
            prev.map((edge) => {
              if (edge.id !== communication.edgeId) return edge
              const data = (edge.data as Record<string, unknown> | undefined) || {}
              return getEdgeStyle({
                ...edge,
                data: { ...data, dataType: communication.dataType, isPulsing: false },
              } as Edge)
            })
          )
        }, index * 170 + 860)

        pulseTimersRef.current.push(activateTimer, deactivateTimer)
      })

      const cooldownTimer = setTimeout(() => {
        setActiveSignalCount(0)
      }, communications.length * 170 + 900)
      pulseTimersRef.current.push(cooldownTimer)
    },
    [clearSignalTimers, setEdges]
  )

  const patchNode = useCallback(
    (nodeId: string, patch: Partial<WorkflowNodeData>) => {
      setIsDirty(true)
      setNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...patch,
                },
              }
            : node
        )
      )
    },
    [setNodes]
  )

  const hydrateWorkflow = useCallback(
    (workflow: Workflow) => {
      clearSignalTimers()
      const hydratedNodes: Node<FlowNodeData>[] = workflow.nodes.map((node) => ({
        ...node,
        type: node.type === 'group' ? 'manager' : node.type,
        data: {
          ...node.data,
          userId,
          workflowId: workflow.id,
          onPatchNode: patchNode,
        },
      }))

      setNodes(hydratedNodes)
      setEdges(workflow.edges.map((edge) => getEdgeStyle(edge)))
      setActiveWorkflowId(workflow.id)
      setCollapsedNodeIds([])
      setSelectedNodeId(null)
      setDrawStrokes([])
      setIsDirty(false)
      setLastSavedAt(workflow.updatedAt)
    },
    [clearSignalTimers, patchNode, setEdges, setNodes, userId]
  )

  const validateActiveWorkflow = useCallback(
    async (autoRepair = false) => {
      if (!activeWorkflowId) return null
      setIsValidating(true)
      try {
        const endpoint = `/api/workflows/${encodeURIComponent(activeWorkflowId)}/validate`
        const response = await fetch(endpoint, autoRepair
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, autoRepair: true }),
            }
          : undefined)

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || `Validation failed (${response.status})`)
        }

        if (data.report) {
          setValidationReport(data.report as WorkflowValidationReport)
        }

        if (autoRepair && data.workflow) {
          const repaired = data.workflow as Workflow
          setWorkflows((prev) => prev.map((item) => (item.id === repaired.id ? repaired : item)))
          hydrateWorkflow(repaired)
          if (Array.isArray(data.appliedFixes) && data.appliedFixes.length > 0) {
            pushToast(`Auto-repair applied ${data.appliedFixes.length} fix(es).`, 'success')
          } else {
            pushToast('Auto-repair completed (no changes needed).', 'info')
          }
        }

        return data.report as WorkflowValidationReport
      } catch (error) {
        pushToast(error instanceof Error ? error.message : 'Validation failed.', 'error')
        return null
      } finally {
        setIsValidating(false)
      }
    },
    [activeWorkflowId, hydrateWorkflow, pushToast, userId]
  )

  const fetchWorkflows = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/workflows?userId=${encodeURIComponent(userId)}`)
      if (!response.ok) {
        throw new Error(`Failed to load workflows (${response.status})`)
      }
      const data = await response.json()
      const fetched = (data.workflows || []) as Workflow[]
      setWorkflows(fetched)
      if (fetched[0]) {
        hydrateWorkflow(fetched[0])
      } else {
        setNodes([])
        setEdges([])
        setActiveWorkflowId('')
        setValidationReport(null)
      }
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Failed to load workflows.',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }, [hydrateWorkflow, pushToast, setEdges, setNodes, userId])

  const fetchAudit = useCallback(async () => {
    if (!activeWorkflowId) return
    try {
      const response = await fetch(
        `/api/audit?userId=${encodeURIComponent(userId)}&workflowId=${encodeURIComponent(activeWorkflowId)}`
      )
      if (!response.ok) {
        throw new Error(`Failed to load audit (${response.status})`)
      }
      const data = await response.json()
      setAuditRows(data.entries || [])
    } catch {
      setAuditRows([])
    }
  }, [activeWorkflowId, userId])

  const fetchMemory = useCallback(async () => {
    if (!activeWorkflowId) {
      setMemoryRecords([])
      return
    }
    setIsMemoryLoading(true)
    try {
      const response = await fetch(
        `/api/memory?userId=${encodeURIComponent(userId)}&workflowId=${encodeURIComponent(activeWorkflowId)}`
      )
      if (!response.ok) {
        throw new Error(`Failed to load memory (${response.status})`)
      }
      const data = await response.json()
      setMemoryRecords((data.records || []) as MemoryRecord[])
    } catch {
      setMemoryRecords([])
    } finally {
      setIsMemoryLoading(false)
    }
  }, [activeWorkflowId, userId])

  const fetchSystemHealth = useCallback(async () => {
    setIsHealthLoading(true)
    try {
      const response = await fetch(`/api/system/health?userId=${encodeURIComponent(userId)}`)
      if (!response.ok) {
        throw new Error(`Failed to load system health (${response.status})`)
      }
      const data = (await response.json()) as SystemHealthResponse
      setSystemHealthChecks(Array.isArray(data.checks) ? data.checks : [])
      setSystemHealthStatus(data.status || 'degraded')
    } catch {
      setSystemHealthChecks([])
      setSystemHealthStatus('critical')
    } finally {
      setIsHealthLoading(false)
    }
  }, [userId])

  const fetchOwnerPrompts = useCallback(async () => {
    setIsLoadingPrompts(true)
    try {
      const response = await fetch(`/api/settings?userId=${encodeURIComponent(userId)}`)
      if (!response.ok) {
        throw new Error(`Failed to load prompt settings (${response.status})`)
      }
      const data = (await response.json()) as SettingsResponse
      const settings = data.settings
      setGlobalPromptDraft(
        settings?.globalPrompt || 'Define company objective and execution standards here.'
      )
    } catch {
      setGlobalPromptDraft('Define company objective and execution standards here.')
    } finally {
      setIsLoadingPrompts(false)
    }
  }, [userId])

  const saveOwnerPrompts = useCallback(async () => {
    setIsSavingPrompts(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          globalPrompt: globalPromptDraft.trim(),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || `Failed to save prompts (${response.status})`)
      }
      pushToast('Prompt profile saved.', 'success')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Failed to save prompts.', 'error')
    } finally {
      setIsSavingPrompts(false)
    }
  }, [globalPromptDraft, pushToast, userId])

  const applyPromptToAllWorkers = useCallback(() => {
    const globalPrompt = globalPromptDraft.trim()
    if (!globalPrompt) {
      pushToast('Write a global prompt first.', 'error')
      return
    }
    setNodes((prev) =>
      prev.map((node) => {
        if (
          node.data.role === 'code' ||
          node.data.role === 'text' ||
          node.data.role === 'buffer' ||
          node.data.role === 'storage'
        ) {
          return node
        }
        const existing = node.data.prompt || ''
        const withoutHeader = existing.includes('\n---\n')
          ? existing.split('\n---\n').slice(1).join('\n---\n')
          : existing
        return {
          ...node,
          data: {
            ...node.data,
            prompt: `${promptProfileTitle.trim() || 'Owner Direction'}:\n${globalPrompt}\n---\n${withoutHeader}`.trim(),
          },
        }
      })
    )
    setIsDirty(true)
    pushToast('Global direction applied to all AI workers.', 'success')
  }, [globalPromptDraft, promptProfileTitle, pushToast, setNodes])

  const saveOwnerNotes = useCallback(async () => {
    if (!activeWorkflowId) return
    try {
      await Promise.all([
        fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            workflowId: activeWorkflowId,
            namespace: 'owner',
            key: 'todo',
            value: ownerTodoText,
          }),
        }),
        fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            workflowId: activeWorkflowId,
            namespace: 'owner',
            key: 'async_manager_notes',
            value: ownerAsyncNote,
          }),
        }),
      ])
      pushToast('Owner todo/async notes saved.', 'success')
      await fetchMemory()
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Failed to save owner notes.', 'error')
    }
  }, [activeWorkflowId, fetchMemory, ownerAsyncNote, ownerTodoText, pushToast, userId])

  const saveMemoryRecord = useCallback(async () => {
    if (!activeWorkflowId) return
    const key = memoryKey.trim()
    if (!key) {
      pushToast('Memory key is required.', 'error')
      return
    }
    setIsMemorySaving(true)
    try {
      const payloadValue = (() => {
        const trimmed = memoryValue.trim()
        if (!trimmed) return ''
        try {
          return JSON.parse(trimmed)
        } catch {
          return memoryValue
        }
      })()

      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          workflowId: activeWorkflowId,
          namespace: memoryNamespace || 'general',
          key,
          value: payloadValue,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || `Memory save failed (${response.status})`)
      }
      pushToast('Memory vault updated.', 'success')
      setMemoryKey('')
      setMemoryValue('')
      await fetchMemory()
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Unable to save memory.', 'error')
    } finally {
      setIsMemorySaving(false)
    }
  }, [activeWorkflowId, fetchMemory, memoryKey, memoryNamespace, memoryValue, pushToast, userId])

  const deleteMemoryVaultEntry = useCallback(
    async (namespace: string, key: string) => {
      if (!activeWorkflowId) return
      try {
        const response = await fetch('/api/memory', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            workflowId: activeWorkflowId,
            namespace,
            key,
          }),
        })
        if (!response.ok) {
          throw new Error(`Memory delete failed (${response.status})`)
        }
        await fetchMemory()
      } catch (error) {
        pushToast(error instanceof Error ? error.message : 'Unable to delete memory.', 'error')
      }
    },
    [activeWorkflowId, fetchMemory, pushToast, userId]
  )

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  useEffect(() => {
    return () => {
      clearSignalTimers()
    }
  }, [clearSignalTimers])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit, runOutput])

  useEffect(() => {
    fetchMemory()
  }, [fetchMemory])

  useEffect(() => {
    const todoRecord = memoryRecords.find(
      (record) => record.namespace === 'owner' && record.key === 'todo'
    )
    const asyncRecord = memoryRecords.find(
      (record) => record.namespace === 'owner' && record.key === 'async_manager_notes'
    )
    const drawingRecord = memoryRecords.find(
      (record) => record.namespace === 'canvas' && record.key === 'drawing_layer'
    )
    if (todoRecord && typeof todoRecord.value === 'string') {
      setOwnerTodoText(todoRecord.value)
    }
    if (asyncRecord && typeof asyncRecord.value === 'string') {
      setOwnerAsyncNote(asyncRecord.value)
    }
    if (drawingRecord && Array.isArray(drawingRecord.value)) {
      const safe = drawingRecord.value
        .map((entry) => {
          if (typeof entry !== 'object' || !entry) return null
          const candidate = entry as Partial<DrawingStroke>
          if (!candidate.id || !Array.isArray(candidate.points)) return null
          return {
            id: String(candidate.id),
            color: String(candidate.color || '#111827'),
            width: Number(candidate.width || 3),
            points: candidate.points
              .map((point) =>
                typeof point === 'object' && point
                  ? {
                      x: Number((point as DrawingPoint).x || 0),
                      y: Number((point as DrawingPoint).y || 0),
                    }
                  : null
              )
              .filter(Boolean) as DrawingPoint[],
          } satisfies DrawingStroke
        })
        .filter(Boolean) as DrawingStroke[]
      setDrawStrokes(safe.slice(0, 500))
    }
  }, [memoryRecords])

  useEffect(() => {
    if (!activeWorkflowId) return
    const timer = setTimeout(() => {
      void fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          workflowId: activeWorkflowId,
          namespace: 'canvas',
          key: 'drawing_layer',
          value: drawStrokes.slice(0, 500),
        }),
      })
    }, 1200)
    return () => clearTimeout(timer)
  }, [activeWorkflowId, drawStrokes, userId])

  useEffect(() => {
    if (!activeWorkflowId) return
    void validateActiveWorkflow(false)
  }, [activeWorkflowId, validateActiveWorkflow])

  useEffect(() => {
    if (!activeWorkflowId) return
    void fetchSystemHealth()
  }, [activeWorkflowId, fetchSystemHealth])

  useEffect(() => {
    void fetchOwnerPrompts()
  }, [fetchOwnerPrompts])

  useEffect(() => {
    if (!activeWorkflowId) {
      setRunInput('run current board')
      return
    }
    setRunInput((prev) => {
      if (!prev || prev === 'run current board' || prev.startsWith('run workflow-')) {
        return `run ${activeWorkflowId}`
      }
      return prev
    })
  }, [activeWorkflowId])

  const applyMindMapLayout = useCallback(
    (rootId?: string) => {
      if (!nodes.length) return
      const inferredRoot =
        rootId ||
        selectedNodeId ||
        inferMindMapRoot(
          nodes.map((node) => ({ id: node.id, position: node.position })),
          edges.map((edge) => ({ source: edge.source, target: edge.target }))
        )
      if (!inferredRoot) return

      const layout = calculateMindMapLayout(
        nodes.map((node) => ({ id: node.id, position: node.position })),
        edges.map((edge) => ({ source: edge.source, target: edge.target })),
        { rootId: inferredRoot, xSpacing: 340, ySpacing: 140 }
      )

      setNodes((prev) =>
        prev.map((node) => {
          const position = layout.get(node.id)
          if (!position) return node
          return {
            ...node,
            position,
            sourcePosition: position.x >= 0 ? Position.Right : Position.Left,
            targetPosition: position.x >= 0 ? Position.Left : Position.Right,
          }
        })
      )
      setIsDirty(true)
    },
    [edges, nodes, selectedNodeId, setNodes]
  )

  const createNodeObject = useCallback(
    (item: LibraryItem, id: string, position: { x: number; y: number }): Node<FlowNodeData> => ({
      id,
      type: item.role,
      position,
      sourcePosition: position.x >= 0 ? Position.Right : Position.Left,
      targetPosition: position.x >= 0 ? Position.Left : Position.Right,
      data: {
        label: item.label,
        workerType: item.label,
        role: item.role,
        prompt: item.defaultPrompt,
        textContent: item.role === 'text' ? 'New text label' : undefined,
        textStyle: item.role === 'text' ? { ...defaultTextStyle } : undefined,
        bufferConfig:
          item.role === 'buffer'
            ? {
                maxItems: 25,
                releaseMode: 'when-target-ready',
                dropPolicy: 'oldest',
              }
            : undefined,
        storageConfig:
          item.role === 'storage'
            ? {
                storageType: item.id.includes('excel')
                  ? 'excel'
                  : item.id.includes('text')
                  ? 'text'
                  : 'database',
                key: `${item.id}-${Date.now()}`,
                allowWrite: true,
                allowRead: true,
                schemaHint: item.id.includes('excel')
                  ? 'table'
                  : item.id.includes('text')
                  ? 'plain-text'
                  : 'json',
              }
            : undefined,
        capabilities: [...item.defaultCapabilities],
        codeSnippet:
          item.role === 'code'
            ? {
                language: 'typescript',
                content: 'export const runTask = () => "custom function output";\n',
              }
            : undefined,
        testsPassed: true,
        bugStatus: 'idle',
        errorHandler: { retryCount: 2, notifyWhatsapp: true },
        errorCheckEnabled: true,
        monitoring: 'none',
        userId,
        workflowId: activeWorkflowId,
        onPatchNode: patchNode,
      },
    }),
    [activeWorkflowId, patchNode, userId]
  )

  const buildCustomItem = useCallback((): LibraryItem => {
    const name = customWorkerName.trim() || 'Custom Specialist'
    const prompt =
      customWorkerPrompt.trim() || 'Define custom responsibilities and measurable objectives.'
    const caps = parseCapabilities(customCapabilitiesText)

    return {
      id: `custom-${Date.now()}`,
      label: name,
      category: 'worker',
      description: 'Custom user-defined worker for unique business functions.',
      icon: Sparkles,
      accent: '#2563EB',
      role: customWorkerRole,
      edgeType:
        customWorkerRole === 'code'
          ? 'code'
          : customWorkerRole === 'storage'
          ? 'api'
          : 'ai',
      defaultPrompt: prompt,
      defaultCapabilities: caps.length > 0 ? caps : ['custom-task'],
    }
  }, [
    customCapabilitiesText,
    customWorkerName,
    customWorkerPrompt,
    customWorkerRole,
  ])

  const addFromLibrary = useCallback(
    (params: {
      mode: 'root' | 'child' | 'sibling' | 'drop'
      item?: LibraryItem
      itemId?: string
      position?: { x: number; y: number }
    }) => {
      const item =
        params.item ||
        libraryItems.find((candidate) => candidate.id === (params.itemId || selectedLibraryId)) ||
        libraryItems[0]

      const selectedIncomingParent = selectedNodeId
        ? edges.find((edge) => edge.target === selectedNodeId)?.source
        : undefined

      const parentId =
        params.mode === 'child'
          ? selectedNodeId || undefined
          : params.mode === 'sibling'
          ? selectedIncomingParent || selectedNodeId || undefined
          : params.mode === 'drop'
          ? autoConnectFromSelection
            ? selectedNodeId || undefined
            : undefined
          : undefined

      const parentNode = parentId ? nodes.find((node) => node.id === parentId) : null
      const siblingsCount = parentId
        ? edges.filter((edge) => edge.source === parentId).length
        : nodes.length
      const direction = (parentNode?.position.x || 0) < 0 ? -1 : 1

      const position =
        params.position ||
        (parentNode
          ? {
              x: parentNode.position.x + direction * 320,
              y: parentNode.position.y + (siblingsCount - 1) * 130,
            }
          : {
              x: 0,
              y: Math.max(0, nodes.length - 1) * 130,
            })

      const id = `${item.id}-${Date.now()}`
      setNodes((prev) => [...prev, createNodeObject(item, id, position)])

      if (parentId) {
        setEdges((prev) => [
          ...prev,
          getEdgeStyle({
            id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            source: parentId,
            target: id,
            type: 'smoothstep',
            dataType: item.edgeType,
            label: item.edgeType.toUpperCase(),
          } as WorkflowEdge),
        ])
      }

      setSelectedNodeId(id)
      setIsDirty(true)
      if (params.mode !== 'drop') {
        const rootHint = params.mode === 'root' ? id : parentId || undefined
        setTimeout(() => applyMindMapLayout(rootHint), 0)
      }
    },
    [
      applyMindMapLayout,
      autoConnectFromSelection,
      createNodeObject,
      edges,
      nodes,
      selectedLibraryId,
      selectedNodeId,
      setEdges,
      setNodes,
    ]
  )

  const addTextNodeAt = useCallback(
    (position: { x: number; y: number }) => {
      const template = libraryItems.find((item) => item.id === 'text-label')
      if (!template) return
      addFromLibrary({
        mode: 'drop',
        item: template,
        position,
      })
    },
    [addFromLibrary]
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)
      setIsDirty(true)
    },
    [onNodesChange]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes)
      setIsDirty(true)
    },
    [onEdgesChange]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((prev) =>
        addEdge(
          getEdgeStyle({
            ...connection,
            id: `edge-${Date.now()}`,
            type: 'smoothstep',
            dataType: connectType,
            label: connectType.toUpperCase(),
          } as WorkflowEdge),
          prev
        )
      )
      setIsDirty(true)
    },
    [connectType, setEdges]
  )

  const onTemplateDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>, itemId: string) => {
      event.dataTransfer.setData('application/x-ceo-board-item', itemId)
      event.dataTransfer.effectAllowed = 'copy'
    },
    []
  )

  const onCanvasDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onCanvasDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const itemId = event.dataTransfer.getData('application/x-ceo-board-item')
      if (!itemId) return

      const fallbackPosition = (() => {
        const bounds = flowWrapperRef.current?.getBoundingClientRect()
        if (!bounds) return { x: 0, y: 0 }
        return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
      })()

      const position = flowInstance
        ? flowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
        : fallbackPosition

      addFromLibrary({ mode: 'drop', itemId, position })
    },
    [addFromLibrary, flowInstance]
  )

  const onPaneClick = useCallback(
    (event: ReactMouseEvent<Element, MouseEvent>) => {
      if (activeTool === 'text') {
        const fallbackPosition = (() => {
          const bounds = flowWrapperRef.current?.getBoundingClientRect()
          if (!bounds) return { x: 0, y: 0 }
          return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
        })()
        const position = flowInstance
          ? flowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
          : fallbackPosition
        addTextNodeAt(position)
        return
      }
      setSelectedNodeId(null)
    },
    [activeTool, addTextNodeAt, flowInstance]
  )

  const startDrawing = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (activeTool !== 'pencil') return
      const point = getRelativePoint(event.clientX, event.clientY)
      if (!point) return
      event.preventDefault()
      event.stopPropagation()
      const strokeId = `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const stroke: DrawingStroke = {
        id: strokeId,
        color: drawColor,
        width: drawWidth,
        points: [point],
      }
      setDrawStrokes((prev) => [...prev, stroke])
      setActiveStrokeId(strokeId)
      setIsDrawing(true)
      setIsDirty(true)
    },
    [activeTool, drawColor, drawWidth, getRelativePoint]
  )

  const moveDrawing = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const point = getRelativePoint(event.clientX, event.clientY)
      if (!point) return

      if (activeTool === 'eraser') {
        event.preventDefault()
        event.stopPropagation()
        setDrawStrokes((prev) => prev.filter((stroke) => !pointNearStroke(point, stroke)))
        return
      }

      if (activeTool !== 'pencil' || !isDrawing || !activeStrokeId) return
      event.preventDefault()
      event.stopPropagation()
      setDrawStrokes((prev) =>
        prev.map((stroke) =>
          stroke.id === activeStrokeId
            ? {
                ...stroke,
                points: [...stroke.points, point],
              }
            : stroke
        )
      )
    },
    [activeStrokeId, activeTool, getRelativePoint, isDrawing, pointNearStroke]
  )

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    setActiveStrokeId(null)
  }, [])

  const undoLastStroke = useCallback(() => {
    setDrawStrokes((prev) => prev.slice(0, -1))
    setIsDirty(true)
  }, [])

  const clearAllStrokes = useCallback(() => {
    setDrawStrokes([])
    setIsDirty(true)
  }, [])

  const toggleCollapseSelected = useCallback(() => {
    if (!selectedNodeId) return
    setCollapsedNodeIds((prev) =>
      prev.includes(selectedNodeId)
        ? prev.filter((id) => id !== selectedNodeId)
        : [...prev, selectedNodeId]
    )
  }, [selectedNodeId])

  const deleteSelectedBranch = useCallback(() => {
    if (!selectedNodeId) return
    const descendantIds = new Set(
      getDescendantIds(
        selectedNodeId,
        edges.map((edge) => ({ source: edge.source, target: edge.target }))
      )
    )
    descendantIds.add(selectedNodeId)

    setNodes((prev) => prev.filter((node) => !descendantIds.has(node.id)))
    setEdges((prev) =>
      prev.filter(
        (edge) =>
          !descendantIds.has(edge.source) && !descendantIds.has(edge.target)
      )
    )
    setCollapsedNodeIds((prev) =>
      prev.filter((nodeId) => !descendantIds.has(nodeId))
    )
    setSelectedNodeId(null)
    setIsDirty(true)
  }, [edges, selectedNodeId, setEdges, setNodes])

  const duplicateSelectedNode = useCallback(() => {
    if (!selectedNode) return
    const cloneId = `${selectedNode.id}-copy-${Date.now()}`
    const clone: Node<FlowNodeData> = {
      ...selectedNode,
      id: cloneId,
      position: {
        x: selectedNode.position.x + 90,
        y: selectedNode.position.y + 60,
      },
      data: {
        ...selectedNode.data,
        label: `${selectedNode.data.label} Copy`,
      },
    }

    setNodes((prev) => [...prev, clone])
    if (autoConnectFromSelection) {
      setEdges((prev) => [
        ...prev,
        getEdgeStyle({
          id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          source: selectedNode.id,
          target: cloneId,
          dataType: connectType,
          type: 'smoothstep',
          label: connectType.toUpperCase(),
        } as WorkflowEdge),
      ])
    }
    setSelectedNodeId(cloneId)
    setIsDirty(true)
  }, [autoConnectFromSelection, connectType, selectedNode, setEdges, setNodes])

  useEffect(() => {
    const hiddenNodeIds = new Set<string>()
    collapsedNodeIds.forEach((collapsedId) => {
      const descendants = getDescendantIds(
        collapsedId,
        edges.map((edge) => ({ source: edge.source, target: edge.target }))
      )
      descendants.forEach((nodeId) => hiddenNodeIds.add(nodeId))
    })

    setNodes((prev) => {
      let changed = false
      const next = prev.map((node) => {
        const hidden = hiddenNodeIds.has(node.id)
        if (node.hidden === hidden) return node
        changed = true
        return { ...node, hidden }
      })
      return changed ? next : prev
    })

    setEdges((prev) => {
      let changed = false
      const next = prev.map((edge) => {
        const hidden =
          hiddenNodeIds.has(edge.source) ||
          hiddenNodeIds.has(edge.target) ||
          collapsedNodeIds.includes(edge.source)
        if (edge.hidden === hidden) return edge
        changed = true
        return { ...edge, hidden }
      })
      return changed ? next : prev
    })
  }, [collapsedNodeIds, edges, setEdges, setNodes])

  const fitView = useCallback(() => {
    flowInstance?.fitView({ duration: 320, padding: 0.22 })
  }, [flowInstance])

  const zoomIn = useCallback(() => {
    flowInstance?.zoomIn({ duration: 220 })
  }, [flowInstance])

  const zoomOut = useCallback(() => {
    flowInstance?.zoomOut({ duration: 220 })
  }, [flowInstance])

  const persistWorkflow = useCallback(
    async (silent = false) => {
      if (!activeWorkflow) return false
      setIsSaving(true)
      try {
        const workflow = toSerializableWorkflow({ workflow: activeWorkflow, nodes, edges })
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflow),
        })
        if (!response.ok) {
          const failData = await response.json().catch(() => null)
          throw new Error(
            failData?.message || failData?.validation?.issues?.[0]?.message || `Save failed (${response.status})`
          )
        }
        const data = await response.json()
        const saved = data.workflow as Workflow
        setWorkflows((prev) => prev.map((item) => (item.id === saved.id ? saved : item)))
        hydrateWorkflow(saved)
        setIsDirty(false)
        setLastSavedAt(new Date().toISOString())
        if (data.validation) {
          setValidationReport(data.validation as WorkflowValidationReport)
        }
        if (Array.isArray(data.appliedFixes) && data.appliedFixes.length > 0 && !silent) {
          pushToast(`Saved with ${data.appliedFixes.length} auto-fix(es).`, 'info')
        }
        if (!silent) pushToast('Workflow saved.', 'success')
        return true
      } catch (error) {
        if (!silent) {
          pushToast(
            error instanceof Error ? error.message : 'Unable to save workflow.',
            'error'
          )
        }
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [activeWorkflow, edges, hydrateWorkflow, nodes, pushToast]
  )

  const saveWorkflow = useCallback(async () => {
    await persistWorkflow(false)
  }, [persistWorkflow])

  const runWorkflow = useCallback(async () => {
    if (!activeWorkflow) return
    setIsRunning(true)
    setRunningThoughts((prev) => [
      'Preparing workflow run...',
      `Workflow: ${activeWorkflow.name}`,
      `Command: ${runInput}`,
      ...prev.slice(0, 2),
    ])
    try {
      const response = await fetch(`/api/workflows/${activeWorkflow.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          triggerText: runInput,
          notifyWhatsapp: true,
        }),
      })
      const data = (await response.json()) as RunWorkflowResponse
      if (!response.ok) {
        throw new Error(data.message || `Run failed (${response.status})`)
      }
      const communications = Array.isArray(data.communications) ? data.communications : []
      setLastRunCommunications(communications)
      setRunOutput(data.output || data.message || 'No output')
      setRunningThoughts(() => {
        const lines = (data.output || data.message || '')
          .split('\n')
          .map((line) => line.replace(/^•\s*/, '').trim())
          .filter(Boolean)
          .slice(0, 8)
        return lines.length > 0
          ? lines
          : ['Workflow completed with no detailed thought lines.', `Communications: ${communications.length}`]
      })
      playCommunicationSignals(communications)
      await fetchMemory()
      if (data.validation) {
        setValidationReport(data.validation)
      } else {
        void validateActiveWorkflow(false)
      }
      pushToast('Workflow run completed.', 'success')
      if (communications.length > 0) {
        pushToast(`Signal burst: ${communications.length} edge pulse(s)`, 'info')
      }
      if (data.autoRepaired) {
        pushToast(
          `Self-heal activated: ${(data.appliedFixes || []).length} fix(es) applied before run.`,
          'info'
        )
        await fetchWorkflows()
      }
      await fetchSystemHealth()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Workflow execution failed.'
      setRunOutput(message)
      setRunningThoughts((prev) => [`Run error: ${message}`, ...prev.slice(0, 5)])
      pushToast(
        message,
        'error'
      )
    } finally {
      setIsRunning(false)
    }
  }, [
    activeWorkflow,
    fetchMemory,
    fetchSystemHealth,
    fetchWorkflows,
    playCommunicationSignals,
    pushToast,
    runInput,
    userId,
    validateActiveWorkflow,
  ])

  const replayLastSignals = useCallback(() => {
    if (lastRunCommunications.length === 0) {
      pushToast('No previous communication pulse to replay yet.', 'info')
      return
    }
    playCommunicationSignals(lastRunCommunications)
    pushToast(`Replaying ${lastRunCommunications.length} pulse event(s).`, 'info')
  }, [lastRunCommunications, playCommunicationSignals, pushToast])

  const simulateSignalStorm = useCallback(() => {
    const visibleEdges = edges.filter((edge) => !edge.hidden)
    if (visibleEdges.length === 0) {
      pushToast('Need at least one connection to simulate signal storm.', 'error')
      return
    }

    const totalSignals = Math.min(42, Math.max(8, visibleEdges.length * 3))
    const now = Date.now()
    const events: WorkflowCommunicationEvent[] = Array.from({ length: totalSignals }).map(
      (_, index) => {
        const edge = visibleEdges[index % visibleEdges.length]
        const dataType =
          ((edge.data as { dataType?: EdgeDataType } | undefined)?.dataType as EdgeDataType) || 'ai'
        return {
          id: `storm-${now}-${index}`,
          edgeId: edge.id,
          source: edge.source,
          target: edge.target,
          dataType,
          message: `Signal storm pulse ${index + 1}`,
          createdAt: new Date(now + index * 5).toISOString(),
        }
      }
    )

    setLastRunCommunications(events)
    playCommunicationSignals(events)
    setRunOutput(`Signal storm simulation ran with ${events.length} synthetic pulses.`)
    setRunningThoughts([
      `Synthetic signal storm started (${events.length} pulses).`,
      'Use this to visually test communication links.',
    ])
    pushToast(`Signal storm launched: ${events.length} pulses.`, 'success')
  }, [edges, playCommunicationSignals, pushToast])

  const clearBoardToEmpty = useCallback(() => {
    setNodes([])
    setEdges([])
    setDrawStrokes([])
    setSelectedNodeId(null)
    setCollapsedNodeIds([])
    setIsDirty(true)
    setRunOutput('Board cleared. Drag AI workers from the left to start.')
    setRunningThoughts(['Board reset completed.', 'Drag a worker card into the map to begin.'])
    pushToast('Board reset to empty schematic map.', 'success')
  }, [pushToast, setDrawStrokes, setEdges, setNodes])

  useEffect(() => {
    if (!autosaveEnabled || !isDirty || !activeWorkflow || isSaving) return
    const timer = setTimeout(() => {
      void persistWorkflow(true)
    }, 4500)
    return () => clearTimeout(timer)
  }, [activeWorkflow, autosaveEnabled, isDirty, isSaving, persistWorkflow])

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      if (target.isContentEditable) return true
      const tag = target.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select'
    }

    const handleShortcut = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      const cmd = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (cmd && key === 's') {
        event.preventDefault()
        void saveWorkflow()
        return
      }

      if (cmd && event.key === 'Enter') {
        event.preventDefault()
        void runWorkflow()
        return
      }

      if (cmd && key === 'd') {
        event.preventDefault()
        duplicateSelectedNode()
        return
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
        event.preventDefault()
        deleteSelectedBranch()
        return
      }

      if (key === 'f') {
        event.preventDefault()
        fitView()
        return
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        zoomIn()
        return
      }

      if (event.key === '-') {
        event.preventDefault()
        zoomOut()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [
    deleteSelectedBranch,
    duplicateSelectedNode,
    fitView,
    runWorkflow,
    saveWorkflow,
    selectedNodeId,
    zoomIn,
    zoomOut,
  ])

  if (loading) {
    return (
      <div className="flex h-[72vh] items-center justify-center rounded-2xl border border-[#BFDBFE] bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="space-y-4">
        <section className="rgb-glow-card rounded-2xl p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#1D4ED8] shadow-sm">
              <PanelsTopLeft className="h-4 w-4" />
              Owner Structure Map
            </div>

            <div className="rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] text-[#334155]">
              {isDirty ? 'Unsaved' : 'Synced'}
              {lastSavedAt ? ` • ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}
            </div>

            <div className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] px-2 py-1 text-[11px] text-[#92400E]">
              Signal XP {signalScore}
            </div>

            <div
              className={`rounded-lg px-2 py-1 text-[11px] ${
                validationReport
                  ? validationReport.safeToRun
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-red-200 bg-red-50 text-red-700'
                  : 'border border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {validationReport ? `Ready ${validationReport.score}/100` : 'Ready check pending'}
            </div>

            <div
              className={`rounded-lg px-2 py-1 text-[11px] ${
                systemHealthStatus === 'healthy'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : systemHealthStatus === 'degraded'
                  ? 'border border-amber-200 bg-amber-50 text-amber-700'
                  : 'border border-red-200 bg-red-50 text-red-700'
              }`}
            >
              System {isHealthLoading ? '...' : systemHealthStatus}
            </div>

            <Input
              value={runInput}
              onChange={(event) => setRunInput(event.target.value)}
              className="min-w-[240px] flex-1 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
              placeholder="Run command for this board..."
            />

            <Button
              className="h-9 bg-[#4F46E5] text-white hover:bg-[#4338CA]"
              onClick={saveWorkflow}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save
            </Button>
            <Button
              className="h-9 bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
              onClick={runWorkflow}
              disabled={isRunning}
            >
              {isRunning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
              Run
            </Button>
            <Button
              className={`h-9 ${ownerPanelMode === 'prompts' ? 'bg-[#1D4ED8]' : 'bg-white text-[#1E293B]'} hover:bg-[#1E40AF] hover:text-white`}
              onClick={() => setOwnerPanelMode('prompts')}
            >
              <MessageSquare className="mr-1 h-4 w-4" />
              Prompt
            </Button>
            <Button
              className={`h-9 ${ownerPanelMode === 'inspect' ? 'bg-[#7C3AED]' : 'bg-white text-[#1E293B]'} hover:bg-[#6D28D9] hover:text-white`}
              onClick={() => setOwnerPanelMode('inspect')}
            >
              <Code2 className="mr-1 h-4 w-4" />
              Code
            </Button>
            <Button
              className={`h-9 ${ownerPanelMode === 'todo' ? 'bg-[#0F766E]' : 'bg-white text-[#1E293B]'} hover:bg-[#115E59] hover:text-white`}
              onClick={() => setOwnerPanelMode('todo')}
            >
              <KanbanSquare className="mr-1 h-4 w-4" />
              Todo
            </Button>
            <Button
              className={`h-9 ${ownerPanelMode === 'output' ? 'bg-[#334155]' : 'bg-white text-[#1E293B]'} hover:bg-[#1E293B] hover:text-white`}
              onClick={() => setOwnerPanelMode('output')}
            >
              Output
            </Button>
            <Button
              className="h-9 bg-white text-[#1E293B] hover:bg-[#F8FAFC]"
              onClick={clearBoardToEmpty}
            >
              New Empty Map
            </Button>
            <Button
              className={`h-9 ${layoutPreset === 'focus' ? 'bg-[#1D4ED8] text-white' : 'bg-white text-[#1E293B]'} hover:bg-[#1E40AF] hover:text-white`}
              onClick={() => setLayoutPreset('focus')}
            >
              Focus Map
            </Button>
            <Button
              className={`h-9 ${layoutPreset === 'balanced' ? 'bg-[#1D4ED8] text-white' : 'bg-white text-[#1E293B]'} hover:bg-[#1E40AF] hover:text-white`}
              onClick={() => setLayoutPreset('balanced')}
            >
              Balanced
            </Button>
            <Button
              className={`h-9 ${layoutPreset === 'wide' ? 'bg-[#1D4ED8] text-white' : 'bg-white text-[#1E293B]'} hover:bg-[#1E40AF] hover:text-white`}
              onClick={() => setLayoutPreset('wide')}
            >
              Wide Menu
            </Button>
            <Button
              className="h-9 bg-white text-[#1E293B] hover:bg-[#F8FAFC]"
              onClick={() => setShowAdvancedMenu((prev) => !prev)}
            >
              <Settings2 className="mr-1 h-4 w-4" />
              Advanced
              {showAdvancedMenu ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
            </Button>
          </div>
          {showAdvancedMenu && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#DBEAFE] pt-3">
              <label className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] text-[#334155]">
                Autosave
                <input
                  type="checkbox"
                  checked={autosaveEnabled}
                  onChange={(event) => setAutosaveEnabled(event.target.checked)}
                />
              </label>
              <label className="text-xs font-medium text-[#334155]">Connection</label>
              <select
                value={connectType}
                onChange={(event) => setConnectType(event.target.value as EdgeDataType)}
                className="h-8 rounded-lg border border-[#CBD5E1] bg-white px-2 text-xs text-[#0F172A]"
              >
                <option value="ai">AI</option>
                <option value="api">API</option>
                <option value="code">Code</option>
              </select>
              <div className="mx-1 h-5 w-px bg-[#DBEAFE]" />
              <span className="text-xs font-medium text-[#334155]">Tools</span>
              <Button
                size="sm"
                className={`h-8 ${activeTool === 'select' ? 'bg-[#1D4ED8] text-white' : 'bg-white text-[#1E293B]'} hover:bg-[#1E40AF] hover:text-white`}
                onClick={() => setActiveTool('select')}
              >
                <MousePointer2 className="mr-1 h-3.5 w-3.5" />
                Select
              </Button>
              <Button
                size="sm"
                className={`h-8 ${activeTool === 'text' ? 'bg-[#7C3AED] text-white' : 'bg-white text-[#1E293B]'} hover:bg-[#6D28D9] hover:text-white`}
                onClick={() => setActiveTool('text')}
              >
                <Type className="mr-1 h-3.5 w-3.5" />
                Text
              </Button>
              <Button
                size="sm"
                className={`h-8 ${activeTool === 'pencil' ? 'bg-[#0F766E] text-white' : 'bg-white text-[#1E293B]'} hover:bg-[#115E59] hover:text-white`}
                onClick={() => setActiveTool('pencil')}
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Pencil
              </Button>
              <Button
                size="sm"
                className={`h-8 ${activeTool === 'eraser' ? 'bg-[#B91C1C] text-white' : 'bg-white text-[#1E293B]'} hover:bg-[#991B1B] hover:text-white`}
                onClick={() => setActiveTool('eraser')}
              >
                <Eraser className="mr-1 h-3.5 w-3.5" />
                Eraser
              </Button>
              <input
                type="color"
                value={drawColor}
                onChange={(event) => setDrawColor(event.target.value)}
                className="h-8 w-9 rounded border border-[#CBD5E1] bg-white p-1"
                title="Pencil color"
              />
              <input
                type="number"
                min={1}
                max={24}
                value={drawWidth}
                onChange={(event) => setDrawWidth(Number(event.target.value))}
                className="h-8 w-16 rounded border border-[#CBD5E1] bg-white px-2 text-xs text-[#0F172A]"
                title="Pencil width"
              />
              <Button
                size="sm"
                className="h-8 bg-white text-[#1E293B] hover:bg-[#F8FAFC]"
                onClick={undoLastStroke}
                disabled={drawStrokes.length === 0}
              >
                Undo Ink
              </Button>
              <Button
                size="sm"
                className="h-8 bg-white text-[#1E293B] hover:bg-[#F8FAFC]"
                onClick={clearAllStrokes}
                disabled={drawStrokes.length === 0}
              >
                Clear Ink
              </Button>
              <Button size="sm" className="h-8 bg-[#2563EB] text-white hover:bg-[#1D4ED8]" onClick={fitView}>
                <Target className="mr-1 h-3.5 w-3.5" />
                Fit
              </Button>
              <Button size="sm" className="h-8 bg-[#1E293B] text-white hover:bg-[#0F172A]" onClick={zoomIn}>
                <ZoomIn className="mr-1 h-3.5 w-3.5" />
                In
              </Button>
              <Button size="sm" className="h-8 bg-[#1E293B] text-white hover:bg-[#0F172A]" onClick={zoomOut}>
                <ZoomOut className="mr-1 h-3.5 w-3.5" />
                Out
              </Button>
              <Button
                size="sm"
                className="h-8 bg-[#0F766E] text-white hover:bg-[#115E59]"
                onClick={() => void validateActiveWorkflow(false)}
                disabled={isValidating}
              >
                Validate
              </Button>
              <Button
                size="sm"
                className="h-8 bg-[#7C2D12] text-white hover:bg-[#9A3412]"
                onClick={() => void validateActiveWorkflow(true)}
                disabled={isValidating}
              >
                Repair
              </Button>
              <Button size="sm" className="h-8 bg-[#DB2777] text-white hover:bg-[#BE185D]" onClick={simulateSignalStorm}>
                Storm
              </Button>
              <Button
                size="sm"
                className="h-8 bg-[#334155] text-white hover:bg-[#1E293B]"
                onClick={replayLastSignals}
                disabled={lastRunCommunications.length === 0}
              >
                Replay
              </Button>
            </div>
          )}
        </section>

        <div className="overflow-x-auto pb-2">
          <div className={`grid min-w-[1180px] gap-4 ${layoutGridClass}`}>
            <aside className="rgb-glow-card space-y-3 rounded-3xl p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0F172A]">AI Worker List</h3>
                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] text-[#4338CA]">
                  drag & drop
                </span>
              </div>
              <p className="rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] px-2 py-1 text-[11px] text-[#1E40AF]">
                For mobile/PC: tap/hold (or click/hold) a worker and drop it on the map. New block appears only when dropped.
              </p>

              <Input
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="Search worker roles..."
                className="h-9 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
              />

              <div className="max-h-[46vh] space-y-2 overflow-auto pr-1">
                {filteredLibrary.map((item) => {
                  const Icon = item.icon
                  const selected = selectedLibraryId === item.id
                  return (
                    <button
                      key={item.id}
                      draggable
                      onDragStart={(event) => onTemplateDragStart(event, item.id)}
                      onClick={() => setSelectedLibraryId(item.id)}
                      className={`rgb-worker-card w-full rounded-xl p-2 text-left transition ${
                        selected ? 'ring-2 ring-[#4338CA]/35' : ''
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${item.accent}22`, color: item.accent }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-xs font-semibold text-[#0F172A]">{item.label}</span>
                        </span>
                        <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] uppercase text-[#475569]">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#334155]">{item.description}</p>
                    </button>
                  )
                })}
              </div>

              {showAdvancedMenu && (
                <>
                  <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-3">
                    <p className="mb-2 text-xs font-semibold text-[#1D4ED8]">Manual Insert (Advanced)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        className="h-8 bg-white text-[#1E293B] hover:bg-[#F8FAFC]"
                        onClick={() => addFromLibrary({ mode: 'root' })}
                      >
                        Root
                      </Button>
                      <Button
                        size="sm"
                        disabled={!selectedNodeId}
                        className="h-8 bg-white text-[#1E293B] hover:bg-[#F8FAFC]"
                        onClick={() => addFromLibrary({ mode: 'child' })}
                      >
                        Child
                      </Button>
                      <Button
                        size="sm"
                        disabled={!selectedNodeId}
                        className="h-8 bg-white text-[#1E293B] hover:bg-[#F8FAFC]"
                        onClick={() => addFromLibrary({ mode: 'sibling' })}
                      >
                        Sibling
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] p-3">
                    <p className="mb-2 text-xs font-semibold text-[#312E81]">Custom Worker (Advanced)</p>
                    <div className="space-y-2">
                      <Input
                        value={customWorkerName}
                        onChange={(event) => setCustomWorkerName(event.target.value)}
                        className="h-8 border-[#A5B4FC] bg-white text-xs text-[#0F172A]"
                        placeholder="Custom role name"
                      />
                      <select
                        value={customWorkerRole}
                        onChange={(event) => setCustomWorkerRole(event.target.value as NodeRole)}
                        className="h-8 w-full rounded-lg border border-[#A5B4FC] bg-white px-2 text-xs text-[#0F172A]"
                      >
                        <option value="manager">Manager</option>
                        <option value="programmer">Programmer</option>
                        <option value="code">Code</option>
                        <option value="buffer">Buffer</option>
                        <option value="storage">Storage</option>
                        <option value="text">Text</option>
                      </select>
                      <Input
                        value={customCapabilitiesText}
                        onChange={(event) => setCustomCapabilitiesText(event.target.value)}
                        className="h-8 border-[#A5B4FC] bg-white text-xs text-[#0F172A]"
                        placeholder="Capabilities comma-separated"
                      />
                      <textarea
                        value={customWorkerPrompt}
                        onChange={(event) => setCustomWorkerPrompt(event.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-[#A5B4FC] bg-white px-2 py-1 text-xs text-[#0F172A] outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          className="h-8 bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                          onClick={() => addFromLibrary({ mode: 'root', item: buildCustomItem() })}
                        >
                          <PlusCircle className="mr-1 h-3.5 w-3.5" />
                          Add Root
                        </Button>
                        <Button
                          size="sm"
                          disabled={!selectedNodeId}
                          className="h-8 bg-[#4338CA] text-white hover:bg-[#3730A3]"
                          onClick={() => addFromLibrary({ mode: 'child', item: buildCustomItem() })}
                        >
                          Add Child
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3">
                    <p className="mb-2 text-xs font-semibold text-[#1E293B]">Structure Controls</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        className="h-8 bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                        onClick={() => applyMindMapLayout()}
                      >
                        Arrange
                      </Button>
                      <Button
                        size="sm"
                        disabled={!selectedNodeId}
                        className="h-8 bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                        onClick={toggleCollapseSelected}
                      >
                        {selectedNodeId && collapsedNodeIds.includes(selectedNodeId) ? 'Expand' : 'Collapse'}
                      </Button>
                      <Button
                        size="sm"
                        disabled={!selectedNodeId}
                        className="h-8 bg-[#DC2626] text-white hover:bg-[#B91C1C]"
                        onClick={deleteSelectedBranch}
                      >
                        Delete
                      </Button>
                    </div>
                    <label className="mt-2 flex items-center justify-between text-[11px] text-[#334155]">
                      Auto-connect dropped nodes
                      <input
                        type="checkbox"
                        checked={autoConnectFromSelection}
                        onChange={(event) => setAutoConnectFromSelection(event.target.checked)}
                      />
                    </label>
                  </div>
                </>
              )}
            </aside>

            <div
              ref={flowWrapperRef}
              className="rgb-wave-space owner-schematic-grid relative h-[82vh] overflow-hidden rounded-3xl border border-[#E2E8F0]"
              onDragOver={onCanvasDragOver}
              onDrop={onCanvasDrop}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={onPaneClick}
                onInit={setFlowInstance}
                panOnScroll={activeTool === 'select' || activeTool === 'text'}
                selectionOnDrag={activeTool === 'select'}
                elementsSelectable={activeTool === 'select' || activeTool === 'text'}
                nodesDraggable={activeTool === 'select' || activeTool === 'text'}
                nodesConnectable={activeTool === 'select' || activeTool === 'text'}
                snapToGrid
                snapGrid={[20, 20]}
                defaultEdgeOptions={{ type: 'smoothstep' }}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#C7D2FE" gap={20} />
                <MiniMap
                  pannable
                  zoomable
                  nodeStrokeWidth={2}
                  nodeColor={(node) => {
                    if (node.type === 'manager') return '#F59E0B'
                    if (node.type === 'programmer') return '#7C3AED'
                    if (node.type === 'text') return '#0F172A'
                    if (node.type === 'buffer') return '#B45309'
                    if (node.type === 'storage') return '#0F766E'
                    return '#2563EB'
                  }}
                />
                <Controls />
              </ReactFlow>

              <div
                className={`absolute inset-0 z-10 ${
                  activeTool === 'pencil' || activeTool === 'eraser' ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
                onMouseDown={startDrawing}
                onMouseMove={moveDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{
                  cursor:
                    activeTool === 'pencil'
                      ? 'crosshair'
                      : activeTool === 'eraser'
                      ? 'cell'
                      : 'default',
                }}
              >
                <svg className="h-full w-full">
                  {drawStrokes.map((stroke) => (
                    <polyline
                      key={stroke.id}
                      points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
                      fill="none"
                      stroke={stroke.color}
                      strokeWidth={stroke.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                </svg>
              </div>

              <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-[#BFDBFE] bg-white/90 px-3 py-2 text-[11px] text-[#1E3A8A] shadow">
                Drag workers from left. Black dot = input, red dot = output. Use Text tool to place labels and Pencil tool to draw freely.
              </div>

              <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-[#FDBA74] bg-[#FFF7ED]/90 px-3 py-2 text-[11px] text-[#9A3412] shadow">
                <span className="inline-flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5" />
                  {activeSignalCount > 0
                    ? `${activeSignalCount} live communication pulse(s)`
                    : 'Signal lane waiting for next run'}
                </span>
                <div className="mt-1 text-[10px] text-[#7C2D12]">Active tool: {activeTool}</div>
              </div>

              {nodes.length === 0 && (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <div className="max-w-md rounded-2xl border border-dashed border-[#93C5FD] bg-white/90 px-4 py-3 text-center shadow">
                    <p className="text-sm font-semibold text-[#1D4ED8]">Empty Schematic Map</p>
                    <p className="mt-1 text-xs text-[#334155]">
                      Start by dragging a worker from the left menu into this map area.
                      The block appears only after drop.
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute right-4 top-4 flex gap-2">
                <Button
                  size="sm"
                  className="h-8 bg-white text-[#1E293B] shadow hover:bg-[#F8FAFC]"
                  onClick={zoomIn}
                >
                  <ZoomIn className="mr-1 h-4 w-4" />
                  In
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-white text-[#1E293B] shadow hover:bg-[#F8FAFC]"
                  onClick={zoomOut}
                >
                  <ZoomOut className="mr-1 h-4 w-4" />
                  Out
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-[#2563EB] text-white shadow hover:bg-[#1D4ED8]"
                  onClick={fitView}
                >
                  Fit View
                </Button>
              </div>
            </div>

            <aside className="rgb-glow-card space-y-3 rounded-3xl p-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#0F172A]">Owner Control Window</h3>
                <p className="text-[11px] text-[#475569]">
                  Keep it simple: use Prompt / Code / Todo. Open Advanced only when needed.
                </p>
                <div className="grid grid-cols-4 gap-1">
                  <Button
                    size="sm"
                    className={`h-7 ${ownerPanelMode === 'prompts' ? 'bg-[#1D4ED8]' : 'bg-white text-[#334155]'} hover:bg-[#1E40AF] hover:text-white`}
                    onClick={() => setOwnerPanelMode('prompts')}
                  >
                    Prompt
                  </Button>
                  <Button
                    size="sm"
                    className={`h-7 ${ownerPanelMode === 'inspect' ? 'bg-[#7C3AED]' : 'bg-white text-[#334155]'} hover:bg-[#6D28D9] hover:text-white`}
                    onClick={() => setOwnerPanelMode('inspect')}
                  >
                    Code
                  </Button>
                  <Button
                    size="sm"
                    className={`h-7 ${ownerPanelMode === 'todo' ? 'bg-[#0F766E]' : 'bg-white text-[#334155]'} hover:bg-[#115E59] hover:text-white`}
                    onClick={() => setOwnerPanelMode('todo')}
                  >
                    Todo
                  </Button>
                  <Button
                    size="sm"
                    className={`h-7 ${ownerPanelMode === 'output' ? 'bg-[#334155]' : 'bg-white text-[#334155]'} hover:bg-[#1E293B] hover:text-white`}
                    onClick={() => setOwnerPanelMode('output')}
                  >
                    Output
                  </Button>
                </div>
              </div>

              <div
                className={`space-y-2 rounded-xl border bg-[#EFF6FF] p-3 ${
                  ownerPanelMode === 'prompts'
                    ? 'border-[#1D4ED8] ring-2 ring-[#1D4ED8]/25'
                    : 'border-[#BFDBFE]'
                }`}
                onClick={() => setOwnerPanelMode('prompts')}
              >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#1D4ED8]">Prompt Control</p>
                    {isLoadingPrompts && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1D4ED8]" />}
                  </div>
                  <label className="text-[11px] text-[#334155]">Prompt profile title</label>
                  <Input
                    value={promptProfileTitle}
                    onChange={(event) => setPromptProfileTitle(event.target.value)}
                    className="h-8 border-[#93C5FD] bg-white text-xs text-[#0F172A]"
                    placeholder="e.g. Owner Direction"
                  />
                  <label className="text-[11px] text-[#334155]">Global prompt (all AIs)</label>
                  <textarea
                    value={globalPromptDraft}
                    onChange={(event) => setGlobalPromptDraft(event.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-[#93C5FD] bg-white px-2 py-1 text-xs text-[#0F172A] outline-none"
                    placeholder="Write global company strategy, style, constraints..."
                  />
                  {selectedNode && (
                    <>
                      <label className="text-[11px] text-[#334155]">
                        Selected AI prompt ({selectedNode.data.label})
                      </label>
                      <textarea
                        value={selectedNode.data.prompt}
                        onChange={(event) => patchNode(selectedNode.id, { prompt: event.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-[#93C5FD] bg-white px-2 py-1 text-xs text-[#0F172A] outline-none"
                      />
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="h-8 bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
                      onClick={saveOwnerPrompts}
                      disabled={isSavingPrompts}
                    >
                      {isSavingPrompts ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                      Save Prompts
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 bg-white text-[#1D4ED8] hover:bg-[#DBEAFE]"
                      onClick={applyPromptToAllWorkers}
                    >
                      Apply to all AIs
                    </Button>
                  </div>
              </div>

              <div
                className={`space-y-2 rounded-xl border bg-[#ECFDF5] p-3 ${
                  ownerPanelMode === 'todo'
                    ? 'border-[#059669] ring-2 ring-[#059669]/25'
                    : 'border-[#A7F3D0]'
                }`}
                onClick={() => setOwnerPanelMode('todo')}
              >
                  <p className="text-xs font-semibold text-[#065F46]">Owner Todo + Async Manager</p>
                  <label className="text-[11px] text-[#065F46]">TODO</label>
                  <textarea
                    value={ownerTodoText}
                    onChange={(event) => setOwnerTodoText(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-[#6EE7B7] bg-white px-2 py-1 text-xs text-[#064E3B] outline-none"
                    placeholder="List objectives and tasks here..."
                  />
                  <label className="text-[11px] text-[#065F46]">Async Manager Notes / Prompts</label>
                  <textarea
                    value={ownerAsyncNote}
                    onChange={(event) => setOwnerAsyncNote(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-[#6EE7B7] bg-white px-2 py-1 text-xs text-[#064E3B] outline-none"
                    placeholder="Write async hand-off instructions for manager AI..."
                  />
                  <Button size="sm" className="h-8 bg-[#059669] text-white hover:bg-[#047857]" onClick={saveOwnerNotes}>
                    Save Todo/Async
                  </Button>
              </div>

              <div
                className={`space-y-2 rounded-xl border bg-[#EEF2FF] p-3 ${
                  ownerPanelMode === 'output'
                    ? 'border-[#4338CA] ring-2 ring-[#4338CA]/25'
                    : 'border-[#C7D2FE]'
                }`}
                onClick={() => setOwnerPanelMode('output')}
              >
                <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3">
                  <p className="mb-1 text-xs font-semibold text-[#1D4ED8]">Live Task Output</p>
                  <pre className="max-h-24 overflow-auto whitespace-pre-wrap text-[11px] text-[#1F2937]">
                    {runOutput || 'No execution yet.'}
                  </pre>
                </div>
                <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-3">
                  <p className="mb-1 text-xs font-semibold text-[#1D4ED8]">Running Thoughts</p>
                  <div className="max-h-24 space-y-1 overflow-auto">
                    {runningThoughts.length === 0 && (
                      <p className="text-[11px] text-[#475569]">Run workflow to see live thought lines.</p>
                    )}
                    {runningThoughts.map((line, index) => (
                      <p key={`${line}-${index}`} className="text-[11px] text-[#1F2937]">
                        • {line}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-[#C7D2FE] bg-white p-3">
                  <p className="mb-1 text-xs font-semibold text-[#4338CA]">Recent Activity</p>
                  <div className="max-h-24 space-y-2 overflow-auto">
                    {auditRows.length === 0 && <p className="text-[11px] text-[#475569]">No entries yet.</p>}
                    {auditRows.slice(0, 6).map((row) => (
                      <div key={row.id} className="rounded border border-[#E2E8F0] bg-white p-2">
                        <div className="text-[11px] font-medium text-[#1E3A8A]">{row.action}</div>
                        <div className="text-[10px] text-[#475569]">{new Date(row.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={`space-y-2 rounded-xl border bg-white p-3 ${
                  ownerPanelMode === 'inspect'
                    ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/20'
                    : 'border-[#CBD5E1]'
                }`}
                onClick={() => setOwnerPanelMode('inspect')}
              >
                {!selectedNode && (
                  <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-3 text-xs text-[#64748B]">
                    Select a block to edit worker settings and code.
                  </div>
                )}
                {selectedNode && (
                  <div className="space-y-2 rounded-xl border border-[#CBD5E1] bg-white p-3">
                      <label className="text-[11px] text-[#334155]">Node label</label>
                      <Input
                        value={selectedNode.data.label}
                        onChange={(event) => patchNode(selectedNode.id, { label: event.target.value })}
                        className="h-8 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />

                      <label className="text-[11px] text-[#334155]">Worker type</label>
                      <Input
                        value={selectedNode.data.workerType || ''}
                        onChange={(event) => patchNode(selectedNode.id, { workerType: event.target.value })}
                        className="h-8 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />

                      <label className="text-[11px] text-[#334155]">Role</label>
                      <select
                        value={selectedNode.data.role}
                        onChange={(event) => {
                          const nextRole = event.target.value as NodeRole
                          setIsDirty(true)
                          setNodes((prev) =>
                            prev.map((node) =>
                              node.id === selectedNode.id
                                ? {
                                    ...node,
                                    type: nextRole,
                                    data: {
                                      ...node.data,
                                      role: nextRole,
                                      textContent:
                                        nextRole === 'text'
                                          ? node.data.textContent || node.data.label || 'Text label'
                                          : undefined,
                                      textStyle:
                                        nextRole === 'text'
                                          ? {
                                              ...defaultTextStyle,
                                              ...(node.data.textStyle || {}),
                                            }
                                          : undefined,
                                      bufferConfig:
                                        nextRole === 'buffer'
                                          ? {
                                              maxItems: node.data.bufferConfig?.maxItems || 25,
                                              releaseMode:
                                                node.data.bufferConfig?.releaseMode || 'when-target-ready',
                                              dropPolicy: node.data.bufferConfig?.dropPolicy || 'oldest',
                                            }
                                          : undefined,
                                      storageConfig:
                                        nextRole === 'storage'
                                          ? {
                                              storageType: node.data.storageConfig?.storageType || 'database',
                                              key: node.data.storageConfig?.key || `storage-${node.id}`,
                                              allowWrite: node.data.storageConfig?.allowWrite !== false,
                                              allowRead: node.data.storageConfig?.allowRead !== false,
                                              schemaHint: node.data.storageConfig?.schemaHint || 'json',
                                            }
                                          : undefined,
                                      codeSnippet:
                                        nextRole === 'code'
                                          ? node.data.codeSnippet || {
                                              language: 'typescript',
                                              content: 'export const runTask = () => "custom function output";\n',
                                            }
                                          : undefined,
                                    },
                                  }
                                : node
                            )
                          )
                        }}
                        className="h-8 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 text-xs text-[#0F172A]"
                      >
                        <option value="manager">Manager</option>
                        <option value="programmer">Programmer</option>
                        <option value="code">Code</option>
                        <option value="buffer">Buffer</option>
                        <option value="storage">Storage</option>
                        <option value="text">Text</option>
                      </select>

                      <label className="text-[11px] text-[#334155]">Capabilities (comma)</label>
                      <Input
                        value={(selectedNode.data.capabilities || []).join(', ')}
                        onChange={(event) =>
                          patchNode(selectedNode.id, { capabilities: parseCapabilities(event.target.value) })
                        }
                        className="h-8 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                      />

                      {selectedNode.data.role !== 'text' && (
                        <>
                          <label className="text-[11px] text-[#334155]">Mission prompt</label>
                          <textarea
                            value={selectedNode.data.prompt}
                            onChange={(event) => patchNode(selectedNode.id, { prompt: event.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-xs text-[#0F172A] outline-none"
                          />
                        </>
                      )}

                      {selectedNode.data.role === 'text' && (
                        <>
                          <label className="text-[11px] text-[#334155]">Text content</label>
                          <textarea
                            value={selectedNode.data.textContent || ''}
                            onChange={(event) => patchNode(selectedNode.id, { textContent: event.target.value })}
                            rows={4}
                            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-xs text-[#0F172A] outline-none"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-[#334155]">Font</label>
                              <select
                                value={selectedNode.data.textStyle?.fontFamily || defaultTextStyle.fontFamily}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    textStyle: {
                                      ...defaultTextStyle,
                                      ...(selectedNode.data.textStyle || {}),
                                      fontFamily: event.target.value,
                                    },
                                  })
                                }
                                className="h-8 w-full rounded border border-[#CBD5E1] bg-white px-2 text-[11px] text-[#334155]"
                              >
                                {textFontOptions.map((font) => (
                                  <option key={font} value={font}>
                                    {font}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] text-[#334155]">Size</label>
                              <input
                                type="number"
                                min={10}
                                max={120}
                                value={selectedNode.data.textStyle?.fontSize || defaultTextStyle.fontSize}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    textStyle: {
                                      ...defaultTextStyle,
                                      ...(selectedNode.data.textStyle || {}),
                                      fontSize: Number(event.target.value),
                                    },
                                  })
                                }
                                className="h-8 w-full rounded border border-[#CBD5E1] bg-white px-2 text-[11px] text-[#334155]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-[#334155]">Text color</label>
                              <input
                                type="color"
                                value={selectedNode.data.textStyle?.color || '#0F172A'}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    textStyle: {
                                      ...defaultTextStyle,
                                      ...(selectedNode.data.textStyle || {}),
                                      color: event.target.value,
                                    },
                                  })
                                }
                                className="h-8 w-full rounded border border-[#CBD5E1] bg-white px-1"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-[#334155]">Background</label>
                              <input
                                type="color"
                                value={
                                  selectedNode.data.textStyle?.backgroundColor &&
                                  selectedNode.data.textStyle.backgroundColor !== 'transparent'
                                    ? selectedNode.data.textStyle.backgroundColor
                                    : '#ffffff'
                                }
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    textStyle: {
                                      ...defaultTextStyle,
                                      ...(selectedNode.data.textStyle || {}),
                                      backgroundColor: event.target.value,
                                    },
                                  })
                                }
                                className="h-8 w-full rounded border border-[#CBD5E1] bg-white px-1"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <label className="flex items-center justify-between rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-1 text-[11px] text-[#334155]">
                              Italic
                              <input
                                type="checkbox"
                                checked={Boolean(selectedNode.data.textStyle?.italic)}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    textStyle: {
                                      ...defaultTextStyle,
                                      ...(selectedNode.data.textStyle || {}),
                                      italic: event.target.checked,
                                    },
                                  })
                                }
                              />
                            </label>
                            <label className="flex items-center justify-between rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-1 text-[11px] text-[#334155]">
                              Underline
                              <input
                                type="checkbox"
                                checked={Boolean(selectedNode.data.textStyle?.underline)}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    textStyle: {
                                      ...defaultTextStyle,
                                      ...(selectedNode.data.textStyle || {}),
                                      underline: event.target.checked,
                                    },
                                  })
                                }
                              />
                            </label>
                            <label className="flex items-center justify-between rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-1 text-[11px] text-[#334155]">
                              Shadow
                              <input
                                type="checkbox"
                                checked={Boolean(selectedNode.data.textStyle?.shadow)}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    textStyle: {
                                      ...defaultTextStyle,
                                      ...(selectedNode.data.textStyle || {}),
                                      shadow: event.target.checked,
                                    },
                                  })
                                }
                              />
                            </label>
                          </div>
                        </>
                      )}

                      {selectedNode.data.role === 'code' && (
                        <>
                          <label className="text-[11px] text-[#334155]">Code editor (owner quick edit)</label>
                          <textarea
                            value={selectedNode.data.codeSnippet?.content || ''}
                            onChange={(event) =>
                              patchNode(selectedNode.id, {
                                codeSnippet: {
                                  language: selectedNode.data.codeSnippet?.language || 'typescript',
                                  content: event.target.value,
                                },
                              })
                            }
                            rows={8}
                            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 font-mono text-[11px] text-[#0F172A] outline-none"
                          />
                        </>
                      )}

                      {selectedNode.data.role === 'buffer' && (
                        <>
                          <label className="text-[11px] text-[#334155]">Buffer max items</label>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={selectedNode.data.bufferConfig?.maxItems || 25}
                            onChange={(event) =>
                              patchNode(selectedNode.id, {
                                bufferConfig: {
                                  maxItems: Number(event.target.value),
                                  releaseMode:
                                    selectedNode.data.bufferConfig?.releaseMode || 'when-target-ready',
                                  dropPolicy: selectedNode.data.bufferConfig?.dropPolicy || 'oldest',
                                },
                              })
                            }
                            className="h-8 w-full rounded border border-[#CBD5E1] bg-white px-2 text-[11px] text-[#334155]"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-[#334155]">Release mode</label>
                              <select
                                value={selectedNode.data.bufferConfig?.releaseMode || 'when-target-ready'}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    bufferConfig: {
                                      maxItems: selectedNode.data.bufferConfig?.maxItems || 25,
                                      releaseMode: event.target.value as 'when-target-ready' | 'immediate',
                                      dropPolicy: selectedNode.data.bufferConfig?.dropPolicy || 'oldest',
                                    },
                                  })
                                }
                                className="h-8 w-full rounded border border-[#CBD5E1] bg-white px-2 text-[11px] text-[#334155]"
                              >
                                <option value="when-target-ready">When target ready</option>
                                <option value="immediate">Immediate</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] text-[#334155]">Drop policy</label>
                              <select
                                value={selectedNode.data.bufferConfig?.dropPolicy || 'oldest'}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    bufferConfig: {
                                      maxItems: selectedNode.data.bufferConfig?.maxItems || 25,
                                      releaseMode:
                                        selectedNode.data.bufferConfig?.releaseMode || 'when-target-ready',
                                      dropPolicy: event.target.value as 'oldest' | 'newest' | 'reject',
                                    },
                                  })
                                }
                                className="h-8 w-full rounded border border-[#CBD5E1] bg-white px-2 text-[11px] text-[#334155]"
                              >
                                <option value="oldest">Drop oldest</option>
                                <option value="newest">Drop newest</option>
                                <option value="reject">Reject new</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedNode.data.role === 'storage' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-[#334155]">Storage type</label>
                              <select
                                value={selectedNode.data.storageConfig?.storageType || 'database'}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    storageConfig: {
                                      ...selectedNode.data.storageConfig,
                                      storageType: event.target.value as 'database' | 'text' | 'excel',
                                    },
                                  })
                                }
                                className="h-8 w-full rounded border border-[#CBD5E1] bg-white px-2 text-[11px] text-[#334155]"
                              >
                                <option value="database">Database</option>
                                <option value="text">Text</option>
                                <option value="excel">Excel</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] text-[#334155]">Schema hint</label>
                              <Input
                                value={selectedNode.data.storageConfig?.schemaHint || ''}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    storageConfig: {
                                      ...selectedNode.data.storageConfig,
                                      schemaHint: event.target.value,
                                    },
                                  })
                                }
                                className="h-8 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                              />
                            </div>
                          </div>

                          <label className="text-[11px] text-[#334155]">Storage key</label>
                          <Input
                            value={selectedNode.data.storageConfig?.key || ''}
                            onChange={(event) =>
                              patchNode(selectedNode.id, {
                                storageConfig: {
                                  ...selectedNode.data.storageConfig,
                                  key: event.target.value,
                                },
                              })
                            }
                            className="h-8 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <label className="flex items-center justify-between rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-1 text-[11px] text-[#334155]">
                              Allow write
                              <input
                                type="checkbox"
                                checked={selectedNode.data.storageConfig?.allowWrite !== false}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    storageConfig: {
                                      ...selectedNode.data.storageConfig,
                                      allowWrite: event.target.checked,
                                    },
                                  })
                                }
                              />
                            </label>
                            <label className="flex items-center justify-between rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-1 text-[11px] text-[#334155]">
                              Allow read
                              <input
                                type="checkbox"
                                checked={selectedNode.data.storageConfig?.allowRead !== false}
                                onChange={(event) =>
                                  patchNode(selectedNode.id, {
                                    storageConfig: {
                                      ...selectedNode.data.storageConfig,
                                      allowRead: event.target.checked,
                                    },
                                  })
                                }
                              />
                            </label>
                          </div>
                        </>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <Button size="sm" className="h-8 bg-[#1D4ED8] text-white hover:bg-[#1E40AF]" onClick={duplicateSelectedNode}>
                          Duplicate
                        </Button>
                        <Button size="sm" className="h-8 bg-[#7C3AED] text-white hover:bg-[#6D28D9]" onClick={toggleCollapseSelected}>
                          {collapsedNodeIds.includes(selectedNode.id) ? 'Expand' : 'Collapse'}
                        </Button>
                        <Button size="sm" className="h-8 bg-[#DC2626] text-white hover:bg-[#B91C1C]" onClick={deleteSelectedBranch}>
                          Delete
                        </Button>
                      </div>

                      {showAdvancedMenu && (
                        <div className="grid grid-cols-2 gap-2 border-t border-[#E2E8F0] pt-2">
                          <label className="flex items-center justify-between rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-1 text-[11px] text-[#334155]">
                            Error Check
                            <input
                              type="checkbox"
                              checked={selectedNode.data.errorCheckEnabled}
                              onChange={(event) =>
                                patchNode(selectedNode.id, { errorCheckEnabled: event.target.checked })
                              }
                            />
                          </label>
                          <select
                            value={selectedNode.data.monitoring}
                            onChange={(event) =>
                              patchNode(selectedNode.id, {
                                monitoring: event.target.value as WorkflowNodeData['monitoring'],
                              })
                            }
                            className="h-8 rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 text-[11px] text-[#334155]"
                          >
                            <option value="none">No monitor</option>
                            <option value="sentry">Sentry</option>
                            <option value="newrelic">New Relic</option>
                          </select>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {showAdvancedMenu && (
                <>
                  <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#92400E]">Workflow Validation</p>
                      <Button
                        size="sm"
                        className="h-7 bg-white text-[#92400E] hover:bg-[#FEF3C7]"
                        onClick={() => void validateActiveWorkflow(false)}
                        disabled={isValidating || !activeWorkflowId}
                      >
                        Refresh
                      </Button>
                    </div>
                    {!validationReport && <p className="text-[11px] text-[#92400E]">No validation report yet.</p>}
                    {validationReport && (
                      <div className="space-y-2">
                        <p className="text-[11px] text-[#92400E]">
                          Score {validationReport.score}/100 • Errors {validationReport.summary.errors} • Warnings{' '}
                          {validationReport.summary.warnings}
                        </p>
                        <div className="max-h-24 space-y-1 overflow-auto">
                          {validationReport.issues.slice(0, 6).map((issue, index) => (
                            <div
                              key={`${issue.code}-${index}`}
                              className={`rounded border px-2 py-1 text-[10px] ${
                                issue.severity === 'error'
                                  ? 'border-red-200 bg-red-50 text-red-700'
                                  : issue.severity === 'warning'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-blue-200 bg-blue-50 text-blue-700'
                              }`}
                            >
                              [{issue.severity}] {issue.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#1D4ED8]">Reliability Matrix</p>
                      <Button
                        size="sm"
                        className="h-7 bg-white text-[#1D4ED8] hover:bg-[#DBEAFE]"
                        onClick={() => void fetchSystemHealth()}
                        disabled={isHealthLoading}
                      >
                        {isHealthLoading ? 'Checking...' : 'Refresh'}
                      </Button>
                    </div>
                    <div className="max-h-24 space-y-1 overflow-auto">
                      {systemHealthChecks.map((check) => (
                        <div
                          key={check.id}
                          className={`rounded border px-2 py-1 text-[10px] ${
                            check.status === 'ok'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : check.status === 'warning'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          <span className="font-semibold">{check.label}</span>: {check.detail}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#065F46]">Memory Vault</p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#047857]">
                        <Database className="h-3.5 w-3.5" />
                        {memoryRecords.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={memoryNamespace}
                        onChange={(event) => setMemoryNamespace(event.target.value)}
                        className="h-8 border-[#6EE7B7] bg-white text-xs text-[#064E3B]"
                        placeholder="namespace"
                      />
                      <Input
                        value={memoryKey}
                        onChange={(event) => setMemoryKey(event.target.value)}
                        className="h-8 border-[#6EE7B7] bg-white text-xs text-[#064E3B]"
                        placeholder="key"
                      />
                    </div>
                    <textarea
                      value={memoryValue}
                      onChange={(event) => setMemoryValue(event.target.value)}
                      rows={2}
                      className="mt-2 w-full rounded-lg border border-[#6EE7B7] bg-white px-2 py-1 text-xs text-[#064E3B] outline-none"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 bg-[#059669] text-white hover:bg-[#047857]"
                        onClick={saveMemoryRecord}
                        disabled={isMemorySaving || !activeWorkflowId}
                      >
                        Store
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-white text-[#065F46] hover:bg-[#F0FDF4]"
                        onClick={fetchMemory}
                        disabled={isMemoryLoading || !activeWorkflowId}
                      >
                        Refresh
                      </Button>
                    </div>
                    <div className="mt-2 max-h-28 space-y-1 overflow-auto">
                      {memoryRecords.slice(0, 8).map((record) => (
                        <div key={record.id} className="rounded border border-[#A7F3D0] bg-white p-2 text-[10px] text-[#065F46]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{record.namespace}/{record.key}</span>
                            <button
                              type="button"
                              className="rounded border border-[#A7F3D0] px-1 py-0.5 text-[10px] text-[#065F46]"
                              onClick={() => deleteMemoryVaultEntry(record.namespace, record.key)}
                            >
                              del
                            </button>
                          </div>
                          <p className="mt-1 break-all text-[#047857]">{formatMemoryValue(record.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
      </div>

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-20 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-lg border px-3 py-2 text-xs shadow-lg ${
                toast.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : toast.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </ReactFlowProvider>
  )
}
