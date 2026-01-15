import { NextResponse } from 'next/server'
import { getSpreadsheet, getSpreadsheetData } from '@/lib/excel-store'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const spreadsheet = getSpreadsheet(id)
    
    if (!spreadsheet) {
      return NextResponse.json({ error: 'Spreadsheet not found' }, { status: 404 })
    }
    
    const data = getSpreadsheetData(spreadsheet.workbook)
    
    return NextResponse.json({
      id: spreadsheet.id,
      name: spreadsheet.name,
      sheets: spreadsheet.workbook.worksheets.map(s => s.name),
      activeSheet: spreadsheet.activeSheet,
      data
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
