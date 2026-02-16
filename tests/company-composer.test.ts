import { describe, expect, test } from 'vitest'
import { composeCompanyGraph } from '@/components/mindmap/company-composer'

describe('company composer', () => {
  test('builds startup company map with manager, routing, and memory', () => {
    const result = composeCompanyGraph({
      input: {
        objective: 'Build autonomous support and sales company',
        scale: 'startup',
        focus: 'balanced',
        includeFunctionRuntime: true,
        includeCompliance: true,
      },
      origin: { x: 100, y: 120 },
    })

    expect(result.nodes.length).toBeGreaterThanOrEqual(7)
    expect(result.edges.length).toBeGreaterThanOrEqual(8)
    expect(result.nodes.some((node) => node.data.workerType === 'manager')).toBe(true)
    expect(result.nodes.some((node) => node.data.workerType === 'storage')).toBe(true)
    expect(result.nodes.some((node) => node.data.workerType === 'buffer')).toBe(true)
    expect(result.edges.some((edge) => edge.data?.messageType === 'memory')).toBe(true)
  })
})
