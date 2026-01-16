// Utility functions for spreadsheet operations
// Note: Vercel serverless functions are stateless, so we don't store data server-side
// Instead, spreadsheet data is managed on the client and passed with each request

export interface CellData {
  value: string | number | null
  formula?: string | null
  bold?: boolean
  italic?: boolean
  color?: string
  backgroundColor?: string
}

export interface SheetData {
  cells: Record<string, CellData>
}

export interface SpreadsheetState {
  id: string
  name: string
  sheets: Record<string, SheetData>
  activeSheet: string
}

export function createEmptySpreadsheet(name: string = 'My Spreadsheet'): SpreadsheetState {
  const id = crypto.randomUUID()
  return {
    id,
    name,
    sheets: {
      'Sheet1': { cells: {} }
    },
    activeSheet: 'Sheet1'
  }
}

export function getSheetNames(state: SpreadsheetState): string[] {
  return Object.keys(state.sheets)
}

export function addSheet(state: SpreadsheetState, sheetName: string): SpreadsheetState {
  return {
    ...state,
    sheets: {
      ...state.sheets,
      [sheetName]: { cells: {} }
    }
  }
}

export function setCell(
  state: SpreadsheetState, 
  sheetName: string, 
  cellRef: string, 
  value: string | number | null,
  style?: Partial<CellData>
): SpreadsheetState {
  const sheet = state.sheets[sheetName] || { cells: {} }
  const existingCell = sheet.cells[cellRef] || {}
  
  return {
    ...state,
    sheets: {
      ...state.sheets,
      [sheetName]: {
        cells: {
          ...sheet.cells,
          [cellRef]: {
            ...existingCell,
            value,
            ...style
          }
        }
      }
    }
  }
}

export function getCell(state: SpreadsheetState, sheetName: string, cellRef: string): CellData | undefined {
  return state.sheets[sheetName]?.cells[cellRef]
}

export function setCellStyle(
  state: SpreadsheetState,
  sheetName: string,
  cellRef: string,
  style: Partial<CellData>
): SpreadsheetState {
  const sheet = state.sheets[sheetName] || { cells: {} }
  const existingCell = sheet.cells[cellRef] || { value: null }
  
  return {
    ...state,
    sheets: {
      ...state.sheets,
      [sheetName]: {
        cells: {
          ...sheet.cells,
          [cellRef]: {
            ...existingCell,
            ...style
          }
        }
      }
    }
  }
}
