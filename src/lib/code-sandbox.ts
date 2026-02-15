import vm from 'node:vm'

export interface SandboxResult {
  ok: boolean
  output: string
  error?: string
}

export function executeJavaScriptSandbox(code: string): SandboxResult {
  const logs: string[] = []
  const context = vm.createContext({
    console: {
      log: (...args: unknown[]) => logs.push(args.map((item) => String(item)).join(' ')),
    },
  })

  try {
    const script = new vm.Script(code)
    script.runInContext(context, { timeout: 2000 })

    return {
      ok: true,
      output: logs.join('\n') || 'Code executed without console output.',
    }
  } catch (error) {
    return {
      ok: false,
      output: logs.join('\n'),
      error: error instanceof Error ? error.message : 'Sandbox execution failed',
    }
  }
}
