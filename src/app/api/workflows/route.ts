import { NextResponse } from 'next/server'
import { addAuditLog, listAuditLogs, listWorkflows, saveWorkflow } from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { Workflow } from '@/types/workflow'
import { resolveUserId } from '@/lib/user-context'
import { autoRepairWorkflow, validateWorkflow } from '@/lib/workflow-validator'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = resolveUserId(searchParams.get('userId') || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }
  const includeAudit = searchParams.get('includeAudit') === 'true'
  const includeValidation = searchParams.get('includeValidation') === 'true'

  const workflows = await listWorkflows(userId)
  const workflowHealth = includeValidation
    ? workflows.map((workflow) => ({
        workflowId: workflow.id,
        report: validateWorkflow(workflow),
      }))
    : undefined
  const audit = includeAudit ? await listAuditLogs(userId) : undefined

  return NextResponse.json({ workflows, audit, workflowHealth })
}

export async function POST(request: Request) {
  let body: Partial<Workflow>
  try {
    body = (await request.json()) as Partial<Workflow>
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON payload.' }, { status: 400 })
  }
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const incoming: Workflow = {
    id: body.id?.trim() || `workflow-${Date.now()}`,
    userId,
    name: body.name?.trim() || 'Untitled workflow',
    description: body.description || '',
    nodes: Array.isArray(body.nodes) ? body.nodes : [],
    edges: Array.isArray(body.edges) ? body.edges : [],
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const repair = autoRepairWorkflow(incoming)
  const validation = validateWorkflow(repair.workflow)
  if (!validation.safeToRun) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Workflow has blocking validation issues.',
        validation,
        appliedFixes: repair.appliedFixes,
      },
      { status: 422 }
    )
  }

  const workflow = await saveWorkflow(repair.workflow)

  await addAuditLog(workflow.userId, workflow.id, 'workflow.saved', {
    nodeCount: workflow.nodes.length,
    edgeCount: workflow.edges.length,
    score: validation.score,
    warnings: validation.summary.warnings,
    appliedFixes: repair.appliedFixes,
  })

  return NextResponse.json({ workflow, validation, appliedFixes: repair.appliedFixes })
}
