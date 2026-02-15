import Anthropic from '@anthropic-ai/sdk'
import { UserAISettings } from '@/types/workflow'

const tonePresetMap = {
  'luxury-brand':
    'Use premium vocabulary, concise sophistication, and elegant visual direction.',
  'technical-executive':
    'Be concise, measurable, and architecture-aware with executive-level clarity.',
  'minimal-precise': 'Respond with compact and exact language with no fluff.',
  'bold-sales': 'Use persuasive direct-response copy with clear CTA momentum.',
}

function getResolvedPrompt(settings: UserAISettings, extraPrompt?: string) {
  const tone = tonePresetMap[settings.tonePreset]
  return [settings.globalPrompt, tone, extraPrompt].filter(Boolean).join('\n\n')
}

export async function generateAIText(params: {
  settings: UserAISettings
  prompt: string
  temperature?: number
  maxTokens?: number
}) {
  const { settings, prompt } = params
  const temperature = Math.min(1, Math.max(0.2, params.temperature ?? settings.creativityTemp))
  const maxTokens = params.maxTokens ?? 1500

  if (settings.aiKeys.claude) {
    try {
      const anthropic = new Anthropic({ apiKey: settings.aiKeys.claude })
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        temperature,
        system: getResolvedPrompt(settings),
        messages: [{ role: 'user', content: prompt }],
      })

      return response.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n')
    } catch (error) {
      return `Claude request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  if (settings.aiKeys.openai || settings.aiKeys.gemini) {
    return `Provider key saved, but live inference is currently configured for Claude in this build. Prompt received: ${prompt}`
  }

  return `Demo mode response: ${prompt.slice(0, 180)}`
}

export async function generateProgrammerCode(params: {
  settings: UserAISettings
  prompt: string
  existingCode?: string
  language: 'javascript' | 'typescript' | 'python'
  mode: 'generate' | 'self-change' | 'delegate'
}) {
  const instruction =
    params.mode === 'self-change'
      ? 'Modify the existing code safely and return only code.'
      : params.mode === 'delegate'
      ? 'Spawn and coordinate sub-agents conceptually, then return unified code.'
      : 'Generate production-ready code and return only code.'

  const fullPrompt = `${instruction}

Language: ${params.language}
Task: ${params.prompt}

Existing code:
${params.existingCode || '(none)'}`.trim()

  const text = await generateAIText({
    settings: params.settings,
    prompt: fullPrompt,
    temperature: params.settings.creativityTemp,
    maxTokens: 1800,
  })

  if (!text || text.startsWith('Demo mode response:')) {
    if (params.language === 'python') {
      return `def build_luxury_layout(brand_name: str) -> dict:
    return {
        "brand": brand_name,
        "theme": ["#1A1A1A", "#FFD700", "#C9A483"],
        "cta": "Book a private consultation",
    }
`
    }

    return `export function buildLuxuryLayout(brandName: string) {
  return {
    brand: brandName,
    theme: ["#1A1A1A", "#FFD700", "#C9A483"],
    cta: "Book a private consultation",
  };
}
`
  }

  return text
}
