export interface ParsedCommand {
  type: 'run-workflow' | 'unknown'
  workflowId?: string
  original: string
  normalized: string
}

export function parseWhatsAppCommand(message: string): ParsedCommand {
  const normalized = message.trim().toLowerCase()

  const slashMatch = normalized.match(/^\/cmd\s+run\s+([a-z0-9\-_]+)/i)
  if (slashMatch) {
    return {
      type: 'run-workflow',
      workflowId: slashMatch[1],
      original: message,
      normalized,
    }
  }

  const plainMatch = normalized.match(/^run\s+([a-z0-9\-_]+)$/i)
  if (plainMatch) {
    return {
      type: 'run-workflow',
      workflowId: plainMatch[1],
      original: message,
      normalized,
    }
  }

  return { type: 'unknown', original: message, normalized }
}
