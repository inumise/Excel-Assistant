'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, RefreshCw, Save } from 'lucide-react'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas'
import { GlobalPanel } from '@/components/mindmap/GlobalPanel'
import { NodeDetailsPanel } from '@/components/mindmap/NodeDetailsPanel'
import { Toolbox } from '@/components/mindmap/Toolbox'
import { WorkerCatalog } from '@/components/mindmap/WorkerCatalog'
import {
  MindMapDocument,
  MindMapEdge,
  MindMapNode,
  MindMapTool,
  buildWorkflowFromDocument,
  cloneMindMapDocument,
  createEmptyMindMapDocument,
  createMindMapNode,
  normalizeMindMapDocument,
  NODE_TEMPLATES,
} from '@/components/mindmap/types'
import { WorkflowGlobalDefaults } from '@/types/workflow'
import { ReactFlowInstance } from 'reactflow'

interface ValidationResponse {
  safeToRun: boolean
  summary: string
  nodeIssues: Record<string, string[]>
}

interface RunResponse {
  success: boolean
  output: string
  nodeResults: Array<{ nodeId: string; summary: string }>
  memoryTable?: Array<{ namespace: string; key: string; value: unknown; updatedAt: string }>
}

const LOCAL_STORAGE_KEY = 'mind-map-builder-document-v3'

export function MindMapBuilder() {
  const [document, setDocument] = useState<MindMapDocument>(createEmptyMindMapDocument())
  const [activeTool, setActiveTool] = useState<MindMapTool>('select')
  const [drawColor, setDrawColor] = useState('#2563EB')
  const [drawWidth, setDrawWidth] = useState(2.5)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [globalCollapsed, setGlobalCollapsed] = useState(true)
  const [undoStack, setUndoStack] = useState<MindMapDocument[]>([])
  const [redoStack, setRedoStack] = useState<MindMapDocument[]>([])
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
  const [isHydrated, setIsHydrated] = useState(false)
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance<MindMapNode, MindMapEdge> | null>(null)

  const documentRef = useRef(document)
  useEffect(() => {
    documentRef.current = document
  }, [document])

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      setDocument(createEmptyMindMapDocument())
      setIsHydrated(true)
      return
    }
    try {
      const parsed = JSON.parse(raw) as Partial<MindMapDocument>
      setDocument(normalizeMindMapDocument(parsed))
    } catch {
      setDocument(createEmptyMindMapDocument())
    } finally {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(document))
  }, [document, isHydrated])

  const updateDocument = useCallback(
    (
      updater: (previous: MindMapDocument) => MindMapDocument,
      options?: {
        recordHistory?: boolean
      }
    ) => {
      setDocument((previous) => {
        const next = updater(previous)
        const shouldRecord = options?.recordHistory !== false
        if (shouldRecord && JSON.stringify(previous) !== JSON.stringify(next)) {
          setUndoStack((stack) => [...stack.slice(-80), cloneMindMapDocument(previous)])
          setRedoStack([])
        }
        return next
      })
    },
    []
  )

  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack
      const previousSnapshot = stack[stack.length - 1]
      setRedoStack((redo) => [...redo.slice(-80), cloneMindMapDocument(documentRef.current)])
      setDocument(previousSnapshot)
      return stack.slice(0, -1)
    })
  }, [])

  const handleRedo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack
      const nextSnapshot = stack[stack.length - 1]
      setUndoStack((undo) => [...undo.slice(-80), cloneMindMapDocument(documentRef.current)])
      setDocument(nextSnapshot)
      return stack.slice(0, -1)
    })
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey
      if (!modifier) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        handleUndo()
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleRedo, handleUndo])

  const selectedNode = useMemo(
    () => document.nodes.find((node) => node.id === selectedNodeId) || null,
    [document.nodes, selectedNodeId]
  )

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
      const response = await fetch('/api/mindmap/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow }),
      })
      const payload = (await response.json()) as ValidationResponse
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

  const runMap = useCallback(async () => {
    setIsRunning(true)
    try {
      const workflow = buildWorkflowFromDocument({
        document,
        userId: DEMO_USER_ID,
      })
      const response = await fetch('/api/mindmap/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow,
          triggerText: runInput,
          userId: DEMO_USER_ID,
          sessionId,
        }),
      })
      const payload = (await response.json()) as RunResponse
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
    } catch (error) {
      setRunOutput(`Run failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }, [document, runInput, sessionId])

  const refreshReliability = useCallback(async () => {
    try {
      const response = await fetch('/api/system/health')
      const payload = (await response.json()) as {
        status?: 'healthy' | 'degraded' | 'critical'
        checks?: Array<{ id: string; label: string; status: 'ok' | 'warning' | 'error'; detail?: string }>
      }
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
    void runValidation()
  }, [runValidation])

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
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Mind Map Builder</h1>
          <p className="text-xs text-slate-500">
            Draw, connect, annotate, and configure AI boxes directly on the map.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={runInput}
            onChange={(event) => setRunInput(event.target.value)}
            placeholder="run input"
            className="h-9 w-[220px] rounded-md border border-slate-300 px-2 text-sm outline-none ring-blue-500 focus:ring-2"
          />
          <button
            type="button"
            onClick={() => void runValidation()}
            disabled={isValidating}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Validate
          </button>
          <button
            type="button"
            onClick={() => void runMap()}
            disabled={isRunning}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
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
            onUndo={handleUndo}
            onRedo={handleRedo}
            onFitView={fitView}
            canUndo={canUndo}
            canRedo={canRedo}
          />

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-700">Drawing</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={drawColor}
                onChange={(event) => setDrawColor(event.target.value)}
                className="h-8 w-10 rounded border border-slate-200"
              />
              <input
                type="number"
                min={1}
                max={8}
                step={0.5}
                value={drawWidth}
                onChange={(event) => setDrawWidth(Math.max(1, Math.min(8, Number(event.target.value) || 2)))}
                className="h-8 w-20 rounded border border-slate-300 px-2 text-sm"
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
          onSelectNode={setSelectedNodeId}
          onUpdateDocument={updateDocument}
          onFlowReady={setFlowInstance}
        />

        <div className="grid grid-rows-[minmax(0,1fr)_auto_auto] gap-3">
          <NodeDetailsPanel
            selectedNode={selectedNode}
            globalDefaults={document.globalDefaults}
            issues={selectedNode ? nodeIssuesById[selectedNode.id] || [] : []}
            onPatchNode={patchNode}
            onPatchAIConfig={patchAIConfig}
            onDeleteNode={deleteNode}
          />

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

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
