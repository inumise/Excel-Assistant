import { NextResponse } from 'next/server'
import { runBugFixLoop } from '@/lib/bugtracker'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { resolveUserId } from '@/lib/user-context'

interface CronBody {
  userId?: string
  workflowId: string
  nodeId: string
  trigger?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as CronBody
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  if (!body.workflowId || !body.nodeId) {
    return NextResponse.json(
      { ok: false, message: 'workflowId and nodeId are required.' },
      { status: 400 }
    )
  }

  const result = await runBugFixLoop({
    userId,
    workflowId: body.workflowId,
    nodeId: body.nodeId,
    trigger: body.trigger || 'code-change',
  })

  return NextResponse.json(result)
}
