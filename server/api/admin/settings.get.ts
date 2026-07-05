import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'
import { getAllSettings } from '~~/server/database/client'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (!validateAdminSession(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Not logged in' })
  }

  return { settings: getAllSettings() }
})
