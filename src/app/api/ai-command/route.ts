import { NextResponse } from 'next/server'
import { processAICommand } from '@/lib/ai-agent'
import { SpreadsheetState } from '@/lib/excel-store'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  command: string
  spreadsheetState: SpreadsheetState
  conversationHistory?: ConversationMessage[]
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json()
    const { command, spreadsheetState, conversationHistory = [] } = body

    if (!command) {
      return NextResponse.json(
        { success: false, message: 'No command provided' },
        { status: 400 }
      )
    }

    if (!spreadsheetState) {
      return NextResponse.json(
        { success: false, message: 'No spreadsheet state provided' },
        { status: 400 }
      )
    }

    const result = await processAICommand(command, spreadsheetState, conversationHistory)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      actions: result.actions,
      spreadsheetState: result.updatedState,
      conversationHistory: result.updatedHistory
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    )
  }
}
