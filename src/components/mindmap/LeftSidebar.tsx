'use client'

import { useState, useCallback, type DragEvent } from 'react'
import {
  Brain,
  Braces,
  ChevronDown,
  ChevronRight,
  Database,
  GripVertical,
  MessageSquareText,
  Plus,
  Settings2,
  Shapes,
  Square,
  Waves,
  Layers,
  Zap,
} from 'lucide-react'
import { NODE_TEMPLATES, type NodeTemplateDefinition } from '@/components/mindmap/types'
import { WorkflowGlobalDefaults } from '@/types/workflow'

/* ──────────────────────────────────────────────
   Props
   ────────────────────────────────────────────── */

interface LeftSidebarProps {
  onAddTemplate: (templateId: string) => void
  onDragStateChange: (active: boolean) => void
  onDragTemplateChange: (templateId: string | null) => void
  globalDefaults: WorkflowGlobalDefaults
  onPatchDefaults: (patch: Partial<WorkflowGlobalDefaults>) => void
  onBulkOverwriteNodes: () => void
}

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function templateIcon(templateId: string) {
  if (templateId === 'ai-box') return <Brain className="h-4 w-4 text-[var(--mind-accent-violet)]" />
  if (templateId === 'storage') return <Database className="h-4 w-4 text-[var(--mind-accent-teal)]" />
  if (templateId === 'buffer') return <Waves className="h-4 w-4 text-amber-500" />
  if (templateId === 'function-box') return <Braces className="h-4 w-4 text-[var(--mind-accent-blue)]" />
  if (templateId === 'text') return <MessageSquareText className="h-4 w-4 text-sky-500" />
  if (templateId === 'shape') return <Shapes className="h-4 w-4 text-[var(--mind-accent-violet)]" />
  return <Square className="h-4 w-4 text-[var(--mind-text-muted)]" />
}

const AI_TEMPLATES = NODE_TEMPLATES.filter(
  (t) => t.kind === 'ai' || t.id === 'ai-box' || t.id === 'function-box'
)
const OTHER_TEMPLATES = NODE_TEMPLATES.filter(
  (t) => t.kind !== 'ai' && t.id !== 'ai-box' && t.id !== 'function-box'
)

/* ──────────────────────────────────────────────
   Collapsible Section Wrapper
   ────────────────────────────────────────────── */

