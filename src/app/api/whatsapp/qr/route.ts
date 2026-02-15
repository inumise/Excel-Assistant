import { NextResponse } from 'next/server'
import { createOrRefreshWhatsAppSession, markWhatsAppLinked } from '@/lib/whatsapp-service'
import { DEMO_USER_ID } from '@/lib/workflow-template'

interface QRRequest {
  userId?: string
  linkedNumber?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as QRRequest
  const userId = body.userId || DEMO_USER_ID

  const session = await createOrRefreshWhatsAppSession(userId)

  if (body.linkedNumber) {
    await markWhatsAppLinked(userId, body.linkedNumber)
  }

  return NextResponse.json({
    ok: true,
    session,
  })
}
