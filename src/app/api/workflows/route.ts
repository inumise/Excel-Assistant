import { NextResponse } from 'next/server'
import { addAuditLog, listAuditLogs, listWorkflows, saveWorkflow } from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { Workflow } from '@/types/workflow'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || DEMO_USER_ID
  const includeAudit = searchParams.get('includeAudit') === 'true'

  const workflows = await listWorkflows(userId)
  const audit = includeAudit ? await listAuditLogs(userId) : undefined

  return NextResponse.json({ workflows, audit })
}

export async function POST(request: Request) {
  const body = (await request.json()) as Workflow
  const workflow = await saveWorkflow({
    ...body,
    userId: body.userId || DEMO_USER_ID,
    updatedAt: new Date().toISOString(),
  })

  await addAuditLog(workflow.userId, workflow.id, 'workflow.saved', {
    nodeCount: workflow.nodes.length,
    edgeCount: workflow.edges.length,
  })

  return NextResponse.json({ workflow })
}
