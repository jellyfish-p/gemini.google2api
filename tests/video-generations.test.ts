import { describe, expect, it } from 'vitest'
import {
  buildVideoGenerationPrompt,
  formatOpenAIVideoGenerationResponse,
  normalizeVideoGenerationRequest,
} from '../server/services/gemini/videos'

describe('video generation compatibility helpers', () => {
  it('normalizes OpenAI video fields before xAI-compatible fields', () => {
    const normalized = normalizeVideoGenerationRequest({
      model: 'veo-3',
      prompt: 'A calm sunrise over water',
      seconds: 8,
      duration: 4,
      input_reference: 'https://example.test/openai.png',
      input_referrence: 'https://example.test/misspelled.png',
      image: 'https://example.test/xai.png',
      images: ['https://example.test/openai-images.png'],
      aspect_ratio: '16:9',
      response_format: 'url',
    })

    expect(normalized.model).toBe('veo-3')
    expect(normalized.seconds).toBe(8)
    expect(normalized.inputReferences).toEqual(['https://example.test/openai.png'])
    expect(normalized.aspectRatio).toBe('16:9')
    expect(normalized.responseFormat).toBe('url')
  })

  it('treats OpenAI image and images fields as references before xAI aliases', () => {
    const normalized = normalizeVideoGenerationRequest({
      prompt: 'Animate this frame',
      images: ['https://example.test/a.png', { url: 'https://example.test/b.png' }],
      input_referrence: 'https://example.test/xai.png',
    })

    expect(normalized.inputReferences).toEqual(['https://example.test/a.png', 'https://example.test/b.png'])
  })

  it('accepts xAI duration and reference aliases when OpenAI fields are absent', () => {
    const normalized = normalizeVideoGenerationRequest({
      prompt: 'A camera orbit around a glass sculpture',
      duration: '6s',
      input_referrence: ['https://example.test/ref-a.png', { url: 'https://example.test/ref-b.png' }],
      resolution: '1280x720',
    })

    expect(normalized.seconds).toBe(6)
    expect(normalized.inputReferences).toEqual(['https://example.test/ref-a.png', 'https://example.test/ref-b.png'])
    expect(normalized.size).toBe('1280x720')
  })

  it('builds a Gemini prompt containing video controls', () => {
    const prompt = buildVideoGenerationPrompt(normalizeVideoGenerationRequest({
      prompt: 'A product reveal shot',
      seconds: 5,
      size: '1920x1080',
      aspect_ratio: '16:9',
      input_reference: ['https://example.test/ref.png'],
    }))

    expect(prompt).toContain('Generate a video')
    expect(prompt).toContain('Duration: 5 seconds')
    expect(prompt).toContain('Size: 1920x1080')
    expect(prompt).toContain('Aspect ratio: 16:9')
    expect(prompt).toContain('Input references: https://example.test/ref.png')
  })

  it('formats generated Gemini media as an OpenAI-compatible video response', () => {
    const response = formatOpenAIVideoGenerationResponse({
      request: normalizeVideoGenerationRequest({ prompt: 'Ocean waves', model: 'veo-3', seconds: 4, n: 2 }),
      result: {
        text: 'Done',
        videos: [{ url: 'video.mp4', thumbnail: 'thumb.jpg', conversationId: 'c', replyId: 'r', candidateId: 'rc' }],
        media: [{ mp3Url: '', mp3Thumbnail: '', mp4Url: 'media-video.mp4', mp4Thumbnail: 'media-thumb.jpg', conversationId: 'c', replyId: 'r', candidateId: 'rc' }],
      },
      created: 123,
      responseId: 'video-test',
    })

    expect(response.id).toBe('video-test')
    expect(response.object).toBe('video.generation')
    expect(response.model).toBe('veo-3')
    expect(response.status).toBe('completed')
    expect(response.data).toEqual([
      expect.objectContaining({ url: 'video.mp4', b64_json: undefined }),
      expect.objectContaining({ url: 'media-video.mp4', thumbnail_url: 'media-thumb.jpg' }),
    ])
  })
})
