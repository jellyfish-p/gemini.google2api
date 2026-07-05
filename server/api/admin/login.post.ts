import { validateAdminLogin, createAdminSession, setAdminCookie } from '~~/server/services/auth/admin'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { password } = body || {}

  if (!password || !validateAdminLogin(password)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Invalid password' })
  }

  const token = createAdminSession()
  setAdminCookie(event, token)

  return { success: true }
})
