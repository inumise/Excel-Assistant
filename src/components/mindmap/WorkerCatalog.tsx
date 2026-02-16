'use client'

import { Brain, Braces, Database, MessageSquareText, Shapes, Square, Waves } from 'lucide-react'
import { NODE_TEMPLATES } from '@/components/mindmap/types'

interface WorkerCatalogProps {
  onAddTemplate: (templateId: string) => void
  onDragStateChange?: (active: boolean) => void
}

function templateIcon(templateId: string) {
  if (templateId === 'ai-box') return <Brain className="h-4 w-4 text-violet-600" />
  if (templateId === 'storage') return <Database className="h-4 w-4 text-emerald-600" />
  if (templateId === 'buffer') return <Waves className="h-4 w-4 text-amber-600" />
  if (templateId === 'function-box') return <Braces className="h-4 w-4 text-indigo-700" />
  if (templateId === 'text') return <MessageSquareText className="h-4 w-4 text-sky-600" />
  if (templateId === 'shape') return <Shapes className="h-4 w-4 text-indigo-600" />
  return <Square className="h-4 w-4 text-slate-600" />
}

export function WorkerCatalog({ onAddTemplate, onDragStateChange }: WorkerCatalogProps) {
  return (
    <aside className="mind-surface-panel w-full rounded-xl p-3">
      <h2 className="text-sm font-semibold text-slate-900">Node Catalog</h2>
      <p className="mt-1 text-xs text-slate-500">
        Drag onto the canvas or click to insert near center.
      </p>

      <div className="mt-3 space-y-2">
        {NODE_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            draggable
            data-testid={`catalog-${template.id}`}
            onDragStart={(event) => {
              event.dataTransfer.setData('application/mindmap-template', template.id)
              event.dataTransfer.setData('application/reactflow', template.id)
              event.dataTransfer.setData('text/plain', template.id)
              event.dataTransfer.effectAllowed = 'move'
              onDragStateChange?.(true)
            }}
            onDragEnd={() => onDragStateChange?.(false)}
            onClick={() => onAddTemplate(template.id)}
            className="flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-left transition hover:border-slate-300 hover:bg-white"
          >
            <span className="mt-0.5">{templateIcon(template.id)}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-800">{template.title}</span>
              <span className="block text-xs text-slate-500">{template.description}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
