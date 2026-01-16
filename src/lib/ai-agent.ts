import Anthropic from '@anthropic-ai/sdk'
import { SpreadsheetState, setCell, setCellStyle, addSheet, getCell } from './excel-store'

// Note: Conversation history is passed from client for stateless operation on Vercel

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

const tools: Anthropic.Tool[] = [
  {
    name: "set_cell_value",
    description: "Set the value of a specific cell in the spreadsheet. Use this to put text, numbers, or formulas into cells.",
    input_schema: {
      type: "object" as const,
      properties: {
        cell: {
          type: "string",
          description: "The cell reference (e.g., 'A1', 'B2', 'C10')"
        },
        value: {
          type: "string",
          description: "The value to set in the cell. Can be text, number, or formula (formulas start with =)"
        }
      },
      required: ["cell", "value"]
    }
  },
  {
    name: "get_cell_value",
    description: "Get the current value of a specific cell in the spreadsheet.",
    input_schema: {
      type: "object" as const,
      properties: {
        cell: {
          type: "string",
          description: "The cell reference (e.g., 'A1', 'B2')"
        }
      },
      required: ["cell"]
    }
  },
  {
    name: "set_cell_style",
    description: "Apply styling to a cell (bold, italic, color, etc.)",
    input_schema: {
      type: "object" as const,
      properties: {
        cell: {
          type: "string",
          description: "The cell reference"
        },
        bold: {
          type: "boolean",
          description: "Make text bold"
        },
        italic: {
          type: "boolean",
          description: "Make text italic"
        }
      },
      required: ["cell"]
    }
  },
  {
    name: "add_sheet",
    description: "Add a new worksheet to the spreadsheet",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Name for the new sheet"
        }
      },
      required: ["name"]
    }
  }
]

async function webSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    )
    const data = await response.json()
    
    if (data.AbstractText) {
      return data.AbstractText
    }
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      return data.RelatedTopics.slice(0, 3).map((t: { Text?: string }) => t.Text).filter(Boolean).join('\n')
    }
    return `Search completed for "${query}". No direct results found.`
  } catch {
    return `Could not perform web search.`
  }
}

export interface AICommandResult {
  success: boolean
  message: string
  actions: string[]
  updatedState: SpreadsheetState
  updatedHistory: ConversationMessage[]
}

export async function processAICommand(
  command: string,
  spreadsheetState: SpreadsheetState,
  conversationHistory: ConversationMessage[] = []
): Promise<AICommandResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY || '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'
  if (!apiKey) {
    return {
      success: false,
      message: 'ANTHROPIC_API_KEY environment variable is not set. Please add it in your Vercel project settings.',
      actions: [],
      updatedState: spreadsheetState,
      updatedHistory: conversationHistory
    }
  }

  const anthropic = new Anthropic({ apiKey })
  const actions: string[] = []
  let currentState = { ...spreadsheetState }
  const history = [...conversationHistory]
  
  const sheetNames = Object.keys(currentState.sheets)
  const activeSheet = currentState.activeSheet

  const systemPrompt = `You are an Excel AI assistant that helps users manipulate spreadsheets using natural language. You have access to tools to modify the spreadsheet.

Current spreadsheet state:
- Active sheet: ${activeSheet}
- Available sheets: ${sheetNames.join(', ')}

When the user asks you to do something:
1. Use the appropriate tools to make changes
2. Be helpful and explain what you did
3. Always confirm the actions you took

Be concise but friendly in your responses.`

  history.push({ role: 'user', content: command })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: history.map(m => ({ role: m.role, content: m.content }))
    })

    let assistantMessage = ''
    
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text
      } else if (block.type === 'tool_use') {
        const toolName = block.name
        const toolInput = block.input as Record<string, unknown>
        
        if (toolName === 'set_cell_value') {
          const cellRef = (toolInput.cell as string).toUpperCase()
          const value = toolInput.value as string
          let cellValue: string | number = value
          
          if (!isNaN(Number(value)) && value !== '') {
            cellValue = Number(value)
          }
          
          currentState = setCell(currentState, activeSheet, cellRef, cellValue)
          actions.push(`Set ${cellRef} to "${value}"`)
        } else if (toolName === 'get_cell_value') {
          const cellRef = (toolInput.cell as string).toUpperCase()
          const cell = getCell(currentState, activeSheet, cellRef)
          const value = cell?.value ?? '(empty)'
          actions.push(`Read ${cellRef}: ${value}`)
        } else if (toolName === 'set_cell_style') {
          const cellRef = (toolInput.cell as string).toUpperCase()
          currentState = setCellStyle(currentState, activeSheet, cellRef, {
            bold: toolInput.bold as boolean | undefined,
            italic: toolInput.italic as boolean | undefined
          })
          actions.push(`Styled ${cellRef}`)
        } else if (toolName === 'add_sheet') {
          const sheetName = toolInput.name as string
          currentState = addSheet(currentState, sheetName)
          actions.push(`Added new sheet: ${sheetName}`)
        }
      }
    }

    if (!assistantMessage && actions.length > 0) {
      assistantMessage = `Done! ${actions.join(', ')}.`
    }

    history.push({ role: 'assistant', content: assistantMessage })

    return {
      success: true,
      message: assistantMessage,
      actions,
      updatedState: currentState,
      updatedHistory: history
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `AI error: ${errorMessage}`,
      actions: [],
      updatedState: spreadsheetState,
      updatedHistory: conversationHistory
    }
  }
}
