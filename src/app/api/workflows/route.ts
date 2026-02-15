import { NextResponse } from 'next/server'
import { addAuditLog, listAuditLogs, listWorkflows, saveWorkflow } from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { Workflow } from '@/types/workflow'
import { resolveUserId } from '@/lib/user-context'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = resolveUserId(searchParams.get('userId') || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }
  const includeAudit = searchParams.get('includeAudit') === 'true'

  const workflows = await listWorkflows(userId)
  const audit = includeAudit ? await listAuditLogs(userId) : undefined

  return NextResponse.json({ workflows, audit })
}

export async function POST(request: Request) {
  const body = (await request.json()) as Workflow
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }
  const workflow = await saveWorkflow({
    ...body,
    userId,
    updatedAt: new Date().toISOString(),
  })

  await addAuditLog(workflow.userId, workflow.id, 'workflow.saved', {
    nodeCount: workflow.nodes.length,
    edgeCount: workflow.edges.length,
  })

  return NextResponse.json({ workflow })
}
