'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Loader2, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DEMO_USER_ID } from '@/lib/workflow-template'

interface BugRecord {
  id: string
  workflowId: string
  nodeId: string
  fixed: boolean
  createdAt: string
  updatedAt: string
  errors: Record<string, unknown>
}

export default function BugtrackerWorkflowPage() {
  const params = useParams<{ workflowId: string }>()
  const workflowId = params.workflowId
  const [records, setRecords] = useState<BugRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [message, setMessage] = useState('')

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/bugtracker?workflowId=${encodeURIComponent(workflowId)}`)
      const data = await response.json()
      setRecords(data.records || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (workflowId) fetchRecords()
  }, [workflowId])

  const runAutoFix = async () => {
    if (!records[0]) {
      setMessage('No bug records yet. Trigger a failing test first.')
      return
    }

    setIsRunning(true)
    try {
      const response = await fetch('/api/bugtracker/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          workflowId,
          nodeId: records[0].nodeId,
          trigger: 'manual-bugtracker-page-run',
        }),
      })
      const data = await response.json()
      setMessage(data.message || 'Bugtracker run complete.')
      fetchRecords()
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#FFD700]">Bugtracker</h1>
          <p className="text-sm text-[#C9A483]">Workflow: {workflowId}</p>
        </div>
        <Button onClick={runAutoFix} disabled={isRunning} className="bg-[#FFD700] text-[#1A1A1A] hover:bg-[#E6C200]">
          {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
          Run Programmer AI Fix Loop
        </Button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-[#C9A483]/30 bg-[#1A1A1A] px-3 py-2 text-sm text-[#E9D6BF]">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" />
        </div>
      ) : (
        <div className="space-y-3">
          {records.length === 0 && (
            <Card className="border-[#C9A483]/30 bg-[#1A1A1A]">
              <CardContent className="pt-6 text-sm text-[#C9A483]">
                No bug records yet for this workflow.
              </CardContent>
            </Card>
          )}

          {records.map((record) => (
            <Card key={record.id} className="border-[#C9A483]/30 bg-[#1A1A1A]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-[#FFD700]">
                  {record.fixed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                  Node {record.nodeId}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-[#E9D6BF]">
                <p>Status: {record.fixed ? 'Fixed' : 'Open / Escalated'}</p>
                <p>Updated: {new Date(record.updatedAt).toLocaleString()}</p>
                <pre className="mt-2 overflow-auto rounded bg-black/40 p-2">
                  {JSON.stringify(record.errors, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
