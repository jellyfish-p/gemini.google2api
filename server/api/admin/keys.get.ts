import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'
import { listApiKeys } from '~~/server/services/auth'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (!validateAdminSession(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Not logged in' })
  }

  return { keys: listApiKeys() }
})
