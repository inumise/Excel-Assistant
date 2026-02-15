import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}), { virtual: true })

describe('memory vault store', () => {
  it('upserts, lists, and deletes workflow memory entries', async () => {
    const { deleteMemoryRecord, listMemoryRecords, upsertMemoryRecord } = await import(
      '@/lib/server-store'
    )

    const userId = '11111111-1111-4111-8111-111111111111'
    const workflowId = 'workflow-memory-spec'
    const namespace = `spec-${Date.now()}`

    await upsertMemoryRecord({
      userId,
      workflowId,
      namespace,
      key: 'summary',
      value: { status: 'ok', score: 12 },
    })

    await upsertMemoryRecord({
      userId,
      workflowId,
      namespace,
      key: 'summary',
      value: { status: 'ok', score: 21 },
    })

    const records = await listMemoryRecords({ userId, workflowId, namespace })
    expect(records.length).toBeGreaterThan(0)
    expect(records[0].namespace).toBe(namespace)
    expect(records[0].key).toBe('summary')

    const deleted = await deleteMemoryRecord({
      userId,
      workflowId,
      namespace,
      key: 'summary',
    })
    expect(deleted.deleted).toBeGreaterThanOrEqual(1)
  })
})
