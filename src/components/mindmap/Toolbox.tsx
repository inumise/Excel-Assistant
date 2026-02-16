'use client'

import {
  Eraser,
  Highlighter,
  MousePointer2,
  Pencil,
  Redo2,
  RotateCcw,
  Shapes,
  Square,
  Type,
  WandSparkles,
  ZoomIn,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { MindMapTool } from '@/components/mindmap/types'
import { TOOL_DEFINITIONS } from '@/components/mindmap/tool-registry'

interface ToolboxProps {
  activeTool: MindMapTool
  onSelectTool: (tool: MindMapTool) => void
  onUndo: () => void
  onRedo: () => void
  onFitView: () => void
  canUndo: boolean
  canRedo: boolean
}

interface ToolButtonProps {
  title: string
  active?: boolean
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

function ToolButton({ title, active = false, onClick, disabled = false, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex h-10 w-10 items-center justify-center rounded-lg border text-slate-700 transition',
        active
          ? 'border-blue-400 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
        disabled ? 'cursor-not-allowed opacity-40' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

const toolIconMap: Record<MindMapTool, ReactNode> = {
  select: <MousePointer2 className="h-4 w-4" />,
  box: <Square className="h-4 w-4" />,
  shape: <Shapes className="h-4 w-4" />,
  'ai-box': <WandSparkles className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  pencil: <Pencil className="h-4 w-4" />,
  highlighter: <Highlighter className="h-4 w-4" />,
  eraser: <Eraser className="h-4 w-4" />,
}

export function Toolbox({
  activeTool,
  onSelectTool,
  onUndo,
  onRedo,
  onFitView,
  canUndo,
  canRedo,
}: ToolboxProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      {TOOL_DEFINITIONS.map((tool) => (
        <ToolButton
          key={tool.id}
          title={tool.label}
          active={activeTool === tool.id}
          onClick={() => onSelectTool(tool.id)}
        >
          {toolIconMap[tool.id]}
        </ToolButton>
      ))}

      <div className="my-1 h-px bg-slate-200" />

      <ToolButton title="Undo" onClick={onUndo} disabled={!canUndo}>
        <RotateCcw className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Redo" onClick={onRedo} disabled={!canRedo}>
        <Redo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Fit View" onClick={onFitView}>
        <ZoomIn className="h-4 w-4" />
      </ToolButton>
    </div>
  )
}
