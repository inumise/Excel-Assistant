import { NextResponse } from 'next/server'
import { getSpreadsheet } from '@/lib/excel-store'

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
    
    const buffer = await spreadsheet.workbook.xlsx.writeBuffer()
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${spreadsheet.name}.xlsx"`
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
