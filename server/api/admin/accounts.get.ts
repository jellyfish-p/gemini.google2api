import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'
import { getDb } from '~~/server/database/client'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (!validateAdminSession(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Not logged in' })
  }

  const db = getDb()
  const accounts = db.prepare('SELECT * FROM accounts ORDER BY last_used_at DESC').all()
  return { accounts }
})
