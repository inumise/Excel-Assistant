import { NextResponse } from 'next/server'
import { addAuditLog, saveWorkflow } from '@/lib/server-store'
import { ownerTemplates } from '@/lib/owner-templates'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { resolveUserId } from '@/lib/user-context'

interface CreateTemplateRequest {
  templateId?: string
  userId?: string
}

export async function GET() {
  return NextResponse.json({
    templates: ownerTemplates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      size: template.size,
      departments: template.departments,
    })),
  })
}

export async function POST(request: Request) {
  let body: CreateTemplateRequest
  try {
    body = (await request.json()) as CreateTemplateRequest
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON payload.' }, { status: 400 })
  }

  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const template = ownerTemplates.find((item) => item.id === body.templateId)
  if (!template) {
    return NextResponse.json({ ok: false, message: 'Template not found.' }, { status: 404 })
  }

  const workflow = await saveWorkflow(template.create(userId))
  await addAuditLog(userId, workflow.id, 'workflow.template_created', {
    templateId: template.id,
    templateName: template.name,
  })

  return NextResponse.json({ ok: true, workflow })
}
