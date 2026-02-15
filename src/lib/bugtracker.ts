import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { generateProgrammerCode } from '@/lib/ai-manager'
import {
  createBugTrackRecord,
  getUserSettings,
  getWorkflowById,
  saveWorkflow,
  updateBugTrackRecord,
} from '@/lib/server-store'
import { WorkflowNode } from '@/types/workflow'

const execAsync = promisify(exec)

interface TestRunResult {
  passed: boolean
  output: string
}

async function runAutomatedChecks(): Promise<TestRunResult> {
  if (process.env.BUGTRACK_RUN_TESTS !== 'true') {
    return {
      passed: true,
      output: 'Automated checks skipped (BUGTRACK_RUN_TESTS is not true).',
    }
  }

  try {
    const { stdout, stderr } = await execAsync('npm run bugtrack:check', {
      cwd: process.cwd(),
      timeout: 180000,
    })

    return { passed: true, output: `${stdout}\n${stderr}`.trim() }
  } catch (error) {
    const message =
      error instanceof Error && 'stderr' in error
        ? `${String((error as { stdout?: string }).stdout || '')}\n${String((error as { stderr?: string }).stderr || '')}`
        : error instanceof Error
        ? error.message
        : 'Unknown test error'

    return { passed: false, output: message }
  }
}

function applyNodeCode(node: WorkflowNode, code: string) {
  return {
    ...node,
    data: {
      ...node.data,
      codeSnippet: {
        language: node.data.codeSnippet?.language || 'typescript',
        content: code,
      },
    },
  }
}

export async function runBugFixLoop(params: {
  userId: string
  workflowId: string
  nodeId: string
  trigger: string
}) {
  const workflow = await getWorkflowById(params.userId, params.workflowId)
  if (!workflow) {
    return { ok: false, message: 'Workflow not found.' }
  }

  const node = workflow.nodes.find((item) => item.id === params.nodeId)
  if (!node) {
    return { ok: false, message: 'Node not found.' }
  }

  const initial = await runAutomatedChecks()
  const record = await createBugTrackRecord({
    workflowId: params.workflowId,
    nodeId: params.nodeId,
    errors: {
      trigger: params.trigger,
      output: initial.output,
      stage: 'initial-check',
    },
    fixed: initial.passed,
  })

  if (initial.passed) {
    return {
      ok: true,
      fixed: true,
      message: 'Checks passed. No fix required.',
      bugTrackId: record.id,
      output: initial.output,
    }
  }

  const settings = await getUserSettings(params.userId)
  const originalCode = node.data.codeSnippet?.content || ''

  const patchedCode = await generateProgrammerCode({
    settings,
    mode: 'self-change',
    language: node.data.codeSnippet?.language || 'typescript',
    prompt: `Fix this failing code. Error logs:\n${initial.output}`,
    existingCode: originalCode,
  })

  const updatedNodes = workflow.nodes.map((item) =>
    item.id === node.id ? applyNodeCode(item, patchedCode) : item
  )
  const updatedWorkflow = { ...workflow, nodes: updatedNodes, updatedAt: new Date().toISOString() }
  await saveWorkflow(updatedWorkflow)

  const retest = await runAutomatedChecks()
  await updateBugTrackRecord(record.id, retest.passed, {
    trigger: params.trigger,
    initialError: initial.output,
    retestOutput: retest.output,
    escalation: retest.passed
      ? null
      : 'Fix bug -> Test -> Failed -> Escalated to Manager AI for manual review.',
  })

  return {
    ok: true,
    fixed: retest.passed,
    message: retest.passed
      ? 'Programmer AI patched code and checks passed.'
      : 'Programmer AI patch failed checks. Escalated to Manager AI.',
    bugTrackId: record.id,
    output: retest.output,
  }
}
