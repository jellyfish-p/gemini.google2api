import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'
import { getDb } from '~~/server/database/client'
import { getConfig } from '~~/server/config'

function maskKey(key: string): string {
  if (key.length <= 16) return key
  return `${key.slice(0, 8)}...${key.slice(-8)}`
}

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (!validateAdminSession(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Not logged in' })
  }

  const db = getDb()
  const configKeys = getConfig().auth.keys
  const stats = {
    totalKeys: configKeys.length,
    activeKeys: configKeys.length,
    totalAccounts: (db.prepare('SELECT COUNT(*) as c FROM accounts').get() as any).c,
    activeAccounts: (db.prepare('SELECT COUNT(*) as c FROM accounts WHERE is_active = 1').get() as any).c,
    totalRequests: (db.prepare('SELECT COALESCE(SUM(total_requests), 0) as c FROM accounts').get() as any).c,
    totalTokens: (db.prepare('SELECT COALESCE(SUM(total_tokens), 0) as c FROM accounts').get() as any).c,
    recentLogs: db.prepare('SELECT COUNT(*) as c FROM usage_logs WHERE created_at > datetime(\'now\', \'-24 hours\')').get() as any,
  }

  const logs = (db.prepare(`
    SELECT ul.*, a.name as account_name
    FROM usage_logs ul
    LEFT JOIN accounts a ON ul.account_id = a.id
    ORDER BY ul.created_at DESC
    LIMIT 50
  `).all() as any[]).map(log => ({
    ...log,
    key_name: log.api_key_id ? maskKey(configKeys[log.api_key_id - 1] || '') || `config-key-${log.api_key_id}` : null,
  }))

  return { stats, logs }
})
