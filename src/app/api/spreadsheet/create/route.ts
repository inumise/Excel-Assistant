import { NextResponse } from 'next/server'
import { createNewSpreadsheet, getSpreadsheetData } from '@/lib/excel-store'

export async function POST() {
  try {
    const spreadsheet = createNewSpreadsheet('My Spreadsheet')
    const data = getSpreadsheetData(spreadsheet.workbook)
    
    return NextResponse.json({
      id: spreadsheet.id,
      name: spreadsheet.name,
      sheets: spreadsheet.workbook.worksheets.map(s => s.name),
      data
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
