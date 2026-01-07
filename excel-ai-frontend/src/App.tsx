import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Mic, 
  MicOff, 
  Upload, 
  Download, 
  Plus, 
  FileSpreadsheet,
  Volume2,
  VolumeX,
  X,
  Send,
  MessageSquare,
  Table,
  Bot,
  User,
  Loader2,
  Sparkles,
  FileAudio
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface CellData {
  value: string | number | null
  formula?: string | null
  bold?: boolean
}

interface SheetData {
  cells: Record<string, CellData>
  max_row: number
  max_column: number
}

interface SpreadsheetData {
  [sheetName: string]: SheetData
}

interface ChatMessage {
  id: number
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  success?: boolean
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: ISpeechRecognitionEvent) => void) | null
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onaudiostart: (() => void) | null
  onaudioend: (() => void) | null
  start: () => void
  stop: () => void
}

interface ISpeechRecognitionEvent {
  resultIndex: number
  results: ISpeechRecognitionResultList
}

interface ISpeechRecognitionResultList {
  length: number
  [index: number]: ISpeechRecognitionResult
}

interface ISpeechRecognitionResult {
  isFinal: boolean
  [index: number]: ISpeechRecognitionAlternative
}

interface ISpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface ISpeechRecognitionErrorEvent {
  error: string
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition
    webkitSpeechRecognition: new () => ISpeechRecognition
  }
}

