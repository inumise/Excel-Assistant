export type NodeRole = 'manager' | 'programmer' | 'code'

export type EdgeDataType = 'api' | 'code' | 'ai'

export type TonePreset =
  | 'luxury-brand'
  | 'technical-executive'
  | 'minimal-precise'
  | 'bold-sales'

export interface AIProviderKeys {
  openai?: string
  claude?: string
  gemini?: string
}

export interface UserAISettings {
  userId: string
  whatsappNumber?: string
  aiKeys: AIProviderKeys
  globalPrompt: string
  creativityTemp: number
  tonePreset: TonePreset
}

export interface ErrorHandlerConfig {
  retryCount: number
  notifyWhatsapp: boolean
}

export interface CodeSnippet {
  language: 'javascript' | 'typescript' | 'python'
  content: string
}

export interface WorkflowNodeData {
  label: string
  role: NodeRole
  workerType?: string
  prompt: string
  codeSnippet?: CodeSnippet
  testsPassed?: boolean
  bugStatus?: 'idle' | 'running' | 'failed' | 'fixed'
  errorHandler: ErrorHandlerConfig
  errorCheckEnabled: boolean
  monitoring: 'none' | 'sentry' | 'newrelic'
  parentWorkflowId?: string
}

export interface WorkflowNode {
  id: string
  type: NodeRole | 'group'
  position: { x: number; y: number }
  parentNode?: string
  extent?: 'parent'
  style?: Record<string, unknown>
  data: WorkflowNodeData
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  type?: string
  dataType: EdgeDataType
  label?: string
}

export interface Workflow {
  id: string
  userId: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

export interface AuditLogEntry {
  id: string
  userId: string
  workflowId: string
  action: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface BugTrackRecord {
  id: string
  workflowId: string
  nodeId: string
  errors: Record<string, unknown>
  fixed: boolean
  createdAt: string
  updatedAt: string
}

export interface WhatsAppSession {
  id: string
  userId: string
  sessionData: Record<string, unknown>
  linkedNumber?: string
  createdAt: string
  updatedAt: string
}
