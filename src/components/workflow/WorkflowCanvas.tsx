'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
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
  Bug,
  Calculator,
  Code2,
  FileSpreadsheet,
  Handshake,
  Headset,
  Loader2,
  Megaphone,
  Palette,
  Save,
  Scale,
  Send,
  ServerCog,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  TestTube2,
  UserRoundPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CodeBlock } from '@/components/Node/CodeBlock'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { calculateMindMapLayout, getDescendantIds } from '@/lib/mind-map-layout'
import { EdgeDataType, Workflow, WorkflowEdge, WorkflowNodeData } from '@/types/workflow'

interface FlowNodeData extends WorkflowNodeData {
  userId: string
  workflowId: string
  onPatchNode: (nodeId: string, patch: Partial<WorkflowNodeData>) => void
}

const edgePalette: Record<EdgeDataType, string> = {
  api: '#3B82F6',
  code: '#22C55E',
  ai: '#A855F7',
}

interface WorkerTemplate {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  role: 'manager' | 'programmer' | 'code'
  prompt: string
  edgeType: EdgeDataType
}

const workerTemplates: WorkerTemplate[] = [
  {
    id: 'manager-core',
    label: 'Manager AI',
    description: 'Orchestrates sub-agents, priorities, and escalation paths.',
    icon: BriefcaseBusiness,
    accent: '#FFD700',
    role: 'manager',
    prompt: 'Coordinate specialist workers and escalate blockers.',
    edgeType: 'ai',
  },
  {
    id: 'programmer-core',
    label: 'Programmer AI',
    description: 'Generates, refactors, and maintains autonomous code.',
    icon: Code2,
    accent: '#C9A483',
    role: 'programmer',
    prompt: 'Implement production-ready code and automation tasks.',
    edgeType: 'code',
  },
  {
    id: 'excel-assistant',
    label: 'Excel Assistant',
    description: 'Builds reports, formulas, pivots, and executive sheets.',
    icon: FileSpreadsheet,
    accent: '#3B82F6',
    role: 'code',
    prompt: 'Automate spreadsheet operations, formulas, and reports.',
    edgeType: 'api',
  },
  {
    id: 'pr-agent',
    label: 'PR Writer Agent',
    description: 'Writes external communication and outreach messaging.',
    icon: Megaphone,
    accent: '#A855F7',
    role: 'programmer',
    prompt: 'Draft and adapt public relations messaging for channels.',
    edgeType: 'ai',
  },
  {
    id: 'accountant',
    label: 'Accountant Agent',
    description: 'Handles reconciliation, margin analysis, and forecasts.',
    icon: Calculator,
    accent: '#22C55E',
    role: 'code',
    prompt: 'Build P&L, forecast, reconciliation, and audit output.',
    edgeType: 'api',
  },
  {
    id: 'sales',
    label: 'Sales Strategist',
    description: 'Optimizes outreach funnels, win-rates, and CRM actions.',
    icon: Handshake,
    accent: '#EAB308',
    role: 'programmer',
    prompt: 'Generate outbound and follow-up strategy with conversion focus.',
    edgeType: 'ai',
  },
  {
    id: 'hr',
    label: 'HR Recruiter',
    description: 'Manages hiring flow, candidate summaries, and onboarding.',
    icon: UserRoundPlus,
    accent: '#F97316',
    role: 'programmer',
    prompt: 'Screen applicants, write scorecards, and coordinate interviews.',
    edgeType: 'ai',
  },
  {
    id: 'legal',
    label: 'Legal Compliance',
    description: 'Tracks policies, contracts, and regulatory checklists.',
    icon: Scale,
    accent: '#EF4444',
    role: 'manager',
    prompt: 'Review risk posture and compliance controls per workflow.',
    edgeType: 'api',
  },
  {
    id: 'support',
    label: 'Support Agent',
    description: 'Handles inbound tickets, triage, and customer follow-ups.',
    icon: Headset,
    accent: '#0EA5E9',
    role: 'programmer',
    prompt: 'Classify support issues and compose contextual responses.',
    edgeType: 'ai',
  },
  {
    id: 'marketing',
    label: 'Marketing Analyst',
    description: 'Creates campaigns, channel plans, and content calendars.',
    icon: BarChart3,
    accent: '#EC4899',
    role: 'programmer',
    prompt: 'Plan campaigns with KPI projections and weekly objectives.',
    edgeType: 'ai',
  },
  {
    id: 'security',
    label: 'Security Monitor',
    description: 'Monitors incidents, compliance, and vulnerability posture.',
    icon: ShieldCheck,
    accent: '#10B981',
    role: 'manager',
    prompt: 'Track security findings and enforce remediation policy.',
    edgeType: 'api',
  },
  {
    id: 'devops',
    label: 'DevOps Engineer',
    description: 'Maintains CI/CD, infra health, and release pipelines.',
    icon: ServerCog,
    accent: '#6366F1',
    role: 'code',
    prompt: 'Automate deployment and reliability checks for services.',
    edgeType: 'code',
  },
  {
    id: 'qa',
    label: 'QA Tester',
    description: 'Creates tests, validates flows, and reports regressions.',
    icon: TestTube2,
    accent: '#14B8A6',
    role: 'code',
    prompt: 'Design and run e2e and regression test suites.',
    edgeType: 'code',
  },
  {
    id: 'design',
    label: 'Brand Designer',
    description: 'Produces visual concepts, assets, and UX refinements.',
    icon: Palette,
    accent: '#A855F7',
    role: 'programmer',
    prompt: 'Generate premium visual direction and component variants.',
    edgeType: 'ai',
  },
  {
    id: 'finance',
    label: 'Finance Controller',
    description: 'Oversees budgets, runway and spend governance.',
    icon: BadgeDollarSign,
    accent: '#22C55E',
    role: 'manager',
    prompt: 'Track budget adherence and trigger variance alerts.',
    edgeType: 'api',
  },
  {
    id: 'procurement',
    label: 'Procurement Agent',
    description: 'Coordinates purchasing, vendor approvals, and RFQs.',
    icon: ShoppingCart,
    accent: '#FB7185',
    role: 'code',
    prompt: 'Compare vendor bids and produce sourcing recommendations.',
    edgeType: 'api',
  },
  {
    id: 'code',
    label: 'Code Node',
    description: 'Raw executable block for custom scripts and tasks.',
    icon: Code2,
    accent: '#22C55E',
    role: 'code',
    prompt: 'Executable code unit with bugtracking.',
    edgeType: 'code',
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
      strokeWidth: 2.2,
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
  borderColor,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  borderColor: string
}) {
  return (
    <div
      className="min-w-[280px] rounded-xl border bg-[#1A1A1A]/95 p-3 shadow-xl"
      style={{ borderColor }}
    >
      <div className="mb-2">
        <div className="text-sm font-semibold text-[#FFD700]">{title}</div>
        <p className="text-[11px] text-[#C9A483]">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function ManagerNode({ id, data }: NodeProps<FlowNodeData>) {
  return (
    <NodeShell title={data.label} subtitle={data.workerType || 'Manager AI (orchestrator)'} borderColor="#FFD70077">
      <Handle type="target" position={Position.Left} className="!bg-[#FFD700]" />
      <p className="mb-2 text-xs text-[#E9D6BF]">{data.prompt}</p>
      <div className="rounded-lg bg-[#0E0E0E] p-2 text-[11px] text-[#C9A483]">
        Global flow coordinator. If auto-fix fails, manager escalation is triggered.
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#FFD700]" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#FFD700]" />
    </NodeShell>
  )
}

function ProgrammerNode({ id, data }: NodeProps<FlowNodeData>) {
  return (
    <NodeShell
      title={data.label}
      subtitle={data.workerType || 'Programmer AI (code generation)'}
      borderColor="#C9A48377"
    >
      <Handle type="target" position={Position.Left} className="!bg-[#C9A483]" />
      <p className="mb-2 text-xs text-[#E9D6BF]">{data.prompt}</p>
      <div className="rounded-lg bg-[#0E0E0E] p-2 text-[11px] text-[#C9A483]">
        Delegates to helper agents and emits implementation blocks.
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#C9A483]" />
    </NodeShell>
  )
}

function CodeNode({ id, data }: NodeProps<FlowNodeData>) {
  return (
    <NodeShell
      title={data.label}
      subtitle={data.workerType || 'Self-modifying code node'}
      borderColor="#66BB6A77"
    >
      <Handle type="target" position={Position.Left} className="!bg-[#66BB6A]" />
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
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <label className="flex items-center justify-between rounded-md border border-[#C9A483]/30 px-2 py-1 text-[#C9A483]">
          Error Check
          <input
            type="checkbox"
            checked={data.errorCheckEnabled}
            onChange={(event) => data.onPatchNode(id, { errorCheckEnabled: event.target.checked })}
          />
        </label>
        <select
          value={data.monitoring}
          onChange={(event) =>
            data.onPatchNode(id, {
              monitoring: event.target.value as WorkflowNodeData['monitoring'],
            })
          }
          className="rounded-md border border-[#C9A483]/30 bg-[#1A1A1A] px-2 py-1 text-[#C9A483]"
        >
          <option value="none">No monitor</option>
          <option value="sentry">Sentry</option>
          <option value="newrelic">New Relic</option>
        </select>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#66BB6A]" />
    </NodeShell>
  )
}

const nodeTypes = {
  manager: ManagerNode,
  programmer: ProgrammerNode,
  code: CodeNode,
}

function toSerializableWorkflow({
  workflow,
  nodes,
  edges,
}: {
  workflow: Workflow
  nodes: Node<FlowNodeData>[]
  edges: Edge[]
}): Workflow {
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
      label: typeof edge.label === 'string' ? edge.label : undefined,
      type: edge.type,
      dataType:
        ((edge.data as { dataType?: EdgeDataType } | undefined)?.dataType as EdgeDataType) || 'ai',
    })),
  }
}

