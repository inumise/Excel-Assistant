import Anthropic from '@anthropic-ai/sdk'
import { SpreadsheetState, setCell, setCellStyle, addSheet, getCell } from './excel-store'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

// Comprehensive tools for CEO assistant
const tools: Anthropic.Tool[] = [
  // Spreadsheet tools
  {
    name: "set_cell_value",
    description: "Set the value of a specific cell in the spreadsheet. Use this to put text, numbers, or formulas into cells.",
    input_schema: {
      type: "object" as const,
      properties: {
        cell: { type: "string", description: "The cell reference (e.g., 'A1', 'B2', 'C10')" },
        value: { type: "string", description: "The value to set in the cell" }
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
        cell: { type: "string", description: "The cell reference (e.g., 'A1', 'B2')" }
      },
      required: ["cell"]
    }
  },
  {
    name: "set_cell_style",
    description: "Apply styling to a cell (bold, italic)",
    input_schema: {
      type: "object" as const,
      properties: {
        cell: { type: "string", description: "The cell reference" },
        bold: { type: "boolean", description: "Make text bold" },
        italic: { type: "boolean", description: "Make text italic" }
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
        name: { type: "string", description: "Name for the new sheet" }
      },
      required: ["name"]
    }
  },
  // Web search and research tools
  {
    name: "web_search",
    description: "Search the internet for information. Use this to find news, company info, people, facts, or any information online.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The search query" }
      },
      required: ["query"]
    }
  },
  {
    name: "fetch_webpage",
    description: "Fetch and extract text content from a webpage URL. Use this to read articles, get information from websites.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "The URL to fetch" }
      },
      required: ["url"]
    }
  },
  // Business tools
  {
    name: "draft_email",
    description: "Draft a professional email. Returns the formatted email text.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient name or email" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Main content of the email" },
        tone: { type: "string", description: "Tone: formal, friendly, urgent, apologetic", enum: ["formal", "friendly", "urgent", "apologetic"] }
      },
      required: ["to", "subject", "body"]
    }
  },
  {
    name: "create_meeting_agenda",
    description: "Create a structured meeting agenda",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Meeting title" },
        attendees: { type: "string", description: "List of attendees" },
        topics: { type: "string", description: "Comma-separated list of discussion topics" },
        duration: { type: "string", description: "Meeting duration" }
      },
      required: ["title", "topics"]
    }
  },
  // Utility tools
  {
    name: "get_current_datetime",
    description: "Get the current date and time",
    input_schema: {
      type: "object" as const,
      properties: {
        timezone: { type: "string", description: "Timezone (e.g., 'America/New_York'). Default is UTC." }
      },
      required: []
    }
  },
  {
    name: "calculate",
    description: "Perform mathematical calculations",
    input_schema: {
      type: "object" as const,
      properties: {
        expression: { type: "string", description: "Mathematical expression (e.g., '100 * 1.15')" }
      },
      required: ["expression"]
    }
  },
  {
    name: "create_task",
    description: "Create a task or reminder displayed in the chat.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title" },
        priority: { type: "string", description: "Priority level", enum: ["high", "medium", "low"] },
        due: { type: "string", description: "Due date or time" },
        notes: { type: "string", description: "Additional notes" }
      },
      required: ["title"]
    }
  },
  {
    name: "convert_currency",
    description: "Convert between currencies (approximate rates)",
    input_schema: {
      type: "object" as const,
      properties: {
        amount: { type: "number", description: "Amount to convert" },
        from: { type: "string", description: "Source currency code (e.g., USD, EUR)" },
        to: { type: "string", description: "Target currency code" }
      },
      required: ["amount", "from", "to"]
    }
  }
]

