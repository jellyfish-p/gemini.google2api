import { acquireSession, releaseSession } from '~~/server/services/pool/manager'
import { generateContent } from '~~/server/services/gemini/client'
import {
  formatOpenAIVideoGenerationResponse,
  generateVideo,
  normalizeVideoGenerationRequest,
} from '~~/server/services/gemini/videos'
import { getDb } from '~~/server/database/client'

export async function handleOpenAIVideoGeneration(event: any) {
  const body = await readBody(event)
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Request body is required' })
  }

  const request = normalizeVideoGenerationRequest(body)
  if (!request.prompt) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'prompt is required' })
  }

  let session: Awaited<ReturnType<typeof acquireSession>> | undefined
  try {
    session = await acquireSession()
    const result = await generateVideo({ request, session, generateContent })

    const db = getDb()
    const promptTokens = Math.ceil(request.prompt.length / 4)
    const completionTokens = Math.ceil((result.text || '').length / 4)
    db.prepare(
      'UPDATE accounts SET total_requests = total_requests + 1, total_tokens = total_tokens + ?, last_used_at = datetime(\'now\') WHERE id = ?',
    ).run(completionTokens, session.accountId)
    db.prepare(
      'INSERT INTO usage_logs (account_id, api_key_id, model, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?)',
    ).run(session.accountId, event.context.apiKeyId || null, request.model, promptTokens, completionTokens)

    return formatOpenAIVideoGenerationResponse({ request, result })
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: err.message || 'Gemini video generation error',
    })
  } finally {
    if (session) releaseSession(session.accountId)
  }
}
