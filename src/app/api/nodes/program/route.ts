import { NextResponse } from 'next/server'
import { generateProgrammerCode } from '@/lib/ai-manager'
import { getUserSettings } from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { resolveUserId } from '@/lib/user-context'

interface ProgramRequest {
  userId?: string
  mode: 'generate' | 'self-change' | 'delegate'
  prompt: string
  language: 'javascript' | 'typescript' | 'python'
  existingCode?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProgramRequest
  const userId = resolveUserId(body.userId || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Valid userId is required.' }, { status: 400 })
  }
  const settings = await getUserSettings(userId)

  const code = await generateProgrammerCode({
    settings,
    mode: body.mode,
    prompt: body.prompt,
    language: body.language,
    existingCode: body.existingCode,
  })

  return NextResponse.json({ ok: true, code })
}
