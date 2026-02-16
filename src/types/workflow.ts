export type NodeRole = 'manager' | 'programmer' | 'code' | 'text' | 'buffer' | 'storage'

export type EdgeDataType = 'ai' | 'api' | 'code' | 'prompt' | 'context' | 'event' | 'memory'

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

export interface WorkflowTextStyle {
  fontFamily?: string
  fontSize?: number
  fontWeight?: '400' | '500' | '600' | '700' | '800'
  italic?: boolean
  underline?: boolean
  uppercase?: boolean
  align?: 'left' | 'center' | 'right'
  color?: string
  backgroundColor?: string
  letterSpacing?: number
  lineHeight?: number
  shadow?: boolean
}

export type NodeRuntimeStatus = 'idle' | 'queued' | 'running' | 'success' | 'error'

export interface NodeRuntimeInfo {
  status: NodeRuntimeStatus
  lastRunAt?: string
  lastSummary?: string
  lastError?: string
}

export interface BufferNodeConfig {
  maxItems?: number
  releaseMode?: 'when-target-ready' | 'immediate'
  dropPolicy?: 'oldest' | 'newest' | 'reject'
}

export interface StorageNodeConfig {
  storageType?: 'database' | 'text' | 'excel'
  key?: string
  allowWrite?: boolean
  allowRead?: boolean
  schemaHint?: string
}

export type NodeMemoryScope = 'session' | 'workflow' | 'global'
export type NodeRoutingMode = 'direct' | 'buffered' | 'storage'

export interface NodeAIConfig {
  systemPrompt?: string
  model?: string
  temperature?: number
  routing?: NodeRoutingMode
  useMemoryVault?: boolean
  memoryScope?: NodeMemoryScope
  code?: string
}

export interface WorkflowGlobalDefaults {
  systemPrompt?: string
  model?: string
  temperature?: number
  routing?: NodeRoutingMode
  useMemoryVault?: boolean
  memoryScope?: NodeMemoryScope
}

export interface WorkflowNodeData {
  label: string
  role: NodeRole
  nodeKind?: 'box' | 'ai' | 'text' | 'buffer' | 'storage'
  workerType?: string
  notes?: string
  prompt: string
  textContent?: string
  textStyle?: WorkflowTextStyle
  bufferConfig?: BufferNodeConfig
  storageConfig?: StorageNodeConfig
  aiConfig?: NodeAIConfig
  runtime?: NodeRuntimeInfo
  capabilities?: string[]
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
  globalDefaults?: WorkflowGlobalDefaults
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

export interface WorkflowCommunicationEvent {
  id: string
  edgeId: string
  source: string
  target: string
  dataType: EdgeDataType
  message: string
  createdAt: string
}

export interface MemoryRecord {
  id: string
  userId: string
  workflowId?: string
  namespace: string
  key: string
  value: unknown
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
