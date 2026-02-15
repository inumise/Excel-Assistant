import { NextResponse } from 'next/server'
import { parseWhatsAppCommand } from '@/lib/command-parser'
import {
  addAuditLog,
  getUserSettings,
  getWorkflowById,
  listWorkflows,
  saveWhatsAppSession,
} from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { executeWorkflow } from '@/lib/workflow-engine'
import { sendWhatsAppMessage } from '@/lib/whatsapp-service'

interface WhatsAppWebhookBody {
  userId?: string
  from: string
  body: string
}

export async function POST(request: Request) {
  const payload = (await request.json()) as WhatsAppWebhookBody
  const userId = payload.userId || DEMO_USER_ID
  const from = payload.from
  const incomingText = payload.body || ''

  const settings = await getUserSettings(userId)
  const parsed = parseWhatsAppCommand(incomingText)
  let reply = 'Unknown command. Use: /cmd run <workflow-id>'

  if (parsed.type === 'run-workflow' && parsed.workflowId) {
    const workflow =
      (await getWorkflowById(userId, parsed.workflowId)) ||
      (await listWorkflows(userId)).find((item) => item.id === parsed.workflowId)

    if (!workflow) {
      reply = `Workflow "${parsed.workflowId}" was not found.`
    } else {
      const result = await executeWorkflow({
        workflow,
        settings,
        triggerText: incomingText,
      })

      reply = result.success
        ? `Workflow "${workflow.name}" completed.\n${result.output}`
        : `Workflow "${workflow.name}" failed.\n${result.output}`

      await addAuditLog(userId, workflow.id, 'whatsapp.workflow.triggered', {
        from,
        incomingText,
        success: result.success,
      })
    }
  }

  await saveWhatsAppSession({
    id: `session-${userId}`,
    userId,
    linkedNumber: from,
    sessionData: {
      lastMessageAt: new Date().toISOString(),
      lastMessage: incomingText,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const response = await sendWhatsAppMessage({ to: from, message: reply })

  return NextResponse.json({
    ok: true,
    reply,
    providerResponse: response,
  })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'WhatsApp webhook route is active.',
  })
}
