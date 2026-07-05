import { describe, expect, it } from 'vitest'
import { buildGenerateInnerRequest, extractDeepResearchPlan, extractDeepResearchStatusPayload, isDeepResearchModel } from '../server/services/gemini/deep-research'
import { parseCandidateResponse } from '../server/services/gemini/utils'

describe('gemini protocol helpers', () => {
  it('recognizes gemini-deepsearch as the deep research virtual model', () => {
    expect(isDeepResearchModel('gemini-deepsearch')).toBe(true)
    expect(isDeepResearchModel('models/gemini-deepsearch')).toBe(true)
    expect(isDeepResearchModel('gemini-2.5-flash')).toBe(false)
  })

  it('extracts generated video and media URLs from Gemini candidate payloads', () => {
    const candidate: any[] = []
    candidate[1] = ['Here is the media']
    candidate[12] = []
    candidate[12][59] = [[[[null, null, null, null, null, null, null, ['thumb.jpg', 'video.mp4']]]]]
    candidate[12][86] = [
      [null, [null, null, null, null, null, null, null, ['audio-thumb.jpg', 'audio.mp3']]],
      [null, [null, null, null, null, null, null, null, ['video-thumb.jpg', 'music-video.mp4']]],
    ]

    const parsed = parseCandidateResponse(candidate, {
      conversationId: 'c_1',
      replyId: 'r_1',
      candidateId: 'rc_1',
    })

    expect(parsed.videos).toEqual([{ url: 'video.mp4', thumbnail: 'thumb.jpg', conversationId: 'c_1', replyId: 'r_1', candidateId: 'rc_1' }])
    expect(parsed.media).toEqual([{ mp3Url: 'audio.mp3', mp3Thumbnail: 'audio-thumb.jpg', mp4Url: 'music-video.mp4', mp4Thumbnail: 'video-thumb.jpg', conversationId: 'c_1', replyId: 'r_1', candidateId: 'rc_1' }])
  })

  it('builds deep research generate requests with the required internal flags', () => {
    const req = buildGenerateInnerRequest({
      prompt: 'research this',
      language: 'en',
      metadata: ['', '', '', null, null, null, null, null, null, ''],
      deepResearch: true,
      uuid: 'ABC',
      entropyToken: 'TOKEN',
    })

    expect(req[0]).toEqual(['research this', 0, null, null, null, null, 0])
    expect(req[3]).toBe('!TOKEN')
    expect(req[4]).toBe('ABC')
    expect(req[49]).toBe(1)
    expect(req[54]).toEqual([[[[[1]]]]])
    expect(req[55]).toEqual([[1]])
  })

  it('extracts deep research plan data from candidate metadata', () => {
    const candidate = [{ 56: ['Plan title', [['1', 'Step one', 'Check sources']], 'about 5 minutes', ['Start research'], ['https://example.test/start'], ['Revise plan']], 70: 1 }, 'id 12345678-1234-1234-1234-123456789abc']

    expect(extractDeepResearchPlan(candidate, 'preview')).toEqual({
      researchId: '12345678-1234-1234-1234-123456789abc',
      title: 'Plan title',
      query: 'Check sources',
      steps: ['Step one: Check sources'],
      etaText: 'about 5 minutes',
      confirmPrompt: 'Start research',
      confirmationUrl: 'https://example.test/start',
      modifyPrompt: 'Revise plan',
      rawState: 1,
      responseText: 'preview',
    })
  })

  it('extracts deep research status data', () => {
    const payload = ['12345678-1234-1234-1234-123456789abc', [null, null, null, ['c_abc'], ['Title', 'Query']], { 70: 2 }, 'immersive_entry_chip', 'Collected note about the topic']

    expect(extractDeepResearchStatusPayload(payload)).toMatchObject({
      researchId: '12345678-1234-1234-1234-123456789abc',
      state: 'completed',
      title: 'Title',
      query: 'Query',
      cid: 'c_abc',
      done: true,
      rawState: 2,
    })
  })
})
