import 'server-only'

import crypto from 'node:crypto'
import {
  AuditLogEntry,
  BugTrackRecord,
  UserAISettings,
  WhatsAppSession,
  Workflow,
} from '@/types/workflow'
import { defaultAISettings, DEMO_USER_ID, createWebDesignFactoryTemplate } from '@/lib/workflow-template'
import { decryptAIKeys, encryptAIKeys } from '@/lib/secure-keys'
import { getServerSupabaseClient } from '@/lib/supabase'

interface InMemoryStore {
  workflows: Workflow[]
  settings: UserAISettings[]
  bugtracks: BugTrackRecord[]
  sessions: WhatsAppSession[]
  auditLogs: AuditLogEntry[]
}

function getInMemoryStore(): InMemoryStore {
  const globalStore = globalThis as unknown as { __hyperStore?: InMemoryStore }
  if (globalStore.__hyperStore) return globalStore.__hyperStore

  globalStore.__hyperStore = {
    workflows: [createWebDesignFactoryTemplate(DEMO_USER_ID)],
    settings: [defaultAISettings],
    bugtracks: [],
    sessions: [],
    auditLogs: [],
  }

  return globalStore.__hyperStore
}

export function getEffectiveUserId(userId?: string | null) {
  return userId || DEMO_USER_ID
}

function cloneWorkflow(workflow: Workflow): Workflow {
  return JSON.parse(JSON.stringify(workflow)) as Workflow
}

function cloneSettings(settings: UserAISettings): UserAISettings {
  return JSON.parse(JSON.stringify(settings)) as UserAISettings
}

export async function getUserSettings(userId: string): Promise<UserAISettings> {
  const effectiveUserId = getEffectiveUserId(userId)
  const supabase = getServerSupabaseClient()

  if (supabase) {
    const { data } = await supabase
      .from('users')
      .select('id, whatsapp_number, ai_keys, global_prompt, creativity_temp, tone_preset')
      .eq('id', effectiveUserId)
      .maybeSingle()

    if (data) {
      return {
        userId: data.id,
        whatsappNumber: data.whatsapp_number || '',
        aiKeys: decryptAIKeys(data.ai_keys),
        globalPrompt: data.global_prompt || defaultAISettings.globalPrompt,
        creativityTemp: Number(data.creativity_temp ?? defaultAISettings.creativityTemp),
        tonePreset: data.tone_preset || defaultAISettings.tonePreset,
      }
    }
  }

  const store = getInMemoryStore()
  const existing = store.settings.find((item) => item.userId === effectiveUserId)
  if (existing) return cloneSettings(existing)

  const created = { ...defaultAISettings, userId: effectiveUserId }
  store.settings.push(created)
  return cloneSettings(created)
}

export async function saveUserSettings(settings: UserAISettings): Promise<UserAISettings> {
  const effectiveSettings: UserAISettings = {
    ...defaultAISettings,
    ...settings,
    userId: getEffectiveUserId(settings.userId),
    creativityTemp: Math.min(1, Math.max(0.2, settings.creativityTemp)),
  }

  const supabase = getServerSupabaseClient()
  if (supabase) {
    await supabase.from('users').upsert({
      id: effectiveSettings.userId,
      whatsapp_number: effectiveSettings.whatsappNumber || null,
      ai_keys: encryptAIKeys(effectiveSettings.aiKeys),
      global_prompt: effectiveSettings.globalPrompt,
      creativity_temp: effectiveSettings.creativityTemp,
      tone_preset: effectiveSettings.tonePreset,
    })
  } else {
    const store = getInMemoryStore()
    const idx = store.settings.findIndex((item) => item.userId === effectiveSettings.userId)
    if (idx >= 0) store.settings[idx] = effectiveSettings
    else store.settings.push(effectiveSettings)
  }

  return cloneSettings(effectiveSettings)
}

export async function listWorkflows(userId: string): Promise<Workflow[]> {
  const effectiveUserId = getEffectiveUserId(userId)
  const supabase = getServerSupabaseClient()

  if (supabase) {
    const { data } = await supabase
      .from('workflows')
      .select('id, user_id, name, description, nodes, edges, created_at, updated_at')
      .eq('user_id', effectiveUserId)
      .order('updated_at', { ascending: false })

    if (data && data.length > 0) {
      return data.map((item) => ({
        id: item.id,
        userId: item.user_id,
        name: item.name,
        description: item.description || '',
        nodes: item.nodes,
        edges: item.edges,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }))
    }
  }

  const store = getInMemoryStore()
  const filtered = store.workflows.filter((workflow) => workflow.userId === effectiveUserId)
  if (filtered.length > 0) return filtered.map(cloneWorkflow)

  const seeded = createWebDesignFactoryTemplate(effectiveUserId)
  store.workflows.push(seeded)
  return [cloneWorkflow(seeded)]
}

export async function getWorkflowById(userId: string, workflowId: string): Promise<Workflow | null> {
  const workflows = await listWorkflows(userId)
  const match = workflows.find((workflow) => workflow.id === workflowId)
  return match ? cloneWorkflow(match) : null
}

export async function saveWorkflow(workflow: Workflow): Promise<Workflow> {
  const effectiveWorkflow: Workflow = {
    ...workflow,
    userId: getEffectiveUserId(workflow.userId),
    updatedAt: new Date().toISOString(),
  }

  const supabase = getServerSupabaseClient()
  if (supabase) {
    await supabase.from('workflows').upsert({
      id: effectiveWorkflow.id,
      user_id: effectiveWorkflow.userId,
      name: effectiveWorkflow.name,
      description: effectiveWorkflow.description || null,
      nodes: effectiveWorkflow.nodes,
      edges: effectiveWorkflow.edges,
      created_at: effectiveWorkflow.createdAt,
      updated_at: effectiveWorkflow.updatedAt,
    })
  } else {
    const store = getInMemoryStore()
    const idx = store.workflows.findIndex((item) => item.id === effectiveWorkflow.id)
    if (idx >= 0) store.workflows[idx] = effectiveWorkflow
    else store.workflows.push(effectiveWorkflow)
  }

  return cloneWorkflow(effectiveWorkflow)
}

