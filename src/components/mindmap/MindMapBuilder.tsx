'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Play, RefreshCw, Save } from 'lucide-react'
import { ReactFlowInstance } from 'reactflow'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { getWorkflowExecutionOrder } from '@/lib/workflow-graph'
import { isAINode } from '@/lib/mindmap-runtime'
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas'
import { EdgeDetailsPanel } from '@/components/mindmap/EdgeDetailsPanel'
import { GlobalPanel } from '@/components/mindmap/GlobalPanel'
import { NodeDetailsPanel } from '@/components/mindmap/NodeDetailsPanel'
import { Toolbox } from '@/components/mindmap/Toolbox'
import { WorkerCatalog } from '@/components/mindmap/WorkerCatalog'
import {
  MindMapEdge,
  MindMapNode,
  MindMapTool,
  buildWorkflowFromDocument,
  createMindMapNode,
  NODE_TEMPLATES,
} from '@/components/mindmap/types'
import { useMindMapDocument } from '@/components/mindmap/hooks/useMindMapDocument'
import { fetchReliability, runMindMap, validateMindMap } from '@/components/mindmap/services'
import { NodeRuntimeInfo, WorkflowGlobalDefaults } from '@/types/workflow'

const LOCAL_STORAGE_KEY = 'mind-map-builder-document-v3'