function App() {
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null)
  const [spreadsheetName, setSpreadsheetName] = useState<string>('')
  const [sheets, setSheets] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState<string>('Sheet1')
  const [spreadsheetData, setSpreadsheetData] = useState<SpreadsheetData>({})
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [speechSupported, setSpeechSupported] = useState(true)
  const [voiceFeedback, setVoiceFeedback] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [activeView, setActiveView] = useState<'spreadsheet' | 'chat'>('chat')
  const [audioLevel, setAudioLevel] = useState(0)
  const [voiceStatus, setVoiceStatus] = useState<string>('')
  const [useAI] = useState(true) // Use AI by default - always on
  
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const messageIdRef = useRef(0)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

        recognition.onresult = (event: ISpeechRecognitionEvent) => {
          let finalTranscript = ''
          let interimTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            const transcriptText = result[0].transcript
        
            if (result.isFinal) {
              finalTranscript += transcriptText
            } else {
              interimTranscript += transcriptText
            }
          }

          setTranscript(interimTranscript || finalTranscript)

          if (finalTranscript && spreadsheetId) {
            const command = finalTranscript.trim()
            setTranscript('')
            setVoiceStatus('')
            setIsListening(false)
            stopAudioVisualization()
            processCommand(command)
          }
        }

        recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error)
          setVoiceStatus('')
          if (event.error === 'no-speech') {
            addChatMessage('assistant', 'No speech detected. Please try again and speak clearly into your microphone.', false)
          } else if (event.error === 'not-allowed') {
            addChatMessage('assistant', 'Microphone access denied. Please allow microphone access in your browser settings.', false)
          } else if (event.error !== 'aborted') {
            addChatMessage('assistant', `Voice error: ${event.error}. Try using text input instead.`, false)
          }
          setIsListening(false)
          stopAudioVisualization()
        }

        recognition.onend = () => {
          setIsListening(false)
          setVoiceStatus('')
          stopAudioVisualization()
        }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      stopAudioVisualization()
    }
  }, [spreadsheetId])

    useEffect(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
      }
    }, [chatMessages])

  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256
      
      const updateLevel = () => {
        if (!analyserRef.current) return
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(average / 255)
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()
    } catch (err) {
      console.error('Failed to start audio visualization:', err)
    }
  }

    const stopAudioVisualization = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      setAudioLevel(0)
    }

    const speak = useCallback((text: string) => {
    if (voiceFeedback && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1
      utterance.volume = 0.8
      window.speechSynthesis.speak(utterance)
    }
  }, [voiceFeedback])

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
    if (!spreadsheetId || !command.trim()) return

    addChatMessage('user', command)
    setIsLoading(true)

    try {
      // Use AI endpoint if AI mode is enabled
      const endpoint = useAI 
        ? `${API_URL}/api/spreadsheet/${spreadsheetId}/ai-command`
        : `${API_URL}/api/spreadsheet/${spreadsheetId}/command`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(useAI ? { command } : { spreadsheet_id: spreadsheetId, command })
      })

      const result = await response.json()

      addChatMessage('assistant', result.message, result.success)

      if (result.success) {
        speak(result.message)
        if (result.data?.spreadsheet) {
          setSpreadsheetData(result.data.spreadsheet)
        }
        if (result.data?.sheet_name) {
          setSheets(prev => [...prev, result.data.sheet_name])
        }
      }
    } catch (err) {
      const errorMsg = 'Connection error. Please check your internet and try again.'
      addChatMessage('assistant', errorMsg, false)
    } finally {
      setIsLoading(false)
    }
  }

  const createSpreadsheet = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/spreadsheet/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My Spreadsheet' })
      })

      const data = await response.json()
      setSpreadsheetId(data.id)
      setSpreadsheetName(data.name)
      setSheets(data.sheets)
      setActiveSheet(data.sheets[0])
      setSpreadsheetData(data.data)
      
      addChatMessage('assistant', "I've created a new spreadsheet for you! You can now tell me what you'd like to do. Try saying something like \"Set A1 to Hello\" or \"Put 100 in B2\".")
    } catch (err) {
      addChatMessage('assistant', 'Failed to create spreadsheet. Please try again.', false)
    } finally {
      setIsLoading(false)
    }
  }

  const uploadSpreadsheet = async (file: File) => {
    setIsLoading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/api/spreadsheet/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setSpreadsheetId(data.id)
      setSpreadsheetName(data.name)
      setSheets(data.sheets)
      setActiveSheet(data.sheets[0])
      setSpreadsheetData(data.data)
      
      addChatMessage('assistant', `I've loaded "${data.name}". What would you like me to help you with?`)
    } catch (err) {
      addChatMessage('assistant', 'Failed to upload file. Please make sure it\'s a valid Excel file.', false)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadSpreadsheet = () => {
    if (spreadsheetId) {
      window.open(`${API_URL}/api/spreadsheet/${spreadsheetId}/download`, '_blank')
    }
  }

    const toggleListening = async () => {
      if (!recognitionRef.current) {
        addChatMessage('assistant', 'Voice recognition is not available in your browser. Please use Chrome or Edge for voice features, or type your commands instead.', false)
        return
      }

      if (isListening) {
        recognitionRef.current.stop()
        setIsListening(false)
        setVoiceStatus('')
        stopAudioVisualization()
      } else {
        try {
          // Request microphone permission first
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach(track => track.stop()) // Release the stream
        
          setVoiceStatus('Listening... Speak now!')
          await startAudioVisualization()
          recognitionRef.current.start()
          setIsListening(true)
        } catch (err) {
          console.error('Microphone error:', err)
          addChatMessage('assistant', 'Could not access microphone. Please allow microphone access in your browser settings and try again.', false)
          setVoiceStatus('')
        }
      }
    }

  const handleCellClick = (cellRef: string) => {
    setSelectedCell(cellRef)
  }

  const handleCellDoubleClick = (cellRef: string) => {
    setEditingCell(cellRef)
    const currentData = spreadsheetData[activeSheet]?.cells[cellRef]
    setEditValue(currentData?.value?.toString() || '')
  }

  const handleCellEdit = async () => {
    if (!editingCell || !spreadsheetId) return

    try {
      const response = await fetch(`${API_URL}/api/spreadsheet/${spreadsheetId}/cell`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_name: activeSheet,
          cell: editingCell,
          value: editValue
        })
      })

      const result = await response.json()
      if (result.success) {
        setSpreadsheetData(result.data)
      }
    } catch (err) {
      addChatMessage('assistant', 'Failed to update cell', false)
    }

    setEditingCell(null)
    setEditValue('')
  }

        const handleSendMessage = () => {
          if (chatInput.trim()) {
            processCommand(chatInput.trim())
            setChatInput('')
          }
        }

  const handleAudioUpload = async (file: File) => {
    if (!spreadsheetId) return

    setIsLoading(true)
    addChatMessage('user', `[Voice memo: ${file.name}]`)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Use AI endpoint if AI mode is enabled
      const endpoint = useAI 
        ? `${API_URL}/api/spreadsheet/${spreadsheetId}/ai-voice-command`
        : `${API_URL}/api/spreadsheet/${spreadsheetId}/voice-command`
  
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })
  
      const result = await response.json()
  
      if (result.success) {
        addChatMessage('assistant', `Heard: "${result.transcript}"\n\n${result.message}`)
        if (result.data?.spreadsheet) {
          setSpreadsheetData(result.data.spreadsheet)
        }
        if (voiceFeedback) {
          speak(result.message)
        }
      } else {
        addChatMessage('assistant', result.message || 'Failed to process voice command', false)
      }
    } catch (err) {
      addChatMessage('assistant', 'Failed to upload audio. Please try again.', false)
    } finally {
      setIsLoading(false)
    }
  }

        const renderSpreadsheet = () => {
    const currentSheet = spreadsheetData[activeSheet]
    if (!currentSheet) return null

    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const rows = Array.from({ length: 15 }, (_, i) => i + 1)

    return (
      <div className="overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="w-8 md:w-10 border border-slate-200 p-1 md:p-2 text-center text-xs font-medium text-slate-500"></th>
              {columns.map(col => (
                <th key={col} className="min-w-16 md:min-w-20 border border-slate-200 p-1 md:p-2 text-center text-xs font-medium text-slate-600">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row}>
                <td className="border border-slate-200 p-1 md:p-2 text-center text-xs font-medium text-slate-500 bg-slate-50">
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
                      className={`border border-slate-200 p-0.5 md:p-1 text-xs md:text-sm cursor-pointer transition-all ${
                        isSelected ? 'bg-emerald-50 ring-2 ring-emerald-500 ring-inset' : 'hover:bg-slate-50'
                      } ${cellData?.bold ? 'font-bold' : ''}`}
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
                          className="h-5 md:h-6 p-0.5 text-xs md:text-sm border-0 focus-visible:ring-0"
                        />
                      ) : (
                        <span className="block min-h-5 md:min-h-6 px-0.5 md:px-1 truncate">
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
      <ScrollArea className="flex-1 p-3 md:p-4" ref={chatScrollRef}>
        <div className="space-y-3 md:space-y-4">
          {chatMessages.length === 0 && (
            <div className="text-center py-8 md:py-12">
              <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-2">Welcome to Excel AI</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                I can help you work with spreadsheets using natural language. Try these commands:
              </p>
              <div className="grid gap-2 max-w-xs mx-auto">
                {['Set A1 to Hello', 'Put 100 in B2', 'Sum column A', 'Make row 1 bold'].map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setChatInput(cmd)
                    }}
                    className="text-left px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-700 transition-colors"
                  >
                    "{cmd}"
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {chatMessages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2 md:gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.type === 'assistant' && (
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.success !== false ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-red-400'
                }`}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-3 py-2 md:px-4 md:py-2.5 rounded-2xl text-sm ${
                  msg.type === 'user'
                    ? 'bg-emerald-500 text-white rounded-br-md'
                    : msg.success !== false
                    ? 'bg-slate-100 text-slate-800 rounded-bl-md'
                    : 'bg-red-50 text-red-700 rounded-bl-md border border-red-200'
                }`}
              >
                {msg.content}
              </div>
              {msg.type === 'user' && (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2 md:gap-3">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-100 px-4 py-2.5 rounded-2xl rounded-bl-md">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

            <div className="p-3 md:p-4 border-t border-slate-200 bg-white">
              {(voiceStatus || transcript) && (
                <div className="mb-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                  {voiceStatus && <div className="font-medium">{voiceStatus}</div>}
                  {transcript && <div className="italic mt-1">"{transcript}"</div>}
                </div>
              )}
        
        <div className="flex gap-2">
                    {speechSupported && (
                      <Button
                        size="icon"
                        variant={isListening ? "destructive" : "outline"}
                        onClick={toggleListening}
                        className={`flex-shrink-0 relative ${isListening ? 'animate-pulse' : ''}`}
                        disabled={!spreadsheetId}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-4 h-4" />
                            <span 
                              className="absolute inset-0 rounded-md border-2 border-red-400 animate-ping"
                              style={{ opacity: audioLevel }}
                            />
                          </>
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </Button>
                    )}
          
                    <label className="flex-shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        className="cursor-pointer"
                        disabled={!spreadsheetId || isLoading}
                        asChild
                      >
                        <span>
                          <FileAudio className="w-4 h-4" />
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])}
                      />
                    </label>
          
                    <Input
            placeholder={spreadsheetId ? "Type a command..." : "Create a spreadsheet first"}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={!spreadsheetId || isLoading}
            className="flex-1"
          />
          
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || !spreadsheetId || isLoading}
            className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  if (!spreadsheetId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <FileSpreadsheet className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">
              Excel AI Assistant
            </CardTitle>
            <CardDescription className="text-slate-500">
              Control spreadsheets with your voice or chat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!speechSupported && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm">
                Voice not supported in this browser. You can still use text commands.
              </div>
            )}
            
            <Button
              size="lg"
              className="w-full h-14 text-base bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md"
              onClick={createSpreadsheet}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Plus className="w-5 h-5 mr-2" />
              )}
              Create New Spreadsheet
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">or</span>
              </div>
            </div>
            
            <label className="cursor-pointer block">
              <Button
                size="lg"
                variant="outline"
                className="w-full h-14 text-base"
                disabled={isLoading}
                asChild
              >
                <span>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Excel File
                </span>
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadSpreadsheet(e.target.files[0])}
              />
            </label>

            <div className="pt-4">
              <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
                <Mic className="w-3 h-3" />
                Voice optimized for noisy environments
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-3 md:px-4 py-2 md:py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-semibold text-slate-800 text-sm md:text-base">{spreadsheetName}</h1>
            <p className="text-xs text-slate-400">{sheets.length} sheet(s)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2">
          <div className="flex items-center gap-2 mr-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full">
              <Sparkles className="w-3 h-3 text-white" />
              <span className="text-xs font-medium text-white">AI</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 mr-2">
            <Switch
              id="voice-feedback"
              checked={voiceFeedback}
              onCheckedChange={setVoiceFeedback}
            />
            <Label htmlFor="voice-feedback" className="text-xs text-slate-500 flex items-center gap-1">
              {voiceFeedback ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            </Label>
          </div>
          
          <Button variant="ghost" size="icon" onClick={downloadSpreadsheet} className="h-8 w-8">
            <Download className="w-4 h-4 text-slate-500" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSpreadsheetId(null)
              setChatMessages([])
            }}
            className="h-8 w-8"
          >
            <X className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
      </header>

      <div className="md:hidden flex border-b border-slate-200 bg-white">
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
          <Table className="w-4 h-4" />
          Sheet
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 flex flex-col md:flex ${activeView === 'chat' ? 'flex' : 'hidden md:flex'} md:w-1/2 lg:w-2/5 border-r border-slate-200 bg-white`}>
          {renderChat()}
        </div>

        <div className={`flex-1 flex flex-col ${activeView === 'spreadsheet' ? 'flex' : 'hidden md:flex'} md:w-1/2 lg:w-3/5 bg-white`}>
          <div className="p-2 md:p-3 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
            {sheets.map(sheet => (
              <button
                key={sheet}
                onClick={() => setActiveSheet(sheet)}
                className={`px-3 py-1.5 text-xs md:text-sm rounded-lg whitespace-nowrap transition-colors ${
                  activeSheet === sheet
                    ? 'bg-emerald-100 text-emerald-700 font-medium'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {sheet}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-auto p-2 md:p-4">
            {renderSpreadsheet()}
          </div>
          
          {selectedCell && (
            <div className="px-3 md:px-4 py-2 border-t border-slate-200 bg-slate-50 text-xs md:text-sm text-slate-600">
              <span className="font-mono font-semibold text-emerald-600">{selectedCell}</span>
              {spreadsheetData[activeSheet]?.cells[selectedCell]?.value && (
                <span className="ml-2">
                  = {spreadsheetData[activeSheet].cells[selectedCell].value}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
