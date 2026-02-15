import { describe, expect, it } from 'vitest'
import {
  calculateMindMapLayout,
  getDescendantIds,
  inferMindMapRoot,
} from '@/lib/mind-map-layout'

describe('mind map layout utilities', () => {
  it('infers root by zero incoming edges', () => {
    const root = inferMindMapRoot(
      [
        { id: 'a', position: { x: 0, y: 0 } },
        { id: 'b', position: { x: 0, y: 0 } },
      ],
      [{ source: 'a', target: 'b' }]
    )
    expect(root).toBe('a')
  })

  it('gets full descendants for branch node', () => {
    const descendants = getDescendantIds('a', [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'a', target: 'd' },
    ])
    expect(descendants.sort()).toEqual(['b', 'c', 'd'])
  })

  it('calculates layout positions for connected nodes', () => {
    const layout = calculateMindMapLayout(
      [
        { id: 'root', position: { x: 0, y: 0 } },
        { id: 'left', position: { x: 0, y: 0 } },
        { id: 'right', position: { x: 0, y: 0 } },
      ],
      [
        { source: 'root', target: 'left' },
        { source: 'root', target: 'right' },
      ],
      { rootId: 'root', xSpacing: 200, ySpacing: 100 }
    )

    expect(layout.get('root')).toEqual({ x: 0, y: 0 })
    expect(Math.abs(layout.get('left')?.x || 0)).toBe(200)
    expect(Math.abs(layout.get('right')?.x || 0)).toBe(200)
  })
})
