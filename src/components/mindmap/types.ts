import type { Edge, Node, XYPosition } from 'reactflow'
import type {
  EdgeDataType,
  NodeAIConfig,
  NodeMemoryScope,
  NodeRoutingMode,
  NodeRuntimeInfo,
  Workflow,
  WorkflowGlobalDefaults,
  WorkflowNodeData,
} from '@/types/workflow'

export type MindMapTool =
  | 'select'
  | 'box'
  | 'shape'
  | 'ai-box'
  | 'text'
  | 'pencil'
  | 'highlighter'
  | 'eraser'

export type MindMapNodeKind = 'box' | 'ai' | 'text' | 'buffer' | 'storage'

export interface FreehandPoint {
  x: number
  y: number
}

export interface FreehandStroke {
  id: string
  color: string
  width: number
  opacity: number
  points: FreehandPoint[]
}

export interface MindMapNodeData extends WorkflowNodeData {
  nodeKind: MindMapNodeKind
  notes: string
  aiConfig: NodeAIConfig
}

export type MindMapNode = Node<MindMapNodeData>
export type MindMapMessageType = EdgeDataType

export interface MindMapEdgeData {
  messageType: MindMapMessageType
  channel?: string
}

export type MindMapEdge = Edge<MindMapEdgeData>

export interface MindMapDocument {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  strokes: FreehandStroke[]
  globalDefaults: WorkflowGlobalDefaults
  updatedAt: string
}

export interface NodeTemplateDefinition {
  id: string
  title: string
  description: string
  kind: MindMapNodeKind
  role: WorkflowNodeData['role']
}

export const EDGE_MESSAGE_TYPES: MindMapMessageType[] = [
  'prompt',
  'context',
  'code',
  'event',
  'memory',
  'api',
  'ai',
]

export const DEFAULT_GLOBALS: WorkflowGlobalDefaults = {
  systemPrompt: 'Think clearly, respond briefly, and keep context grounded in the map.',
  model: 'gpt-4.1-mini',
  temperature: 0.4,
  routing: 'direct',
  useMemoryVault: false,
  memoryScope: 'workflow',
}

export const NODE_TEMPLATES: NodeTemplateDefinition[] = [
  {
    id: 'box',
    title: 'Box',
    description: 'Simple map box for ideas and notes',
    kind: 'box',
    role: 'text',
  },
  {
    id: 'ai-box',
    title: 'AI Box',
    description: 'Configurable AI node with prompt/model/memory/routing',
    kind: 'ai',
    role: 'programmer',
  },
  {
    id: 'function-box',
    title: 'Function Box',
    description: 'Code function node for local runtime logic',
    kind: 'ai',
    role: 'code',
  },
  {
    id: 'shape',
    title: 'Shape',
    description: 'Basic shape card for diagram anchors',
    kind: 'box',
    role: 'text',
  },
  {
    id: 'text',
    title: 'Text',
    description: 'Text label for annotations',
    kind: 'text',
    role: 'text',
  },
  {
    id: 'buffer',
    title: 'Buffer',
    description: 'Queue node that can hold routing messages',
    kind: 'buffer',
    role: 'buffer',
  },
  {
    id: 'storage',
    title: 'Storage',
    description: 'Storage node for shared values and snapshots',
    kind: 'storage',
    role: 'storage',
  },
]

const storageDefaultsByKind: Record<
  MindMapNodeKind,
  {
    storageType?: 'database' | 'text' | 'excel'
    key?: string
  }
> = {
  box: {},
  ai: {},
  text: { storageType: 'text' },
  buffer: {},
  storage: { storageType: 'database', key: 'shared' },
}

export function createMindMapNode(template: NodeTemplateDefinition, position: XYPosition): MindMapNode {
  const id = `${template.id}-${crypto.randomUUID().slice(0, 8)}`

  const aiConfig: NodeAIConfig = {
    systemPrompt: template.kind === 'ai' ? '' : undefined,
    model: template.kind === 'ai' ? '' : undefined,
    temperature: undefined,
    routing: undefined,
    useMemoryVault: undefined,
    memoryScope: undefined,
    code: undefined,
  }

  const labelBase = template.title
  const runtime: NodeRuntimeInfo = { status: 'idle' }

  return {
    id,
    type: 'mindMapNode',
    position,
    data: {
      label: labelBase,
      role: template.role,
      nodeKind: template.kind,
      workerType: template.kind === 'ai' ? 'ai-box' : template.kind,
      notes: '',
      prompt: '',
      textContent: template.kind === 'text' ? 'New label' : '',
      aiConfig,
      runtime,
      storageConfig: template.kind === 'storage' ? { ...storageDefaultsByKind.storage } : undefined,
      bufferConfig:
        template.kind === 'buffer'
          ? {
              maxItems: 20,
              releaseMode: 'when-target-ready',
              dropPolicy: 'oldest',
            }
          : undefined,
      codeSnippet:
        template.kind === 'ai'
          ? {
              language: 'typescript',
              content:
                template.role === 'code'
                  ? `export function run(input: string) {\n  return input\n}\n`
                  : '',
            }
          : undefined,
      errorHandler: {
        retryCount: 1,
        notifyWhatsapp: false,
      },
      errorCheckEnabled: false,
      monitoring: 'none',
      capabilities: [],
    },
    width: template.kind === 'text' ? 180 : 260,
    height: template.kind === 'text' ? 80 : 170,
    selected: false,
    draggable: true,
    connectable: true,
  }
}

export function createEmptyMindMapDocument(): MindMapDocument {
  return {
    nodes: [],
    edges: [],
    strokes: [],
    globalDefaults: { ...DEFAULT_GLOBALS },
    updatedAt: new Date().toISOString(),
  }
}

