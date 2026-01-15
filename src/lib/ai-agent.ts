import Anthropic from '@anthropic-ai/sdk'
import ExcelJS from 'exceljs'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
})

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

const conversationHistory = new Map<string, ConversationMessage[]>()

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
        },
        color: {
          type: "string",
          description: "Text color in hex format (e.g., 'FF0000' for red)"
        },
        backgroundColor: {
          type: "string",
          description: "Background color in hex format"
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
  },
  {
    name: "web_search",
    description: "Search the web for information. Use this when you need to look up data, facts, or current information.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query"
        }
      },
      required: ["query"]
    }
  }
]

function parseCellReference(cellRef: string): { col: string; row: number } | null {
  const match = cellRef.toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!match) return null
  return { col: match[1], row: parseInt(match[2]) }
}

function columnLetterToNumber(col: string): number {
  let result = 0
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 64)
  }
  return result
}

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
    return `Search completed for "${query}". No direct results found, but you can use general knowledge.`
  } catch {
    return `Could not perform web search. Using general knowledge instead.`
  }
}

export async function processAICommand(
  spreadsheetId: string,
  command: string,
  workbook: ExcelJS.Workbook,
  activeSheet: string
): Promise<{ success: boolean; message: string; actions: string[] }> {
  const history = conversationHistory.get(spreadsheetId) || []
  const actions: string[] = []
  
  const sheet = workbook.getWorksheet(activeSheet)
  if (!sheet) {
    return { success: false, message: 'Active sheet not found', actions: [] }
  }

  const systemPrompt = `You are an Excel AI assistant that helps users manipulate spreadsheets using natural language. You have access to tools to modify the spreadsheet.

Current spreadsheet state:
- Active sheet: ${activeSheet}
- Available sheets: ${workbook.worksheets.map(s => s.name).join(', ')}

When the user asks you to do something:
1. Use the appropriate tools to make changes
2. Be helpful and explain what you did
3. If you need information from the web, use the web_search tool
4. Always confirm the actions you took

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
          const cellRef = parseCellReference(toolInput.cell as string)
          if (cellRef) {
            const cell = sheet.getCell(cellRef.row, columnLetterToNumber(cellRef.col))
            const value = toolInput.value as string
            if (value.startsWith('=')) {
              cell.value = { formula: value.substring(1) }
            } else if (!isNaN(Number(value))) {
              cell.value = Number(value)
            } else {
              cell.value = value
            }
            actions.push(`Set ${toolInput.cell} to "${value}"`)
          }
        } else if (toolName === 'get_cell_value') {
          const cellRef = parseCellReference(toolInput.cell as string)
          if (cellRef) {
            const cell = sheet.getCell(cellRef.row, columnLetterToNumber(cellRef.col))
            actions.push(`Read ${toolInput.cell}: ${cell.value || '(empty)'}`)
          }
        } else if (toolName === 'set_cell_style') {
          const cellRef = parseCellReference(toolInput.cell as string)
          if (cellRef) {
            const cell = sheet.getCell(cellRef.row, columnLetterToNumber(cellRef.col))
            if (toolInput.bold !== undefined || toolInput.italic !== undefined || toolInput.color !== undefined) {
              cell.font = {
                ...cell.font,
                bold: toolInput.bold as boolean | undefined,
                italic: toolInput.italic as boolean | undefined,
                color: toolInput.color ? { argb: `FF${toolInput.color}` } : undefined
              }
            }
            if (toolInput.backgroundColor) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: `FF${toolInput.backgroundColor}` }
              }
            }
            actions.push(`Styled ${toolInput.cell}`)
          }
        } else if (toolName === 'add_sheet') {
          const newSheet = workbook.addWorksheet(toolInput.name as string)
          actions.push(`Added new sheet: ${newSheet.name}`)
        } else if (toolName === 'web_search') {
          const searchResult = await webSearch(toolInput.query as string)
          actions.push(`Searched: ${toolInput.query}`)
          assistantMessage += `\n[Search result: ${searchResult}]`
        }
      }
    }

    if (!assistantMessage && actions.length > 0) {
      assistantMessage = `Done! ${actions.join(', ')}.`
    }

    history.push({ role: 'assistant', content: assistantMessage })
    conversationHistory.set(spreadsheetId, history)

    return { success: true, message: assistantMessage, actions }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, message: `AI error: ${errorMessage}`, actions: [] }
  }
}

export function clearHistory(spreadsheetId: string): void {
  conversationHistory.delete(spreadsheetId)
}
