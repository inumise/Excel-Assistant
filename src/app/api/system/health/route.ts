import { NextResponse } from 'next/server'
import { getUserSettings } from '@/lib/server-store'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { resolveUserId } from '@/lib/user-context'
import { getServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

type HealthStatus = 'ok' | 'warning' | 'error'

interface HealthCheck {
  id: string
  label: string
  status: HealthStatus
  detail: string
}

function aggregateStatus(checks: HealthCheck[]) {
  if (checks.some((check) => check.status === 'error')) return 'critical'
  if (checks.some((check) => check.status === 'warning')) return 'degraded'
  return 'healthy'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = resolveUserId(searchParams.get('userId') || DEMO_USER_ID)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'Valid userId is required.' }, { status: 400 })
  }

  const checks: HealthCheck[] = []

  checks.push({
    id: 'runtime.nextjs',
    label: 'Next.js Runtime',
    status: 'ok',
    detail: 'API runtime responding.',
  })

  const supabaseReady = isSupabaseConfigured()
  checks.push({
    id: 'storage.supabase',
    label: 'Supabase Connectivity',
    status: supabaseReady ? 'ok' : 'warning',
    detail: supabaseReady ? 'Supabase is configured.' : 'Fallback in-memory mode is active.',
  })

  if (supabaseReady) {
    const supabase = getServerSupabaseClient()
    try {
      const { error } = await supabase!
        .from('ai_memory')
        .select('id')
        .limit(1)
      checks.push({
        id: 'storage.memory-table',
        label: 'Memory Vault Table',
        status: error ? 'warning' : 'ok',
        detail: error
          ? 'ai_memory table unreachable; using in-memory fallback.'
          : 'ai_memory table is reachable.',
      })
    } catch {
      checks.push({
        id: 'storage.memory-table',
        label: 'Memory Vault Table',
        status: 'warning',
        detail: 'ai_memory check failed; fallback remains available.',
      })
    }
  } else {
    checks.push({
      id: 'storage.memory-table',
      label: 'Memory Vault Table',
      status: 'warning',
      detail: 'Supabase disabled; memory persistence is session-scoped.',
    })
  }

  const settings = await getUserSettings(userId)
  const keyCount = [settings.aiKeys.claude, settings.aiKeys.openai, settings.aiKeys.gemini].filter(
    Boolean
  ).length
  checks.push({
    id: 'ai.providers',
    label: 'AI Providers',
    status: keyCount > 0 ? 'ok' : 'warning',
    detail:
      keyCount > 0
        ? `${keyCount} provider key(s) configured.`
        : 'No provider keys configured (demo mode only).',
  })

  const whatsappEnabled = process.env.WPPCONNECT_ENABLED === 'true'
  checks.push({
    id: 'channel.whatsapp',
    label: 'WhatsApp Channel',
    status: whatsappEnabled ? 'ok' : 'warning',
    detail: whatsappEnabled ? 'WhatsApp runtime enabled.' : 'WhatsApp runtime disabled.',
  })

  checks.push({
    id: 'security.encryption',
    label: 'AI Key Encryption Secret',
    status: process.env.AI_KEYS_ENCRYPTION_SECRET ? 'ok' : 'warning',
    detail: process.env.AI_KEYS_ENCRYPTION_SECRET
      ? 'Encryption secret configured.'
      : 'Missing AI_KEYS_ENCRYPTION_SECRET (required in production).',
  })

  return NextResponse.json({
    success: true,
    status: aggregateStatus(checks),
    checks,
    generatedAt: new Date().toISOString(),
  })
}
