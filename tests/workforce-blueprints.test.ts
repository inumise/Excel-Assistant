import { describe, expect, test } from 'vitest'
import { buildWorkforceBlueprint, listWorkforceBlueprints } from '@/components/mindmap/workforce-blueprints'

describe('workforce blueprints', () => {
  test('lists available workforce packs', () => {
    const blueprints = listWorkforceBlueprints()
    expect(blueprints.length).toBeGreaterThanOrEqual(3)
    expect(blueprints.some((entry) => entry.id === 'lean-core')).toBe(true)
  })

  test('builds enterprise blueprint with connected nodes', () => {
    const generated = buildWorkforceBlueprint({
      blueprintId: 'enterprise-grid',
      origin: { x: 100, y: 120 },
    })
    expect(generated.nodes.length).toBeGreaterThanOrEqual(8)
    expect(generated.edges.length).toBeGreaterThanOrEqual(8)
    expect(generated.nodes.some((node) => node.data.workerType === 'manager')).toBe(true)
    expect(generated.edges.some((edge) => edge.data?.messageType === 'memory')).toBe(true)
  })
})
