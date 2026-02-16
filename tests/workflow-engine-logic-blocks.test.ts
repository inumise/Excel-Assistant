import { describe, expect, it } from 'vitest'
import { executeWorkflow } from '@/lib/workflow-engine'
import { defaultAISettings } from '@/lib/workflow-template'
import { Workflow } from '@/types/workflow'

describe('workflow engine logic blocks', () => {
  it('processes buffer and storage nodes in one run', async () => {
    const now = new Date().toISOString()
    const workflow: Workflow = {
      id: 'workflow-logic-blocks',
      userId: '11111111-1111-4111-8111-111111111111',
      name: 'Logic blocks test',
      description: '',
      createdAt: now,
      updatedAt: now,
      nodes: [
        {
          id: 'producer',
          type: 'programmer',
          position: { x: 0, y: 0 },
          data: {
            label: 'Producer',
            role: 'programmer',
            prompt: 'Generate a handoff packet.',
            errorHandler: { retryCount: 1, notifyWhatsapp: false },
            errorCheckEnabled: true,
            monitoring: 'none',
          },
        },
        {
          id: 'buffer',
          type: 'buffer',
          position: { x: 220, y: 0 },
          data: {
            label: 'Buffer',
            role: 'buffer',
            prompt: '',
            bufferConfig: {
              maxItems: 20,
              releaseMode: 'immediate',
              dropPolicy: 'oldest',
            },
            errorHandler: { retryCount: 1, notifyWhatsapp: false },
            errorCheckEnabled: true,
            monitoring: 'none',
          },
        },
        {
          id: 'storage',
          type: 'storage',
          position: { x: 440, y: 0 },
          data: {
            label: 'Storage',
            role: 'storage',
            prompt: '',
            storageConfig: {
              storageType: 'text',
              key: 'shared-handoff',
              allowWrite: true,
              allowRead: true,
            },
            errorHandler: { retryCount: 1, notifyWhatsapp: false },
            errorCheckEnabled: true,
            monitoring: 'none',
          },
        },
        {
          id: 'consumer',
          type: 'programmer',
          position: { x: 660, y: 0 },
          data: {
            label: 'Consumer',
            role: 'programmer',
            prompt: 'Read shared storage and prepare final summary.',
            errorHandler: { retryCount: 1, notifyWhatsapp: false },
            errorCheckEnabled: true,
            monitoring: 'none',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'producer', target: 'buffer', dataType: 'ai' },
        { id: 'e2', source: 'buffer', target: 'storage', dataType: 'ai' },
        { id: 'e3', source: 'storage', target: 'consumer', dataType: 'api' },
      ],
    }

    const result = await executeWorkflow({
      workflow,
      settings: defaultAISettings,
      triggerText: 'run logic blocks',
    })

    expect(result.success).toBe(true)
    expect(result.communications.length).toBeGreaterThan(0)
    expect(result.nodeResults.find((row) => row.nodeId === 'buffer')?.summary).toContain('Buffer')
    expect(result.nodeResults.find((row) => row.nodeId === 'storage')?.summary).toContain('Storage')
  })
})
