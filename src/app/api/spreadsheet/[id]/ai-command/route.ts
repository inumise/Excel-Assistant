import { NextResponse } from 'next/server'
import { getSpreadsheet, getSpreadsheetData } from '@/lib/excel-store'
import { processAICommand } from '@/lib/ai-agent'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { command } = await request.json()
    
    if (!command) {
      return NextResponse.json({ success: false, message: 'No command provided' }, { status: 400 })
    }
    
    const spreadsheet = getSpreadsheet(id)
    
    if (!spreadsheet) {
      return NextResponse.json({ success: false, message: 'Spreadsheet not found' }, { status: 404 })
    }
    
    const result = await processAICommand(
      id,
      command,
      spreadsheet.workbook,
      spreadsheet.activeSheet
    )
    
    const data = getSpreadsheetData(spreadsheet.workbook)
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      actions: result.actions,
      data: {
        spreadsheet: data
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