export function WorkflowCanvas({ userId = DEMO_USER_ID }: { userId?: string }) {
  const [loading, setLoading] = useState(true)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<string[]>([])
  const [templateId, setTemplateId] = useState<string>('manager-core')
  const [autoConnectFromSelection, setAutoConnectFromSelection] = useState(true)
  const [runInput, setRunInput] = useState('run workflow-web-design-factory')
  const [runOutput, setRunOutput] = useState('')
  const [auditRows, setAuditRows] = useState<
    Array<{ id: string; action: string; createdAt: string; payload: Record<string, unknown> }>
  >([])
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

  const patchNode = useCallback(
    (nodeId: string, patch: Partial<WorkflowNodeData>) => {
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
      const nextNodes: Node<FlowNodeData>[] = workflow.nodes.map((node) => ({
        ...node,
        type: node.type === 'group' ? 'manager' : node.type,
        data: {
          ...node.data,
          userId,
          workflowId: workflow.id,
          onPatchNode: patchNode,
        },
      }))

      const nextEdges = workflow.edges.map((edge) => getEdgeStyle(edge))
      setNodes(nextNodes)
      setEdges(nextEdges)
      setActiveWorkflowId(workflow.id)
      setSelectedNodeId(null)
      setCollapsedNodeIds([])
    },
    [patchNode, setEdges, setNodes, userId]
  )

  const fetchWorkflows = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/workflows?userId=${encodeURIComponent(userId)}`)
      const data = await response.json()
      const fetched = (data.workflows || []) as Workflow[]
      setWorkflows(fetched)
      if (fetched[0]) {
        hydrateWorkflow(fetched[0])
      }
    } finally {
      setLoading(false)
    }
  }, [hydrateWorkflow, userId])

  const fetchAudit = useCallback(async () => {
    if (!activeWorkflowId) return
    const response = await fetch(
      `/api/audit?userId=${encodeURIComponent(userId)}&workflowId=${encodeURIComponent(activeWorkflowId)}`
    )
    const data = await response.json()
    setAuditRows(data.entries || [])
  }, [activeWorkflowId, userId])

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit, runOutput])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(
          getEdgeStyle({
            ...connection,
            id: `edge-${Date.now()}`,
            dataType: 'ai',
            label: 'AI',
            type: 'smoothstep',
          } as unknown as WorkflowEdge),
          currentEdges
        )
      )
    },
    [setEdges]
  )

  const saveWorkflow = useCallback(async () => {
    if (!activeWorkflow) return
    setIsSaving(true)

    try {
      const serialized = toSerializableWorkflow({
        workflow: activeWorkflow,
        nodes,
        edges,
      })

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serialized),
      })
      const data = await response.json()
      const saved = data.workflow as Workflow

      setWorkflows((previous) => previous.map((item) => (item.id === saved.id ? saved : item)))
      hydrateWorkflow(saved)
    } finally {
      setIsSaving(false)
    }
  }, [activeWorkflow, edges, hydrateWorkflow, nodes])

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
      setRunOutput(data.output || data.message || 'No output')
    } finally {
      setIsRunning(false)
    }
  }, [activeWorkflow, runInput, userId])

  const arrangeMindMap = useCallback(
    (rootNodeId?: string) => {
      const inferredRootId =
        rootNodeId || selectedNodeId || nodes.find((node) => node.data.role === 'manager')?.id || nodes[0]?.id
      if (!inferredRootId) return

      const layout = calculateMindMapLayout(
        nodes.map((node) => ({ id: node.id, position: node.position })),
        edges.map((edge) => ({ source: edge.source, target: edge.target })),
        { rootId: inferredRootId }
      )

      setNodes((prev) => {
        let changed = false
        const next = prev.map((node) => {
          const position = layout.get(node.id)
          if (!position) return node

          const sourcePosition = position.x >= 0 ? Position.Right : Position.Left
          const targetPosition = position.x >= 0 ? Position.Left : Position.Right
          if (
            node.position.x === position.x &&
            node.position.y === position.y &&
            node.sourcePosition === sourcePosition &&
            node.targetPosition === targetPosition
          ) {
            return node
          }

          changed = true
          return { ...node, position, sourcePosition, targetPosition }
        })
        return changed ? next : prev
      })
    },
    [edges, nodes, selectedNodeId, setNodes]
  )

  const createNodeObject = useCallback(
    (
      template: WorkerTemplate,
      id: string,
      position: { x: number; y: number }
    ): Node<FlowNodeData> => ({
      id,
      type: template.role,
      position,
      sourcePosition: position.x >= 0 ? Position.Right : Position.Left,
      targetPosition: position.x >= 0 ? Position.Left : Position.Right,
      data: {
        label: template.label,
        role: template.role,
        workerType: template.label,
        prompt: template.prompt,
        codeSnippet:
          template.role === 'code'
            ? {
                language: 'typescript',
                content: 'export const workerTask = () => "Mind map worker active";\n',
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

  const addNodeFromTemplate = useCallback(
    (
      mode: 'root' | 'child' | 'sibling' | 'drop',
      forcedTemplateId?: string,
      forcedPosition?: { x: number; y: number }
    ) => {
      const template =
        workerTemplates.find((item) => item.id === (forcedTemplateId || templateId)) || workerTemplates[0]
      const parentFromIncoming = selectedNodeId
        ? edges.find((edge) => edge.target === selectedNodeId)?.source
        : undefined
      const parentId =
        mode === 'child'
          ? selectedNodeId || undefined
          : mode === 'sibling'
          ? parentFromIncoming || selectedNodeId || undefined
          : mode === 'drop'
          ? autoConnectFromSelection
            ? selectedNodeId || undefined
            : undefined
          : undefined
      const parentNode = parentId ? nodes.find((node) => node.id === parentId) : null
      const siblingCount = parentId ? edges.filter((edge) => edge.source === parentId).length : nodes.length
      const direction = (parentNode?.position.x || 0) < 0 ? -1 : 1

      const id = `${template.id}-${Date.now()}`
      const position =
        forcedPosition ||
        (parentNode
          ? {
              x: parentNode.position.x + direction * 300,
              y: parentNode.position.y + (siblingCount - 1) * 120,
            }
          : {
              x: 0,
              y: Math.max(0, nodes.length - 1) * 120,
            })

      setNodes((prev) => [...prev, createNodeObject(template, id, position)])
      if (parentId) {
        const nextEdge = getEdgeStyle({
          id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          source: parentId,
          target: id,
          dataType: template.edgeType,
          label: template.edgeType.toUpperCase(),
          type: 'smoothstep',
        } as unknown as WorkflowEdge)
        setEdges((prev) => [...prev, nextEdge])
      }

      setSelectedNodeId(id)
      if (mode !== 'drop') {
        const rootHint = mode === 'root' ? id : parentId || selectedNodeId || undefined
        setTimeout(() => arrangeMindMap(rootHint), 0)
      }
    },
    [
      arrangeMindMap,
      autoConnectFromSelection,
      createNodeObject,
      edges,
      nodes,
      selectedNodeId,
      setEdges,
      setNodes,
      templateId,
    ]
  )

  const onTemplateDragStart = useCallback((event: DragEvent<HTMLButtonElement>, id: string) => {
    event.dataTransfer.setData('application/x-hyper-worker-template', id)
    event.dataTransfer.effectAllowed = 'copyMove'
  }, [])

  const onFlowDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onFlowDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const droppedTemplateId = event.dataTransfer.getData('application/x-hyper-worker-template')
      if (!droppedTemplateId) return

      const bounds = flowWrapperRef.current?.getBoundingClientRect()
      const fallbackPosition = bounds
        ? {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          }
        : { x: 0, y: 0 }
      const position = flowInstance
        ? flowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })
        : fallbackPosition

      addNodeFromTemplate('drop', droppedTemplateId, position)
    },
    [addNodeFromTemplate, flowInstance]
  )

  const toggleCollapse = useCallback(() => {
    if (!selectedNodeId) return
    setCollapsedNodeIds((prev) =>
      prev.includes(selectedNodeId) ? prev.filter((nodeId) => nodeId !== selectedNodeId) : [...prev, selectedNodeId]
    )
  }, [selectedNodeId])

  const deleteSelectedBranch = useCallback(() => {
    if (!selectedNodeId) return

    const descendants = new Set(
      getDescendantIds(
        selectedNodeId,
        edges.map((edge) => ({ source: edge.source, target: edge.target }))
      )
    )
    descendants.add(selectedNodeId)

    setNodes((prev) => prev.filter((node) => !descendants.has(node.id)))
    setEdges((prev) =>
      prev.filter((edge) => !descendants.has(edge.source) && !descendants.has(edge.target))
    )
    setCollapsedNodeIds((prev) => prev.filter((nodeId) => !descendants.has(nodeId)))
    setSelectedNodeId(null)
  }, [edges, selectedNodeId, setEdges, setNodes])

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

  if (loading) {
    return (
      <div className="flex h-[72vh] items-center justify-center rounded-2xl border border-[#C9A483]/20 bg-[#121212]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" />
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3 rounded-2xl border border-[#C9A483]/30 bg-[#111111] p-4">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-[#FFD700]">Worker Types</h3>
            <p className="text-xs text-[#C9A483]">
              Drag a worker card onto the map. On mobile, tap a card then use Add Child/Sibling.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-xs text-[#C9A483]">Active workflow</label>
            <select
              value={activeWorkflowId}
              onChange={(event) => {
                setActiveWorkflowId(event.target.value)
                const next = workflows.find((workflow) => workflow.id === event.target.value)
                if (next) hydrateWorkflow(next)
              }}
              className="h-9 rounded-lg border border-[#C9A483]/30 bg-[#1A1A1A] px-3 text-xs text-[#F3EDE5]"
            >
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[45vh] space-y-2 overflow-auto pr-1">
            {workerTemplates.map((template) => {
              const Icon = template.icon
              const isSelectedTemplate = templateId === template.id
              return (
                <button
                  key={template.id}
                  draggable
                  onDragStart={(event) => onTemplateDragStart(event, template.id)}
                  onClick={() => setTemplateId(template.id)}
                  className={`w-full rounded-xl border p-2 text-left transition ${
                    isSelectedTemplate
                      ? 'border-[#FFD700]/70 bg-[#1D1D1D]'
                      : 'border-[#C9A483]/20 bg-[#151515] hover:border-[#C9A483]/60'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${template.accent}22`, color: template.accent }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="text-xs font-medium text-[#F3EDE5]">{template.label}</p>
                  </div>
                  <p className="text-[11px] text-[#C9A483]">{template.description}</p>
                </button>
              )
            })}
          </div>

          <div className="rounded-lg border border-[#C9A483]/30 bg-[#1A1A1A] p-3">
            <p className="mb-2 text-xs font-medium text-[#FFD700]">Mind Map Builder</p>
            <div className="mb-2 grid grid-cols-3 gap-2">
              <Button
                size="sm"
                className="h-8 bg-[#2A2A2A] text-[#F3EDE5] hover:bg-[#383838]"
                onClick={() => addNodeFromTemplate('root')}
              >
                Root
              </Button>
              <Button
                size="sm"
                disabled={!selectedNodeId}
                className="h-8 bg-[#2A2A2A] text-[#F3EDE5] hover:bg-[#383838]"
                onClick={() => addNodeFromTemplate('child')}
              >
                Child
              </Button>
              <Button
                size="sm"
                disabled={!selectedNodeId}
                className="h-8 bg-[#2A2A2A] text-[#F3EDE5] hover:bg-[#383838]"
                onClick={() => addNodeFromTemplate('sibling')}
              >
                Sibling
              </Button>
            </div>
            <div className="mb-2 grid grid-cols-3 gap-2">
              <Button
                size="sm"
                className="h-8 bg-[#3C2E1E] text-[#FFD700] hover:bg-[#4D3A24]"
                onClick={() => arrangeMindMap()}
              >
                Arrange
              </Button>
              <Button
                size="sm"
                disabled={!selectedNodeId}
                className="h-8 bg-[#2A2A2A] text-[#F3EDE5] hover:bg-[#383838]"
                onClick={toggleCollapse}
              >
                {selectedNodeId && collapsedNodeIds.includes(selectedNodeId) ? 'Expand' : 'Collapse'}
              </Button>
              <Button
                size="sm"
                disabled={!selectedNodeId}
                className="h-8 bg-[#422020] text-[#FFD0D0] hover:bg-[#5A2A2A]"
                onClick={deleteSelectedBranch}
              >
                Delete
              </Button>
            </div>
            <label className="flex items-center justify-between text-[11px] text-[#C9A483]">
              Auto-connect dropped worker from selected node
              <input
                type="checkbox"
                checked={autoConnectFromSelection}
                onChange={(event) => setAutoConnectFromSelection(event.target.checked)}
              />
            </label>
            <p className="mt-2 text-[11px] text-[#C9A483]">
              Selected node: {selectedNode?.data.label || 'none'}
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-xs text-[#C9A483]">Run command</label>
            <Input
              value={runInput}
              onChange={(event) => setRunInput(event.target.value)}
              className="h-9 border-[#C9A483]/30 bg-[#1A1A1A] text-xs text-[#F3EDE5]"
              placeholder='Example: /cmd run workflow-web-design-factory'
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={saveWorkflow}
                disabled={isSaving}
                className="h-9 bg-[#C9A483] text-[#1A1A1A] hover:bg-[#B89269]"
              >
                {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Save
              </Button>
              <Button
                onClick={runWorkflow}
                disabled={isRunning}
                className="h-9 bg-[#FFD700] text-[#1A1A1A] hover:bg-[#E6C200]"
              >
                {isRunning ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                Run
              </Button>
            </div>
          </div>
        </aside>

        <div
          ref={flowWrapperRef}
          className="relative h-[78vh] overflow-hidden rounded-2xl border border-[#C9A483]/30 bg-[#0D0D0D]"
          onDragOver={onFlowDragOver}
          onDrop={onFlowDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            onInit={setFlowInstance}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#2A2A2A" gap={20} />
            <MiniMap
              pannable
              zoomable
              nodeStrokeWidth={2}
              nodeColor={(node) => {
                if (node.type === 'manager') return '#FFD700'
                if (node.type === 'programmer') return '#C9A483'
                return '#22C55E'
              }}
            />
            <Controls />
          </ReactFlow>

          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-[#C9A483]/30 bg-[#111111]/80 px-3 py-2 text-[11px] text-[#E9D6BF]">
            Drag worker cards from the left panel into this mind map.
          </div>

          <div className="absolute bottom-3 right-3 w-72 rounded-lg border border-[#C9A483]/30 bg-[#111111]/85 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[#FFD700]">
              <Settings2 className="h-3.5 w-3.5" />
              Last Run Output
            </div>
            <pre className="max-h-28 overflow-auto whitespace-pre-wrap text-[11px] text-[#E9D6BF]">
              {runOutput || 'No execution yet.'}
            </pre>
          </div>

          <div className="absolute bottom-3 left-3 w-72 rounded-lg border border-[#C9A483]/30 bg-[#111111]/85 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[#FFD700]">
              <Bug className="h-3.5 w-3.5" />
              Audit Log
            </div>
            <div className="max-h-28 space-y-2 overflow-auto">
              {auditRows.length === 0 && <p className="text-[11px] text-[#C9A483]">No entries yet.</p>}
              {auditRows.slice(0, 5).map((row) => (
                <div key={row.id} className="rounded border border-[#C9A483]/20 p-2 text-[11px] text-[#E9D6BF]">
                  <div className="font-medium text-[#FFD700]">{row.action}</div>
                  <div>{new Date(row.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  )
}
