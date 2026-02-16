import { Workflow } from '@/types/workflow'

export interface ValidationResponse {
  safeToRun: boolean
  summary: string
  nodeIssues: Record<string, string[]>
}

export interface RunResponse {
  success: boolean
  output: string
  nodeResults: Array<{ nodeId: string; summary: string; success: boolean; error?: string }>
  memoryTable?: Array<{ namespace: string; key: string; value: unknown; updatedAt: string }>
}

export interface ReliabilityResponse {
  status?: 'healthy' | 'degraded' | 'critical'
  checks?: Array<{ id: string; label: string; status: 'ok' | 'warning' | 'error'; detail?: string }>
}

export async function validateMindMap(workflow: Workflow) {
  const response = await fetch('/api/mindmap/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow }),
  })
  return (await response.json()) as ValidationResponse
}

export async function runMindMap(params: {
  workflow: Workflow
  triggerText: string
  userId: string
  sessionId: string
}) {
  const response = await fetch('/api/mindmap/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  return (await response.json()) as RunResponse
}

export async function fetchReliability() {
  const response = await fetch('/api/system/health')
  return (await response.json()) as ReliabilityResponse
}
