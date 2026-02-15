const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'

export function isUuid(value?: string | null) {
  if (!value) return false
  return UUID_REGEX.test(value)
}

export function resolveUserId(value?: string | null) {
  if (isUuid(value)) return value as string

  if (process.env.NODE_ENV !== 'production') {
    return DEMO_USER_ID
  }

  return null
}