// Tool implementations
async function webSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    )
    const data = await response.json()
    const results: string[] = []
    
    if (data.AbstractText) results.push(`**Summary:** ${data.AbstractText}`)
    if (data.AbstractSource && data.AbstractURL) results.push(`**Source:** ${data.AbstractSource} - ${data.AbstractURL}`)
    
    if (data.RelatedTopics?.length > 0) {
      const topics = data.RelatedTopics.slice(0, 5).map((t: { Text?: string }) => t.Text).filter(Boolean)
      if (topics.length > 0) results.push(`**Related:**\n${topics.join('\n')}`)
    }
    
    if (data.Infobox?.content) {
      const info = data.Infobox.content.slice(0, 5).map((i: { label?: string; value?: string }) => `${i.label}: ${i.value}`).join('\n')
      if (info) results.push(`**Details:**\n${info}`)
    }
    
    return results.length > 0 ? results.join('\n\n') : `Search for "${query}" completed. Try a more specific query for detailed results.`
  } catch (error) {
    return `Search error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function fetchWebpage(url: string): Promise<string> {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ExcelAI/1.0)' } })
    if (!response.ok) return `Failed to fetch URL: ${response.status} ${response.statusText}`
    
    let text = (await response.text())
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ').trim()
    
    return text.length > 3000 ? text.substring(0, 3000) + '... [truncated]' : (text || 'No readable content found.')
  } catch (error) {
    return `Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

function draftEmail(to: string, subject: string, body: string, tone: string = 'formal'): string {
  const greetings: Record<string, string> = { formal: `Dear ${to},`, friendly: `Hi ${to},`, urgent: `Dear ${to},`, apologetic: `Dear ${to},` }
  const closings: Record<string, string> = { formal: 'Best regards,', friendly: 'Best,', urgent: 'Please respond at your earliest convenience.\n\nBest regards,', apologetic: 'I sincerely apologize for any inconvenience.\n\nBest regards,' }
  return `**To:** ${to}\n**Subject:** ${subject}\n\n${greetings[tone] || greetings.formal}\n\n${body}\n\n${closings[tone] || closings.formal}\n[Your Name]`
}

function createMeetingAgenda(title: string, attendees: string, topics: string, duration: string): string {
  const topicList = topics.split(',').map((t, i) => `${i + 1}. ${t.trim()}`).join('\n')
  return `**MEETING AGENDA**\n${'━'.repeat(40)}\n\n**Title:** ${title}\n**Duration:** ${duration || 'TBD'}\n**Attendees:** ${attendees || 'TBD'}\n\n**Agenda Items:**\n${topicList}\n\n**Action Items:**\n- [ ] To be determined\n\n${'━'.repeat(40)}`
}

function getCurrentDateTime(timezone: string = 'UTC'): string {
  try {
    return new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: timezone, timeZoneName: 'short' })
  } catch { return new Date().toISOString() }
}

function calculate(expression: string): string {
  try {
    const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '')
    if (sanitized !== expression.replace(/\s/g, '')) return 'Invalid expression. Only numbers and basic operators allowed.'
    const result = Function('"use strict"; return (' + sanitized + ')')()
    return `${expression} = ${result}`
  } catch (error) { return `Calculation error: ${error instanceof Error ? error.message : 'Invalid expression'}` }
}

function createTask(title: string, priority: string = 'medium', due: string = '', notes: string = ''): string {
  const emoji: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' }
  return `**NEW TASK**\n${'━'.repeat(40)}\n${emoji[priority] || '🟡'} **${title}**\n${due ? `📅 Due: ${due}` : ''}\n${notes ? `📝 Notes: ${notes}` : ''}\n${'━'.repeat(40)}`
}

