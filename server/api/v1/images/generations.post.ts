import { acquireSession, releaseSession } from '~~/server/services/pool/manager'
import { generateContent } from '~~/server/services/gemini/client'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Request body is required' })
  }

  const { prompt, model: modelName, n = 1, size } = body

  if (!prompt) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'prompt is required' })
  }

  try {
    const session = await acquireSession()
    const result = await generateContent({
      prompt: `Generate image: ${prompt}`,
      session,
      model: modelName,
    })
    releaseSession(session.accountId)

    const images = result.images.length > 0
      ? result.images
      : [{ url: '', title: 'generated', alt: prompt, isGenerated: true }]

    return {
      created: Math.floor(Date.now() / 1000),
      data: images.slice(0, n).map((img, i) => ({
        url: img.url,
        revised_prompt: img.alt || prompt,
      })),
    }
  } catch (err: any) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: err.message || 'Gemini API error',
    })
  }
})
