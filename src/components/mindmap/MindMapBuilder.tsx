'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Eraser,
  Highlighter,
  MousePointer2,
  Pencil,
  Play,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Shapes,
  Square,
  Type,
  WandSparkles,
  ZoomIn,
} from 'lucide-react'
import { ReactFlowInstance } from 'reactflow'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { getWorkflowExecutionOrder } from '@/lib/workflow-graph'
import { isAINode } from '@/lib/mindmap-runtime'
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas'
import { CompanyComposerInput, composeCompanyGraph } from '@/components/mindmap/company-composer'
import { LeftSidebar } from '@/components/mindmap/LeftSidebar'
import { RightSidebar } from '@/components/mindmap/RightSidebar'
import {
  buildWorkforceBlueprint,
  listWorkforceBlueprints,
} from '@/components/mindmap/workforce-blueprints'
import {
  MindMapEdge,
  MindMapNode,
  MindMapTool,
  buildWorkflowFromDocument,
  createMindMapNode,
  NODE_TEMPLATES,
} from '@/components/mindmap/types'
import { TOOL_DEFINITIONS } from '@/components/mindmap/tool-registry'
import { useMindMapDocument } from '@/components/mindmap/hooks/useMindMapDocument'
import { fetchReliability, runMindMap, validateMindMap } from '@/components/mindmap/services'
import { NodeRuntimeInfo, WorkflowGlobalDefaults } from '@/types/workflow'

const LOCAL_STORAGE_KEY = 'mind-map-builder-document-v3'

const toolIconMap: Record<MindMapTool, React.ReactNode> = {
  select: <MousePointer2 className="h-4 w-4" />,
  box: <Square className="h-4 w-4" />,
  shape: <Shapes className="h-4 w-4" />,
  'ai-box': <WandSparkles className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  pencil: <Pencil className="h-4 w-4" />,
  highlighter: <Highlighter className="h-4 w-4" />,
  eraser: <Eraser className="h-4 w-4" />,
}

