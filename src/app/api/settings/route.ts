import { NextResponse } from 'next/server'
import { getUserSettings, getWhatsAppSession, saveUserSettings } from '@/lib/server-store'
import { defaultAISettings, DEMO_USER_ID } from '@/lib/workflow-template'
import { resolveUserId } from '@/lib/user-context'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = resolveUserId(searchParams.get('userId') || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const [settings, session] = await Promise.all([getUserSettings(userId), getWhatsAppSession(userId)])

  return NextResponse.json({
    settings,
    whatsappSession: session,
  })
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<typeof defaultAISettings> & { userId?: string }
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }
  const current = await getUserSettings(userId)

  const saved = await saveUserSettings({
    ...current,
    ...body,
    userId,
    aiKeys: {
      ...current.aiKeys,
      ...(body.aiKeys || {}),
    },
    creativityTemp: Number(body.creativityTemp ?? current.creativityTemp),
  })

  return NextResponse.json({ settings: saved })
}
