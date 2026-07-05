import { buildGeminiModelList } from '~~/server/services/gemini/responses'

export default defineEventHandler(async () => {
  return buildGeminiModelList()
})
