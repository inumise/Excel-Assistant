'use client'

import { memo } from 'react'
import { Handle, NodeProps, Position } from 'reactflow'
import { Brain, Database, MessageSquareText, Square, Waves } from 'lucide-react'
import { MindMapNodeData } from '@/components/mindmap/types'
import { NodeRuntimeStatus } from '@/types/workflow'

function badgeClass(kind: MindMapNodeData['nodeKind']) {
  if (kind === 'ai') return 'bg-violet-100 text-violet-700'
  if (kind === 'buffer') return 'bg-amber-100 text-amber-700'
  if (kind === 'storage') return 'bg-emerald-100 text-emerald-700'
  if (kind === 'text') return 'bg-sky-100 text-sky-700'
  return 'bg-slate-100 text-slate-700'
}

function roleIcon(kind: MindMapNodeData['nodeKind']) {
  if (kind === 'ai') return <Brain className="h-4 w-4" />
  if (kind === 'buffer') return <Waves className="h-4 w-4" />
  if (kind === 'storage') return <Database className="h-4 w-4" />
  if (kind === 'text') return <MessageSquareText className="h-4 w-4" />
  return <Square className="h-4 w-4" />
}

function runtimeBadge(status: NodeRuntimeStatus | undefined) {
  if (!status || status === 'idle') return 'bg-slate-100 text-slate-600'
  if (status === 'queued') return 'bg-amber-100 text-amber-700'
  if (status === 'running') return 'bg-blue-100 text-blue-700'
  if (status === 'success') return 'bg-emerald-100 text-emerald-700'
  return 'bg-red-100 text-red-700'
}

export const MindMapNodeCard = memo(function MindMapNodeCard({
  id,
  selected,
  data,
}: NodeProps<MindMapNodeData>) {
  const isAI = data.nodeKind === 'ai'

  return (
    <div
      className={[
        'min-w-[170px] max-w-[280px] rounded-xl border bg-white p-3 shadow-sm transition',
        selected
          ? 'border-blue-400 ring-2 ring-blue-200'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border !border-slate-900 !bg-black"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border !border-red-900 !bg-red-500"
      />

      <div className="flex items-center gap-2 text-slate-700">
        {roleIcon(data.nodeKind)}
        <span className="truncate text-sm font-semibold">{data.label || id}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass(data.nodeKind)}`}>
          {data.nodeKind}
        </span>
        {isAI && (
          <>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${runtimeBadge(data.runtime?.status)}`}>
              {data.runtime?.status || 'idle'}
            </span>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700">
              {data.aiConfig?.model || 'global model'}
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
              {data.aiConfig?.useMemoryVault ? `memory:${data.aiConfig.memoryScope || 'global'}` : 'memory:off'}
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
              route:{data.aiConfig?.routing || 'global'}
            </span>
          </>
        )}
      </div>

      {(data.notes || data.textContent) && (
        <p className="mt-2 line-clamp-3 text-xs text-slate-500">{data.notes || data.textContent}</p>
      )}
    </div>
  )
})
