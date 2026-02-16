'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MindMapDocument,
  cloneMindMapDocument,
  createEmptyMindMapDocument,
  normalizeMindMapDocument,
} from '@/components/mindmap/types'

const HISTORY_LIMIT = 80

export interface UpdateDocumentOptions {
  recordHistory?: boolean
}

export function useMindMapDocument(storageKey: string) {
  const [document, setDocument] = useState<MindMapDocument>(createEmptyMindMapDocument())
  const [undoStack, setUndoStack] = useState<MindMapDocument[]>([])
  const [redoStack, setRedoStack] = useState<MindMapDocument[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const documentRef = useRef(document)

  useEffect(() => {
    documentRef.current = document
  }, [document])

  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      setDocument(createEmptyMindMapDocument())
      setIsHydrated(true)
      return
    }

    try {
      setDocument(normalizeMindMapDocument(JSON.parse(raw) as Partial<MindMapDocument>))
    } catch {
      setDocument(createEmptyMindMapDocument())
    } finally {
      setIsHydrated(true)
    }
  }, [storageKey])

  useEffect(() => {
    if (!isHydrated) return
    localStorage.setItem(storageKey, JSON.stringify(document))
  }, [document, isHydrated, storageKey])

  const updateDocument = useCallback(
    (updater: (previous: MindMapDocument) => MindMapDocument, options?: UpdateDocumentOptions) => {
      setDocument((previous) => {
        const next = updater(previous)
        const shouldRecord = options?.recordHistory !== false
        if (shouldRecord && JSON.stringify(previous) !== JSON.stringify(next)) {
          setUndoStack((stack) => [...stack.slice(-HISTORY_LIMIT), cloneMindMapDocument(previous)])
          setRedoStack([])
        }
        return next
      })
    },
    []
  )

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack
      const snapshot = stack[stack.length - 1]
      setRedoStack((redo) => [...redo.slice(-HISTORY_LIMIT), cloneMindMapDocument(documentRef.current)])
      setDocument(snapshot)
      return stack.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack
      const snapshot = stack[stack.length - 1]
      setUndoStack((undoStackValue) => [
        ...undoStackValue.slice(-HISTORY_LIMIT),
        cloneMindMapDocument(documentRef.current),
      ])
      setDocument(snapshot)
      return stack.slice(0, -1)
    })
  }, [])

  return {
    document,
    setDocument,
    isHydrated,
    updateDocument,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  }
}
