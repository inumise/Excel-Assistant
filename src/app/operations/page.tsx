'use client'

import { useEffect, useMemo, useState } from 'react'
import { ActivitySquare, Loader2, ShieldAlert, Siren, Wrench } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { Workflow } from '@/types/workflow'

interface ValidationSummary {
  errors: number
  warnings: number
  infos: number
}

interface ValidationReport {
  score: number
  safeToRun: boolean
  summary: ValidationSummary
}

interface WorkflowHealthRow {
  workflowId: string
  report: ValidationReport
}

interface HealthCheck {
  id: string
  label: string
  status: 'ok' | 'warning' | 'error'
  detail: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'critical'
  checks: HealthCheck[]
}

interface AuditRow {
  id: string
  action: string
  createdAt: string
  payload: Record<string, unknown>
}

export default function OperationsPage() {
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [workflowHealth, setWorkflowHealth] = useState<WorkflowHealthRow[]>([])
  const [auditRows, setAuditRows] = useState<AuditRow[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [healthRes, workflowsRes, auditRes] = await Promise.all([
          fetch(`/api/system/health?userId=${encodeURIComponent(DEMO_USER_ID)}`),
          fetch(`/api/workflows?userId=${encodeURIComponent(DEMO_USER_ID)}&includeValidation=true`),
          fetch(`/api/audit?userId=${encodeURIComponent(DEMO_USER_ID)}`),
        ])

        const healthData = (await healthRes.json()) as HealthResponse
        setHealth(healthData)

        const workflowData = (await workflowsRes.json()) as {
          workflows?: Workflow[]
          workflowHealth?: WorkflowHealthRow[]
        }
        setWorkflowHealth(workflowData.workflowHealth || [])

        const auditData = (await auditRes.json()) as { entries?: AuditRow[] }
        setAuditRows(auditData.entries || [])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const counts = useMemo(() => {
    const errors = workflowHealth.reduce((sum, row) => sum + (row.report?.summary.errors || 0), 0)
    const warnings = workflowHealth.reduce((sum, row) => sum + (row.report?.summary.warnings || 0), 0)
    return { errors, warnings }
  }, [workflowHealth])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-[1400px] items-center justify-center px-4 py-6">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#1D4ED8]">Operations Console</h1>
        <p className="text-sm text-[#334155]">
          Reliability, validation, and runtime signals for owner-scale AI employee operations.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rgb-glow-card">
          <CardHeader className="pb-2">
            <CardDescription>System status</CardDescription>
            <CardTitle className="text-2xl text-[#1D4ED8]">{health?.status || 'unknown'}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-[#475569]">
            <ActivitySquare className="h-4 w-4 text-[#1D4ED8]" />
            {health?.checks?.length || 0} runtime checks
          </CardContent>
        </Card>

        <Card className="rgb-glow-card">
          <CardHeader className="pb-2">
            <CardDescription>Validation errors</CardDescription>
            <CardTitle className="text-2xl text-[#1D4ED8]">{counts.errors}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-[#475569]">
            <ShieldAlert className="h-4 w-4 text-[#1D4ED8]" />
            Across all structures
          </CardContent>
        </Card>

        <Card className="rgb-glow-card">
          <CardHeader className="pb-2">
            <CardDescription>Validation warnings</CardDescription>
            <CardTitle className="text-2xl text-[#1D4ED8]">{counts.warnings}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-[#475569]">
            <Siren className="h-4 w-4 text-[#1D4ED8]" />
            Optimize before scaling
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <Card className="rgb-glow-card">
          <CardHeader>
            <CardTitle className="text-base text-[#1D4ED8]">Reliability matrix</CardTitle>
            <CardDescription>Critical integrations and deployment readiness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(health?.checks || []).map((check) => (
              <div
                key={check.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  check.status === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : check.status === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                <p className="font-semibold">{check.label}</p>
                <p className="text-xs">{check.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rgb-glow-card">
          <CardHeader>
            <CardTitle className="text-base text-[#1D4ED8]">Workflow validation standings</CardTitle>
            <CardDescription>Largest structures should target zero errors before launch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workflowHealth.length === 0 && <p className="text-sm text-[#475569]">No workflows available.</p>}
            {workflowHealth
              .slice()
              .sort((a, b) => (a.report?.score || 0) - (b.report?.score || 0))
              .map((row) => (
                <div key={row.workflowId} className="rounded-lg border border-[#DBEAFE] bg-white px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#1E293B]">{row.workflowId}</p>
                    <span className="text-xs text-[#1D4ED8]">{row.report.score}/100</span>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Errors {row.report.summary.errors} • Warnings {row.report.summary.warnings}
                  </p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rgb-glow-card">
        <CardHeader>
          <CardTitle className="text-base text-[#1D4ED8]">Recent operation events</CardTitle>
          <CardDescription>Last actions executed across structures.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {auditRows.length === 0 && <p className="text-sm text-[#475569]">No events yet.</p>}
          {auditRows.slice(0, 12).map((row) => (
            <div key={row.id} className="rounded-lg border border-[#DBEAFE] bg-white px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-[#1E293B]">{row.action}</p>
                <Wrench className="h-4 w-4 text-[#1D4ED8]" />
              </div>
              <p className="text-xs text-[#64748B]">{new Date(row.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
