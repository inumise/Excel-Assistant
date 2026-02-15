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

function normalizeText(value: string | undefined, fallback: string, maxLength: number) {
  const text = (value || fallback).trim()
  return text.slice(0, maxLength) || fallback
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
  let body: MemoryWriteRequest
  try {
    body = (await request.json()) as MemoryWriteRequest
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 })
  }
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const key = normalizeText(body.key, '', 120)
  const namespace = normalizeText(body.namespace, 'general', 80)
  if (!key.trim()) {
    return NextResponse.json({ success: false, message: 'Memory key is required.' }, { status: 400 })
  }

  const payloadSize = JSON.stringify(body.value ?? null).length
  if (payloadSize > 16_000) {
    return NextResponse.json(
      { success: false, message: 'Memory value too large (max 16KB JSON).' },
      { status: 413 }
    )
  }

  const record = await upsertMemoryRecord({
    userId,
    workflowId: body.workflowId,
    namespace,
    key,
    value: body.value ?? null,
  })

  return NextResponse.json({ success: true, record })
}

export async function DELETE(request: Request) {
  let body: MemoryDeleteRequest
  try {
    body = (await request.json()) as MemoryDeleteRequest
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 })
  }
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const key = normalizeText(body.key, '', 120)
  const namespace = normalizeText(body.namespace, 'general', 80)
  if (!key.trim()) {
    return NextResponse.json({ success: false, message: 'Memory key is required.' }, { status: 400 })
  }

  const result = await deleteMemoryRecord({
    userId,
    workflowId: body.workflowId,
    namespace,
    key,
  })

  return NextResponse.json({ success: true, ...result })
}
