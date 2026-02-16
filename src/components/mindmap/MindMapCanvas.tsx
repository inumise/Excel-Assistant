'use client'

import { useCallback, useMemo, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent } from 'react'
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  EdgeChange,
  NodeChange,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  FreehandStroke,
  MindMapDocument,
  MindMapEdge,
  MindMapNode,
  MindMapTool,
  NODE_TEMPLATES,
  createMindMapNode,
} from '@/components/mindmap/types'
import { MindMapNodeCard } from '@/components/mindmap/MindMapNodeCard'

interface MindMapCanvasProps {
  document: MindMapDocument
  activeTool: MindMapTool
  drawColor: string
  drawWidth: number
  onSelectNode: (nodeId: string | null) => void
  onUpdateDocument: (
    updater: (previous: MindMapDocument) => MindMapDocument,
    options?: { recordHistory?: boolean }
  ) => void
  onFlowReady: (instance: ReactFlowInstance<MindMapNode, MindMapEdge>) => void
}

function pointNearStroke(stroke: FreehandStroke, x: number, y: number, radius = 10) {
  return stroke.points.some((point) => Math.hypot(point.x - x, point.y - y) <= radius)
}

const nodeTypes = {
  mindMapNode: MindMapNodeCard,
}

function MindMapCanvasInner({
  document,
  activeTool,
  drawColor,
  drawWidth,
  onSelectNode,
  onUpdateDocument,
  onFlowReady,
}: MindMapCanvasProps) {
  const reactFlow = useReactFlow<MindMapNode, MindMapEdge>()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [activeStrokeId, setActiveStrokeId] = useState<string | null>(null)

  const onNodesChange = useCallback<OnNodesChange>(
    (changes: NodeChange[]) => {
      // Record position snapshots only when dragging completes, otherwise undo stack becomes noisy.
      const shouldRecord = changes.some(
        (change) =>
          change.type === 'remove' ||
          change.type === 'add' ||
          (change.type === 'position' && (change as { dragging?: boolean }).dragging !== true)
      )
      onUpdateDocument(
        (previous) => ({
          ...previous,
          nodes: applyNodeChanges(changes, previous.nodes),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: shouldRecord }
      )
    },
    [onUpdateDocument]
  )

  const onEdgesChange = useCallback<OnEdgesChange>(
    (changes: EdgeChange[]) => {
      const shouldRecord = changes.some((change) => change.type === 'remove' || change.type === 'add')
      onUpdateDocument(
        (previous) => ({
          ...previous,
          edges: applyEdgeChanges(changes, previous.edges),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: shouldRecord }
      )
    },
    [onUpdateDocument]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (activeTool !== 'select') return
      onUpdateDocument(
        (previous) => ({
          ...previous,
          edges: addEdge(
            {
              ...connection,
              id: `edge-${crypto.randomUUID().slice(0, 8)}`,
              animated: false,
              data: { dataType: 'prompt' },
              label: '',
            },
            previous.edges
          ),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: true }
      )
    },
    [activeTool, onUpdateDocument]
  )

  const addNodeAtPoint = useCallback(
    (templateId: string, x: number, y: number) => {
      const template = NODE_TEMPLATES.find((item) => item.id === templateId)
      if (!template) return
      onUpdateDocument(
        (previous) => ({
          ...previous,
          nodes: [...previous.nodes, createMindMapNode(template, { x, y })],
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: true }
      )
    },
    [onUpdateDocument]
  )

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      if (!wrapperRef.current) return
      const templateId = event.dataTransfer.getData('application/mindmap-template')
      if (!templateId) return
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addNodeAtPoint(templateId, position.x, position.y)
    },
    [addNodeAtPoint, reactFlow]
  )

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onPaneClick = useCallback(
    (event: MouseEvent) => {
      if (activeTool === 'select') {
        onSelectNode(null)
        return
      }
      if (!wrapperRef.current) return
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      if (activeTool === 'box') addNodeAtPoint('box', position.x, position.y)
      if (activeTool === 'ai-box') addNodeAtPoint('ai-box', position.x, position.y)
      if (activeTool === 'text') addNodeAtPoint('text', position.x, position.y)
    },
    [activeTool, addNodeAtPoint, onSelectNode, reactFlow]
  )

  const writeStrokePoint = useCallback(
    (x: number, y: number) => {
      if (!activeStrokeId) return
      // During pencil drag we stream points without new history entries.
      onUpdateDocument(
        (previous) => ({
          ...previous,
          strokes: previous.strokes.map((stroke) =>
            stroke.id === activeStrokeId
              ? {
                  ...stroke,
                  points: [...stroke.points, { x, y }],
                }
              : stroke
          ),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: false }
      )
    },
    [activeStrokeId, onUpdateDocument]
  )

  const beginPencilStroke = useCallback(
    (x: number, y: number) => {
      const strokeId = `stroke-${crypto.randomUUID().slice(0, 8)}`
      setActiveStrokeId(strokeId)
      // One history checkpoint per stroke start keeps undo/redo predictable.
      onUpdateDocument(
        (previous) => ({
          ...previous,
          strokes: [...previous.strokes, { id: strokeId, color: drawColor, width: drawWidth, points: [{ x, y }] }],
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory: true }
      )
    },
    [drawColor, drawWidth, onUpdateDocument]
  )

  const eraseAtPoint = useCallback(
    (x: number, y: number, recordHistory = true) => {
      onUpdateDocument(
        (previous) => ({
          ...previous,
          strokes: previous.strokes.filter((stroke) => !pointNearStroke(stroke, x, y)),
          updatedAt: new Date().toISOString(),
        }),
        { recordHistory }
      )
    },
    [onUpdateDocument]
  )

  const toFlowPoint = useCallback(
    (event: PointerEvent) =>
      reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      }),
    [reactFlow]
  )

  const onDrawPointerDown = useCallback(
    (event: PointerEvent) => {
      if (activeTool !== 'pencil' && activeTool !== 'eraser') return
      event.preventDefault()
      const point = toFlowPoint(event)
      if (activeTool === 'pencil') {
        beginPencilStroke(point.x, point.y)
        return
      }
      eraseAtPoint(point.x, point.y, true)
    },
    [activeTool, beginPencilStroke, eraseAtPoint, toFlowPoint]
  )

  const onDrawPointerMove = useCallback(
    (event: PointerEvent) => {
      if (activeTool !== 'pencil' && activeTool !== 'eraser') return
      if (event.buttons === 0) return
      const point = toFlowPoint(event)
      if (activeTool === 'pencil') {
        writeStrokePoint(point.x, point.y)
      } else {
        eraseAtPoint(point.x, point.y, false)
      }
    },
    [activeTool, eraseAtPoint, toFlowPoint, writeStrokePoint]
  )

  const onDrawPointerUp = useCallback(() => {
    setActiveStrokeId(null)
  }, [])

  const strokesSvg = useMemo(
    () =>
      document.strokes.map((stroke) => (
        <polyline
          key={stroke.id}
          points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.95}
        />
      )),
    [document.strokes]
  )

  return (
    <div className="relative h-full min-h-[620px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        ref={wrapperRef}
        className="absolute inset-0"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPointerDown={onDrawPointerDown}
        onPointerMove={onDrawPointerMove}
        onPointerUp={onDrawPointerUp}
        onPointerLeave={onDrawPointerUp}
      >
        <ReactFlow<MindMapNode, MindMapEdge>
          nodes={document.nodes}
          edges={document.edges}
          nodeTypes={nodeTypes}
          onInit={onFlowReady}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          onSelectionChange={(selection) => {
            const firstNode = selection.nodes[0]
            onSelectNode(firstNode ? firstNode.id : null)
          }}
          fitView
          panOnDrag={activeTool === 'select'}
          selectionOnDrag={activeTool === 'select'}
          nodesDraggable={activeTool === 'select'}
          nodesConnectable={activeTool === 'select'}
          elementsSelectable={activeTool === 'select'}
          deleteKeyCode={activeTool === 'select' ? ['Backspace', 'Delete'] : null}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={18} size={1.2} />
          <Controls showInteractive={false} />
        </ReactFlow>

        {document.strokes.length > 0 && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="-2000 -2000 4000 4000"
            preserveAspectRatio="none"
          >
            {strokesSvg}
          </svg>
        )}
      </div>
    </div>
  )
}

export function MindMapCanvas(props: MindMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
