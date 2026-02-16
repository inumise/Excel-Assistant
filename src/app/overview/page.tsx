'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Building2, Loader2, Network, ShieldCheck, UserCog, Wrench } from 'lucide-react'
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

interface WorkflowsResponse {
  workflows?: Workflow[]
  workflowHealth?: WorkflowHealthRow[]
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

export default function OverviewPage() {
  const [loading, setLoading] = useState(true)
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [workflowHealth, setWorkflowHealth] = useState<WorkflowHealthRow[]>([])
  const [health, setHealth] = useState<HealthResponse | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [workflowRes, healthRes] = await Promise.all([
          fetch(`/api/workflows?userId=${encodeURIComponent(DEMO_USER_ID)}&includeValidation=true`),
          fetch(`/api/system/health?userId=${encodeURIComponent(DEMO_USER_ID)}`),
        ])

        const workflowData = (await workflowRes.json()) as WorkflowsResponse
        setWorkflows(workflowData.workflows || [])
        setWorkflowHealth(workflowData.workflowHealth || [])

        const healthData = (await healthRes.json()) as HealthResponse
        setHealth(healthData)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const totals = useMemo(() => {
    const nodes = workflows.flatMap((workflow) => workflow.nodes)
    const edges = workflows.flatMap((workflow) => workflow.edges)
    const managers = nodes.filter((node) => node.data.role === 'manager').length
    const programmers = nodes.filter((node) => node.data.role === 'programmer').length
    const codeBlocks = nodes.filter((node) => node.data.role === 'code').length
    const avgScore =
      workflowHealth.length > 0
        ? Math.round(
            workflowHealth.reduce((sum, row) => sum + (row.report?.score || 0), 0) / workflowHealth.length
          )
        : 0

    return {
      workflows: workflows.length,
      nodes: nodes.length,
      edges: edges.length,
      managers,
      programmers,
      codeBlocks,
      avgScore,
    }
  }, [workflowHealth, workflows])

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-[1400px] items-center justify-center px-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#1D4ED8]">Owner Overview</h1>
        <p className="text-sm text-[#334155]">
          Monitor workforce scale, structure quality, and operating readiness from one page.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rgb-glow-card">
          <CardHeader className="pb-2">
            <CardDescription>Total structures</CardDescription>
            <CardTitle className="text-2xl text-[#1D4ED8]">{totals.workflows}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-[#475569]">
            <Building2 className="h-4 w-4 text-[#1D4ED8]" />
            AI employee organizations
          </CardContent>
        </Card>

        <Card className="rgb-glow-card">
          <CardHeader className="pb-2">
            <CardDescription>Total AI workers</CardDescription>
            <CardTitle className="text-2xl text-[#1D4ED8]">{totals.nodes}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-[#475569]">
            <UserCog className="h-4 w-4 text-[#1D4ED8]" />
            Managers {totals.managers} • Programmers {totals.programmers}
          </CardContent>
        </Card>

        <Card className="rgb-glow-card">
          <CardHeader className="pb-2">
            <CardDescription>Connections + code blocks</CardDescription>
            <CardTitle className="text-2xl text-[#1D4ED8]">{totals.edges}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-[#475569]">
            <Network className="h-4 w-4 text-[#1D4ED8]" />
            Code nodes {totals.codeBlocks}
          </CardContent>
        </Card>

        <Card className="rgb-glow-card">
          <CardHeader className="pb-2">
            <CardDescription>Average readiness score</CardDescription>
            <CardTitle className="text-2xl text-[#1D4ED8]">{totals.avgScore}/100</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-[#475569]">
            <ShieldCheck className="h-4 w-4 text-[#1D4ED8]" />
            {health?.status || 'unknown'} system status
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <Card className="rgb-glow-card">
          <CardHeader>
            <CardTitle className="text-base text-[#1D4ED8]">Top workflows by readiness</CardTitle>
            <CardDescription>Use these as launch templates for large departments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workflowHealth.length === 0 && (
              <p className="text-sm text-[#475569]">No workflows yet. Start in Builder and drag workers into map.</p>
            )}
            {workflowHealth
              .slice()
              .sort((a, b) => (b.report?.score || 0) - (a.report?.score || 0))
              .slice(0, 8)
              .map((row) => (
                <div key={row.workflowId} className="rounded-lg border border-[#DBEAFE] bg-white px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#1E293B]">{row.workflowId}</p>
                    <span className="text-xs text-[#1D4ED8]">{row.report.score}/100</span>
                  </div>
                  <p className="text-xs text-[#475569]">
                    Errors {row.report.summary.errors} • Warnings {row.report.summary.warnings}
                  </p>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="rgb-glow-card">
          <CardHeader>
            <CardTitle className="text-base text-[#1D4ED8]">Operator launchpad</CardTitle>
            <CardDescription>Owner-first pages for scaling company AI structures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/"
              className="flex items-center justify-between rounded-lg border border-[#BFDBFE] bg-white px-3 py-2 text-sm text-[#1E293B] hover:bg-[#EFF6FF]"
            >
              Open Structure Builder
              <Wrench className="h-4 w-4 text-[#1D4ED8]" />
            </Link>
            <Link
              href="/templates"
              className="flex items-center justify-between rounded-lg border border-[#BFDBFE] bg-white px-3 py-2 text-sm text-[#1E293B] hover:bg-[#EFF6FF]"
            >
              Create from Templates
              <Wrench className="h-4 w-4 text-[#1D4ED8]" />
            </Link>
            <Link
              href="/playbooks"
              className="flex items-center justify-between rounded-lg border border-[#BFDBFE] bg-white px-3 py-2 text-sm text-[#1E293B] hover:bg-[#EFF6FF]"
            >
              Manage Prompt Playbooks
              <Wrench className="h-4 w-4 text-[#1D4ED8]" />
            </Link>
            <Link
              href="/operations"
              className="flex items-center justify-between rounded-lg border border-[#BFDBFE] bg-white px-3 py-2 text-sm text-[#1E293B] hover:bg-[#EFF6FF]"
            >
              Operations + Reliability
              <Wrench className="h-4 w-4 text-[#1D4ED8]" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