export function MindMapBuilder() {
  const { document, isHydrated, updateDocument, undo, redo, canUndo, canRedo } =
    useMindMapDocument(LOCAL_STORAGE_KEY)
  const [activeTool, setActiveTool] = useState<MindMapTool>('select')
  const [drawColor, setDrawColor] = useState('#2563EB')
  const [drawWidth, setDrawWidth] = useState(2.5)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [globalCollapsed, setGlobalCollapsed] = useState(true)
  const [runInput, setRunInput] = useState('run this map')
  const [runOutput, setRunOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationSummary, setValidationSummary] = useState<string>('')
  const [nodeIssuesById, setNodeIssuesById] = useState<Record<string, string[]>>({})
  const [reliabilityStatus, setReliabilityStatus] = useState<'healthy' | 'degraded' | 'offline'>('degraded')
  const [reliabilityChecks, setReliabilityChecks] = useState<
    Array<{ name: string; status: 'ok' | 'warn' | 'error'; message?: string }>
  >([])
  const [memoryRows, setMemoryRows] = useState<
    Array<{ namespace: string; key: string; value: string; updatedAt: string }>
  >([])
  const [sessionId] = useState(() => crypto.randomUUID())
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<MindMapNode, MindMapEdge> | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey
      if (!modifier) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [redo, undo])

  const selectedNode = useMemo(
    () => document.nodes.find((node) => node.id === selectedNodeId) || null,
    [document.nodes, selectedNodeId]
  )
  const selectedEdge = useMemo(
    () => document.edges.find((edge) => edge.id === selectedEdgeId) || null,
    [document.edges, selectedEdgeId]
  )

  const handleSelectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId)
    if (nodeId) setSelectedEdgeId(null)
  }, [])

  const handleSelectEdge = useCallback((edgeId: string | null) => {
    setSelectedEdgeId(edgeId)
    if (edgeId) setSelectedNodeId(null)
  }, [])

  const patchNode = useCallback(
    (nodeId: string, patch: Partial<MindMapNode['data']>) => {
      updateDocument(
        (previous) => ({
          ...previous,
          nodes: previous.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: { ...node.data, ...patch },
                }
              : node
          ),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: true }
      )
    },
    [updateDocument]
  )

  const patchAIConfig = useCallback(
    (nodeId: string, patch: Partial<NonNullable<MindMapNode['data']['aiConfig']>>) => {
      updateDocument(
        (previous) => ({
          ...previous,
          nodes: previous.nodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    aiConfig: {
                      ...(node.data.aiConfig || {}),
                      ...patch,
                    },
                  },
                }
              : node
          ),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: true }
      )
    },
    [updateDocument]
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      updateDocument(
        (previous) => ({
          ...previous,
          nodes: previous.nodes.filter((node) => node.id !== nodeId),
          edges: previous.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: true }
      )
      if (selectedNodeId === nodeId) setSelectedNodeId(null)
    },
    [selectedNodeId, updateDocument]
  )

  const patchEdge = useCallback(
    (edgeId: string, patch: Partial<MindMapEdge>) => {
      updateDocument(
        (previous) => ({
          ...previous,
          edges: previous.edges.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: true }
      )
    },
    [updateDocument]
  )

  const deleteEdge = useCallback(
    (edgeId: string) => {
      updateDocument(
        (previous) => ({
          ...previous,
          edges: previous.edges.filter((edge) => edge.id !== edgeId),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: true }
      )
      if (selectedEdgeId === edgeId) setSelectedEdgeId(null)
    },
    [selectedEdgeId, updateDocument]
  )

  const patchDefaults = useCallback(
    (patch: Partial<WorkflowGlobalDefaults>) => {
      updateDocument(
        (previous) => ({
          ...previous,
          globalDefaults: {
            ...previous.globalDefaults,
            ...patch,
          },
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: true }
      )
    },
    [updateDocument]
  )

  const addTemplateNodeNearCenter = useCallback(
    (templateId: string) => {
      const template = NODE_TEMPLATES.find((entry) => entry.id === templateId)
      if (!template) return
      const position = flowInstance
        ? flowInstance.screenToFlowPosition({
            x: window.innerWidth * 0.5,
            y: window.innerHeight * 0.35,
          })
        : { x: 120 + Math.random() * 200, y: 120 + Math.random() * 120 }
      updateDocument(
        (previous) => ({
          ...previous,
          nodes: [...previous.nodes, createMindMapNode(template, position)],
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: true }
      )
    },
    [flowInstance, updateDocument]
  )

  const runValidation = useCallback(async () => {
    setIsValidating(true)
    try {
      const workflow = buildWorkflowFromDocument({
        document,
        userId: DEMO_USER_ID,
      })
      const payload = await validateMindMap(workflow)
      setValidationSummary(payload.summary)
      setNodeIssuesById(payload.nodeIssues || {})
    } catch (error) {
      setValidationSummary(
        `Validation failed: ${error instanceof Error ? error.message : 'unknown error'}`
      )
    } finally {
      setIsValidating(false)
    }
  }, [document])

  const applyNodeRuntimePatch = useCallback(
    (patchByNodeId: Record<string, Partial<NodeRuntimeInfo>>) => {
      updateDocument(
        (previous) => ({
          ...previous,
          nodes: previous.nodes.map((node) => {
            const runtimePatch = patchByNodeId[node.id]
            if (!runtimePatch) return node
            return {
              ...node,
              data: {
                ...node.data,
                runtime: {
                  status: 'idle',
                  ...(node.data.runtime || {}),
                  ...runtimePatch,
                },
              },
            }
          }),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: false }
      )
    },
    [updateDocument]
  )

  const runMap = useCallback(async () => {
    setIsRunning(true)
    let runningTimer: number | undefined
    try {
      const workflow = buildWorkflowFromDocument({
        document,
        userId: DEMO_USER_ID,
      })

      const orderedNodeIds = getWorkflowExecutionOrder(workflow)
        .filter((node) => isAINode(node))
        .map((node) => node.id)
      if (orderedNodeIds.length > 0) {
        applyNodeRuntimePatch(
          Object.fromEntries(orderedNodeIds.map((nodeId) => [nodeId, { status: 'queued' }]))
        )
        let cursor = 0
        runningTimer = window.setInterval(() => {
          if (cursor >= orderedNodeIds.length) return
          const currentId = orderedNodeIds[cursor]
          const previousId = cursor > 0 ? orderedNodeIds[cursor - 1] : null
          const patch: Record<string, Partial<NodeRuntimeInfo>> = {
            [currentId]: { status: 'running' },
          }
          if (previousId) patch[previousId] = { status: 'queued' }
          applyNodeRuntimePatch(patch)
          cursor += 1
        }, 220)
      }

      const payload = await runMindMap({
        workflow,
        triggerText: runInput,
        userId: DEMO_USER_ID,
        sessionId,
      })
      setRunOutput(payload.output || '')
      const rows =
        payload.memoryTable?.map((row) => ({
          namespace: row.namespace,
          key: row.key,
          value:
            typeof row.value === 'string'
              ? row.value
              : JSON.stringify(row.value).slice(0, 80),
          updatedAt: row.updatedAt,
        })) || []
      setMemoryRows(rows)
      if (!payload.success && !payload.output) {
        setRunOutput('Run failed with no output.')
      }

      const now = new Date().toISOString()
      const resultById = new Map(payload.nodeResults.map((entry) => [entry.nodeId, entry]))
      const runtimePatch: Record<string, Partial<NodeRuntimeInfo>> = {}
      workflow.nodes.filter((node) => isAINode(node)).forEach((node) => {
        const result = resultById.get(node.id)
        if (!result) {
          runtimePatch[node.id] = { status: 'idle', lastRunAt: now }
          return
        }
        runtimePatch[node.id] = {
          status: result.success ? 'success' : 'error',
          lastRunAt: now,
          lastSummary: result.summary,
          lastError: result.error,
        }
      })
      applyNodeRuntimePatch(runtimePatch)
    } catch (error) {
      const now = new Date().toISOString()
      const errorMessage = error instanceof Error ? error.message : 'unknown error'
      applyNodeRuntimePatch(
        Object.fromEntries(
          document.nodes
            .filter((node) => node.data.nodeKind === 'ai')
            .map((node) => [
              node.id,
              {
                status: 'error',
                lastRunAt: now,
                lastError: errorMessage,
              } satisfies Partial<NodeRuntimeInfo>,
            ])
        )
      )
      setRunOutput(`Run failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    } finally {
      if (runningTimer) window.clearInterval(runningTimer)
      setIsRunning(false)
    }
  }, [applyNodeRuntimePatch, document, runInput, sessionId])

  const refreshReliability = useCallback(async () => {
    try {
      const payload = await fetchReliability()
      setReliabilityStatus(
        payload.status === 'critical' ? 'offline' : payload.status ? payload.status : 'degraded'
      )
      setReliabilityChecks(
        (payload.checks || []).map((check) => ({
          name: check.label || check.id,
          status: check.status === 'warning' ? 'warn' : check.status,
          message: check.detail,
        }))
      )
    } catch {
      setReliabilityStatus('offline')
      setReliabilityChecks([
        {
          name: 'runtime',
          status: 'error',
          message: 'health endpoint unavailable',
        },
      ])
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    const timeout = window.setTimeout(() => {
      void runValidation()
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [document, isHydrated, runValidation])

  useEffect(() => {
    void refreshReliability()
  }, [refreshReliability])

  const bulkOverwriteFromDefaults = useCallback(() => {
    const confirmed = window.confirm(
      'Overwrite all AI nodes with current global defaults?\nThis replaces per-node systemPrompt/model/temperature/routing/memory settings.'
    )
    if (!confirmed) return
    updateDocument(
      (previous) => ({
        ...previous,
        nodes: previous.nodes.map((node) =>
          node.data.nodeKind !== 'ai'
            ? node
            : {
                ...node,
                data: {
                  ...node.data,
                  aiConfig: {
                    ...(node.data.aiConfig || {}),
                    systemPrompt: previous.globalDefaults.systemPrompt || '',
                    model: previous.globalDefaults.model || '',
                    temperature: previous.globalDefaults.temperature,
                    routing: previous.globalDefaults.routing,
                    useMemoryVault: previous.globalDefaults.useMemoryVault,
                    memoryScope: previous.globalDefaults.memoryScope,
                  },
                },
              }
        ),
        updatedAt: new Date().toISOString(),
      }),
      { recordHistory: true }
    )
  }, [updateDocument])

  const fitView = useCallback(() => {
    flowInstance?.fitView({ padding: 0.25, duration: 300 })
  }, [flowInstance])

  return (
    <main className="mx-auto flex w-full max-w-[1700px] flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4">
      <header className="mind-surface-panel flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-[#13223A] sm:text-xl">Mind Map Builder</h1>
          <p className="text-xs text-[#5A6B83]">
            Draw, connect, annotate, and configure AI boxes directly on the map.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={runInput}
            onChange={(event) => setRunInput(event.target.value)}
            placeholder="run input"
            className="mind-input-field h-9 w-[220px] rounded-md px-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void runValidation()}
            disabled={isValidating}
            className="mind-tool-button inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Validate
          </button>
          <button
            type="button"
            onClick={() => void runMap()}
            disabled={isRunning}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-[#45658D] px-3 text-sm font-medium text-white hover:bg-[#3A5679] disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            Run
          </button>
          <div className="inline-flex h-9 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 text-xs text-emerald-700">
            <Save className="h-3.5 w-3.5" />
            Auto-saved
          </div>
        </div>
      </header>

      <section className="grid min-h-[760px] grid-cols-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <Toolbox
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            onUndo={undo}
            onRedo={redo}
            onFitView={fitView}
            canUndo={canUndo}
            canRedo={canRedo}
          />

          <div className="mind-surface-panel rounded-xl p-3">
            <p className="text-xs font-semibold text-slate-700">Drawing</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={drawColor}
                onChange={(event) => setDrawColor(event.target.value)}
                className="h-8 w-10 rounded border border-slate-200 bg-white"
              />
              <input
                type="number"
                min={1}
                max={8}
                step={0.5}
                value={drawWidth}
                onChange={(event) => setDrawWidth(Math.max(1, Math.min(8, Number(event.target.value) || 2)))}
                className="mind-input-field h-8 w-20 rounded px-2 text-sm outline-none"
              />
              <span className="text-xs text-slate-500">px</span>
            </div>
          </div>

          <WorkerCatalog onAddTemplate={addTemplateNodeNearCenter} />
        </div>

        <MindMapCanvas
          document={document}
          activeTool={activeTool}
          drawColor={drawColor}
          drawWidth={drawWidth}
          onSelectNode={handleSelectNode}
          onSelectEdge={handleSelectEdge}
          onUpdateDocument={updateDocument}
          onFlowReady={setFlowInstance}
        />

        <div className="grid grid-rows-[minmax(0,1fr)_auto_auto] gap-3">
          {selectedEdge && !selectedNode ? (
            <EdgeDetailsPanel
              selectedEdge={selectedEdge}
              onPatchEdge={patchEdge}
              onDeleteEdge={deleteEdge}
            />
          ) : (
            <NodeDetailsPanel
              selectedNode={selectedNode}
              globalDefaults={document.globalDefaults}
              issues={selectedNode ? nodeIssuesById[selectedNode.id] || [] : []}
              onPatchNode={patchNode}
              onPatchAIConfig={patchAIConfig}
              onDeleteNode={deleteNode}
            />
          )}

          <GlobalPanel
            collapsed={globalCollapsed}
            onToggle={() => setGlobalCollapsed((value) => !value)}
            defaults={document.globalDefaults}
            onPatchDefaults={patchDefaults}
            onBulkOverwriteNodes={bulkOverwriteFromDefaults}
            validationSummary={validationSummary}
            reliabilityStatus={reliabilityStatus}
            reliabilityChecks={reliabilityChecks}
            onRefreshReliability={() => void refreshReliability()}
            memoryRows={memoryRows}
          />

          <section className="mind-surface-panel rounded-xl p-3">
            <h3 className="text-xs font-semibold text-slate-700">Run Output</h3>
            <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
              {runOutput || 'Run the map to see execution output here.'}
            </pre>
          </section>
        </div>
      </section>
    </main>
  )
}
