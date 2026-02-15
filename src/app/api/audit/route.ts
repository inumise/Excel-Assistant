import { NextResponse } from 'next/server'
import { listAuditLogs } from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { resolveUserId } from '@/lib/user-context'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = resolveUserId(searchParams.get('userId') || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }
  const workflowId = searchParams.get('workflowId') || undefined

  const entries = await listAuditLogs(userId, workflowId)
  return NextResponse.json({ ok: true, entries })
}
