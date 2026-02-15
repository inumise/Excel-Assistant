import { NextResponse } from 'next/server'
import {
  deleteMemoryRecord,
  listMemoryRecords,
  upsertMemoryRecord,
} from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { resolveUserId } from '@/lib/user-context'

interface MemoryWriteRequest {
  userId?: string
  workflowId?: string
  namespace?: string
  key?: string
  value?: unknown
}

interface MemoryDeleteRequest {
  userId?: string
  workflowId?: string
  namespace?: string
  key?: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const userId = resolveUserId(url.searchParams.get('userId') || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const workflowId = url.searchParams.get('workflowId') || undefined
  const namespace = url.searchParams.get('namespace') || undefined
  const key = url.searchParams.get('key') || undefined

  const records = await listMemoryRecords({
    userId,
    workflowId,
    namespace,
    key,
  })

  return NextResponse.json({ success: true, records })
}

export async function POST(request: Request) {
  const body = (await request.json()) as MemoryWriteRequest
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  if (!body.key?.trim()) {
    return NextResponse.json({ success: false, message: 'Memory key is required.' }, { status: 400 })
  }

  const record = await upsertMemoryRecord({
    userId,
    workflowId: body.workflowId,
    namespace: body.namespace || 'general',
    key: body.key,
    value: body.value ?? null,
  })

  return NextResponse.json({ success: true, record })
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as MemoryDeleteRequest
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  if (!body.key?.trim()) {
    return NextResponse.json({ success: false, message: 'Memory key is required.' }, { status: 400 })
  }

  const result = await deleteMemoryRecord({
    userId,
    workflowId: body.workflowId,
    namespace: body.namespace || 'general',
    key: body.key,
  })

  return NextResponse.json({ success: true, ...result })
}
