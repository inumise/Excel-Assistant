'use client'

import { ChevronDown, ChevronUp, GaugeCircle, RefreshCw, ShieldCheck, WandSparkles } from 'lucide-react'
import { WorkflowGlobalDefaults } from '@/types/workflow'

interface ReliabilityCheck {
  name: string
  status: 'ok' | 'warn' | 'error'
  message?: string
}

interface GlobalPanelProps {
  collapsed: boolean
  onToggle: () => void
  defaults: WorkflowGlobalDefaults
  onPatchDefaults: (patch: Partial<WorkflowGlobalDefaults>) => void
  onBulkOverwriteNodes: () => void
  validationSummary?: string
  reliabilityStatus?: 'healthy' | 'degraded' | 'offline'
  reliabilityChecks: ReliabilityCheck[]
  onRefreshReliability: () => void
  memoryRows: Array<{ namespace: string; key: string; value: string; updatedAt: string }>
}

function statusClass(status: 'ok' | 'warn' | 'error') {
  if (status === 'ok') return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (status === 'warn') return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

export function GlobalPanel({
  collapsed,
  onToggle,
  defaults,
  onPatchDefaults,
  onBulkOverwriteNodes,
  validationSummary,
  reliabilityStatus,
  reliabilityChecks,
  onRefreshReliability,
  memoryRows,
}: GlobalPanelProps) {
  return (
    <aside className="mind-surface-panel rounded-xl">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">Global Defaults</p>
          <p className="text-xs text-slate-500">Fallback values for newly created or empty node fields.</p>
        </div>
        {collapsed ? <ChevronDown className="h-4 w-4 text-slate-600" /> : <ChevronUp className="h-4 w-4 text-slate-600" />}
      </button>

      {!collapsed && (
        <div className="space-y-4 p-4">
          <div className="grid gap-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-700">Default System Prompt</span>
              <textarea
                value={defaults.systemPrompt || ''}
                onChange={(event) => onPatchDefaults({ systemPrompt: event.target.value })}
                rows={3}
                className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Default Model</span>
              <input
                value={defaults.model || ''}
                onChange={(event) => onPatchDefaults({ model: event.target.value })}
                className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Default Temperature</span>
              <input
                type="number"
                min={0.1}
                max={1}
                step={0.1}
                value={defaults.temperature ?? ''}
                onChange={(event) =>
                  onPatchDefaults({
                    temperature: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Default Routing</span>
              <select
                value={defaults.routing || 'direct'}
                onChange={(event) => onPatchDefaults({ routing: event.target.value as typeof defaults.routing })}
                className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
              >
                <option value="direct">direct</option>
                <option value="buffered">buffered</option>
                <option value="storage">storage</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Default Memory Vault</span>
              <select
                value={defaults.useMemoryVault ? 'true' : 'false'}
                onChange={(event) => onPatchDefaults({ useMemoryVault: event.target.value === 'true' })}
                className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
              >
                <option value="false">disabled</option>
                <option value="true">enabled</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-700">Default Memory Scope</span>
              <select
                value={defaults.memoryScope || 'workflow'}
                onChange={(event) =>
                  onPatchDefaults({ memoryScope: event.target.value as typeof defaults.memoryScope })
                }
                className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
              >
                <option value="session">session</option>
                <option value="workflow">workflow</option>
                <option value="global">global</option>
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <WandSparkles className="h-3.5 w-3.5" />
              Bulk Overwrite
            </div>
            <p className="text-xs text-slate-600">
              Explicit action only. This copies current defaults into every AI node.
            </p>
            <button
              type="button"
              onClick={onBulkOverwriteNodes}
              className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              Overwrite all AI nodes from defaults
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <GaugeCircle className="h-3.5 w-3.5" />
              Validation + Reliability
            </div>
            <p className="text-xs text-slate-600">{validationSummary || 'Run validation to view status.'}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Runtime status:{' '}
                <span className="font-semibold text-slate-800">{reliabilityStatus || 'unknown'}</span>
              </p>
              <button
                type="button"
                onClick={onRefreshReliability}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {reliabilityChecks.map((check) => (
                <div
                  key={check.name}
                  className={`rounded-md border px-2 py-1 text-xs ${statusClass(check.status)}`}
                >
                  <span className="font-semibold">{check.name}:</span> {check.message || check.status}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Memory Vault Table
            </div>
            <p className="mb-2 text-[11px] text-slate-500">Session-scoped demo data (reset on refresh).</p>
            <div className="max-h-48 overflow-auto rounded-md border border-slate-200">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-2 py-1 text-left">Namespace</th>
                    <th className="px-2 py-1 text-left">Key</th>
                    <th className="px-2 py-1 text-left">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {memoryRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-2 py-3 text-center text-slate-500">
                        No memory rows for this session.
                      </td>
                    </tr>
                  ) : (
                    memoryRows.map((row) => (
                      <tr key={`${row.namespace}-${row.key}-${row.updatedAt}`} className="border-t border-slate-100">
                        <td className="max-w-[140px] truncate px-2 py-1">{row.namespace}</td>
                        <td className="max-w-[100px] truncate px-2 py-1">{row.key}</td>
                        <td className="max-w-[220px] truncate px-2 py-1">{row.value}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
