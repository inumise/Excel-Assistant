'use client'

import { Brain, Database, MessageSquareText, Square, Waves } from 'lucide-react'
import { NODE_TEMPLATES } from '@/components/mindmap/types'

interface WorkerCatalogProps {
  onAddTemplate: (templateId: string) => void
}

function templateIcon(templateId: string) {
  if (templateId === 'ai-box') return <Brain className="h-4 w-4 text-violet-600" />
  if (templateId === 'storage') return <Database className="h-4 w-4 text-emerald-600" />
  if (templateId === 'buffer') return <Waves className="h-4 w-4 text-amber-600" />
  if (templateId === 'text') return <MessageSquareText className="h-4 w-4 text-sky-600" />
  return <Square className="h-4 w-4 text-slate-600" />
}

export function WorkerCatalog({ onAddTemplate }: WorkerCatalogProps) {
  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
            onDragStart={(event) => {
              event.dataTransfer.setData('application/mindmap-template', template.id)
              event.dataTransfer.effectAllowed = 'move'
            }}
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
