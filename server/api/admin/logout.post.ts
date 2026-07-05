import { getAdminToken, validateAdminSession, clearAdminCookie } from '~~/server/services/auth/admin'

export default defineEventHandler(async (event) => {
  const token = getAdminToken(event)
  if (token) {
    clearAdminCookie(event)
  }
  return { success: true }
})