export function MindMapBuilder() {
  const { document, isHydrated, updateDocument, undo, redo, canUndo, canRedo } =
    useMindMapDocument(LOCAL_STORAGE_KEY)
  const [activeTool, setActiveTool] = useState<MindMapTool>('select')
  const [drawColor, setDrawColor] = useState('#1a1f2e')
  const [drawWidth, setDrawWidth] = useState(2.5)
  const [isCatalogDragging, setIsCatalogDragging] = useState(false)
  const [dragTemplateId, setDragTemplateId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [runInput, setRunInput] = useState('run this map')
  const [runOutput, setRunOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isBuildingBlueprint, setIsBuildingBlueprint] = useState(false)
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

  const blueprintOptions = useMemo(() => listWorkforceBlueprints(), [])
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>(blueprintOptions[0]?.id || 'lean-core')
  const [composerInput, setComposerInput] = useState<CompanyComposerInput>({
    objective: 'Build a high-performance automated company that can run core workflows 24/7.',
    scale: 'growth',
    focus: 'balanced',
    includeFunctionRuntime: true,
    includeCompliance: true,
  })

  /* ── Keyboard shortcuts ── */
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

  /* ── Derived state ── */
  const selectedNode = useMemo(
    () => document.nodes.find((node) => node.id === selectedNodeId) || null,
    [document.nodes, selectedNodeId]
  )
  const selectedEdge = useMemo(
    () => document.edges.find((edge) => edge.id === selectedEdgeId) || null,
    [document.edges, selectedEdgeId]
  )

  /* ── Handlers ── */
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
            node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node
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
                    aiConfig: { ...(node.data.aiConfig || {}), ...patch },
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
          globalDefaults: { ...previous.globalDefaults, ...patch },
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
      const canvasElement = window.document.querySelector('.mind-reactflow') as HTMLElement | null
      const canvasRect = canvasElement?.getBoundingClientRect()
      const position =
        flowInstance && canvasRect
          ? flowInstance.screenToFlowPosition({
              x: canvasRect.left + canvasRect.width * 0.5,
              y: canvasRect.top + canvasRect.height * 0.45,
            })
          : flowInstance
            ? flowInstance.screenToFlowPosition({
                x: window.innerWidth * 0.5,
                y: window.innerHeight * 0.42,
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

  const clearCatalogDragState = useCallback(() => {
    setIsCatalogDragging(false)
    setDragTemplateId(null)
  }, [])

  const applyWorkforceBlueprint = useCallback(
    (replaceCurrent: boolean) => {
      setIsBuildingBlueprint(true)
      try {
        const origin = flowInstance
          ? flowInstance.screenToFlowPosition({
              x: window.innerWidth * 0.52,
              y: window.innerHeight * 0.44,
            })
          : { x: 120, y: 120 }
        const generated = buildWorkforceBlueprint({
          blueprintId: selectedBlueprintId as 'lean-core' | 'growth-pod' | 'enterprise-grid',
          origin,
        })
        updateDocument(
          (previous) => ({
            ...previous,
            nodes: replaceCurrent ? generated.nodes : [...previous.nodes, ...generated.nodes],
            edges: replaceCurrent ? generated.edges : [...previous.edges, ...generated.edges],
            updatedAt: new Date().toISOString(),
          }),
          { recordHistory: true }
        )
        clearCatalogDragState()
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
      } finally {
        setIsBuildingBlueprint(false)
      }
    },
    [clearCatalogDragState, flowInstance, selectedBlueprintId, updateDocument]
  )

  const buildNewWorkforceMap = useCallback(() => {
    if (
      document.nodes.length > 0 &&
      !window.confirm('Replace current map with this workforce structure?')
    ) {
      return
    }
    applyWorkforceBlueprint(true)
  }, [applyWorkforceBlueprint, document.nodes.length])

  const applyCompanyComposition = useCallback(
    (replaceCurrent: boolean) => {
      setIsBuildingBlueprint(true)
      try {
        const origin = flowInstance
          ? flowInstance.screenToFlowPosition({
              x: window.innerWidth * 0.52,
              y: window.innerHeight * 0.48,
            })
          : { x: 120, y: 120 }
        const composed = composeCompanyGraph({ input: composerInput, origin })
        updateDocument(
          (previous) => ({
            ...previous,
            nodes: replaceCurrent ? composed.nodes : [...previous.nodes, ...composed.nodes],
            edges: replaceCurrent ? composed.edges : [...previous.edges, ...composed.edges],
            updatedAt: new Date().toISOString(),
          }),
          { recordHistory: true }
        )
        setRunOutput(composed.summary)
        clearCatalogDragState()
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
      } finally {
        setIsBuildingBlueprint(false)
      }
    },
    [clearCatalogDragState, composerInput, flowInstance, updateDocument]
  )

  const buildComposedCompany = useCallback(() => {
    if (
      document.nodes.length > 0 &&
      !window.confirm('Replace current map with generated company composition?')
    ) {
      return
    }
    applyCompanyComposition(true)
  }, [applyCompanyComposition, document.nodes.length])

  const runValidation = useCallback(async () => {
    setIsValidating(true)
    try {
      const workflow = buildWorkflowFromDocument({ document, userId: DEMO_USER_ID })
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
                runtime: { status: 'idle', ...(node.data.runtime || {}), ...runtimePatch },
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
      const workflow = buildWorkflowFromDocument({ document, userId: DEMO_USER_ID })
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
          value: typeof row.value === 'string' ? row.value : JSON.stringify(row.value).slice(0, 80),
          updatedAt: row.updatedAt,
        })) || []
      setMemoryRows(rows)
      if (!payload.success && !payload.output) {
        setRunOutput('Run failed with no output.')
      }
      const now = new Date().toISOString()
      const resultById = new Map(payload.nodeResults.map((entry) => [entry.nodeId, entry]))
      const runtimePatch: Record<string, Partial<NodeRuntimeInfo>> = {}
      workflow.nodes
        .filter((node) => isAINode(node))
        .forEach((node) => {
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
              { status: 'error', lastRunAt: now, lastError: errorMessage } satisfies Partial<NodeRuntimeInfo>,
            ])
        )
      )
      setRunOutput(`Run failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    } finally {
      if (runningTimer) window.clearInterval(runningTimer)
      setIsRunning(false)
    }
  }, [applyNodeRuntimePatch, document, runInput, sessionId])

  const runAutopilotCycles = useCallback(async () => {
    setIsRunning(true)
    const cycleOutputs: string[] = []
    try {
      for (let cycle = 1; cycle <= 3; cycle += 1) {
        const workflow = buildWorkflowFromDocument({ document, userId: DEMO_USER_ID })
        const triggerText = `${runInput} (autopilot cycle ${cycle})`
        const payload = await runMindMap({ workflow, triggerText, userId: DEMO_USER_ID, sessionId })
        cycleOutputs.push(
          `Cycle ${cycle}: ${payload.success ? 'ok' : 'failed'}\n${payload.output || '(no output)'}`
        )
      }
      setRunOutput(cycleOutputs.join('\n\n'))
    } catch (error) {
      setRunOutput(`Autopilot failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }, [document, runInput, sessionId])

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
      setReliabilityChecks([{ name: 'runtime', status: 'error', message: 'health endpoint unavailable' }])
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    const timeout = window.setTimeout(() => void runValidation(), 350)
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

  /* ═══════════════════════════════════════════════════════
     RENDER -- Full-height 3-panel layout
     ═══════════════════════════════════════════════════════ */

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[var(--mind-bg)]">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between border-b border-[var(--mind-border)] bg-[var(--mind-surface)] px-4 py-2">
        {/* Left: Title + Tools */}
        <div className="flex items-center gap-1">
          <h1 className="mr-3 text-sm font-bold text-[var(--mind-text)]">Autonomous Workforce</h1>

          {/* Tool buttons */}
          <div className="flex items-center gap-0.5 rounded-lg border border-[var(--mind-border)] bg-[var(--mind-bg-accent)] p-0.5">
            {TOOL_DEFINITIONS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                title={tool.label}
                onClick={() => setActiveTool(tool.id)}
                className={[
                  'mind-tool-button inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--mind-text)]',
                  activeTool === tool.id ? 'mind-tool-button--active' : '',
                ]
                  .join(' ')
                  .trim()}
              >
                {toolIconMap[tool.id]}
              </button>
            ))}
          </div>

          {/* Undo/Redo */}
          <div className="ml-1 flex items-center gap-0.5">
            <button
              type="button"
              title="Undo"
              onClick={undo}
              disabled={!canUndo}
              className="mind-tool-button inline-flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Redo"
              onClick={redo}
              disabled={!canRedo}
              className="mind-tool-button inline-flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-30"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Fit View"
              onClick={fitView}
              className="mind-tool-button inline-flex h-8 w-8 items-center justify-center rounded-md"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Drawing settings (visible when draw tool active) */}
          {(activeTool === 'pencil' || activeTool === 'highlighter') && (
            <div className="ml-2 flex items-center gap-2 border-l border-[var(--mind-border)] pl-2">
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setDrawColor(e.target.value)}
                className="h-7 w-8 rounded border border-[var(--mind-border)] bg-[var(--mind-surface)]"
              />
              <input
                type="number"
                min={1}
                max={8}
                step={0.5}
                value={drawWidth}
                onChange={(e) => setDrawWidth(Math.max(1, Math.min(8, Number(e.target.value) || 2)))}
                className="mind-input-field h-7 w-14 rounded-md px-2 text-xs"
              />
              <span className="text-[10px] text-[var(--mind-text-muted)]">px</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <input
            value={runInput}
            onChange={(e) => setRunInput(e.target.value)}
            placeholder="Run input..."
            className="mind-input-field h-8 w-44 rounded-lg px-3 text-xs"
          />

          <button
            type="button"
            onClick={() => void runValidation()}
            disabled={isValidating}
            className="mind-tool-button inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            Validate
          </button>

          <button
            type="button"
            onClick={() => void runMap()}
            disabled={isRunning}
            className="btn-primary-rainbow inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </button>

          <button
            type="button"
            onClick={() => void runAutopilotCycles()}
            disabled={isRunning}
            className="mind-tool-button inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:opacity-50"
          >
            Autopilot
          </button>

          <div className="flex items-center gap-1 rounded-lg border border-[var(--mind-border)] bg-[var(--mind-bg-accent)] px-2 py-1">
            <Save className="h-3 w-3 text-[var(--mind-text-muted)]" />
            <span className="text-[10px] text-[var(--mind-text-muted)]">Saved</span>
          </div>
        </div>
      </header>

      {/* ── 3-Panel Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 shrink-0">
          <LeftSidebar
            onAddTemplate={addTemplateNodeNearCenter}
            onDragStateChange={setIsCatalogDragging}
            onDragTemplateChange={setDragTemplateId}
            globalDefaults={document.globalDefaults}
            onPatchDefaults={patchDefaults}
            onBulkOverwriteNodes={bulkOverwriteFromDefaults}
          />
        </div>

        {/* Canvas (grows to fill) */}
        <div className="flex-1 overflow-hidden">
          <MindMapCanvas
            document={document}
            activeTool={activeTool}
            drawColor={drawColor}
            drawWidth={drawWidth}
            externalDragActive={isCatalogDragging}
            externalDragTemplateId={dragTemplateId}
            onExternalDropComplete={clearCatalogDragState}
            onSelectNode={handleSelectNode}
            onSelectEdge={handleSelectEdge}
            onUpdateDocument={updateDocument}
            onFlowReady={setFlowInstance}
          />
        </div>

        {/* Right Sidebar */}
        <div className="w-80 shrink-0">
          <RightSidebar
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            globalDefaults={document.globalDefaults}
            issues={selectedNode ? nodeIssuesById[selectedNode.id] || [] : []}
            runOutput={runOutput}
            onPatchNode={patchNode}
            onPatchAIConfig={patchAIConfig}
            onDeleteNode={deleteNode}
            onPatchEdge={patchEdge}
            onDeleteEdge={deleteEdge}
          />
        </div>
      </div>
    </main>
  )
}
