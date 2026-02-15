import { NextResponse } from 'next/server'
import { listAuditLogs } from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || DEMO_USER_ID
  const workflowId = searchParams.get('workflowId') || undefined

  const entries = await listAuditLogs(userId, workflowId)
  return NextResponse.json({ ok: true, entries })
}