export async function addAuditLog(
  userId: string,
  workflowId: string,
  action: string,
  payload: Record<string, unknown>
) {
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    userId: getEffectiveUserId(userId),
    workflowId,
    action,
    payload,
    createdAt: new Date().toISOString(),
  }

  const supabase = getServerSupabaseClient()
  if (supabase) {
    await supabase.from('audit_log').insert({
      id: entry.id,
      user_id: entry.userId,
      workflow_id: entry.workflowId,
      action: entry.action,
      payload: entry.payload,
      created_at: entry.createdAt,
    })
  } else {
    const store = getInMemoryStore()
    store.auditLogs.unshift(entry)
  }
}

export async function listAuditLogs(userId: string, workflowId?: string) {
  const effectiveUserId = getEffectiveUserId(userId)
  const supabase = getServerSupabaseClient()

  if (supabase) {
    let query = supabase
      .from('audit_log')
      .select('id, user_id, workflow_id, action, payload, created_at')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: false })

    if (workflowId) query = query.eq('workflow_id', workflowId)
    const { data } = await query.limit(100)
    return (data || []).map((item) => ({
      id: item.id,
      userId: item.user_id,
      workflowId: item.workflow_id,
      action: item.action,
      payload: item.payload || {},
      createdAt: item.created_at,
    }))
  }

  const store = getInMemoryStore()
  return store.auditLogs
    .filter((entry) => entry.userId === effectiveUserId && (!workflowId || entry.workflowId === workflowId))
    .slice(0, 100)
}

export async function createBugTrackRecord(params: {
  workflowId: string
  nodeId: string
  errors: Record<string, unknown>
  fixed?: boolean
}) {
  const now = new Date().toISOString()
  const record: BugTrackRecord = {
    id: crypto.randomUUID(),
    workflowId: params.workflowId,
    nodeId: params.nodeId,
    errors: params.errors,
    fixed: Boolean(params.fixed),
    createdAt: now,
    updatedAt: now,
  }

  const supabase = getServerSupabaseClient()
  if (supabase) {
    await supabase.from('bugtracks').insert({
      id: record.id,
      node_id: record.nodeId,
      workflow_id: record.workflowId,
      errors: record.errors,
      fixed: record.fixed,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    })
  } else {
    const store = getInMemoryStore()
    store.bugtracks.unshift(record)
  }

  return record
}

export async function updateBugTrackRecord(recordId: string, fixed: boolean, errors?: Record<string, unknown>) {
  const now = new Date().toISOString()
  const supabase = getServerSupabaseClient()
  if (supabase) {
    await supabase
      .from('bugtracks')
      .update({ fixed, errors: errors || null, updated_at: now })
      .eq('id', recordId)
  } else {
    const store = getInMemoryStore()
    const index = store.bugtracks.findIndex((record) => record.id === recordId)
    if (index >= 0) {
      store.bugtracks[index] = {
        ...store.bugtracks[index],
        fixed,
        errors: errors || store.bugtracks[index].errors,
        updatedAt: now,
      }
    }
  }
}

export async function listBugTrackRecords(workflowId: string) {
  const supabase = getServerSupabaseClient()
  if (supabase) {
    const { data } = await supabase
      .from('bugtracks')
      .select('id, workflow_id, node_id, errors, fixed, created_at, updated_at')
      .eq('workflow_id', workflowId)
      .order('updated_at', { ascending: false })

    return (data || []).map((item) => ({
      id: item.id,
      workflowId: item.workflow_id,
      nodeId: item.node_id,
      errors: item.errors || {},
      fixed: Boolean(item.fixed),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }))
  }

  const store = getInMemoryStore()
  return store.bugtracks.filter((item) => item.workflowId === workflowId)
}

export async function saveWhatsAppSession(session: WhatsAppSession) {
  const normalized: WhatsAppSession = {
    ...session,
    userId: getEffectiveUserId(session.userId),
    updatedAt: new Date().toISOString(),
  }

  const supabase = getServerSupabaseClient()
  if (supabase) {
    await supabase.from('whatsapp_sessions').upsert({
      id: normalized.id,
      user_id: normalized.userId,
      session_data: normalized.sessionData,
      linked_number: normalized.linkedNumber || null,
      created_at: normalized.createdAt,
      updated_at: normalized.updatedAt,
    })
  } else {
    const store = getInMemoryStore()
    const idx = store.sessions.findIndex((item) => item.userId === normalized.userId)
    if (idx >= 0) store.sessions[idx] = normalized
    else store.sessions.push(normalized)
  }

  return normalized
}

export async function getWhatsAppSession(userId: string) {
  const effectiveUserId = getEffectiveUserId(userId)
  const supabase = getServerSupabaseClient()

  if (supabase) {
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('id, user_id, session_data, linked_number, created_at, updated_at')
      .eq('user_id', effectiveUserId)
      .maybeSingle()

    if (!data) return null

    return {
      id: data.id,
      userId: data.user_id,
      sessionData: data.session_data || {},
      linkedNumber: data.linked_number || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } satisfies WhatsAppSession
  }

  const store = getInMemoryStore()
  return store.sessions.find((item) => item.userId === effectiveUserId) || null
}
