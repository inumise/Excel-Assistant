import { Workflow, WorkflowNode } from '@/types/workflow'

/**
 * Pure graph traversal helper used by runtime and UI previews.
 * Falls back to x-position ordering when cycles exist.
 */
export function getWorkflowExecutionOrder(workflow: Pick<Workflow, 'nodes' | 'edges'>): WorkflowNode[] {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()
  const nodeMap = new Map(workflow.nodes.map((node) => [node.id, node]))
  const validNodeIds = new Set(workflow.nodes.map((node) => node.id))

  workflow.nodes.forEach((node) => {
    inDegree.set(node.id, 0)
    adjacency.set(node.id, [])
  })

  workflow.edges.forEach((edge) => {
    if (!validNodeIds.has(edge.source) || !validNodeIds.has(edge.target)) return
    adjacency.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
  })

  const queue = workflow.nodes
    .filter((node) => (inDegree.get(node.id) || 0) === 0)
    .sort((a, b) => a.position.x - b.position.x)
  const ordered: WorkflowNode[] = []

  while (queue.length > 0) {
    const node = queue.shift()
    if (!node) break

    ordered.push(node)
    adjacency.get(node.id)?.forEach((targetId) => {
      inDegree.set(targetId, (inDegree.get(targetId) || 0) - 1)
      if ((inDegree.get(targetId) || 0) === 0) {
        const targetNode = nodeMap.get(targetId)
        if (targetNode) queue.push(targetNode)
      }
    })
  }

  if (ordered.length !== workflow.nodes.length) {
    return [...workflow.nodes].sort((a, b) => a.position.x - b.position.x)
  }

  return ordered
}
