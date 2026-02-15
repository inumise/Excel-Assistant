import crypto from 'node:crypto'
import { AIProviderKeys } from '@/types/workflow'

const ALGORITHM = 'aes-256-gcm'

function getSecretKey() {
  const secret = process.env.AI_KEYS_ENCRYPTION_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AI_KEYS_ENCRYPTION_SECRET is required in production.')
    }
    return crypto
      .createHash('sha256')
      .update('demo-insecure-secret-change-me')
      .digest()
  }
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptAIKeys(keys: AIProviderKeys) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv)
  const payload = JSON.stringify(keys)
  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptAIKeys(value?: string | null): AIProviderKeys {
  if (!value) return {}

  try {
    const [ivB64, tagB64, encryptedB64] = value.split(':')
    if (!ivB64 || !tagB64 || !encryptedB64) return {}

    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(tagB64, 'base64')
    const encrypted = Buffer.from(encryptedB64, 'base64')
    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    return JSON.parse(decrypted) as AIProviderKeys
  } catch {
    return {}
  }
}
