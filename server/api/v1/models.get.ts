import { buildOpenAIModelList } from '~~/server/services/gemini/responses'

export default defineEventHandler(async () => {
  return buildOpenAIModelList()
})
