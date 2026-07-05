import { MODELS, MODEL_ALIASES } from './constants'
import { getDeepResearchModelId } from './deep-research'

function tokenEstimate(text: string): number {
  return Math.ceil(text.length / 4)
}

function normalizeMedia(result: any) {
  return {
    videos: (result.videos || []).map((video: any) => ({
      url: video.url,
      thumbnail: video.thumbnail,
      conversation_id: video.conversationId,
      reply_id: video.replyId,
      candidate_id: video.candidateId,
    })),
    media: (result.media || []).map((media: any) => ({
      mp3_url: media.mp3Url,
      mp3_thumbnail: media.mp3Thumbnail,
      mp4_url: media.mp4Url,
      mp4_thumbnail: media.mp4Thumbnail,
      conversation_id: media.conversationId,
      reply_id: media.replyId,
      candidate_id: media.candidateId,
    })),
  }
}

export function buildOpenAIModelList(now = Math.floor(Date.now() / 1000)) {
  const models = Object.values(MODELS).map(m => ({
    id: m.modelName,
    object: 'model',
    created: now,
    owned_by: 'google',
    permission: [],
  }))

  for (const [alias] of Object.entries(MODEL_ALIASES)) {
    models.push({
      id: alias,
      object: 'model',
      created: now,
      owned_by: 'google',
      permission: [],
    })
  }

  models.push({
    id: getDeepResearchModelId(),
    object: 'model',
    created: now,
    owned_by: 'google',
    permission: [],
  })

  return {
    object: 'list',
    data: models,
  }
}

export function buildGeminiModelList() {
  const baseModels = Object.entries(MODELS).map(([id, info]) => ({
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
  }))

  baseModels.push({
    name: `models/${getDeepResearchModelId()}`,
    version: '1.0',
    displayName: 'Gemini DeepSearch',
    description: 'Gemini Deep Research workflow model',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: ['generateContent'],
    temperature: { min: 0, max: 2.0, default: 0.7 },
    topP: { min: 0, max: 1.0, default: 0.95 },
    topK: { min: 1, max: 40, default: 40 },
  })

  return { models: baseModels }
}

export function formatOpenAIChatCompletionResponse(options: { result: any; model: string; prompt: string; responseId?: string; created?: number }) {
  const { result, model, prompt } = options
  const responseId = options.responseId ?? `chatcmpl-${Date.now()}`
  const created = options.created ?? Math.floor(Date.now() / 1000)
  const normalized = normalizeMedia(result)

  return {
    id: responseId,
    object: 'chat.completion',
    created,
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: result.text,
          images: result.images || [],
          videos: normalized.videos,
          media: normalized.media,
          deep_research: result.deepResearchPlan
            ? {
                plan: result.deepResearchPlan,
                statuses: result.deepResearchStatuses || [],
              }
            : undefined,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: tokenEstimate(prompt),
      completion_tokens: tokenEstimate(result.text || ''),
      total_tokens: tokenEstimate(`${prompt}${result.text || ''}`),
    },
  }
}

export function formatGeminiGenerateContentResponse(options: { result: any; model: string; prompt: string }) {
  const { result, model, prompt } = options
  const parts: any[] = [{ text: result.text || '' }]

  for (const image of result.images || []) {
    parts.push({
      fileData: {
        mimeType: image.isGenerated ? 'image/png' : 'image/*',
        fileUri: image.url,
      },
    })
  }

  for (const video of result.videos || []) {
    parts.push({
      fileData: {
        mimeType: 'video/mp4',
        fileUri: video.url,
      },
      metadata: {
        thumbnail: video.thumbnail,
        conversationId: video.conversationId,
        replyId: video.replyId,
        candidateId: video.candidateId,
      },
    })
  }

  for (const media of result.media || []) {
    if (media.mp3Url) {
      parts.push({
        fileData: {
          mimeType: 'audio/mpeg',
          fileUri: media.mp3Url,
        },
        metadata: {
          thumbnail: media.mp3Thumbnail,
          conversationId: media.conversationId,
          replyId: media.replyId,
          candidateId: media.candidateId,
        },
      })
    }
    if (media.mp4Url) {
      parts.push({
        fileData: {
          mimeType: 'video/mp4',
          fileUri: media.mp4Url,
        },
        metadata: {
          thumbnail: media.mp4Thumbnail,
          conversationId: media.conversationId,
          replyId: media.replyId,
          candidateId: media.candidateId,
        },
      })
    }
  }

  return {
    candidates: [{
      content: {
        role: 'model',
        parts,
      },
      finishReason: 'STOP',
      index: 0,
    }],
    usageMetadata: {
      promptTokenCount: tokenEstimate(prompt),
      candidatesTokenCount: tokenEstimate(result.text || ''),
      totalTokenCount: tokenEstimate(`${prompt}${result.text || ''}`),
    },
    modelVersion: model,
    deepResearch: result.deepResearchPlan
      ? {
          plan: result.deepResearchPlan,
          statuses: result.deepResearchStatuses || [],
        }
      : undefined,
  }
}
