import { NextResponse } from 'next/server'
import {
  createBugTrackRecord,
  listBugTrackRecords,
  getWorkflowById,
  saveWorkflow,
} from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { resolveUserId } from '@/lib/user-context'

interface BugtrackerRequest {
  userId?: string
  workflowId: string
  nodeId: string
  errors: Record<string, unknown>
  fixed?: boolean
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workflowId = searchParams.get('workflowId')
  if (!workflowId) {
    return NextResponse.json(
      { ok: false, message: 'workflowId is required.' },
      { status: 400 }
    )
  }

  const records = await listBugTrackRecords(workflowId)
  return NextResponse.json({ ok: true, records })
}

export async function POST(request: Request) {
  const body = (await request.json()) as BugtrackerRequest
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const record = await createBugTrackRecord({
    workflowId: body.workflowId,
    nodeId: body.nodeId,
    errors: body.errors,
    fixed: body.fixed,
  })

  const workflow = await getWorkflowById(userId, body.workflowId)
  if (workflow) {
    const updatedNodes = workflow.nodes.map((node) =>
      node.id === body.nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              testsPassed: Boolean(body.fixed),
              bugStatus: body.fixed ? ('fixed' as const) : ('failed' as const),
            },
          }
        : node
    )
    await saveWorkflow({
      ...workflow,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString(),
    })
  }

  return NextResponse.json({ ok: true, record })
}
