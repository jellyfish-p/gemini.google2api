import { acquireSession, releaseSession } from '~~/server/services/pool/manager'
import { generateContent, readChat, sendBatchExecute } from '~~/server/services/gemini/client'
import { isDeepResearchModel, runDeepResearch } from '~~/server/services/gemini/deep-research'
import { formatGeminiGenerateContentResponse } from '~~/server/services/gemini/responses'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  const path = `/${slug}`

  // Extract model name and action from path like "gemini-2.0-flash:generateContent"
  const parts = path.split(':')
  const action = parts[1] || 'generateContent'
  const modelParam = (parts[0] ?? '').replace(/^\/+/, '')

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

    let session: Awaited<ReturnType<typeof acquireSession>> | undefined
    try {
      session = await acquireSession()
      const result = isDeepResearchModel(modelParam)
        ? await runDeepResearch({
            prompt,
            session,
            model: modelParam,
            generateContent,
            sendBatchExecute,
            readChat,
          })
        : await generateContent({
            prompt,
            session,
            model: modelParam,
          })
      return formatGeminiGenerateContentResponse({ result, model: modelParam, prompt })
    } catch (err: any) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Bad Gateway',
        message: err.message || 'Gemini API error',
      })
    } finally {
      if (session) releaseSession(session.accountId)
    }
  }

  // streamGenerateContent not implemented separately; falls back to generateContent

  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
