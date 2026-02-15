import { UserAISettings, Workflow } from '@/types/workflow'
import { DEMO_USER_ID as DEFAULT_DEMO_USER_ID } from '@/lib/user-context'

export const DEMO_USER_ID = DEFAULT_DEMO_USER_ID

export const defaultAISettings: UserAISettings = {
  userId: DEMO_USER_ID,
  aiKeys: {},
  whatsappNumber: '',
  globalPrompt: 'You are a luxurious web designer focused on premium experiences.',
  creativityTemp: 0.6,
  tonePreset: 'luxury-brand',
}

export function createWebDesignFactoryTemplate(userId: string = DEMO_USER_ID): Workflow {
  const now = new Date().toISOString()

  return {
    id: 'workflow-web-design-factory',
    userId,
    name: 'Web Design Factory',
    description:
      'Manager orchestrates programmer agents, code is generated, bugtracked, and confirmed over WhatsApp.',
    createdAt: now,
    updatedAt: now,
    nodes: [
      {
        id: 'manager-1',
        type: 'manager',
        position: { x: 40, y: 50 },
        style: {
          width: 780,
          height: 360,
          border: '1px solid rgba(255, 215, 0, 0.4)',
          borderRadius: 20,
          background: 'rgba(26, 26, 26, 0.7)',
        },
        data: {
          label: 'Manager AI: Luxury Factory Orchestrator',
          role: 'manager',
          workerType: 'Manager AI',
          prompt:
            'Break work into sub-tasks, delegate to programmer nodes, and escalate on repeated test failures.',
          testsPassed: true,
          bugStatus: 'idle',
          errorHandler: { retryCount: 2, notifyWhatsapp: true },
          errorCheckEnabled: true,
          monitoring: 'none',
        },
      },
      {
        id: 'programmer-1',
        type: 'programmer',
        parentNode: 'manager-1',
        extent: 'parent',
        position: { x: 40, y: 80 },
        data: {
          label: 'Programmer AI: Site Generator',
          role: 'programmer',
          workerType: 'Programmer AI',
          prompt: 'Generate hero sections, nav, and polished interaction logic.',
          testsPassed: true,
          bugStatus: 'idle',
          errorHandler: { retryCount: 2, notifyWhatsapp: true },
          errorCheckEnabled: true,
          monitoring: 'none',
        },
      },
      {
        id: 'code-1',
        type: 'code',
        parentNode: 'manager-1',
        extent: 'parent',
        position: { x: 390, y: 80 },
        data: {
          label: 'Code Block: Luxury Landing Page',
          role: 'code',
          workerType: 'Code Node',
          prompt: 'Build a premium landing page with dark/gold palette.',
          codeSnippet: {
            language: 'typescript',
            content: `export function buildLuxuryHero(brandName: string) {
  return {
    headline: brandName + " — Bespoke Digital Presence",
    cta: "Book Private Consultation",
    palette: ["#1A1A1A", "#FFD700", "#C9A483"],
  };
}
`,
          },
          testsPassed: true,
          bugStatus: 'idle',
          errorHandler: { retryCount: 2, notifyWhatsapp: true },
          errorCheckEnabled: true,
          monitoring: 'none',
        },
      },
    ],
    edges: [
      {
        id: 'edge-manager-programmer',
        source: 'manager-1',
        target: 'programmer-1',
        dataType: 'ai',
        label: 'Delegation',
      },
      {
        id: 'edge-programmer-code',
        source: 'programmer-1',
        target: 'code-1',
        dataType: 'code',
        label: 'Generated module',
      },
    ],
  }
}