function SidebarSection({
  title,
  icon,
  defaultOpen = true,
  count,
  children,
}: {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  count?: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--mind-border)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="sidebar-section-header flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--mind-text-muted)]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-[var(--mind-text-muted)]" />
        )}
        <span className="text-[var(--mind-text-muted)]">{icon}</span>
        <span className="text-sm font-semibold text-[var(--mind-text)]">{title}</span>
        {typeof count === 'number' && (
          <span className="ml-auto rounded-full bg-[var(--mind-bg-accent)] px-2 py-0.5 text-[10px] font-medium text-[var(--mind-text-muted)]">
            {count}
          </span>
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

/* ──────────────────────────────────────────────
   Draggable Template Card
   ────────────────────────────────────────────── */

function DraggableTemplateCard({
  template,
  onAdd,
  onDragStateChange,
  onDragTemplateChange,
}: {
  template: NodeTemplateDefinition
  onAdd: (id: string) => void
  onDragStateChange: (active: boolean) => void
  onDragTemplateChange: (id: string | null) => void
}) {
  const handleDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.setData('application/mindmap-template', template.id)
      event.dataTransfer.setData('application/reactflow', template.id)
      event.dataTransfer.setData('text/plain', template.id)
      event.dataTransfer.effectAllowed = 'move'
      onDragStateChange(true)
      onDragTemplateChange(template.id)
    },
    [template.id, onDragStateChange, onDragTemplateChange]
  )

  const handleDragEnd = useCallback(() => {
    onDragStateChange(false)
    onDragTemplateChange(null)
  }, [onDragStateChange, onDragTemplateChange])

  return (
    <button
      type="button"
      draggable
      data-testid={`catalog-${template.id}`}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseDown={() => {
        onDragStateChange(true)
        onDragTemplateChange(template.id)
      }}
      onMouseUp={() => {
        onDragStateChange(false)
        onDragTemplateChange(null)
      }}
      onClick={() => onAdd(template.id)}
      className="draggable-card flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left"
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-[var(--mind-text-light)]" />
      <span className="shrink-0">{templateIcon(template.id)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--mind-text)]">
          {template.title}
        </span>
        <span className="block truncate text-[11px] text-[var(--mind-text-muted)]">
          {template.description}
        </span>
      </span>
      <Plus className="h-3.5 w-3.5 shrink-0 text-[var(--mind-text-light)] opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

/* ──────────────────────────────────────────────
   Main LeftSidebar
   ────────────────────────────────────────────── */

export function LeftSidebar({
  onAddTemplate,
  onDragStateChange,
  onDragTemplateChange,
  globalDefaults,
  onPatchDefaults,
  onBulkOverwriteNodes,
}: LeftSidebarProps) {
  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-[var(--mind-border)] bg-[var(--mind-surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--mind-border)] px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--mind-text)]">
          <Layers className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--mind-text)]">Workforce</h2>
          <p className="text-[10px] text-[var(--mind-text-muted)]">Drag items to canvas</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {/* AI Workers List */}
        <SidebarSection
          title="AI Workers"
          icon={<Brain className="h-4 w-4" />}
          defaultOpen={true}
          count={AI_TEMPLATES.length}
        >
          <div className="space-y-1">
            {AI_TEMPLATES.map((template) => (
              <DraggableTemplateCard
                key={template.id}
                template={template}
                onAdd={onAddTemplate}
                onDragStateChange={onDragStateChange}
                onDragTemplateChange={onDragTemplateChange}
              />
            ))}
          </div>
        </SidebarSection>

        {/* Functions & Components */}
        <SidebarSection
          title="Components"
          icon={<Zap className="h-4 w-4" />}
          defaultOpen={true}
          count={OTHER_TEMPLATES.length}
        >
          <div className="space-y-1">
            {OTHER_TEMPLATES.map((template) => (
              <DraggableTemplateCard
                key={template.id}
                template={template}
                onAdd={onAddTemplate}
                onDragStateChange={onDragStateChange}
                onDragTemplateChange={onDragTemplateChange}
              />
            ))}
          </div>
        </SidebarSection>

        {/* Global Settings */}
        <SidebarSection
          title="Global Settings"
          icon={<Settings2 className="h-4 w-4" />}
          defaultOpen={false}
        >
          <div className="space-y-3">
            <label className="block">
              <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">System Prompt</span>
              <textarea
                value={globalDefaults.systemPrompt || ''}
                onChange={(e) => onPatchDefaults({ systemPrompt: e.target.value })}
                rows={3}
                className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Model</span>
              <input
                value={globalDefaults.model || ''}
                onChange={(e) => onPatchDefaults({ model: e.target.value })}
                className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Temperature</span>
                <input
                  type="number"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={globalDefaults.temperature ?? ''}
                  onChange={(e) =>
                    onPatchDefaults({
                      temperature: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Routing</span>
                <select
                  value={globalDefaults.routing || 'direct'}
                  onChange={(e) =>
                    onPatchDefaults({ routing: e.target.value as typeof globalDefaults.routing })
                  }
                  className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
                >
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
                  value={globalDefaults.useMemoryVault ? 'true' : 'false'}
                  onChange={(e) =>
                    onPatchDefaults({ useMemoryVault: e.target.value === 'true' })
                  }
                  className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
                >
                  <option value="false">Off</option>
                  <option value="true">On</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-[var(--mind-text-muted)]">Scope</span>
                <select
                  value={globalDefaults.memoryScope || 'workflow'}
                  onChange={(e) =>
                    onPatchDefaults({
                      memoryScope: e.target.value as typeof globalDefaults.memoryScope,
                    })
                  }
                  className="mind-input-field mt-1 w-full rounded-lg px-2.5 py-2 text-xs"
                >
                  <option value="session">session</option>
                  <option value="workflow">workflow</option>
                  <option value="global">global</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={onBulkOverwriteNodes}
              className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            >
              Apply defaults to all AI nodes
            </button>
          </div>
        </SidebarSection>
      </div>
    </aside>
  )
}
