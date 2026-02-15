'use client'

import { useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CodeBlockProps {
  userId: string
  workflowId: string
  nodeId: string
  language: 'javascript' | 'typescript' | 'python'
  code: string
  prompt: string
  testsPassed?: boolean
  bugStatus?: 'idle' | 'running' | 'failed' | 'fixed'
  errorCheckEnabled: boolean
  onChange: (nextCode: string) => void
  onStatusChange: (status: { testsPassed?: boolean; bugStatus?: 'idle' | 'running' | 'failed' | 'fixed' }) => void
}

export function CodeBlock({
  userId,
  workflowId,
  nodeId,
  language,
  code,
  prompt,
  testsPassed,
  bugStatus,
  errorCheckEnabled,
  onChange,
  onStatusChange,
}: CodeBlockProps) {
  const [localPrompt, setLocalPrompt] = useState(prompt)
  const [isProgramming, setIsProgramming] = useState(false)
  const [isBugtracking, setIsBugtracking] = useState(false)
  const [statusText, setStatusText] = useState('Ready')

  const statusBadge = useMemo(() => {
    if (bugStatus === 'running') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] text-amber-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          Bugtrack running
        </span>
      )
    }

    if (testsPassed || bugStatus === 'fixed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] text-emerald-700">
          <CheckCircle2 className="h-3 w-3" />
          Tests passed
        </span>
      )
    }

    if (bugStatus === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[11px] text-red-700">
          <AlertTriangle className="h-3 w-3" />
          Failing
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
        Idle
      </span>
    )
  }, [bugStatus, testsPassed])

  const callProgrammer = async (mode: 'generate' | 'self-change' | 'delegate') => {
    setIsProgramming(true)
    setStatusText(
      mode === 'generate'
        ? 'Programmer AI generating code…'
        : mode === 'self-change'
        ? 'Self-modifying this node…'
        : 'Delegating to child programmer agents…'
    )

    try {
      const response = await fetch('/api/nodes/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          mode,
          prompt: localPrompt,
          language,
          existingCode: code,
        }),
      })
      const data = await response.json()
      if (data.code) {
        onChange(data.code)
      }
      setStatusText('Code updated by Programmer AI.')
    } catch {
      setStatusText('Programmer AI request failed.')
    } finally {
      setIsProgramming(false)
    }
  }

  const runBugtrackLoop = async () => {
    if (!errorCheckEnabled) {
      setStatusText('Enable Error Check before running bugtracker.')
      return
    }

    setIsBugtracking(true)
    onStatusChange({ bugStatus: 'running' })
    setStatusText('Running lint/tests and auto-fix loop…')

    try {
      const response = await fetch('/api/bugtracker/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          workflowId,
          nodeId,
          trigger: 'manual-code-update',
        }),
      })
      const data = await response.json()
      if (data.fixed) {
        onStatusChange({ testsPassed: true, bugStatus: 'fixed' })
      } else {
        onStatusChange({ testsPassed: false, bugStatus: 'failed' })
      }
      setStatusText(data.message || 'Bugtracker completed.')
    } catch {
      onStatusChange({ testsPassed: false, bugStatus: 'failed' })
      setStatusText('Bugtracker failed.')
    } finally {
      setIsBugtracking(false)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-[#BFDBFE] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-medium text-[#1D4ED8]">{language.toUpperCase()} code</div>
        {statusBadge}
      </div>

      <Input
        value={localPrompt}
        onChange={(event) => setLocalPrompt(event.target.value)}
        placeholder="Prompt for Programmer AI"
        className="h-8 border-[#93C5FD] bg-white text-xs text-[#0F172A] placeholder:text-[#64748B]"
      />

      <div className="overflow-hidden rounded-lg border border-[#93C5FD]">
        <Editor
          height={220}
          defaultLanguage={language}
          value={code}
          onChange={(value) => onChange(value || '')}
          theme="vs"
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbersMinChars: 3,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={isProgramming || isBugtracking}
          onClick={() => callProgrammer('generate')}
          className="h-8 bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
        >
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          AI Program
        </Button>
        <Button
          size="sm"
          disabled={isProgramming || isBugtracking}
          onClick={() => callProgrammer('self-change')}
          className="h-8 bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
        >
          Self-Change
        </Button>
        <Button
          size="sm"
          disabled={isProgramming || isBugtracking}
          onClick={() => callProgrammer('delegate')}
          className="h-8 bg-[#0F172A] text-white hover:bg-[#020617]"
        >
          Delegate
        </Button>
        <Button
          size="sm"
          disabled={isProgramming || isBugtracking}
          onClick={runBugtrackLoop}
          className="h-8 bg-[#0EA5E9] text-white hover:bg-[#0284C7]"
        >
          {isBugtracking ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wrench className="mr-1 h-3.5 w-3.5" />
          )}
          Bugtrack & Fix
        </Button>
      </div>

      <p className="text-[11px] text-[#334155]">{statusText}</p>
    </div>
  )
}
