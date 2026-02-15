import { describe, expect, it } from 'vitest'
import { DEMO_USER_ID, isUuid, resolveUserId } from '@/lib/user-context'

describe('user-context helpers', () => {
  it('validates uuid values', () => {
    expect(isUuid('00000000-0000-4000-8000-000000000001')).toBe(true)
    expect(isUuid('demo-user')).toBe(false)
  })

  it('resolves invalid user to demo in non-production', () => {
    expect(resolveUserId('invalid')).toBe(DEMO_USER_ID)
    expect(resolveUserId(undefined)).toBe(DEMO_USER_ID)
  })

  it('returns provided valid uuid', () => {
    const id = '123e4567-e89b-42d3-a456-426614174000'
    expect(resolveUserId(id)).toBe(id)
  })
})
