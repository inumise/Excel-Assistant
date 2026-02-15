import { describe, expect, it } from 'vitest'
import { Workflow } from '@/types/workflow'
import { autoRepairWorkflow, validateWorkflow } from '@/lib/workflow-validator'

function buildInvalidWorkflow(): Workflow {
  const now = new Date().toISOString()
  return {
    id: 'wf-invalid',
    userId: '11111111-1111-4111-8111-111111111111',
    name: 'Invalid Workflow',
    description: '',
    createdAt: now,
    updatedAt: now,
    nodes: [
      {
        id: 'a',
        type: 'programmer',
        position: { x: 0, y: 0 },
        data: {
          label: '',
          role: 'programmer',
          prompt: '',
          errorHandler: { retryCount: 99, notifyWhatsapp: true },
          errorCheckEnabled: true,
          monitoring: 'none',
        },
      },
      {
        id: 'b',
        type: 'code',
        position: { x: 200, y: 0 },
        data: {
          label: 'Code Node',
          role: 'code',
          prompt: '',
          errorHandler: { retryCount: 1, notifyWhatsapp: false },
          errorCheckEnabled: true,
          monitoring: 'none',
        },
      },
    ],
    edges: [
      { id: 'edge-1', source: 'a', target: 'b', dataType: 'ai' },
      { id: 'edge-1', source: 'b', target: 'a', dataType: 'ai' },
      { id: 'dangling', source: 'x', target: 'a', dataType: 'api' },
    ],
  }
}

describe('workflow validator', () => {
  it('detects blocking issues and cycles', () => {
    const report = validateWorkflow(buildInvalidWorkflow())
    expect(report.safeToRun).toBe(false)
    expect(report.summary.errors).toBeGreaterThan(0)
    expect(report.issues.some((issue) => issue.code === 'edge.dangling')).toBe(true)
    expect(report.issues.some((issue) => issue.code === 'workflow.cycle.detected')).toBe(true)
  })

  it('auto-repairs fixable issues and increases score', () => {
    const original = buildInvalidWorkflow()
    const before = validateWorkflow(original)
    const repaired = autoRepairWorkflow(original)
    const after = validateWorkflow(repaired.workflow)

    expect(repaired.appliedFixes.length).toBeGreaterThan(0)
    expect(after.score).toBeGreaterThan(before.score)
    expect(after.summary.errors).toBeLessThanOrEqual(before.summary.errors)
    expect(after.summary.warnings).toBeLessThanOrEqual(before.summary.warnings)
  })
})