function convertCurrency(amount: number, from: string, to: string): string {
  const rates: Record<string, number> = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 149.50, CAD: 1.36, AUD: 1.53, CHF: 0.88, CNY: 7.24, INR: 83.12, MXN: 17.15 }
  const fromRate = rates[from.toUpperCase()], toRate = rates[to.toUpperCase()]
  if (!fromRate || !toRate) return `Currency not supported. Available: ${Object.keys(rates).join(', ')}`
  return `${amount} ${from.toUpperCase()} = ${((amount / fromRate) * toRate).toFixed(2)} ${to.toUpperCase()} (approximate)`
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
    return { success: false, message: 'ANTHROPIC_API_KEY not set.', actions: [], updatedState: spreadsheetState, updatedHistory: conversationHistory }
  }

  const anthropic = new Anthropic({ apiKey })
  const actions: string[] = []
  let currentState = { ...spreadsheetState }
  const history = [...conversationHistory]
  const sheetNames = Object.keys(currentState.sheets)
  const activeSheet = currentState.activeSheet

  const systemPrompt = `You are an intelligent AI assistant for executive assistants and CEO support staff. You help with spreadsheets, research, communication, and task management.

**Your Capabilities:**
1. **Spreadsheet Operations** - Create, edit, and format spreadsheets
2. **Web Search** - Find information, news, company data online
3. **Web Scraping** - Extract content from URLs
4. **Email Drafting** - Compose professional emails
5. **Meeting Agendas** - Create structured meeting agendas
6. **Task Management** - Create and track tasks
7. **Calculations** - Perform math and currency conversions

**Current Spreadsheet:** Active sheet: ${activeSheet}, Available sheets: ${sheetNames.join(', ')}

Be proactive, thorough, and action-oriented. Use tools to accomplish tasks.`

  history.push({ role: 'user', content: command })

  try {
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: history.map(m => ({ role: m.role, content: m.content }))
    })

    let assistantMessage = ''
    let iterations = 0

    while (response.stop_reason === 'tool_use' && iterations < 10) {
      iterations++
      const toolResults: Anthropic.MessageParam[] = []
      
      for (const block of response.content) {
        if (block.type === 'text') assistantMessage += block.text
        else if (block.type === 'tool_use') {
          const toolInput = block.input as Record<string, unknown>
          let toolResult = ''
          
          if (block.name === 'set_cell_value') {
            const cellRef = (toolInput.cell as string).toUpperCase()
            const value = toolInput.value as string
            currentState = setCell(currentState, activeSheet, cellRef, !isNaN(Number(value)) && value !== '' ? Number(value) : value)
            actions.push(`Set ${cellRef} to "${value}"`)
            toolResult = `Set ${cellRef} to "${value}"`
          } else if (block.name === 'get_cell_value') {
            const cellRef = (toolInput.cell as string).toUpperCase()
            const value = getCell(currentState, activeSheet, cellRef)?.value ?? '(empty)'
            actions.push(`Read ${cellRef}: ${value}`)
            toolResult = `Cell ${cellRef}: ${value}`
          } else if (block.name === 'set_cell_style') {
            const cellRef = (toolInput.cell as string).toUpperCase()
            currentState = setCellStyle(currentState, activeSheet, cellRef, { bold: toolInput.bold as boolean | undefined, italic: toolInput.italic as boolean | undefined })
            actions.push(`Styled ${cellRef}`)
            toolResult = `Styled ${cellRef}`
          } else if (block.name === 'add_sheet') {
            const sheetName = toolInput.name as string
            currentState = addSheet(currentState, sheetName)
            actions.push(`Added sheet: ${sheetName}`)
            toolResult = `Created sheet: ${sheetName}`
          } else if (block.name === 'web_search') {
            toolResult = await webSearch(toolInput.query as string)
            actions.push(`Searched: "${toolInput.query}"`)
          } else if (block.name === 'fetch_webpage') {
            toolResult = await fetchWebpage(toolInput.url as string)
            actions.push(`Fetched: ${toolInput.url}`)
          } else if (block.name === 'draft_email') {
            toolResult = draftEmail(toolInput.to as string, toolInput.subject as string, toolInput.body as string, toolInput.tone as string)
            actions.push('Drafted email')
          } else if (block.name === 'create_meeting_agenda') {
            toolResult = createMeetingAgenda(toolInput.title as string, toolInput.attendees as string || '', toolInput.topics as string, toolInput.duration as string || '')
            actions.push('Created meeting agenda')
          } else if (block.name === 'get_current_datetime') {
            toolResult = getCurrentDateTime(toolInput.timezone as string || 'UTC')
            actions.push('Got current time')
          } else if (block.name === 'calculate') {
            toolResult = calculate(toolInput.expression as string)
            actions.push('Calculated')
          } else if (block.name === 'create_task') {
            toolResult = createTask(toolInput.title as string, toolInput.priority as string || 'medium', toolInput.due as string || '', toolInput.notes as string || '')
            actions.push(`Created task: ${toolInput.title}`)
          } else if (block.name === 'convert_currency') {
            toolResult = convertCurrency(toolInput.amount as number, toolInput.from as string, toolInput.to as string)
            actions.push('Converted currency')
          }
          
          toolResults.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: block.id, content: toolResult }] })
        }
      }
      
      if (toolResults.length > 0) {
        response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          tools,
          messages: [...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })), { role: 'assistant', content: response.content }, ...toolResults]
        })
      }
    }

    for (const block of response.content) {
      if (block.type === 'text') assistantMessage += block.text
    }

    if (!assistantMessage && actions.length > 0) assistantMessage = `Done! ${actions.join(', ')}.`
    history.push({ role: 'assistant', content: assistantMessage })

    return { success: true, message: assistantMessage, actions, updatedState: currentState, updatedHistory: history }
  } catch (error) {
    return { success: false, message: `AI error: ${error instanceof Error ? error.message : 'Unknown error'}`, actions: [], updatedState: spreadsheetState, updatedHistory: conversationHistory }
  }
}
