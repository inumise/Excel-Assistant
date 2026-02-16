'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookText, Loader2, PlusCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { MemoryRecord } from '@/types/workflow'

function toKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function PlaybooksPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [records, setRecords] = useState<MemoryRecord[]>([])
  const [title, setTitle] = useState('')
  const [promptBody, setPromptBody] = useState('')
  const [message, setMessage] = useState('')

  const sorted = useMemo(
    () => records.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [records]
  )

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/memory?userId=${encodeURIComponent(DEMO_USER_ID)}&namespace=playbook`
      )
      const data = await response.json()
      setRecords((data.records || []) as MemoryRecord[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const savePlaybook = async () => {
    const trimmedTitle = title.trim()
    const trimmedBody = promptBody.trim()
    if (!trimmedTitle || !trimmedBody) {
      setMessage('Playbook title and prompt are required.')
      return
    }
    const key = toKey(trimmedTitle)
    if (!key) {
      setMessage('Playbook title must contain letters or numbers.')
      return
    }

    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          namespace: 'playbook',
          key,
          value: {
            title: trimmedTitle,
            prompt: trimmedBody,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || `Unable to save playbook (${response.status})`)
      }
      setTitle('')
      setPromptBody('')
      setMessage('Playbook saved.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save playbook.')
    } finally {
      setSaving(false)
    }
  }

  const deletePlaybook = async (key: string) => {
    setMessage('')
    try {
      const response = await fetch('/api/memory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          namespace: 'playbook',
          key,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.message || `Unable to delete playbook (${response.status})`)
      }
      setMessage('Playbook deleted.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete playbook.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#1D4ED8]">Prompt Playbooks</h1>
        <p className="text-sm text-[#334155]">
          Keep reusable owner prompt packs to scale many departments consistently.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-sm text-[#1E3A8A]">
          {message}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rgb-glow-card">
          <CardHeader>
            <CardTitle className="text-base text-[#1D4ED8]">Create playbook</CardTitle>
            <CardDescription>Used in Prompt Control to standardize teams at scale.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="text-xs text-[#334155]">Playbook title</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Sales follow-up voice"
              className="border-[#CBD5E1]"
            />
            <label className="text-xs text-[#334155]">Prompt body</label>
            <textarea
              value={promptBody}
              onChange={(event) => setPromptBody(event.target.value)}
              rows={10}
              className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1 text-xs text-[#0F172A] outline-none"
              placeholder="Write style/tone/instructions..."
            />
            <Button
              onClick={() => void savePlaybook()}
              disabled={saving}
              className="w-full bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Save Playbook
            </Button>
          </CardContent>
        </Card>

        <Card className="rgb-glow-card">
          <CardHeader>
            <CardTitle className="text-base text-[#1D4ED8]">Saved playbooks</CardTitle>
            <CardDescription>Reference these when editing global and per-block prompts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="flex min-h-[24vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#1D4ED8]" />
              </div>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-[#475569]">No playbooks yet.</p>
            ) : (
              sorted.map((record) => {
                const payload = (record.value || {}) as { title?: string; prompt?: string }
                return (
                  <div key={record.id} className="rounded-lg border border-[#DBEAFE] bg-white p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#1E293B]">
                        {payload.title || record.key}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEF2F2]"
                        onClick={() => void deletePlaybook(record.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="line-clamp-4 whitespace-pre-wrap text-xs text-[#475569]">
                      {payload.prompt || ''}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-[#64748B]">
                      <BookText className="h-3 w-3" />
                      key: {record.key}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