export function cloneMindMapDocument(document: MindMapDocument): MindMapDocument {
  return JSON.parse(JSON.stringify(document)) as MindMapDocument
}

function inferNodeKind(data: Partial<MindMapNodeData>): MindMapNodeKind {
  if (data.nodeKind) return data.nodeKind
  if (data.role === 'storage') return 'storage'
  if (data.role === 'buffer') return 'buffer'
  if (data.role === 'manager' || data.role === 'programmer' || data.role === 'code') return 'ai'
  if (data.role === 'text' && data.textContent?.trim()) return 'text'
  return 'box'
}

function isEdgeMessageType(value: unknown): value is MindMapMessageType {
  return typeof value === 'string' && EDGE_MESSAGE_TYPES.includes(value as MindMapMessageType)
}

export function normalizeMindMapDocument(input?: Partial<MindMapDocument>): MindMapDocument {
  const nodes = (input?.nodes || []).map((rawNode) => {
    const source = rawNode as MindMapNode
    const kind = inferNodeKind(source.data || {})
    const normalizedData: MindMapNodeData = {
      ...(source.data || {
        label: 'Node',
        role: kind === 'ai' ? 'programmer' : kind === 'storage' ? 'storage' : kind === 'buffer' ? 'buffer' : 'text',
        prompt: '',
      }),
      label: source.data?.label || source.id || 'Node',
      role:
        source.data?.role ||
        (kind === 'ai' ? 'programmer' : kind === 'storage' ? 'storage' : kind === 'buffer' ? 'buffer' : 'text'),
      prompt: source.data?.prompt || '',
      nodeKind: kind,
      notes: source.data?.notes || '',
      aiConfig: source.data?.aiConfig || {},
      runtime: source.data?.runtime || { status: 'idle' },
      errorHandler: source.data?.errorHandler || { retryCount: 1, notifyWhatsapp: false },
      errorCheckEnabled: source.data?.errorCheckEnabled ?? false,
      monitoring: source.data?.monitoring || 'none',
    }

    return {
      ...source,
      type: 'mindMapNode',
      data: normalizedData,
      position: source.position || { x: 0, y: 0 },
      width: source.width,
      height: source.height,
      draggable: true,
      connectable: true,
    } satisfies MindMapNode
  })

  return {
    nodes,
    edges: (input?.edges || []).map((rawEdge) => {
      const edge = rawEdge as MindMapEdge
      const legacyDataType = (edge.data as { dataType?: unknown } | undefined)?.dataType
      const normalizedType = isEdgeMessageType(edge.data?.messageType)
        ? edge.data.messageType
        : isEdgeMessageType(legacyDataType)
        ? legacyDataType
        : 'prompt'
      return {
        ...edge,
        data: {
          messageType: normalizedType,
          channel: edge.data?.channel || '',
        },
      } satisfies MindMapEdge
    }),
    strokes: (input?.strokes || []).map((rawStroke) => {
      const stroke = rawStroke as Partial<FreehandStroke>
      return {
        id: stroke.id || `stroke-${crypto.randomUUID().slice(0, 8)}`,
        color: stroke.color || '#2563EB',
        width: typeof stroke.width === 'number' ? stroke.width : 2.5,
        opacity: typeof stroke.opacity === 'number' ? stroke.opacity : 0.95,
        points: stroke.points || [],
      } satisfies FreehandStroke
    }),
    globalDefaults: { ...DEFAULT_GLOBALS, ...(input?.globalDefaults || {}) },
    updatedAt: input?.updatedAt || new Date().toISOString(),
  }
}

export function buildWorkflowFromDocument(params: {
  document: MindMapDocument
  userId: string
  mapId?: string
  mapName?: string
}): Workflow {
  const now = new Date().toISOString()
  return {
    id: params.mapId || 'local-mind-map',
    userId: params.userId,
    name: params.mapName || 'Mind Map',
    description: 'Local mind map session',
    globalDefaults: params.document.globalDefaults,
    nodes: params.document.nodes.map((node) => ({
      id: node.id,
      type: node.data.role,
      position: node.position,
      data: node.data,
      parentNode: node.parentNode,
    })),
    edges: params.document.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
      label: typeof edge.label === 'string' ? edge.label : undefined,
      dataType: edge.data?.messageType || 'prompt',
      animated: Boolean(edge.animated),
    })),
    createdAt: now,
    updatedAt: params.document.updatedAt || now,
  }
}

export function resolveNodeAIFallback(
  config: NodeAIConfig | undefined,
  globalDefaults: WorkflowGlobalDefaults
): {
  systemPrompt?: string
  model?: string
  temperature?: number
  routing: NodeRoutingMode
  useMemoryVault: boolean
  memoryScope: NodeMemoryScope
} {
  const maybeTemp = config?.temperature ?? globalDefaults.temperature
  const parsedTemp = typeof maybeTemp === 'number' ? maybeTemp : undefined
  return {
    systemPrompt: config?.systemPrompt?.trim() || globalDefaults.systemPrompt,
    model: config?.model?.trim() || globalDefaults.model,
    temperature:
      typeof parsedTemp === 'number' && Number.isFinite(parsedTemp)
        ? Math.min(1, Math.max(0.1, parsedTemp))
        : undefined,
    routing: config?.routing || globalDefaults.routing || 'direct',
    useMemoryVault: config?.useMemoryVault ?? globalDefaults.useMemoryVault ?? false,
    memoryScope: config?.memoryScope || globalDefaults.memoryScope || 'workflow',
  }
}
