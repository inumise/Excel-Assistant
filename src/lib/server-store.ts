import 'server-only'

import crypto from 'node:crypto'
import {
  AuditLogEntry,
  BugTrackRecord,
  MemoryRecord,
  UserAISettings,
  WhatsAppSession,
  Workflow,
} from '@/types/workflow'
import {
  createOwnerStructureTemplate,
  defaultAISettings,
  DEMO_USER_ID,
} from '@/lib/workflow-template'
import { decryptAIKeys, encryptAIKeys } from '@/lib/secure-keys'
import { getServerSupabaseClient } from '@/lib/supabase'
import { isUuid, resolveUserId } from '@/lib/user-context'

interface InMemoryStore {
  workflows: Workflow[]
  settings: UserAISettings[]
  bugtracks: BugTrackRecord[]
  sessions: WhatsAppSession[]
  auditLogs: AuditLogEntry[]
  memoryRecords: MemoryRecord[]
}

function getInMemoryStore(): InMemoryStore {
  const globalStore = globalThis as unknown as { __hyperStore?: InMemoryStore }
  if (globalStore.__hyperStore) return globalStore.__hyperStore

  globalStore.__hyperStore = {
    workflows: [createOwnerStructureTemplate(DEMO_USER_ID)],
    settings: [defaultAISettings],
    bugtracks: [],
    sessions: [],
    auditLogs: [],
    memoryRecords: [],
  }

  return globalStore.__hyperStore
}

export function getEffectiveUserId(userId?: string | null) {
  return resolveUserId(userId) || DEMO_USER_ID
}

function cloneWorkflow(workflow: Workflow): Workflow {
  return JSON.parse(JSON.stringify(workflow)) as Workflow
}

function cloneSettings(settings: UserAISettings): UserAISettings {
  return JSON.parse(JSON.stringify(settings)) as UserAISettings
}

