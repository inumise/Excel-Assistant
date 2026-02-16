'use client'

import { AlertTriangle, Cpu, Info, Trash2 } from 'lucide-react'
import { MindMapNode, resolveNodeAIFallback } from '@/components/mindmap/types'
import { NodeMemoryScope, NodeRoutingMode, WorkflowGlobalDefaults } from '@/types/workflow'

interface NodeDetailsPanelProps {
  selectedNode: MindMapNode | null
  globalDefaults: WorkflowGlobalDefaults
  issues: string[]
  onPatchNode: (nodeId: string, patch: Partial<MindMapNode['data']>) => void
  onPatchAIConfig: (nodeId: string, patch: Partial<NonNullable<MindMapNode['data']['aiConfig']>>) => void
  onDeleteNode: (nodeId: string) => void
}

function FieldHint({ active, value }: { active: boolean; value?: string }) {
  if (!active) return null
  return (
    <p className="mt-1 text-[11px] text-slate-500">
      Using global default: <span className="font-medium text-slate-700">{value || '(not set)'}</span>
    </p>
  )
}

export function NodeDetailsPanel({
  selectedNode,
  globalDefaults,
  issues,
  onPatchNode,
  onPatchAIConfig,
  onDeleteNode,
}: NodeDetailsPanelProps) {
  if (!selectedNode) {
    return (
      <aside className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Node Settings</h2>
        <p className="mt-2 text-sm text-slate-500">
          Select any box on the map to edit title, notes, and AI settings.
        </p>
      </aside>
    )
  }

  const data = selectedNode.data
  const aiEffective = resolveNodeAIFallback(data.aiConfig, globalDefaults)
  const isAI = data.nodeKind === 'ai'

  return (
    <aside className="h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Node Settings</h2>
          <p className="text-xs text-slate-500">
            {selectedNode.id} • type: <span className="font-medium">{data.nodeKind}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDeleteNode(selectedNode.id)}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 text-xs text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Title</span>
          <input
            value={data.label}
            onChange={(event) => onPatchNode(selectedNode.id, { label: event.target.value })}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-700">Type</span>
          <input
            value={data.nodeKind}
            disabled
            className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-600"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-slate-700">Notes</span>
          <textarea
            value={data.notes || ''}
            onChange={(event) => onPatchNode(selectedNode.id, { notes: event.target.value })}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
          />
        </label>
      </div>

      {isAI && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Cpu className="h-3.5 w-3.5" />
            AI Node Config
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">System Prompt</span>
              <textarea
                value={data.aiConfig?.systemPrompt || ''}
                onChange={(event) =>
                  onPatchAIConfig(selectedNode.id, { systemPrompt: event.target.value })
                }
                rows={4}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
              />
              <FieldHint
                active={!data.aiConfig?.systemPrompt?.trim()}
                value={globalDefaults.systemPrompt || 'empty'}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Model</span>
              <input
                value={data.aiConfig?.model || ''}
                onChange={(event) => onPatchAIConfig(selectedNode.id, { model: event.target.value })}
                placeholder="e.g. gpt-4.1-mini"
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
              />
              <FieldHint active={!data.aiConfig?.model?.trim()} value={globalDefaults.model || 'empty'} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Temperature (0.1 - 1.0)</span>
              <input
                type="number"
                min={0.1}
                max={1}
                step={0.1}
                value={data.aiConfig?.temperature ?? ''}
                onChange={(event) =>
                  onPatchAIConfig(selectedNode.id, {
                    temperature: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
              />
              <FieldHint
                active={typeof data.aiConfig?.temperature !== 'number'}
                value={typeof globalDefaults.temperature === 'number' ? `${globalDefaults.temperature}` : 'empty'}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Routing</span>
              <select
                value={data.aiConfig?.routing || ''}
                onChange={(event) =>
                  onPatchAIConfig(selectedNode.id, {
                    routing: (event.target.value || undefined) as NodeRoutingMode | undefined,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
              >
                <option value="">Use global default</option>
                <option value="direct">direct</option>
                <option value="buffered">buffered</option>
                <option value="storage">storage</option>
              </select>
              <FieldHint active={!data.aiConfig?.routing} value={globalDefaults.routing || 'direct'} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Memory Vault</span>
              <select
                value={
                  typeof data.aiConfig?.useMemoryVault === 'boolean'
                    ? data.aiConfig.useMemoryVault
                      ? 'true'
                      : 'false'
                    : ''
                }
                onChange={(event) =>
                  onPatchAIConfig(selectedNode.id, {
                    useMemoryVault:
                      event.target.value === ''
                        ? undefined
                        : event.target.value === 'true',
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
              >
                <option value="">Use global default</option>
                <option value="true">enabled</option>
                <option value="false">disabled</option>
              </select>
              <FieldHint
                active={typeof data.aiConfig?.useMemoryVault !== 'boolean'}
                value={globalDefaults.useMemoryVault ? 'enabled' : 'disabled'}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Memory Scope</span>
              <select
                value={data.aiConfig?.memoryScope || ''}
                onChange={(event) =>
                  onPatchAIConfig(selectedNode.id, {
                    memoryScope: (event.target.value || undefined) as NodeMemoryScope | undefined,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none ring-blue-500 focus:ring-2"
              >
                <option value="">Use global default</option>
                <option value="session">session</option>
                <option value="workflow">workflow</option>
                <option value="global">global</option>
              </select>
              <FieldHint active={!data.aiConfig?.memoryScope} value={globalDefaults.memoryScope || 'workflow'} />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Code (optional)</span>
              <textarea
                value={data.aiConfig?.code || ''}
                onChange={(event) => onPatchAIConfig(selectedNode.id, { code: event.target.value })}
                rows={5}
                className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs outline-none ring-blue-500 focus:ring-2"
              />
            </label>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-slate-200 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Info className="h-3.5 w-3.5" />
          Node Validation
        </div>
        {issues.length === 0 ? (
          <p className="text-xs text-emerald-700">No node-level issues found.</p>
        ) : (
          <ul className="space-y-1 text-xs text-amber-700">
            {issues.map((issue) => (
              <li key={issue} className="flex items-start gap-1">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-slate-500">
          Effective model: <span className="font-medium text-slate-700">{aiEffective.model || 'none'}</span>
        </p>
      </div>
    </aside>
  )
}
