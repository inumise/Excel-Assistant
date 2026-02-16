import { describe, expect, test } from 'vitest'
import { getWorkflowExecutionOrder } from '@/lib/workflow-graph'
import { Workflow } from '@/types/workflow'

function buildWorkflow(overrides?: Partial<Workflow>): Workflow {
  const now = new Date().toISOString()
  return {
    id: 'wf-test',
    userId: 'user-test',
    name: 'workflow',
    nodes: [
      {
        id: 'a',
        type: 'programmer',
        position: { x: 0, y: 0 },
        data: {
          label: 'A',
          role: 'programmer',
          prompt: '',
          errorHandler: { retryCount: 0, notifyWhatsapp: false },
          errorCheckEnabled: false,
          monitoring: 'none',
        },
      },
      {
        id: 'b',
        type: 'programmer',
        position: { x: 100, y: 0 },
        data: {
          label: 'B',
          role: 'programmer',
          prompt: '',
          errorHandler: { retryCount: 0, notifyWhatsapp: false },
          errorCheckEnabled: false,
          monitoring: 'none',
        },
      },
      {
        id: 'c',
        type: 'programmer',
        position: { x: 200, y: 0 },
        data: {
          label: 'C',
          role: 'programmer',
          prompt: '',
          errorHandler: { retryCount: 0, notifyWhatsapp: false },
          errorCheckEnabled: false,
          monitoring: 'none',
        },
      },
    ],
    edges: [
      {
        id: 'e-ab',
        source: 'a',
        target: 'b',
        dataType: 'prompt',
      },
      {
        id: 'e-bc',
        source: 'b',
        target: 'c',
        dataType: 'prompt',
      },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('workflow graph execution order', () => {
  test('orders nodes topologically', () => {
    const workflow = buildWorkflow()
    const ordered = getWorkflowExecutionOrder(workflow).map((node) => node.id)
    expect(ordered).toEqual(['a', 'b', 'c'])
  })

  test('falls back to position order when cycle exists', () => {
    const workflow = buildWorkflow({
      edges: [
        { id: 'e-ab', source: 'a', target: 'b', dataType: 'prompt' },
        { id: 'e-ba', source: 'b', target: 'a', dataType: 'prompt' },
      ],
    })
    const ordered = getWorkflowExecutionOrder(workflow).map((node) => node.id)
    expect(ordered).toEqual(['a', 'b', 'c'])
  })
})
