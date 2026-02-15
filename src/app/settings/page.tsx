'use client'

import { useEffect, useState } from 'react'
import { Loader2, QrCode, Save, ShieldCheck, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DEMO_USER_ID } from '@/lib/workflow-template'
import { TonePreset, UserAISettings } from '@/types/workflow'

const toneOptions: Array<{ label: string; value: TonePreset }> = [
  { value: 'luxury-brand', label: 'Luxury Brand' },
  { value: 'technical-executive', label: 'Technical Executive' },
  { value: 'minimal-precise', label: 'Minimal Precise' },
  { value: 'bold-sales', label: 'Bold Sales' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserAISettings | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [whatsStatus, setWhatsStatus] = useState('Not linked')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isQrLoading, setIsQrLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/settings?userId=${DEMO_USER_ID}`)
        const data = await response.json()
        setSettings(data.settings)
        if (data.whatsappSession?.sessionData?.qr) {
          setQrCode(String(data.whatsappSession.sessionData.qr))
        }
        if (data.whatsappSession?.linkedNumber) {
          setWhatsStatus(`Linked: ${data.whatsappSession.linkedNumber}`)
        }
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const updateSettings = <K extends keyof UserAISettings>(key: K, value: UserAISettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const save = async () => {
    if (!settings) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await response.json()
      setSettings(data.settings)
    } finally {
      setIsSaving(false)
    }
  }

  const setupWhatsApp = async () => {
    if (!settings) return
    setIsQrLoading(true)
    try {
      const response = await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: settings.userId,
          linkedNumber: settings.whatsappNumber,
        }),
      })
      const data = await response.json()
      setQrCode(data.session?.qr || '')
      setWhatsStatus(data.session?.status || 'pending')
    } finally {
      setIsQrLoading(false)
    }
  }

  if (isLoading || !settings) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center px-4 py-10">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1D4ED8]">AI Manager Settings</h1>
        <p className="mt-1 text-sm text-[#334155]">
          Configure provider keys, creativity, global prompts, and WhatsApp login control.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rgb-glow-card border-[#BFDBFE] bg-white/90">
          <CardHeader>
            <CardTitle className="text-lg text-[#1D4ED8]">Global AI Manager</CardTitle>
            <CardDescription className="text-[#334155]">
              Per-user prompt/tone presets and multi-provider keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-xs text-[#334155]">Global Prompt</label>
            <textarea
              value={settings.globalPrompt}
              onChange={(event) => updateSettings('globalPrompt', event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none"
            />

            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="block text-xs text-[#334155]">Creativity ({settings.creativityTemp.toFixed(1)})</label>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.1}
                  value={settings.creativityTemp}
                  onChange={(event) => updateSettings('creativityTemp', Number(event.target.value))}
                  className="w-full accent-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#334155]">Tone Preset</label>
                <select
                  value={settings.tonePreset}
                  onChange={(event) => updateSettings('tonePreset', event.target.value as TonePreset)}
                  className="h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#0F172A]"
                >
                  {toneOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-[#334155]">OpenAI Key</label>
              <Input
                type="password"
                value={settings.aiKeys.openai || ''}
                onChange={(event) =>
                  updateSettings('aiKeys', {
                    ...settings.aiKeys,
                    openai: event.target.value,
                  })
                }
                className="border-[#CBD5E1] bg-white text-[#0F172A]"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-[#334155]">Claude Key</label>
              <Input
                type="password"
                value={settings.aiKeys.claude || ''}
                onChange={(event) =>
                  updateSettings('aiKeys', {
                    ...settings.aiKeys,
                    claude: event.target.value,
                  })
                }
                className="border-[#CBD5E1] bg-white text-[#0F172A]"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs text-[#334155]">Gemini Key</label>
              <Input
                type="password"
                value={settings.aiKeys.gemini || ''}
                onChange={(event) =>
                  updateSettings('aiKeys', {
                    ...settings.aiKeys,
                    gemini: event.target.value,
                  })
                }
                className="border-[#CBD5E1] bg-white text-[#0F172A]"
              />
            </div>

            <Button
              onClick={save}
              disabled={isSaving}
              className="mt-2 w-full bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save AI Manager Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="rgb-glow-card border-[#C7D2FE] bg-white/90">
          <CardHeader>
            <CardTitle className="text-lg text-[#4338CA]">WhatsApp Login & Control</CardTitle>
            <CardDescription className="text-[#334155]">
              Link WhatsApp with QR to trigger workflows from chat commands.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-xs text-[#334155]">WhatsApp Number</label>
            <Input
              value={settings.whatsappNumber || ''}
              onChange={(event) => updateSettings('whatsappNumber', event.target.value)}
              placeholder="+1..."
              className="border-[#CBD5E1] bg-white text-[#0F172A]"
            />
            <Button
              onClick={setupWhatsApp}
              disabled={isQrLoading}
              className="w-full bg-[#4F46E5] text-white hover:bg-[#4338CA]"
            >
              {isQrLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Generate WhatsApp QR Session
            </Button>

            <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-[#1D4ED8]">
                <Smartphone className="h-3.5 w-3.5" />
                Session status: {whatsStatus}
              </div>
              <pre className="overflow-auto rounded bg-white p-2 text-[11px] text-[#1F2937]">
                {qrCode || 'No QR generated yet.'}
              </pre>
            </div>

            <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-3 text-xs text-[#334155]">
              <div className="mb-1 flex items-center gap-2 font-medium text-[#4338CA]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Auth stack
              </div>
              Supabase profile/RLS is active in this build with optional SuperTokens client wiring for
              advanced auth flows.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
