'use client'

import { Link2, Trash2 } from 'lucide-react'
import { EDGE_MESSAGE_TYPES, MindMapEdge } from '@/components/mindmap/types'

interface EdgeDetailsPanelProps {
  selectedEdge: MindMapEdge | null
  onPatchEdge: (edgeId: string, patch: Partial<MindMapEdge>) => void
  onDeleteEdge: (edgeId: string) => void
}

export function EdgeDetailsPanel({ selectedEdge, onPatchEdge, onDeleteEdge }: EdgeDetailsPanelProps) {
  if (!selectedEdge) {
    return (
      <aside className="mind-surface-panel h-full rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-900">Edge Settings</h2>
        <p className="mt-2 text-sm text-slate-500">
          Select a connection line to configure message type and channel.
        </p>
      </aside>
    )
  }

  return (
    <aside className="mind-surface-panel h-full rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Edge Settings</h2>
          <p className="text-xs text-slate-500">
            {selectedEdge.source} → {selectedEdge.target}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDeleteEdge(selectedEdge.id)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 text-xs text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Message Type</span>
          <select
            value={selectedEdge.data?.messageType || 'prompt'}
            onChange={(event) =>
              onPatchEdge(selectedEdge.id, {
                label: event.target.value,
                data: {
                  ...(selectedEdge.data || { channel: 'default' }),
                  messageType: event.target.value as (typeof EDGE_MESSAGE_TYPES)[number],
                },
              })
            }
            className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
          >
            {EDGE_MESSAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-700">Channel</span>
          <input
            value={selectedEdge.data?.channel || ''}
            onChange={(event) =>
              onPatchEdge(selectedEdge.id, {
                data: {
                  ...(selectedEdge.data || { messageType: 'prompt' }),
                  channel: event.target.value,
                },
              })
            }
            placeholder="default"
            className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
          />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Link2 className="h-3.5 w-3.5" />
          Typed Routing
        </div>
        <p className="text-xs text-slate-600">
          Message type and channel are explicit edge metadata. Runtime logic reads this directly, so
          adding new routed message kinds is predictable and testable.
        </p>
      </div>
    </aside>
  )
}
