import { acquireSession, releaseSession } from '~~/server/services/pool/manager'
import { generateContent } from '~~/server/services/gemini/client'
import { getDb } from '~~/server/database/client'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Request body is required' })
  }

  const { model: modelName, messages, stream, max_tokens, temperature, top_p } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'messages is required' })
  }

  // Build prompt from messages
  const prompt = messages.map((m: any) => {
    const role = m.role === 'assistant' ? 'Assistant' : 'User'
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    return `${role}: ${content}`
  }).join('\n')

  try {
    const session = await acquireSession()

    const systemMsg = messages.find((m: any) => m.role === 'system')
    const finalPrompt = systemMsg
      ? `System: ${systemMsg.content}\n\n${prompt}`
      : prompt

    const result = await generateContent({
      prompt: finalPrompt,
      session,
      model: modelName,
    })

    releaseSession(session.accountId)

    // Log usage
    const db = getDb()
    const promptTokens = Math.ceil(finalPrompt.length / 4)
    const completionTokens = Math.ceil(result.text.length / 4)
    db.prepare(
      'UPDATE accounts SET total_requests = total_requests + 1, total_tokens = total_tokens + ?, last_used_at = datetime(\'now\') WHERE id = ?'
    ).run(completionTokens, session.accountId)
    db.prepare(
      'INSERT INTO usage_logs (account_id, api_key_id, model, prompt_tokens, completion_tokens) VALUES (?, ?, ?, ?, ?)'
    ).run(session.accountId, event.context.apiKeyId || null, modelName || 'unknown', promptTokens, completionTokens)

    const responseId = `chatcmpl-${Date.now()}`
    const now = Math.floor(Date.now() / 1000)

    if (stream) {
      setHeader(event, 'Content-Type', 'text/event-stream')
      setHeader(event, 'Cache-Control', 'no-cache')
      setHeader(event, 'Connection', 'keep-alive')

      const res = event.node.res
      const lines = result.text.split(/(?<=[.!?])\s+/)

      for (const line of lines) {
        const chunk = {
          id: responseId,
          object: 'chat.completion.chunk',
          created: now,
          model: modelName || 'gemini-2.0-flash',
          choices: [{ index: 0, delta: { content: line + ' ' }, finish_reason: null }],
        }
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const done = { id: responseId, object: 'chat.completion.chunk', created: now, model: modelName || 'gemini-2.0-flash', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }
      res.write(`data: ${JSON.stringify(done)}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    return {
      id: responseId,
      object: 'chat.completion',
      created: now,
      model: modelName || 'gemini-2.0-flash',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: result.text },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: Math.ceil(finalPrompt.length / 4),
        completion_tokens: Math.ceil(result.text.length / 4),
        total_tokens: Math.ceil((finalPrompt.length + result.text.length) / 4),
      },
    }
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: err.message || 'Gemini API error',
    })
  }
})
