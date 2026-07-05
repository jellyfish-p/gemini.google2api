import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'
import { getDb } from '~~/server/database/client'
import { removeAccountFromPool, addAccountToPool } from '~~/server/services/pool/manager'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (!validateAdminSession(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Not logged in' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const body = await readBody(event)
  const db = getDb()

  const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const name = body.name ?? existing.name
  const secure_1psid = body.secure_1psid ?? existing.secure_1psid
  const secure_1psidts = body.secure_1psidts ?? existing.secure_1psidts
  const proxy = body.proxy !== undefined ? body.proxy : existing.proxy
  const is_active = body.is_active !== undefined ? body.is_active : existing.is_active

  db.prepare(`
    UPDATE accounts SET name = ?, secure_1psid = ?, secure_1psidts = ?, proxy = ?, is_active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, secure_1psid, secure_1psidts, proxy, is_active, id)

  // Refresh pool
  removeAccountFromPool(Number(id))
  if (is_active) {
    addAccountToPool(Number(id)).catch(err => console.warn('[admin] Failed to re-add account to pool:', err.message))
  }

  return { success: true }
})
