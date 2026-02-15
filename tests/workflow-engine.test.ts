import { describe, expect, it } from 'vitest'
import { executeWorkflow } from '@/lib/workflow-engine'
import { createWebDesignFactoryTemplate, defaultAISettings } from '@/lib/workflow-template'

describe('executeWorkflow', () => {
  it('runs the web design factory template', async () => {
    const workflow = createWebDesignFactoryTemplate('demo-user')
    const result = await executeWorkflow({
      workflow,
      settings: defaultAISettings,
      triggerText: 'run workflow-web-design-factory',
    })

    expect(result.nodeResults.length).toBeGreaterThan(0)
    expect(result.output).toContain('manager-1')
    expect(result.communications.length).toBeGreaterThan(0)
    expect(result.communications.some((event) => event.edgeId.startsWith('edge-'))).toBe(true)
  })
})
