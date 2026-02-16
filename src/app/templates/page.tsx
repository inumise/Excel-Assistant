'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, PlusCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DEMO_USER_ID } from '@/lib/workflow-template'

interface TemplateItem {
  id: string
  name: string
  description: string
  size: 'small' | 'medium' | 'large'
  departments: string[]
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingId, setCreatingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/templates')
        const data = await response.json()
        setTemplates(data.templates || [])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const createFromTemplate = async (templateId: string) => {
    setCreatingId(templateId)
    setMessage('')
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, userId: DEMO_USER_ID }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || `Failed to create template (${response.status})`)
      }
      setMessage(`Template created: ${data.workflow?.name || templateId}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create workflow template.')
    } finally {
      setCreatingId(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-4 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#1D4ED8]">Structure Templates</h1>
        <p className="text-sm text-[#334155]">
          Create full employee AI structures instantly, then customize in Builder.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 text-sm text-[#1E3A8A]">
          {message} {' '}
          <Link href="/" className="font-semibold underline">
            Open Builder
          </Link>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="rgb-glow-card">
              <CardHeader>
                <CardTitle className="text-base text-[#1D4ED8]">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#475569]">
                  <span>Size: {template.size}</span>
                  <span>{template.departments.length} departments</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {template.departments.map((department) => (
                    <span
                      key={department}
                      className="rounded-full border border-[#C7D2FE] bg-white px-2 py-0.5 text-[10px] text-[#4338CA]"
                    >
                      {department}
                    </span>
                  ))}
                </div>
                <Button
                  onClick={() => void createFromTemplate(template.id)}
                  disabled={creatingId === template.id}
                  className="w-full bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
                >
                  {creatingId === template.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="mr-2 h-4 w-4" />
                  )}
                  Create Structure
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="rgb-glow-card">
        <CardHeader>
          <CardTitle className="text-base text-[#1D4ED8]">Owner strategy note</CardTitle>
          <CardDescription>
            Start with templates, then adapt prompts and code blocks for each department.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-[#334155]">
          <Sparkles className="h-4 w-4 text-[#1D4ED8]" />
          Keep structure simple first, then expand using advanced map controls.
        </CardContent>
      </Card>
    </main>
  )
}
