import { NextResponse } from 'next/server'
import { validateMindMapWorkflow } from '@/lib/mindmap-runtime'
import { Workflow } from '@/types/workflow'

interface ValidatePayload {
  workflow?: Workflow
}

export async function POST(request: Request) {
  let body: ValidatePayload
  try {
    body = (await request.json()) as ValidatePayload
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 })
  }

  if (!body.workflow) {
    return NextResponse.json({ success: false, message: 'workflow is required.' }, { status: 400 })
  }

  const result = validateMindMapWorkflow(body.workflow)
  return NextResponse.json(result)
}
