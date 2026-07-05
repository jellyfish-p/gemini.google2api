import { acquireSession, releaseSession } from '~~/server/services/pool/manager'
import { generateContent } from '~~/server/services/gemini/client'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  const path = `/${slug}`

  // Extract model name and action from path like "gemini-2.0-flash:generateContent"
  const parts = path.split(':')
  const action = parts[1] || 'generateContent'
  const modelParam = parts[0].replace(/^\/+/, '')

  if (!modelParam) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Model name is required' })
  }

  if (action === 'generateContent') {
    const body = await readBody(event)
    if (!body) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Request body is required' })
    }

    const { contents, generationConfig, systemInstruction } = body

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'contents is required' })
    }

    // Convert Gemini format to prompt
    let prompt = ''
    if (systemInstruction) {
      const sysParts = systemInstruction.parts || []
      prompt += sysParts.map((p: any) => p.text || '').join('') + '\n\n'
    }

    for (const content of contents) {
      const role = content.role === 'model' ? 'Assistant' : 'User'
      const parts = content.parts || []
      const text = parts.map((p: any) => p.text || '').join('')
      prompt += `${role}: ${text}\n`
    }
    prompt += 'Assistant:'

    try {
      const session = await acquireSession()
      const result = await generateContent({
        prompt,
        session,
        model: modelParam,
      })
      releaseSession(session.accountId)

      const responseId = `chatcmpl-${Date.now()}`
      const now = Math.floor(Date.now() / 1000)

      const candidates = [{
        content: {
          role: 'model',
          parts: [{ text: result.text }],
        },
        finishReason: 'STOP',
        index: 0,
      }]

      if (result.images.length > 0) {
        candidates[0].content.parts.push(
          ...result.images.map(img => ({
            inlineData: { mimeType: 'image/png', data: img.url },
          }))
        )
      }

      if (result.thoughts) {
        candidates[0].content.parts.push({ text: `[Thought process]: ${result.thoughts}` })
      }

      return {
        candidates,
        usageMetadata: {
          promptTokenCount: Math.ceil(prompt.length / 4),
          candidatesTokenCount: Math.ceil(result.text.length / 4),
          totalTokenCount: Math.ceil((prompt.length + result.text.length) / 4),
        },
        modelVersion: modelParam,
      }
    } catch (err: any) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Bad Gateway',
        message: err.message || 'Gemini API error',
      })
    }
  }

  // streamGenerateContent not implemented separately; falls back to generateContent

  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
