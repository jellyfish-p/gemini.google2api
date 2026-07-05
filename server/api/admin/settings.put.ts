import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'
import { setSetting } from '~~/server/database/client'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (!validateAdminSession(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Not logged in' })
  }

  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }

  const allowed = ['global_proxy', 'pool_strategy']
  for (const [key, value] of Object.entries(body)) {
    if (allowed.includes(key) && typeof value === 'string') {
      setSetting(key, value)
    }
  }

  return { success: true }
})
