import crypto from 'node:crypto'
import { getWhatsAppSession, saveWhatsAppSession } from '@/lib/server-store'
import { WhatsAppSession } from '@/types/workflow'

type WppModule = {
  create: (config: Record<string, unknown>) => Promise<unknown>
}

const runtimeCache = new Map<string, { qr?: string; status: 'pending' | 'connected' | 'disconnected' }>()

async function maybeLoadWppModule(): Promise<WppModule | null> {
  if (process.env.WPPCONNECT_ENABLED !== 'true') return null
  try {
    const loadedModule = (await import('@wppconnect-team/wppconnect')) as unknown as WppModule
    return loadedModule
  } catch {
    return null
  }
}

export async function createOrRefreshWhatsAppSession(userId: string) {
  const now = new Date().toISOString()
  const existing = await getWhatsAppSession(userId)
  const sessionId = existing?.id || crypto.randomUUID()
  const fallbackQr = `SCAN-${sessionId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`

  runtimeCache.set(userId, { qr: fallbackQr, status: 'pending' })

  const wpp = await maybeLoadWppModule()
  if (wpp) {
    try {
      await wpp.create({
        session: sessionId,
        headless: true,
        logQR: false,
        catchQR: (base64Qr: string) => {
          runtimeCache.set(userId, { qr: base64Qr, status: 'pending' })
        },
        statusFind: (statusSession: string) => {
          const status =
            statusSession === 'inChat' || statusSession === 'isLogged'
              ? 'connected'
              : statusSession === 'notLogged'
              ? 'pending'
              : 'disconnected'
          runtimeCache.set(userId, { qr: runtimeCache.get(userId)?.qr, status })
        },
      })
    } catch {
      // Fallback QR remains available for development/demo mode.
    }
  }

  const persisted: WhatsAppSession = {
    id: sessionId,
    userId,
    sessionData: {
      mode: wpp ? 'wppconnect' : 'demo',
    },
    linkedNumber: existing?.linkedNumber,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  await saveWhatsAppSession(persisted)

  return {
    sessionId,
    qr: runtimeCache.get(userId)?.qr || fallbackQr,
    status: runtimeCache.get(userId)?.status || 'pending',
    mode: wpp ? 'wppconnect' : 'demo',
  }
}

export async function markWhatsAppLinked(userId: string, number: string) {
  const existing = await getWhatsAppSession(userId)
  if (!existing) return null

  const updated: WhatsAppSession = {
    ...existing,
    linkedNumber: number,
    updatedAt: new Date().toISOString(),
  }
  await saveWhatsAppSession(updated)
  runtimeCache.set(userId, { qr: runtimeCache.get(userId)?.qr, status: 'connected' })
  return updated
}

export async function sendWhatsAppMessage(params: { to: string; message: string }) {
  // Demo mode: return payload as if message was sent.
  return {
    delivered: true,
    to: params.to,
    message: params.message,
    provider: process.env.WPPCONNECT_ENABLED === 'true' ? 'wppconnect' : 'demo',
  }
}
