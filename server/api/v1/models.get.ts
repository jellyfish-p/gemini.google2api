import { MODELS, MODEL_ALIASES } from '~~/server/services/gemini/constants'

export default defineEventHandler(async () => {
  const now = Math.floor(Date.now() / 1000)

  const models = Object.values(MODELS).map(m => ({
    id: m.modelName,
    object: 'model',
    created: now,
    owned_by: 'google',
    permission: [],
  }))

  // Add aliases
  for (const [alias, target] of Object.entries(MODEL_ALIASES)) {
    models.push({
      id: alias,
      object: 'model',
      created: now,
      owned_by: 'google',
      permission: [],
    })
  }

  return {
    object: 'list',
    data: models,
  }
})
