'use client'

import { WandSparkles } from 'lucide-react'
import {
  CompanyComposerInput,
  CompanyFocus,
  CompanyScale,
  previewCompositionSize,
} from '@/components/mindmap/company-composer'

interface CompanyComposerPanelProps {
  value: CompanyComposerInput
  onChange: (next: CompanyComposerInput) => void
  onBuildReplace: () => void
  onBuildAppend: () => void
  isBusy: boolean
}

function setScale(value: string): CompanyScale {
  if (value === 'startup' || value === 'growth' || value === 'enterprise') return value
  return 'growth'
}

function setFocus(value: string): CompanyFocus {
  if (value === 'balanced' || value === 'revenue' || value === 'operations' || value === 'innovation') {
    return value
  }
  return 'balanced'
}

export function CompanyComposerPanel({
  value,
  onChange,
  onBuildReplace,
  onBuildAppend,
  isBusy,
}: CompanyComposerPanelProps) {
  const preview = previewCompositionSize(value)

  return (
    <section className="mind-surface-panel rounded-xl p-3">
      <div className="flex items-center gap-2 text-[#1f3855]">
        <WandSparkles className="h-4 w-4" />
        <h3 className="text-sm font-semibold">AI Company Composer</h3>
      </div>
      <p className="mt-1 text-xs text-[#5a6b83]">
        Describe business objective, choose scale/focus, and generate a full automated workforce map.
      </p>

      <div className="mt-3 space-y-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-700">Business Objective</span>
          <textarea
            value={value.objective}
            onChange={(event) => onChange({ ...value, objective: event.target.value })}
            rows={3}
            placeholder="e.g. Build an AI-first agency that handles sales, delivery, support, and finance autonomously."
            className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Scale</span>
            <select
              value={value.scale}
              onChange={(event) => onChange({ ...value, scale: setScale(event.target.value) })}
              className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
            >
              <option value="startup">startup</option>
              <option value="growth">growth</option>
              <option value="enterprise">enterprise</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Focus</span>
            <select
              value={value.focus}
              onChange={(event) => onChange({ ...value, focus: setFocus(event.target.value) })}
              className="mind-input-field mt-1 w-full rounded-md px-2 py-1.5 text-sm outline-none"
            >
              <option value="balanced">balanced</option>
              <option value="revenue">revenue</option>
              <option value="operations">operations</option>
              <option value="innovation">innovation</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs text-[#4f637d]">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.includeFunctionRuntime}
              onChange={(event) => onChange({ ...value, includeFunctionRuntime: event.target.checked })}
            />
            Include function runtime node
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.includeCompliance}
              onChange={(event) => onChange({ ...value, includeCompliance: event.target.checked })}
            />
            Include compliance governance unit
          </label>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-[#d4deea] bg-[#f8fbff] px-2 py-1.5 text-xs text-[#3f556f]">
        Preview: ~{preview.nodes} nodes / ~{preview.aiNodes} AI runtime units
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onBuildReplace}
          disabled={isBusy}
          className="inline-flex h-9 items-center rounded-md bg-[#45658D] px-3 text-xs font-semibold text-white disabled:opacity-60"
        >
          Build New Company
        </button>
        <button
          type="button"
          onClick={onBuildAppend}
          disabled={isBusy}
          className="mind-tool-button inline-flex h-9 items-center rounded-md px-3 text-xs font-semibold disabled:opacity-60"
        >
          Add Company Pack
        </button>
      </div>
    </section>
  )
}
