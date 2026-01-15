import { NextResponse } from 'next/server'
import { getSpreadsheet, getSpreadsheetData } from '@/lib/excel-store'

function columnLetterToNumber(col: string): number {
  let result = 0
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 64)
  }
  return result
}

function parseCellReference(cellRef: string): { col: string; row: number } | null {
  const match = cellRef.toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!match) return null
  return { col: match[1], row: parseInt(match[2]) }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { sheet_name, cell, value } = await request.json()
    
    const spreadsheet = getSpreadsheet(id)
    
    if (!spreadsheet) {
      return NextResponse.json({ success: false, message: 'Spreadsheet not found' }, { status: 404 })
    }
    
    const sheet = spreadsheet.workbook.getWorksheet(sheet_name || spreadsheet.activeSheet)
    if (!sheet) {
      return NextResponse.json({ success: false, message: 'Sheet not found' }, { status: 404 })
    }
    
    const cellRef = parseCellReference(cell)
    if (!cellRef) {
      return NextResponse.json({ success: false, message: 'Invalid cell reference' }, { status: 400 })
    }
    
    const cellObj = sheet.getCell(cellRef.row, columnLetterToNumber(cellRef.col))
    
    if (typeof value === 'string' && value.startsWith('=')) {
      cellObj.value = { formula: value.substring(1) }
    } else if (!isNaN(Number(value))) {
      cellObj.value = Number(value)
    } else {
      cellObj.value = value
    }
    
    const data = getSpreadsheetData(spreadsheet.workbook)
    
    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