function cloneMemoryRecord(record: MemoryRecord): MemoryRecord {
  return JSON.parse(JSON.stringify(record)) as MemoryRecord
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
  const filtered = store.workflows
    .filter((workflow) => workflow.userId === effectiveUserId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  if (filtered.length > 0) return filtered.map(cloneWorkflow)

  const seeded = createOwnerStructureTemplate(effectiveUserId)
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
  const safeSessionId = isUuid(session.id) ? session.id : crypto.randomUUID()
  const normalized: WhatsAppSession = {
    ...session,
    id: safeSessionId,
    userId: getEffectiveUserId(session.userId),
    updatedAt: new Date().toISOString(),
  }

  const supabase = getServerSupabaseClient()
  if (supabase) {
    await supabase
      .from('whatsapp_sessions')
      .upsert(
        {
          id: normalized.id,
          user_id: normalized.userId,
          session_data: normalized.sessionData,
          linked_number: normalized.linkedNumber || null,
          created_at: normalized.createdAt,
          updated_at: normalized.updatedAt,
        },
        {
          onConflict: 'user_id',
        }
      )
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

export async function upsertMemoryRecord(params: {
  userId: string
  workflowId?: string
  namespace: string
  key: string
  value: unknown
}) {
  const normalizedUserId = getEffectiveUserId(params.userId)
  const normalizedWorkflowId = params.workflowId?.trim() || ''
  const namespace = params.namespace.trim().toLowerCase() || 'general'
  const key = params.key.trim()
  const now = new Date().toISOString()

  if (!key) {
    throw new Error('Memory key is required.')
  }

  const supabase = getServerSupabaseClient()
  if (supabase) {
    try {
      const { error } = await supabase
        .from('ai_memory')
        .upsert(
          {
            user_id: normalizedUserId,
            workflow_id: normalizedWorkflowId,
            namespace,
            key,
            value: params.value,
            updated_at: now,
          },
          {
            onConflict: 'user_id,workflow_id,namespace,key',
          }
        )
      if (error) throw error
    } catch {
      // If table is not provisioned yet, fallback to in-memory.
    }
  }

  const store = getInMemoryStore()
  const existingIndex = store.memoryRecords.findIndex(
    (entry) =>
      entry.userId === normalizedUserId &&
      (entry.workflowId || '') === normalizedWorkflowId &&
      entry.namespace === namespace &&
      entry.key === key
  )

  if (existingIndex >= 0) {
    store.memoryRecords[existingIndex] = {
      ...store.memoryRecords[existingIndex],
      value: params.value,
      updatedAt: now,
    }
    return cloneMemoryRecord(store.memoryRecords[existingIndex])
  }

  const created: MemoryRecord = {
    id: crypto.randomUUID(),
    userId: normalizedUserId,
    workflowId: normalizedWorkflowId || undefined,
    namespace,
    key,
    value: params.value,
    createdAt: now,
    updatedAt: now,
  }
  store.memoryRecords.unshift(created)
  return cloneMemoryRecord(created)
}

export async function listMemoryRecords(params: {
  userId: string
  workflowId?: string
  namespace?: string
  key?: string
}) {
  const normalizedUserId = getEffectiveUserId(params.userId)
  const normalizedWorkflowId = params.workflowId?.trim() || ''
  const namespace = params.namespace?.trim().toLowerCase()
  const key = params.key?.trim()

  const supabase = getServerSupabaseClient()
  if (supabase) {
    try {
      let query = supabase
        .from('ai_memory')
        .select('id, user_id, workflow_id, namespace, key, value, created_at, updated_at')
        .eq('user_id', normalizedUserId)
        .order('updated_at', { ascending: false })
        .limit(200)

      if (normalizedWorkflowId) query = query.eq('workflow_id', normalizedWorkflowId)
      if (namespace) query = query.eq('namespace', namespace)
      if (key) query = query.eq('key', key)

      const { data, error } = await query
      if (error) throw error
      if (data) {
        return data.map((row) => ({
          id: row.id,
          userId: row.user_id,
          workflowId: row.workflow_id || undefined,
          namespace: row.namespace,
          key: row.key,
          value: row.value,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }))
      }
    } catch {
      // Table missing or unavailable; fallback to in-memory records.
    }
  }

  const store = getInMemoryStore()
  return store.memoryRecords
    .filter((entry) => entry.userId === normalizedUserId)
    .filter((entry) => (normalizedWorkflowId ? (entry.workflowId || '') === normalizedWorkflowId : true))
    .filter((entry) => (namespace ? entry.namespace === namespace : true))
    .filter((entry) => (key ? entry.key === key : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(cloneMemoryRecord)
}

export async function deleteMemoryRecord(params: {
  userId: string
  workflowId?: string
  namespace: string
  key: string
}) {
  const normalizedUserId = getEffectiveUserId(params.userId)
  const normalizedWorkflowId = params.workflowId?.trim() || ''
  const namespace = params.namespace.trim().toLowerCase()
  const key = params.key.trim()

  if (!key) {
    throw new Error('Memory key is required.')
  }

  const supabase = getServerSupabaseClient()
  if (supabase) {
    try {
      let query = supabase
        .from('ai_memory')
        .delete()
        .eq('user_id', normalizedUserId)
        .eq('namespace', namespace)
        .eq('key', key)

      if (normalizedWorkflowId) query = query.eq('workflow_id', normalizedWorkflowId)
      const { error } = await query
      if (error) throw error
    } catch {
      // Ignore and apply in-memory deletion fallback below.
    }
  }

  const store = getInMemoryStore()
  const before = store.memoryRecords.length
  store.memoryRecords = store.memoryRecords.filter((entry) => {
    if (entry.userId !== normalizedUserId) return true
    if ((entry.workflowId || '') !== normalizedWorkflowId) return true
    if (entry.namespace !== namespace) return true
    if (entry.key !== key) return true
    return false
  })

  return { deleted: before - store.memoryRecords.length }
}
