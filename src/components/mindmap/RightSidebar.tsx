'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Cpu,
  Link2,
  Terminal,
  Trash2,
  X,
} from 'lucide-react'
import {
  EDGE_MESSAGE_TYPES,
  type MindMapEdge,
  type MindMapNode,
  resolveNodeAIFallback,
} from '@/components/mindmap/types'
import type { NodeMemoryScope, NodeRoutingMode, NodeRuntimeStatus, WorkflowGlobalDefaults } from '@/types/workflow'

/* ──────────────────────────────────────────────
   Props
   ────────────────────────────────────────────── */

interface RightSidebarProps {
  selectedNode: MindMapNode | null
  selectedEdge: MindMapEdge | null
  globalDefaults: WorkflowGlobalDefaults
  issues: string[]
  runOutput: string
  onPatchNode: (nodeId: string, patch: Partial<MindMapNode['data']>) => void
  onPatchAIConfig: (nodeId: string, patch: Partial<NonNullable<MindMapNode['data']['aiConfig']>>) => void
  onDeleteNode: (nodeId: string) => void
  onPatchEdge: (edgeId: string, patch: Partial<MindMapEdge>) => void
  onDeleteEdge: (edgeId: string) => void
}

/* ──────────────────────────────────────────────
   Inline Helper
   ────────────────────────────────────────────── */

function FieldHint({ active, value }: { active: boolean; value?: string }) {
  if (!active) return null
  return (
    <p className="mt-0.5 text-[10px] text-[var(--mind-text-light)]">
      Default: <span className="font-medium text-[var(--mind-text-muted)]">{value || '(none)'}</span>
    </p>
  )
}

function SectionToggle({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-[var(--mind-border)]">
      <button
        type="button"
        onClick={onToggle}
        className="sidebar-section-header flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 text-[var(--mind-text-muted)]" />
        ) : (
          <ChevronRight className="h-3 w-3 text-[var(--mind-text-muted)]" />
        )}
        <span className="text-[var(--mind-text-muted)]">{icon}</span>
        <span className="text-xs font-semibold text-[var(--mind-text)]">{title}</span>
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

/* ──────────────────────────────────────────────
   Edge Details (inline)
   ────────────────────────────────────────────── */

