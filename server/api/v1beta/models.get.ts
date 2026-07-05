import { MODELS } from '~~/server/services/gemini/constants'

export default defineEventHandler(async () => {
  const now = Math.floor(Date.now() / 1000)

  return {
    models: Object.entries(MODELS).map(([id, info]) => ({
      name: `models/${id}`,
      version: '1.0',
      displayName: info.displayName,
      description: `${info.displayName} model`,
      inputTokenLimit: 1048576,
      outputTokenLimit: 8192,
      supportedGenerationMethods: ['generateContent'],
      temperature: { min: 0, max: 2.0, default: 0.7 },
      topP: { min: 0, max: 1.0, default: 0.95 },
      topK: { min: 1, max: 40, default: 40 },
    })),
  }
})
