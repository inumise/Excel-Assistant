export interface MindMapNodeShape {
  id: string
  position: { x: number; y: number }
}

export interface MindMapEdgeShape {
  source: string
  target: string
}

export interface MindMapLayoutOptions {
  rootId?: string
  xSpacing?: number
  ySpacing?: number
}

function buildChildrenMap(edges: MindMapEdgeShape[]) {
  const childrenMap = new Map<string, string[]>()
  for (const edge of edges) {
    if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, [])
    childrenMap.get(edge.source)?.push(edge.target)
  }
  return childrenMap
}

export function inferMindMapRoot(nodes: MindMapNodeShape[], edges: MindMapEdgeShape[]) {
  if (!nodes.length) return null
  const incoming = new Map<string, number>()
  nodes.forEach((node) => incoming.set(node.id, 0))

  edges.forEach((edge) => {
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1)
  })

  const root = nodes.find((node) => (incoming.get(node.id) || 0) === 0)
  return root?.id || nodes[0].id
}

export function getDescendantIds(rootId: string, edges: MindMapEdgeShape[]) {
  const childrenMap = buildChildrenMap(edges)
  const descendants = new Set<string>()
  const queue = [...(childrenMap.get(rootId) || [])]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || descendants.has(current)) continue
    descendants.add(current)
    queue.push(...(childrenMap.get(current) || []))
  }

  return [...descendants]
}

export function calculateMindMapLayout(
  nodes: MindMapNodeShape[],
  edges: MindMapEdgeShape[],
  options: MindMapLayoutOptions = {}
) {
  const layout = new Map<string, { x: number; y: number }>()
  if (!nodes.length) return layout

  const rootId = options.rootId || inferMindMapRoot(nodes, edges)
  if (!rootId) return layout

  const xSpacing = options.xSpacing ?? 320
  const ySpacing = options.ySpacing ?? 130
  const rootNode = nodes.find((node) => node.id === rootId) || nodes[0]
  const rootPosition = { x: rootNode.position.x, y: rootNode.position.y }

  const childrenMap = buildChildrenMap(edges)
  const depthMap = new Map<string, number>([[rootId, 0]])
  const sideMap = new Map<string, 'left' | 'right' | 'center'>([[rootId, 'center']])
  const orderMap = new Map<string, number>()

  let order = 0
  const queue = [rootId]

  while (queue.length > 0) {
    const nodeId = queue.shift()
    if (!nodeId) break
    const children = childrenMap.get(nodeId) || []
    const parentDepth = depthMap.get(nodeId) || 0
    const parentSide = sideMap.get(nodeId) || 'center'

    children.forEach((childId, index) => {
      if (depthMap.has(childId)) return
      depthMap.set(childId, parentDepth + 1)
      if (parentSide === 'center') {
        sideMap.set(childId, index % 2 === 0 ? 'right' : 'left')
      } else {
        sideMap.set(childId, parentSide)
      }
      orderMap.set(childId, order++)
      queue.push(childId)
    })
  }

  layout.set(rootId, rootPosition)

  const groups = new Map<string, string[]>()
  depthMap.forEach((depth, nodeId) => {
    if (nodeId === rootId) return
    const side = sideMap.get(nodeId) || 'right'
    const key = `${side}:${depth}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)?.push(nodeId)
  })

  for (const [key, nodeIds] of groups.entries()) {
    const [side, depthText] = key.split(':')
    const depth = Number(depthText)
    nodeIds.sort((a, b) => (orderMap.get(a) || 0) - (orderMap.get(b) || 0))

    const centerOffset = (nodeIds.length - 1) / 2
    nodeIds.forEach((nodeId, index) => {
      const x =
        rootPosition.x + (side === 'left' ? -1 : 1) * Math.max(1, depth) * xSpacing
      const y = rootPosition.y + (index - centerOffset) * ySpacing
      layout.set(nodeId, { x, y })
    })
  }

  let orphanIndex = 1
  const maxDepth = Math.max(...[...depthMap.values()])
  nodes.forEach((node) => {
    if (layout.has(node.id)) return
    layout.set(node.id, {
      x: rootPosition.x + (maxDepth + 1) * xSpacing,
      y: rootPosition.y + orphanIndex * ySpacing,
    })
    orphanIndex += 1
  })

  return layout
}
