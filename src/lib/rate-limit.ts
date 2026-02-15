interface BucketState {
  count: number
  resetAt: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

const KEY_PREFIX = '__hyper_rate_limit__'

function getStore() {
  const globalState = globalThis as unknown as { [KEY_PREFIX]?: Map<string, BucketState> }
  if (globalState[KEY_PREFIX]) return globalState[KEY_PREFIX] as Map<string, BucketState>

  const store = new Map<string, BucketState>()
  globalState[KEY_PREFIX] = store
  return store
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const store = getStore()
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || now >= existing.resetAt) {
    const next = { count: 1, resetAt: now + windowMs }
    store.set(key, next)
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: next.resetAt }
  }

  existing.count += 1
  store.set(key, existing)

  const allowed = existing.count <= limit
  const remaining = Math.max(0, limit - existing.count)
  return { allowed, remaining, resetAt: existing.resetAt }
}
