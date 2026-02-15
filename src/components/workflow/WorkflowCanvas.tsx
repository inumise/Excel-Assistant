'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
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
  BadgeDollarSign,
  BarChart3,
  BriefcaseBusiness,
  Calculator,
  Code2,
  FileSpreadsheet,
  Handshake,
  Headset,
  Loader2,
  Megaphone,
  Palette,
  PlusCircle,
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
  NodeRole,
  Workflow,
  WorkflowEdge,
  WorkflowNodeData,
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

const edgePalette: Record<EdgeDataType, string> = {
  api: '#2563EB',
  code: '#059669',
  ai: '#7C3AED',
}

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

  return {
    ...edge,
    animated: dataType === 'ai',
    label: edge.label || dataType.toUpperCase(),
    style: {
      stroke: edgePalette[dataType],
      strokeWidth: 2.4,
    },
    markerEnd: {
      type: 'arrowclosed',
      color: edgePalette[dataType],
    },
    data: { ...(existingData || {}), dataType },
  } as Edge
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
      <Handle type="target" position={Position.Left} className="!bg-[#F59E0B]" />
      <p className="mb-2 text-xs text-[#1F2937]">{data.prompt}</p>
      <div className="rounded-lg border border-[#FCD34D]/50 bg-[#FFFBEB] p-2 text-[11px] text-[#92400E]">
        Controls strategy, budgets, priorities, and cross-team escalation.
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#F59E0B]" />
    </NodeShell>
  )
}

function ProgrammerNode({ id, data, selected }: NodeProps<FlowNodeData>) {
  return (
    <NodeShell title={data.label} subtitle={data.workerType || 'Programmer Node'} selected={selected}>
      <Handle type="target" position={Position.Left} className="!bg-[#7C3AED]" />
      <p className="mb-2 text-xs text-[#1F2937]">{data.prompt}</p>
      <div className="rounded-lg border border-[#C4B5FD]/60 bg-[#F5F3FF] p-2 text-[11px] text-[#5B21B6]">
        Handles logic, content generation, and process automation orchestration.
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#7C3AED]" />
    </NodeShell>
  )
}

function CodeNode({ id, data, selected }: NodeProps<FlowNodeData>) {
  return (
    <NodeShell title={data.label} subtitle={data.workerType || 'Function Node'} selected={selected}>
      <Handle type="target" position={Position.Left} className="!bg-[#2563EB]" />
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
      <Handle type="source" position={Position.Right} className="!bg-[#2563EB]" />
    </NodeShell>
  )
}

