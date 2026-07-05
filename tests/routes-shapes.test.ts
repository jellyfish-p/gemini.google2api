import { describe, expect, it } from 'vitest'
import { buildGeminiModelList, buildOpenAIModelList, formatGeminiGenerateContentResponse, formatOpenAIChatCompletionResponse } from '../server/services/gemini/responses'

describe('route response helpers', () => {
  const deepResult: any = {
    text: 'Final research report',
    thoughts: '',
    images: [],
    videos: [{ url: 'video.mp4', thumbnail: 'thumb.jpg', conversationId: 'c_1', replyId: 'r_1', candidateId: 'rc_1' }],
    media: [{ mp3Url: 'audio.mp3', mp3Thumbnail: 'audio-thumb.jpg', mp4Url: '', mp4Thumbnail: '', conversationId: 'c_1', replyId: 'r_1', candidateId: 'rc_1' }],
    conversationId: 'c_1',
    replyId: 'r_1',
    candidateId: 'rc_1',
    deepResearchPlan: { researchId: 'rid', title: 'Plan', steps: ['Step'], query: 'Query' },
    deepResearchStatuses: [{ researchId: 'rid', state: 'completed', done: true }],
  }

  it('includes gemini-deepsearch in OpenAI model list', () => {
    expect(buildOpenAIModelList().data.map(model => model.id)).toContain('gemini-deepsearch')
  })

  it('includes gemini-deepsearch in Gemini model list', () => {
    const deepModel = buildGeminiModelList().models.find(model => model.name === 'models/gemini-deepsearch')
    expect(deepModel?.supportedGenerationMethods).toContain('generateContent')
  })

  it('formats OpenAI chat responses with deep research and media metadata', () => {
    const response = formatOpenAIChatCompletionResponse({
      result: deepResult,
      model: 'gemini-deepsearch',
      prompt: 'Research this',
    })

    expect(response.model).toBe('gemini-deepsearch')
    expect(response.choices[0].message.content).toBe('Final research report')
    expect(response.choices[0].message.deep_research.plan.title).toBe('Plan')
    expect(response.choices[0].message.videos[0].url).toBe('video.mp4')
    expect(response.choices[0].message.media[0].mp3_url).toBe('audio.mp3')
  })

  it('formats Gemini generateContent responses with metadata parts', () => {
    const response = formatGeminiGenerateContentResponse({
      result: deepResult,
      model: 'gemini-deepsearch',
      prompt: 'Research this',
    })

    expect(response.modelVersion).toBe('gemini-deepsearch')
    expect(response.candidates[0].content.parts[0].text).toBe('Final research report')
    expect(response.candidates[0].content.parts.some((part: any) => part.fileData?.fileUri === 'video.mp4')).toBe(true)
    expect(response.deepResearch.plan.title).toBe('Plan')
  })
})
