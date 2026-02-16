import { MindMapTool } from '@/components/mindmap/types'

export interface ToolDefinition {
  id: MindMapTool
  label: string
  kind: 'pointer' | 'node' | 'draw'
}

/**
 * Add tools here to keep Toolbox + Canvas behavior declarative.
 * This makes adding a new tool (e.g. highlighter/shape) a one-file edit.
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { id: 'select', label: 'Select', kind: 'pointer' },
  { id: 'box', label: 'Box', kind: 'node' },
  { id: 'shape', label: 'Shape', kind: 'node' },
  { id: 'ai-box', label: 'AI Box', kind: 'node' },
  { id: 'text', label: 'Text', kind: 'node' },
  { id: 'pencil', label: 'Pencil', kind: 'draw' },
  { id: 'highlighter', label: 'Highlighter', kind: 'draw' },
  { id: 'eraser', label: 'Eraser', kind: 'draw' },
]

export const CANVAS_NODE_TOOL_TO_TEMPLATE: Partial<Record<MindMapTool, string>> = {
  box: 'box',
  shape: 'shape',
  'ai-box': 'ai-box',
  text: 'text',
}
