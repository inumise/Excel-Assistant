import { NextResponse } from 'next/server'
import { addAuditLog, getUserSettings, getWorkflowById } from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { executeWorkflow } from '@/lib/workflow-engine'
import { sendWhatsAppMessage } from '@/lib/whatsapp-service'

interface RunRequest {
  userId?: string
  triggerText?: string
  notifyWhatsapp?: boolean
  whatsappNumber?: string
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  const { workflowId } = await context.params
  const body = (await request.json()) as RunRequest
  const userId = body.userId || DEMO_USER_ID
  const triggerText = body.triggerText || `run ${workflowId}`

  const [workflow, settings] = await Promise.all([
    getWorkflowById(userId, workflowId),
    getUserSettings(userId),
  ])

  if (!workflow) {
    return NextResponse.json({ success: false, message: 'Workflow not found.' }, { status: 404 })
  }

  const result = await executeWorkflow({
    workflow,
    settings,
    triggerText,
  })

  await addAuditLog(userId, workflowId, 'workflow.run', {
    triggerText,
    success: result.success,
    nodeResults: result.nodeResults,
  })

  const shouldNotify = body.notifyWhatsapp || settings.whatsappNumber
  if (shouldNotify && (body.whatsappNumber || settings.whatsappNumber)) {
    await sendWhatsAppMessage({
      to: body.whatsappNumber || settings.whatsappNumber || '',
      message: result.success
        ? `Workflow ${workflow.name} finished successfully.\n${result.output}`
        : `Workflow ${workflow.name} failed.\n${result.output}`,
    })
  }

  return NextResponse.json(result)
}
