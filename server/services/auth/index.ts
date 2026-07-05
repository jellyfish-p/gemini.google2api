import { randomUUID } from 'node:crypto'
import { getConfig, updateAuthKeys } from '../../config'

type ConfigApiKey = {
  id: number
  key: string
  name: string
  is_active: 1
  created_at: string | null
  updated_at: string | null
}

function cleanBearerKey(key: string): string {
  return key.startsWith('Bearer ') ? key.slice(7) : key
}

export function validateApiKey(key: string | undefined): { valid: boolean; keyId?: number } {
  const config = getConfig()
  if (!config.auth.enabled) {
    return { valid: true }
  }

  if (!key) {
    return { valid: false }
  }

  const cleanKey = cleanBearerKey(key)
  const keyIndex = config.auth.keys.findIndex(configKey => configKey === cleanKey)

  if (keyIndex >= 0) {
    return { valid: true, keyId: keyIndex + 1 }
  }

  return { valid: false }
}

export function createApiKey(name: string = ''): string {
  const key = `sk-${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`
  const config = getConfig()

  updateAuthKeys([...config.auth.keys, key])

  return key
}

export function listApiKeys(): ConfigApiKey[] {
  const config = getConfig()
  return config.auth.keys.map((key, index) => ({
    id: index + 1,
    key,
    name: 'config.toml',
    is_active: 1,
    created_at: null,
    updated_at: null,
  }))
}

export function revokeApiKey(keyId: number): void {
  const config = getConfig()
  const nextKeys = config.auth.keys.filter((_, index) => index + 1 !== keyId)
  updateAuthKeys(nextKeys)
}
