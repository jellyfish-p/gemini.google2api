import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'
import { getDb } from '~~/server/database/client'
import { addAccountToPool } from '~~/server/services/pool/manager'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (!validateAdminSession(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Not logged in' })
  }

  const body = await readBody(event)
  if (!body?.name || !body?.secure_1psid) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'name and secure_1psid required' })
  }

  const db = getDb()
  db.prepare(`
    INSERT INTO accounts (name, secure_1psid, secure_1psidts, proxy)
    VALUES (?, ?, ?, ?)
  `).run(body.name, body.secure_1psid, body.secure_1psidts || '', body.proxy || '')

  const account = db.prepare('SELECT * FROM accounts WHERE name = ?').get(body.name) as any

  // Add to pool asynchronously
  if (account) {
    addAccountToPool(account.id).catch(err => console.warn('[admin] Failed to add account to pool:', err.message))
  }

  return { success: true, id: account?.id }
})
