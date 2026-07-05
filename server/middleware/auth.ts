import { validateApiKey } from '../services/auth'
import { getConfig } from '../config'

const PUBLIC_PATHS = ['/api/health', '/api/v1/keys']

export default defineEventHandler(async (event) => {
  const config = getConfig()
  if (!config.auth.enabled) return

  const path = event.path || event.node?.req?.url || ''
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) return

  const authHeader = getHeader(event, 'authorization') || getHeader(event, 'x-api-key') || ''
  const result = validateApiKey(authHeader)

  if (!result.valid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid or missing API key',
    })
  }

  event.context.apiKeyId = result.keyId
})