function EdgeSection({
  edge,
  onPatchEdge,
  onDeleteEdge,
}: {
  edge: MindMapEdge
  onPatchEdge: (edgeId: string, patch: Partial<MindMapEdge>) => void
  onDeleteEdge: (edgeId: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-[var(--mind-text-muted)]">
        <Link2 className="h-3.5 w-3.5" />
        <span>
          {edge.source} &rarr; {edge.target}
        </span>
      </div>

      <label className="block">
        <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Message Type</span>
        <select
          value={edge.data?.messageType || 'prompt'}
          onChange={(e) =>
            onPatchEdge(edge.id, {
              label: e.target.value,
              data: {
                ...(edge.data || { channel: 'default' }),
                messageType: e.target.value as (typeof EDGE_MESSAGE_TYPES)[number],
              },
            })
          }
          className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
        >
          {EDGE_MESSAGE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Channel</span>
        <input
          value={edge.data?.channel || ''}
          onChange={(e) =>
            onPatchEdge(edge.id, {
              data: {
                ...(edge.data || { messageType: 'prompt' }),
                channel: e.target.value,
              },
            })
          }
          placeholder="default"
          className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
        />
      </label>

      <button
        type="button"
        onClick={() => onDeleteEdge(edge.id)}
        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
      >
        <Trash2 className="h-3 w-3" />
        Delete Connection
      </button>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Node Details (inline)
   ────────────────────────────────────────────── */

function NodeSection({
  node,
  globalDefaults,
  issues,
  onPatchNode,
  onPatchAIConfig,
  onDeleteNode,
}: {
  node: MindMapNode
  globalDefaults: WorkflowGlobalDefaults
  issues: string[]
  onPatchNode: (nodeId: string, patch: Partial<MindMapNode['data']>) => void
  onPatchAIConfig: (nodeId: string, patch: Partial<NonNullable<MindMapNode['data']['aiConfig']>>) => void
  onDeleteNode: (nodeId: string) => void
}) {
  const data = node.data
  const aiEffective = resolveNodeAIFallback(data.aiConfig, globalDefaults)
  const isAI = data.nodeKind === 'ai'
  const runtimeStatus: NodeRuntimeStatus = data.runtime?.status || 'idle'
  const [aiConfigOpen, setAiConfigOpen] = useState(true)

  return (
    <div className="space-y-3">
      {/* Quick info */}
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-[var(--mind-bg-accent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--mind-text-muted)]">
          {data.nodeKind}
        </span>
        <span className="text-[10px] text-[var(--mind-text-light)]">{node.id}</span>
      </div>

      {/* Title */}
      <label className="block">
        <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Title</span>
        <input
          value={data.label}
          onChange={(e) => onPatchNode(node.id, { label: e.target.value })}
          className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-sm font-medium"
        />
      </label>

      {/* Notes */}
      <label className="block">
        <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Notes</span>
        <textarea
          value={data.notes || ''}
          onChange={(e) => onPatchNode(node.id, { notes: e.target.value })}
          rows={2}
          className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
        />
      </label>

      {/* AI Config Section */}
      {isAI && (
        <SectionToggle
          title="AI Configuration"
          icon={<Cpu className="h-3.5 w-3.5" />}
          open={aiConfigOpen}
          onToggle={() => setAiConfigOpen((v) => !v)}
        >
          <div className="mt-2 space-y-2.5">
            <label className="block">
              <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">System Prompt</span>
              <textarea
                value={data.aiConfig?.systemPrompt || ''}
                onChange={(e) => onPatchAIConfig(node.id, { systemPrompt: e.target.value })}
                rows={3}
                className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
              />
              <FieldHint active={!data.aiConfig?.systemPrompt?.trim()} value={globalDefaults.systemPrompt || 'empty'} />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Model</span>
              <input
                value={data.aiConfig?.model || ''}
                onChange={(e) => onPatchAIConfig(node.id, { model: e.target.value })}
                placeholder="e.g. gpt-4.1-mini"
                className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
              />
              <FieldHint active={!data.aiConfig?.model?.trim()} value={globalDefaults.model || 'empty'} />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Temperature</span>
                <input
                  type="number"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={data.aiConfig?.temperature ?? ''}
                  onChange={(e) =>
                    onPatchAIConfig(node.id, {
                      temperature: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Routing</span>
                <select
                  value={data.aiConfig?.routing || ''}
                  onChange={(e) =>
                    onPatchAIConfig(node.id, {
                      routing: (e.target.value || undefined) as NodeRoutingMode | undefined,
                    })
                  }
                  className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
                >
                  <option value="">Default</option>
                  <option value="direct">direct</option>
                  <option value="buffered">buffered</option>
                  <option value="storage">storage</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Memory</span>
                <select
                  value={
                    typeof data.aiConfig?.useMemoryVault === 'boolean'
                      ? data.aiConfig.useMemoryVault ? 'true' : 'false'
                      : ''
                  }
                  onChange={(e) =>
                    onPatchAIConfig(node.id, {
                      useMemoryVault: e.target.value === '' ? undefined : e.target.value === 'true',
                    })
                  }
                  className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
                >
                  <option value="">Default</option>
                  <option value="true">On</option>
                  <option value="false">Off</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Scope</span>
                <select
                  value={data.aiConfig?.memoryScope || ''}
                  onChange={(e) =>
                    onPatchAIConfig(node.id, {
                      memoryScope: (e.target.value || undefined) as NodeMemoryScope | undefined,
                    })
                  }
                  className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
                >
                  <option value="">Default</option>
                  <option value="session">session</option>
                  <option value="workflow">workflow</option>
                  <option value="global">global</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Code (optional)</span>
              <textarea
                value={data.aiConfig?.code || ''}
                onChange={(e) => onPatchAIConfig(node.id, { code: e.target.value })}
                rows={4}
                className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 font-mono text-[11px]"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Runtime Status</span>
              <select
                value={runtimeStatus}
                onChange={(e) =>
                  onPatchNode(node.id, {
                    runtime: {
                      ...(data.runtime || {}),
                      status: e.target.value as NodeRuntimeStatus,
                    },
                  })
                }
                className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
              >
                <option value="idle">idle</option>
                <option value="queued">queued</option>
                <option value="running">running</option>
                <option value="success">success</option>
                <option value="error">error</option>
              </select>
            </label>
          </div>
        </SectionToggle>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <p className="mb-1 text-[11px] font-semibold text-amber-800">Issues</p>
          <ul className="space-y-0.5">
            {issues.map((issue) => (
              <li key={issue} className="flex items-start gap-1 text-[11px] text-amber-700">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Effective model info */}
      <div className="rounded-lg border border-[var(--mind-border)] bg-[var(--mind-bg-accent)] p-2.5">
        <p className="text-[10px] text-[var(--mind-text-muted)]">
          Model: <span className="font-semibold text-[var(--mind-text)]">{aiEffective.model || 'none'}</span>
        </p>
        {node.data.runtime?.lastRunAt && (
          <p className="mt-0.5 text-[10px] text-[var(--mind-text-muted)]">
            Last run: <span className="font-medium text-[var(--mind-text)]">{node.data.runtime.lastRunAt}</span>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onDeleteNode(node.id)}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   Main RightSidebar
   ────────────────────────────────────────────── */

export function RightSidebar({
  selectedNode,
  selectedEdge,
  globalDefaults,
  issues,
  runOutput,
  onPatchNode,
  onPatchAIConfig,
  onDeleteNode,
  onPatchEdge,
  onDeleteEdge,
}: RightSidebarProps) {
  const hasSelection = selectedNode || selectedEdge

  return (
    <aside className="flex h-full flex-col overflow-hidden border-l border-[var(--mind-border)] bg-[var(--mind-surface)]">
      {/* Header */}
      <div className="border-b border-[var(--mind-border)] px-4 py-3">
        <h2 className="text-sm font-bold text-[var(--mind-text)]">
          {selectedNode ? 'Node Settings' : selectedEdge ? 'Connection' : 'Inspector'}
        </h2>
        <p className="text-[10px] text-[var(--mind-text-muted)]">
          {hasSelection ? 'Configure the selected element' : 'Select an item on the canvas'}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {/* Selection details */}
        {selectedNode ? (
          <div className="p-4">
            <NodeSection
              node={selectedNode}
              globalDefaults={globalDefaults}
              issues={issues}
              onPatchNode={onPatchNode}
              onPatchAIConfig={onPatchAIConfig}
              onDeleteNode={onDeleteNode}
            />
          </div>
        ) : selectedEdge ? (
          <div className="p-4">
            <EdgeSection
              edge={selectedEdge}
              onPatchEdge={onPatchEdge}
              onDeleteEdge={onDeleteEdge}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="rainbow-border rainbow-border-subtle flex h-12 w-12 items-center justify-center rounded-xl">
              <Copy className="h-5 w-5 text-[var(--mind-text-light)]" />
            </div>
            <p className="mt-3 text-xs text-[var(--mind-text-muted)]">
              Click on any node or connection to view and edit its settings here.
            </p>
          </div>
        )}

        {/* Run Output */}
        <div className="border-t border-[var(--mind-border)]">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Terminal className="h-3.5 w-3.5 text-[var(--mind-text-muted)]" />
            <span className="text-xs font-semibold text-[var(--mind-text)]">Output</span>
          </div>
          <div className="px-4 pb-4">
            <pre className="custom-scrollbar max-h-48 overflow-auto rounded-lg border border-[var(--mind-border)] bg-[var(--mind-bg-accent)] p-3 text-[11px] leading-relaxed text-[var(--mind-text-muted)]">
              {runOutput || 'Run the workflow to see output here.'}
            </pre>
          </div>
        </div>
      </div>
    </aside>
  )
}
