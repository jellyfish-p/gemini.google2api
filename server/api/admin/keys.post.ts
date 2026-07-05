import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'
import { createApiKey } from '~~/server/services/auth'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (!validateAdminSession(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Not logged in' })
  }

  const body = await readBody(event)
  const { name } = body || {}

  const key = createApiKey(name || '')
  return { key }
})
