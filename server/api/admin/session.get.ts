import { getAdminToken, validateAdminSession } from '~~/server/services/auth/admin'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  return { authenticated: validateAdminSession(token) }
})
