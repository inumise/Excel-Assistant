'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Bot, Bug, Cog, GitBranch, Loader2, Save, Send, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CodeBlock } from '@/components/Node/CodeBlock'
import { DEMO_USER_ID } from '@/lib/workflow-template'
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
    <NodeShell title={data.label} subtitle="Manager AI (orchestrator)" borderColor="#FFD70077">
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
    <NodeShell title={data.label} subtitle="Programmer AI (code generation)" borderColor="#C9A48377">
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
    <NodeShell title={data.label} subtitle="Self-modifying code node" borderColor="#66BB6A77">
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
  const [runInput, setRunInput] = useState('run workflow-web-design-factory')
  const [runOutput, setRunOutput] = useState('')
  const [auditRows, setAuditRows] = useState<
    Array<{ id: string; action: string; createdAt: string; payload: Record<string, unknown> }>
  >([])
  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const activeWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === activeWorkflowId) || null,
    [workflows, activeWorkflowId]
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

  const addNode = useCallback(
    (role: 'manager' | 'programmer' | 'code') => {
      const id = `${role}-${Date.now()}`
      const x = 100 + Math.random() * 320
      const y = 120 + Math.random() * 260

      const nextNode: Node<FlowNodeData> = {
        id,
        type: role,
        position: { x, y },
        data: {
          label: `${role[0].toUpperCase()}${role.slice(1)} AI`,
          role,
          prompt:
            role === 'manager'
              ? 'Orchestrate sub-nodes and handle escalations.'
              : role === 'programmer'
              ? 'Generate clean production code.'
              : 'Executable code node.',
          codeSnippet:
            role === 'code'
              ? {
                  language: 'typescript',
                  content: 'export const hello = "luxury workflow";\n',
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
      }

      setNodes((prev) => [...prev, nextNode])
    },
    [activeWorkflowId, patchNode, setNodes, userId]
  )

  if (loading) {
    return (
      <div className="flex h-[72vh] items-center justify-center rounded-2xl border border-[#C9A483]/20 bg-[#121212]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" />
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="h-[75vh] overflow-hidden rounded-2xl border border-[#C9A483]/30 bg-[#0D0D0D]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
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
        </div>

        <aside className="space-y-3 rounded-2xl border border-[#C9A483]/30 bg-[#111111] p-4">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-[#FFD700]">Workflow Hierarchy</h3>
            <p className="text-xs text-[#C9A483]">
              Zoom and pan through nested manager/programmer/code nodes.
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

          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              className="h-8 bg-[#2A2A2A] text-[#F3EDE5] hover:bg-[#383838]"
              onClick={() => addNode('manager')}
            >
              <Bot className="mr-1 h-3.5 w-3.5" />
              Manager
            </Button>
            <Button
              size="sm"
              className="h-8 bg-[#2A2A2A] text-[#F3EDE5] hover:bg-[#383838]"
              onClick={() => addNode('programmer')}
            >
              <Cog className="mr-1 h-3.5 w-3.5" />
              Programmer
            </Button>
            <Button
              size="sm"
              className="h-8 bg-[#2A2A2A] text-[#F3EDE5] hover:bg-[#383838]"
              onClick={() => addNode('code')}
            >
              <GitBranch className="mr-1 h-3.5 w-3.5" />
              Code
            </Button>
          </div>

          <div className="grid gap-2">
            <label className="text-xs text-[#C9A483]">Trigger command</label>
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

          <div className="rounded-lg border border-[#C9A483]/30 bg-[#1A1A1A] p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[#FFD700]">
              <Bug className="h-3.5 w-3.5" />
              Data Flow Colors
            </div>
            <ul className="space-y-1 text-[11px] text-[#C9A483]">
              <li>API = blue</li>
              <li>Code = green</li>
              <li>AI = purple</li>
              <li>Error propagation = red node status + bugtrack logs</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#C9A483]/30 bg-[#1A1A1A] p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[#FFD700]">
              <Settings2 className="h-3.5 w-3.5" />
              Last Run Output
            </div>
            <pre className="max-h-28 overflow-auto whitespace-pre-wrap text-[11px] text-[#E9D6BF]">
              {runOutput || 'No execution yet.'}
            </pre>
          </div>

          <div className="rounded-lg border border-[#C9A483]/30 bg-[#1A1A1A] p-3">
            <p className="mb-1 text-xs font-medium text-[#FFD700]">Audit Log</p>
            <div className="max-h-32 space-y-2 overflow-auto">
              {auditRows.length === 0 && <p className="text-[11px] text-[#C9A483]">No entries yet.</p>}
              {auditRows.map((row) => (
                <div key={row.id} className="rounded border border-[#C9A483]/20 p-2 text-[11px] text-[#E9D6BF]">
                  <div className="font-medium text-[#FFD700]">{row.action}</div>
                  <div>{new Date(row.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </ReactFlowProvider>
  )
}
