import ExcelJS from 'exceljs'

interface SpreadsheetData {
  id: string
  name: string
  workbook: ExcelJS.Workbook
  activeSheet: string
  createdAt: Date
}

const spreadsheets = new Map<string, SpreadsheetData>()

export function getSpreadsheet(id: string): SpreadsheetData | undefined {
  return spreadsheets.get(id)
}

export function setSpreadsheet(id: string, data: SpreadsheetData): void {
  spreadsheets.set(id, data)
}

export function deleteSpreadsheet(id: string): boolean {
  return spreadsheets.delete(id)
}

export function createNewSpreadsheet(name: string = 'My Spreadsheet'): SpreadsheetData {
  const id = crypto.randomUUID()
  const workbook = new ExcelJS.Workbook()
  workbook.addWorksheet('Sheet1')
  
  const data: SpreadsheetData = {
    id,
    name,
    workbook,
    activeSheet: 'Sheet1',
    createdAt: new Date()
  }
  
  spreadsheets.set(id, data)
  return data
}

export function getSpreadsheetData(workbook: ExcelJS.Workbook): Record<string, unknown> {
  const sheetsData: Record<string, unknown> = {}
  
  workbook.eachSheet((sheet) => {
    const cells: Record<string, unknown> = {}
    
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const colLetter = String.fromCharCode(64 + colNumber)
        const cellRef = `${colLetter}${rowNumber}`
        cells[cellRef] = {
          value: cell.value,
          formula: cell.formula || null,
          bold: cell.font?.bold || false
        }
      })
    })
    
    sheetsData[sheet.name] = {
      cells,
      max_row: sheet.rowCount,
      max_column: sheet.columnCount
    }
  })
  
  return sheetsData
}

export { spreadsheets }
