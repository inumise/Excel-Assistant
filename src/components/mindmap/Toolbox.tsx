'use client'

import {
  Eraser,
  MousePointer2,
  Pencil,
  Redo2,
  RotateCcw,
  Square,
  Type,
  WandSparkles,
  ZoomIn,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { MindMapTool } from '@/components/mindmap/types'

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
      <ToolButton
        title="Select"
        active={activeTool === 'select'}
        onClick={() => onSelectTool('select')}
      >
        <MousePointer2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Box" active={activeTool === 'box'} onClick={() => onSelectTool('box')}>
        <Square className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="AI Box"
        active={activeTool === 'ai-box'}
        onClick={() => onSelectTool('ai-box')}
      >
        <WandSparkles className="h-4 w-4" />
      </ToolButton>
      <ToolButton title="Text" active={activeTool === 'text'} onClick={() => onSelectTool('text')}>
        <Type className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Pencil"
        active={activeTool === 'pencil'}
        onClick={() => onSelectTool('pencil')}
      >
        <Pencil className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        title="Eraser"
        active={activeTool === 'eraser'}
        onClick={() => onSelectTool('eraser')}
      >
        <Eraser className="h-4 w-4" />
      </ToolButton>

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
