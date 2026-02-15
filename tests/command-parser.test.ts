import { describe, expect, it } from 'vitest'
import { parseWhatsAppCommand } from '@/lib/command-parser'

describe('parseWhatsAppCommand', () => {
  it('parses /cmd run workflow command', () => {
    const parsed = parseWhatsAppCommand('/cmd run workflow-web-design-factory')
    expect(parsed.type).toBe('run-workflow')
    expect(parsed.workflowId).toBe('workflow-web-design-factory')
  })

  it('parses plain run command', () => {
    const parsed = parseWhatsAppCommand('run workflow123')
    expect(parsed.type).toBe('run-workflow')
    expect(parsed.workflowId).toBe('workflow123')
  })

  it('returns unknown for unsupported text', () => {
    const parsed = parseWhatsAppCommand('hello bot')
    expect(parsed.type).toBe('unknown')
  })
})
