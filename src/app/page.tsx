'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  FileSpreadsheet, 
  Plus, 
  Send, 
  Bot, 
  User, 
  Loader2,
  Sparkles,
  Table2,
  MessageSquare
} from 'lucide-react'

// Types for client-side state management
interface CellData {
  value: string | number | null
  formula?: string | null
  bold?: boolean
  italic?: boolean
}

interface SheetData {
  cells: Record<string, CellData>
}

interface SpreadsheetState {
  id: string
  name: string
  sheets: Record<string, SheetData>
  activeSheet: string
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatMessage {
  id: number
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  success?: boolean
}

// Create empty spreadsheet client-side
function createEmptySpreadsheet(): SpreadsheetState {
  return {
    id: crypto.randomUUID(),
    name: 'My Spreadsheet',
    sheets: {
      'Sheet1': { cells: {} }
    },
    activeSheet: 'Sheet1'
  }
}

export default function Home() {
  const [spreadsheetState, setSpreadsheetState] = useState<SpreadsheetState | null>(null)
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [activeView, setActiveView] = useState<'chat' | 'spreadsheet'>('chat')
  
  const messageIdRef = useRef(0)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const addChatMessage = (type: 'user' | 'assistant', content: string, success: boolean = true) => {
    const message: ChatMessage = {
      id: ++messageIdRef.current,
      type,
      content,
      timestamp: new Date(),
      success
    }
    setChatMessages(prev => [...prev, message])
  }

  const processCommand = async (command: string) => {
    if (!spreadsheetState || !command.trim()) return

    addChatMessage('user', command)
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          spreadsheetState,
          conversationHistory
        })
      })

      const result = await response.json()
      addChatMessage('assistant', result.message, result.success)

      if (result.success) {
        if (result.spreadsheetState) {
          setSpreadsheetState(result.spreadsheetState)
        }
        if (result.conversationHistory) {
          setConversationHistory(result.conversationHistory)
        }
      }
    } catch {
      addChatMessage('assistant', 'Connection error. Please try again.', false)
    } finally {
      setIsLoading(false)
    }
  }

  const createSpreadsheet = () => {
    const newSpreadsheet = createEmptySpreadsheet()
    setSpreadsheetState(newSpreadsheet)
    setConversationHistory([])
    setChatMessages([])
    addChatMessage('assistant', "Welcome! I'm your AI assistant for spreadsheets and executive tasks. I can help with:\n\n• Spreadsheet operations (\"Create a budget tracker\")\n• Web search (\"Search for Apple's stock price\")\n• Email drafting (\"Draft an email to John about the meeting\")\n• Meeting agendas (\"Create agenda for Q1 review\")\n• Task management (\"Create a high priority task for Friday\")\n• Calculations & currency conversion\n\nWhat would you like to do?")
  }

  const handleCellClick = (cellRef: string) => {
    setSelectedCell(cellRef)
  }

  const handleCellDoubleClick = (cellRef: string) => {
    setEditingCell(cellRef)
    if (spreadsheetState) {
      const currentData = spreadsheetState.sheets[spreadsheetState.activeSheet]?.cells[cellRef]
      setEditValue(currentData?.value?.toString() || '')
    }
  }

  const handleCellEdit = () => {
    if (!editingCell || !spreadsheetState) return

    const activeSheet = spreadsheetState.activeSheet
    const sheet = spreadsheetState.sheets[activeSheet] || { cells: {} }
    
    let cellValue: string | number = editValue
    if (!isNaN(Number(editValue)) && editValue !== '') {
      cellValue = Number(editValue)
    }

    setSpreadsheetState({
      ...spreadsheetState,
      sheets: {
        ...spreadsheetState.sheets,
        [activeSheet]: {
          cells: {
            ...sheet.cells,
            [editingCell]: {
              ...sheet.cells[editingCell],
              value: cellValue
            }
          }
        }
      }
    })

    setEditingCell(null)
    setEditValue('')
  }

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      processCommand(chatInput.trim())
      setChatInput('')
    }
  }

  const setActiveSheet = (sheetName: string) => {
    if (spreadsheetState) {
      setSpreadsheetState({
        ...spreadsheetState,
        activeSheet: sheetName
      })
    }
  }

  const renderSpreadsheet = () => {
    if (!spreadsheetState) return null
    
    const currentSheet = spreadsheetState.sheets[spreadsheetState.activeSheet]
    if (!currentSheet) return null

    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const rows = Array.from({ length: 15 }, (_, i) => i + 1)

    return (
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100">
              <th className="w-10 border-b border-r border-slate-200 p-2 text-center text-xs font-semibold text-slate-500"></th>
              {columns.map(col => (
                <th key={col} className="min-w-20 border-b border-r border-slate-200 p-2 text-center text-xs font-semibold text-slate-600">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row} className="hover:bg-slate-50/50">
                <td className="border-b border-r border-slate-200 p-2 text-center text-xs font-semibold text-slate-500 bg-gradient-to-r from-slate-50 to-slate-100">
                  {row}
                </td>
                {columns.map(col => {
                  const cellRef = `${col}${row}`
                  const cellData = currentSheet.cells[cellRef]
                  const isSelected = selectedCell === cellRef
                  const isEditing = editingCell === cellRef

                  return (
                    <td
                      key={cellRef}
                      className={`border-b border-r border-slate-200 p-0 text-sm cursor-pointer transition-all ${
                        isSelected ? 'bg-emerald-50 ring-2 ring-emerald-500 ring-inset' : ''
                      } ${cellData?.bold ? 'font-bold' : ''} ${cellData?.italic ? 'italic' : ''}`}
                      onClick={() => handleCellClick(cellRef)}
                      onDoubleClick={() => handleCellDoubleClick(cellRef)}
                    >
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellEdit}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellEdit()}
                          autoFocus
                          className="h-8 p-1 text-sm border-0 focus-visible:ring-0 rounded-none"
                        />
                      ) : (
                        <span className="block min-h-8 px-2 py-1.5 truncate">
                          {cellData?.value ?? ''}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderChat = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4" ref={chatScrollRef}>
        {chatMessages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">AI-Powered Excel</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">
              Tell me what you want to do with your spreadsheet in plain English
            </p>
          </div>
        )}
        {chatMessages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.type === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.type === 'user'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                  : msg.success === false
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-white text-slate-700 shadow-md border border-slate-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.type === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-600" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white rounded-2xl px-4 py-3 shadow-md border border-slate-100">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="flex gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Type a command..."
            disabled={isLoading || !spreadsheetState}
            className="flex-1 bg-white border-slate-200 focus-visible:ring-emerald-500"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !chatInput.trim() || !spreadsheetState}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  if (!spreadsheetState) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <FileSpreadsheet className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Excel AI Assistant
            </CardTitle>
            <CardDescription className="text-slate-500">
              Control spreadsheets with natural language
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={createSpreadsheet}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 text-base font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Spreadsheet
            </Button>
            <div className="text-center">
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                Powered by Claude AI
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  const sheets = Object.keys(spreadsheetState.sheets)

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800">{spreadsheetState.name}</h1>
            <p className="text-xs text-slate-500">{sheets.length} sheet(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            AI
          </div>
          <a
            href="/workers"
            className="rounded-full border border-[#FFD700]/40 bg-[#1A1A1A] px-3 py-1.5 text-xs font-medium text-[#FFD700] transition hover:bg-[#2B2B2B]"
          >
            Workflow Studio
          </a>
        </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="sm:hidden flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveView('chat')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeView === 'chat'
              ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50'
              : 'text-slate-500'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </button>
        <button
          onClick={() => setActiveView('spreadsheet')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeView === 'spreadsheet'
              ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50'
              : 'text-slate-500'
          }`}
        >
          <Table2 className="w-4 h-4" />
          Sheet
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Chat Panel */}
        <div className={`${activeView === 'chat' ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-96 border-r border-slate-200 bg-slate-50/50`}>
          {renderChat()}
        </div>

        {/* Spreadsheet Panel */}
        <div className={`${activeView === 'spreadsheet' ? 'flex' : 'hidden'} sm:flex flex-col flex-1 overflow-hidden`}>
          {/* Sheet Tabs */}
          <div className="flex items-center gap-1 p-2 bg-white border-b border-slate-200 overflow-x-auto">
            {sheets.map(sheet => (
              <button
                key={sheet}
                onClick={() => setActiveSheet(sheet)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  spreadsheetState.activeSheet === sheet
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {sheet}
              </button>
            ))}
          </div>

          {/* Spreadsheet Grid */}
          <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
            {renderSpreadsheet()}
          </div>
        </div>
      </div>
    </main>
  )
}