const nodeTypes = {
  manager: ManagerNode,
  programmer: ProgrammerNode,
  code: CodeNode,
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
  const [runInput, setRunInput] = useState('run workflow-web-design-factory')
  const [runOutput, setRunOutput] = useState('')
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

  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null)
  const flowWrapperRef = useRef<HTMLDivElement | null>(null)

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
      setIsDirty(false)
      setLastSavedAt(workflow.updatedAt)
    },
    [patchNode, setEdges, setNodes, userId]
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
      }
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Failed to load workflows.',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }, [hydrateWorkflow, pushToast, userId])

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

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit, runOutput])

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
      edgeType: customWorkerRole === 'code' ? 'code' : 'ai',
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
          throw new Error(`Save failed (${response.status})`)
        }
        const data = await response.json()
        const saved = data.workflow as Workflow
        setWorkflows((prev) => prev.map((item) => (item.id === saved.id ? saved : item)))
        hydrateWorkflow(saved)
        setIsDirty(false)
        setLastSavedAt(new Date().toISOString())
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
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || `Run failed (${response.status})`)
      }
      setRunOutput(data.output || data.message || 'No output')
      pushToast('Workflow run completed.', 'success')
    } catch (error) {
      setRunOutput(error instanceof Error ? error.message : 'Workflow execution failed.')
      pushToast(
        error instanceof Error ? error.message : 'Workflow execution failed.',
        'error'
      )
    } finally {
      setIsRunning(false)
    }
  }, [activeWorkflow, pushToast, runInput, userId])

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
            <div className="mr-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#1D4ED8] shadow-sm">
              <Target className="h-4 w-4" />
              CEO Command Board
            </div>

            <div className="rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] text-[#334155]">
              {isDirty ? 'Unsaved changes' : 'Synced'}
              {lastSavedAt ? ` • ${new Date(lastSavedAt).toLocaleTimeString()}` : ''}
            </div>

            <label className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] text-[#334155]">
              Autosave
              <input
                type="checkbox"
                checked={autosaveEnabled}
                onChange={(event) => setAutosaveEnabled(event.target.checked)}
              />
            </label>

            <label className="text-xs font-medium text-[#334155]">Connection Type</label>
            <select
              value={connectType}
              onChange={(event) => setConnectType(event.target.value as EdgeDataType)}
              className="h-9 rounded-lg border border-[#CBD5E1] bg-white px-2 text-xs text-[#0F172A]"
            >
              <option value="ai">AI</option>
              <option value="api">API</option>
              <option value="code">Code</option>
            </select>

            <Input
              value={runInput}
              onChange={(event) => setRunInput(event.target.value)}
              className="min-w-[260px] flex-1 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
              placeholder="Type execution command..."
            />

            <Button className="h-9 bg-[#2563EB] text-white hover:bg-[#1D4ED8]" onClick={fitView}>
              Fit
            </Button>
            <Button className="h-9 bg-[#1E293B] text-white hover:bg-[#0F172A]" onClick={zoomIn}>
              <ZoomIn className="mr-1 h-4 w-4" />
              Zoom
            </Button>
            <Button className="h-9 bg-[#1E293B] text-white hover:bg-[#0F172A]" onClick={zoomOut}>
              <ZoomOut className="mr-1 h-4 w-4" />
              Out
            </Button>
            <Button
              className="h-9 bg-[#4F46E5] text-white hover:bg-[#4338CA]"
              onClick={saveWorkflow}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Save
            </Button>
            <Button
              className="h-9 bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
              onClick={runWorkflow}
              disabled={isRunning}
            >
              {isRunning ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              Run
            </Button>
          </div>
        </section>

        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1180px] gap-4 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
            <aside className="rgb-glow-card space-y-3 rounded-3xl p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0F172A]">Role + Tool Library</h3>
                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] text-[#4338CA]">
                  {filteredLibrary.length} items
                </span>
              </div>

              <Input
                value={librarySearch}
                onChange={(event) => setLibrarySearch(event.target.value)}
                placeholder="Search workers/tools/functions..."
                className="h-9 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
              />

              <div className="max-h-[38vh] space-y-2 overflow-auto pr-1">
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

              <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-3">
                <p className="mb-2 text-xs font-semibold text-[#1D4ED8]">Insert Selected Item</p>
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
                <p className="mb-2 text-xs font-semibold text-[#312E81]">Custom Role Builder</p>
                <div className="space-y-2">
                  <Input
                    value={customWorkerName}
                    onChange={(event) => setCustomWorkerName(event.target.value)}
                    className="h-8 border-[#A5B4FC] bg-white text-xs text-[#0F172A]"
                    placeholder="Custom role name"
                  />
                  <select
                    value={customWorkerRole}
                    onChange={(event) =>
                      setCustomWorkerRole(event.target.value as NodeRole)
                    }
                    className="h-8 w-full rounded-lg border border-[#A5B4FC] bg-white px-2 text-xs text-[#0F172A]"
                  >
                    <option value="manager">Manager</option>
                    <option value="programmer">Programmer</option>
                    <option value="code">Code</option>
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
                      onClick={() =>
                        addFromLibrary({ mode: 'root', item: buildCustomItem() })
                      }
                    >
                      <PlusCircle className="mr-1 h-3.5 w-3.5" />
                      Add Root
                    </Button>
                    <Button
                      size="sm"
                      disabled={!selectedNodeId}
                      className="h-8 bg-[#4338CA] text-white hover:bg-[#3730A3]"
                      onClick={() =>
                        addFromLibrary({ mode: 'child', item: buildCustomItem() })
                      }
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
                    {selectedNodeId && collapsedNodeIds.includes(selectedNodeId)
                      ? 'Expand'
                      : 'Collapse'}
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
                    onChange={(event) =>
                      setAutoConnectFromSelection(event.target.checked)
                    }
                  />
                </label>
              </div>
            </aside>

            <div
              ref={flowWrapperRef}
              className="rgb-wave-space relative h-[82vh] overflow-hidden rounded-3xl border border-[#E2E8F0]"
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
                onPaneClick={() => setSelectedNodeId(null)}
                onInit={setFlowInstance}
                panOnScroll
                selectionOnDrag
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
                    return '#2563EB'
                  }}
                />
                <Controls />
              </ReactFlow>

              <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-[#BFDBFE] bg-white/90 px-3 py-2 text-[11px] text-[#1E3A8A] shadow">
                Drag cards from left. Connect handles to build any possible org/tool/function
                structure.
              </div>

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
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A]">Inspector</h3>
                <p className="text-xs text-[#475569]">
                  Tune selected node behavior, role, and function scope.
                </p>
                <p className="mt-1 text-[10px] text-[#64748B]">
                  Shortcuts: Ctrl/Cmd+S Save, Ctrl/Cmd+Enter Run, Ctrl/Cmd+D Duplicate, Del Remove, F Fit.
                </p>
              </div>

              {!selectedNode && (
                <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-white p-3 text-xs text-[#64748B]">
                  Select a node on the board to edit its mission, capabilities, and behavior.
                </div>
              )}

              {selectedNode && (
                <div className="space-y-2 rounded-xl border border-[#CBD5E1] bg-white p-3">
                  <label className="text-[11px] text-[#334155]">Node label</label>
                  <Input
                    value={selectedNode.data.label}
                    onChange={(event) =>
                      patchNode(selectedNode.id, { label: event.target.value })
                    }
                    className="h-8 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                  />

                  <label className="text-[11px] text-[#334155]">Worker type</label>
                  <Input
                    value={selectedNode.data.workerType || ''}
                    onChange={(event) =>
                      patchNode(selectedNode.id, { workerType: event.target.value })
                    }
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
                                  codeSnippet:
                                    nextRole === 'code'
                                      ? node.data.codeSnippet || {
                                          language: 'typescript',
                                          content:
                                            'export const runTask = () => "custom function output";\n',
                                        }
                                      : node.data.codeSnippet,
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
                  </select>

                  <label className="text-[11px] text-[#334155]">Capabilities (comma)</label>
                  <Input
                    value={(selectedNode.data.capabilities || []).join(', ')}
                    onChange={(event) =>
                      patchNode(selectedNode.id, {
                        capabilities: parseCapabilities(event.target.value),
                      })
                    }
                    className="h-8 border-[#CBD5E1] bg-white text-xs text-[#0F172A]"
                  />

                  <label className="text-[11px] text-[#334155]">Mission prompt</label>
                  <textarea
                    value={selectedNode.data.prompt}
                    onChange={(event) =>
                      patchNode(selectedNode.id, { prompt: event.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-xs text-[#0F172A] outline-none"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center justify-between rounded border border-[#CBD5E1] bg-[#F8FAFC] px-2 py-1 text-[11px] text-[#334155]">
                      Error Check
                      <input
                        type="checkbox"
                        checked={selectedNode.data.errorCheckEnabled}
                        onChange={(event) =>
                          patchNode(selectedNode.id, {
                            errorCheckEnabled: event.target.checked,
                          })
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

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      className="h-8 bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
                      onClick={duplicateSelectedNode}
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
                      onClick={toggleCollapseSelected}
                    >
                      {collapsedNodeIds.includes(selectedNode.id) ? 'Expand' : 'Collapse'}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 bg-[#DC2626] text-white hover:bg-[#B91C1C]"
                      onClick={deleteSelectedBranch}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3">
                <p className="mb-1 text-xs font-semibold text-[#1D4ED8]">Execution Output</p>
                <pre className="max-h-24 overflow-auto whitespace-pre-wrap text-[11px] text-[#1F2937]">
                  {runOutput || 'No execution yet.'}
                </pre>
              </div>

              <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3">
                <p className="mb-1 text-xs font-semibold text-[#4338CA]">Recent Audit</p>
                <div className="max-h-28 space-y-2 overflow-auto">
                  {auditRows.length === 0 && (
                    <p className="text-[11px] text-[#475569]">No entries yet.</p>
                  )}
                  {auditRows.slice(0, 6).map((row) => (
                    <div key={row.id} className="rounded border border-[#E2E8F0] bg-white p-2">
                      <div className="text-[11px] font-medium text-[#1E3A8A]">{row.action}</div>
                      <div className="text-[10px] text-[#475569]">
                        {new Date(row.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
