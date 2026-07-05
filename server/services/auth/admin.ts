import { createHmac, randomUUID } from 'node:crypto'
import { getCookie, setCookie, deleteCookie } from 'h3'
import { getConfig } from '../../config'

const SESSION_COOKIE = 'admin_session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

const sessions = new Map<string, { expires: number }>()

function hashPassword(password: string): string {
  return createHmac('sha256', 'gemini2api-admin').update(password).digest('hex')
}

export function validateAdminLogin(password: string): boolean {
  const config = getConfig()
  return password === config.admin.password
}

export function createAdminSession(): string {
  const token = randomUUID()
  sessions.set(token, { expires: Date.now() + SESSION_DURATION })
  cleanupSessions()
  return token
}

export function validateAdminSession(token: string): boolean {
  const session = sessions.get(token)
  if (!session) return false
  if (Date.now() > session.expires) {
    sessions.delete(token)
    return false
  }
  return true
}

export function destroyAdminSession(token: string): void {
  sessions.delete(token)
}

function cleanupSessions(): void {
  const now = Date.now()
  for (const [token, session] of sessions) {
    if (now > session.expires) sessions.delete(token)
  }
}

export function setAdminCookie(event: any, token: string): void {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION / 1000,
  })
}

export function getAdminToken(event: any): string {
  return getCookie(event, SESSION_COOKIE) || ''
}

export function clearAdminCookie(event: any): void {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}
