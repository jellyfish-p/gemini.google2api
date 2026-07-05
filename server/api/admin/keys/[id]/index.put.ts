import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (!validateAdminSession(token)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Not logged in' })
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method Not Allowed',
    message: 'Config-backed API keys cannot be disabled. Delete the key from config.toml instead.',
  })
})
