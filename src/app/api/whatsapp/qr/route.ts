import { NextResponse } from 'next/server'
import { createOrRefreshWhatsAppSession, markWhatsAppLinked } from '@/lib/whatsapp-service'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { resolveUserId } from '@/lib/user-context'

interface QRRequest {
  userId?: string
  linkedNumber?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as QRRequest
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const session = await createOrRefreshWhatsAppSession(userId)

  if (body.linkedNumber) {
    await markWhatsAppLinked(userId, body.linkedNumber)
  }

  return NextResponse.json({
    ok: true,
    session,
  })
}
