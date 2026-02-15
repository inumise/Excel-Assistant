import { NextResponse } from 'next/server'
import { addAuditLog, getWorkflowById, saveWorkflow } from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { resolveUserId } from '@/lib/user-context'
import { autoRepairWorkflow, validateWorkflow } from '@/lib/workflow-validator'

interface ValidateRequest {
  userId?: string
  autoRepair?: boolean
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await context.params
  const { searchParams } = new URL(request.url)
  const userId = resolveUserId(searchParams.get('userId') || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const workflow = await getWorkflowById(userId, workflowId)
  if (!workflow) {
    return NextResponse.json({ success: false, message: 'Workflow not found.' }, { status: 404 })
  }

  const report = validateWorkflow(workflow)
  return NextResponse.json({ success: report.safeToRun, report })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await context.params
  let body: ValidateRequest
  try {
    body = (await request.json()) as ValidateRequest
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 })
  }
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const workflow = await getWorkflowById(userId, workflowId)
  if (!workflow) {
    return NextResponse.json({ success: false, message: 'Workflow not found.' }, { status: 404 })
  }

  let effectiveWorkflow = workflow
  let appliedFixes: string[] = []
  if (body.autoRepair !== false) {
    const repair = autoRepairWorkflow(workflow)
    appliedFixes = repair.appliedFixes
    if (appliedFixes.length > 0) {
      effectiveWorkflow = await saveWorkflow(repair.workflow)
      await addAuditLog(userId, workflowId, 'workflow.auto_repair.manual', { appliedFixes })
    }
  }

  const report = validateWorkflow(effectiveWorkflow)
  return NextResponse.json({
    success: report.safeToRun,
    report,
    appliedFixes,
    workflow: effectiveWorkflow,
  })
}
