import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'
import { getDb } from '~~/server/database/client'
import { removeAccountFromPool } from '~~/server/services/pool/manager'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (!validateAdminSession(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Not logged in' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const db = getDb()
  db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
  removeAccountFromPool(Number(id))

  return { success: true }
})
