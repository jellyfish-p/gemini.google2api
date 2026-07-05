import type { GenerateResult, GeminiSession } from './client'

export interface NormalizedVideoGenerationRequest {
  prompt: string
  model: string
  n: number
  seconds: number | null
  size: string | null
  aspectRatio: string | null
  responseFormat: 'url' | 'b64_json'
  inputReferences: string[]
  negativePrompt: string | null
  seed: number | null
  fps: number | null
  raw: Record<string, unknown>
}

type GenerateVideoContent = (options: {
  prompt: string
  session: GeminiSession
  model?: string
}) => Promise<GenerateResult>

function firstValue(...values: unknown[]): unknown {
  return values.find(value => value !== undefined && value !== null && value !== '')
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value)
  }
  if (typeof value === 'string') {
    const match = value.match(/\d+(\.\d+)?/)
    if (!match) return null
    const parsed = Number(match[0])
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed)
  }
  return null
}

function collectReferenceUrls(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(item => collectReferenceUrls(item))
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    return collectReferenceUrls(
      firstValue(record.url, record.uri, record.file_uri, record.fileUri, record.image_url, record.imageUrl),
    )
  }
  return []
}

export function normalizeVideoGenerationRequest(body: Record<string, unknown>): NormalizedVideoGenerationRequest {
  const prompt = String(firstValue(body.prompt, body.description, body.text) ?? '').trim()
  const seconds = parsePositiveInt(firstValue(body.seconds, body.duration))
  const n = parsePositiveInt(body.n) ?? 1
  const responseFormat = body.response_format === 'b64_json' || body.responseFormat === 'b64_json' ? 'b64_json' : 'url'
  const openAIReferenceSource = firstValue(
    body.input_reference,
    body.inputReference,
    body.input_references,
    body.inputReferences,
    body.image,
    body.images,
    body.image_url,
    body.imageUrl,
  )
  const xAIReferenceSource = firstValue(
    body.input_referrence,
    body.inputReferrence,
  )

  return {
    prompt,
    model: String(firstValue(body.model, 'veo-3') ?? 'veo-3'),
    n: Math.max(1, Math.min(n, 4)),
    seconds,
    size: typeof firstValue(body.size, body.resolution) === 'string'
      ? String(firstValue(body.size, body.resolution))
      : null,
    aspectRatio: typeof firstValue(body.aspect_ratio, body.aspectRatio) === 'string'
      ? String(firstValue(body.aspect_ratio, body.aspectRatio))
      : null,
    responseFormat,
    inputReferences: collectReferenceUrls(firstValue(openAIReferenceSource, xAIReferenceSource)),
    negativePrompt: typeof firstValue(body.negative_prompt, body.negativePrompt) === 'string'
      ? String(firstValue(body.negative_prompt, body.negativePrompt))
      : null,
    seed: parsePositiveInt(body.seed),
    fps: parsePositiveInt(body.fps),
    raw: body,
  }
}

export function buildVideoGenerationPrompt(request: NormalizedVideoGenerationRequest): string {
  const lines = [
    'Generate a video from this prompt.',
    `Prompt: ${request.prompt}`,
  ]

  if (request.seconds) lines.push(`Duration: ${request.seconds} seconds`)
  if (request.size) lines.push(`Size: ${request.size}`)
  if (request.aspectRatio) lines.push(`Aspect ratio: ${request.aspectRatio}`)
  if (request.fps) lines.push(`Frame rate: ${request.fps} fps`)
  if (request.seed) lines.push(`Seed: ${request.seed}`)
  if (request.negativePrompt) lines.push(`Avoid: ${request.negativePrompt}`)
  if (request.inputReferences.length) {
    lines.push(`Input references: ${request.inputReferences.join(', ')}`)
  }

  return lines.join('\n')
}

export async function generateVideo(options: {
  request: NormalizedVideoGenerationRequest
  session: GeminiSession
  generateContent: GenerateVideoContent
}): Promise<GenerateResult> {
  return options.generateContent({
    prompt: buildVideoGenerationPrompt(options.request),
    session: options.session,
    model: options.request.model,
  })
}

export function formatOpenAIVideoGenerationResponse(options: {
  request: NormalizedVideoGenerationRequest
  result: Partial<GenerateResult>
  responseId?: string
  created?: number
}) {
  const created = options.created ?? Math.floor(Date.now() / 1000)
  const id = options.responseId ?? `video-${Date.now()}`
  const videos = [
    ...(options.result.videos || []).map(video => ({
      url: video.url,
      thumbnail_url: video.thumbnail || undefined,
      conversation_id: video.conversationId,
      reply_id: video.replyId,
      candidate_id: video.candidateId,
    })),
    ...(options.result.media || [])
      .filter(media => media.mp4Url)
      .map(media => ({
        url: media.mp4Url,
        thumbnail_url: media.mp4Thumbnail || undefined,
        conversation_id: media.conversationId,
        reply_id: media.replyId,
        candidate_id: media.candidateId,
      })),
  ]

  const data = videos.slice(0, options.request.n).map((video, index) => ({
    object: 'video',
    id: `${id}-${index}`,
    url: options.request.responseFormat === 'url' ? video.url : undefined,
    b64_json: options.request.responseFormat === 'b64_json' ? '' : undefined,
    thumbnail_url: video.thumbnail_url,
    revised_prompt: options.result.text || options.request.prompt,
    metadata: {
      conversation_id: video.conversation_id,
      reply_id: video.reply_id,
      candidate_id: video.candidate_id,
      seconds: options.request.seconds,
      size: options.request.size,
      aspect_ratio: options.request.aspectRatio,
      input_references: options.request.inputReferences,
    },
  }))

  return {
    id,
    object: 'video.generation',
    created,
    model: options.request.model,
    status: data.length > 0 ? 'completed' : 'failed',
    data,
  }
}
