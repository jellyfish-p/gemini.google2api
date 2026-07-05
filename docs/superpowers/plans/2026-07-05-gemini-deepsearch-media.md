# Gemini Deepsearch Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `gemini-deepsearch` as an OpenAI-compatible and Gemini-compatible model, and port Deep Research plus generated video/audio parsing from HanaokaYuzu/Gemini-API.

**Architecture:** Keep route handlers thin and move protocol behavior into `server/services/gemini`. Add pure conversion helpers for testable OpenAI/Gemini response formatting. Deep Research is implemented as a service workflow over existing session pooling: plan generation, confirmation, status polling, and final chat fetch.

**Tech Stack:** Nuxt 4/Nitro, TypeScript, undici fetch/ProxyAgent, Node test runner via Vitest.

---

### Task 1: Test Harness and Pure Types

**Files:**
- Modify: `package.json`
- Create: `server/services/gemini/types.ts`
- Create: `tests/gemini-utils.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { isDeepResearchModel } from '../server/services/gemini/deep-research'
import { parseCandidateResponse } from '../server/services/gemini/utils'

describe('gemini protocol helpers', () => {
  it('recognizes gemini-deepsearch as the deep research virtual model', () => {
    expect(isDeepResearchModel('gemini-deepsearch')).toBe(true)
    expect(isDeepResearchModel('gemini-2.5-flash')).toBe(false)
  })

  it('extracts generated video and media URLs from Gemini candidate payloads', () => {
    const candidate = []
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
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/gemini-utils.test.ts`
Expected: FAIL because `vitest`, `deep-research`, or media parsing is missing.

- [ ] **Step 3: Add minimal implementation**

Add `vitest`, shared result interfaces, `isDeepResearchModel`, and media parsing fields.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/gemini-utils.test.ts`
Expected: PASS.

### Task 2: Deep Research Protocol Service

**Files:**
- Modify: `server/services/gemini/constants.ts`
- Create: `server/services/gemini/deep-research.ts`
- Modify: `server/services/gemini/client.ts`
- Test: `tests/gemini-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for `extractDeepResearchPlan`, `extractDeepResearchStatusPayload`, and request options that set Deep Research indices 3, 4, 49, 54, and 55.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/gemini-utils.test.ts`
Expected: FAIL because extraction and request building are absent.

- [ ] **Step 3: Implement minimal protocol**

Port upstream RPC constants, preflight calls, plan/status extraction, `runDeepResearch`, and `readChat`/`fetchLatestChatResponse`.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/gemini-utils.test.ts`
Expected: PASS.

### Task 3: Route Integration

**Files:**
- Modify: `server/api/v1/models.get.ts`
- Modify: `server/api/v1/chat/completions.post.ts`
- Modify: `server/api/v1beta/models.get.ts`
- Modify: `server/api/v1beta/models/[...slug].post.ts`
- Create: `server/services/gemini/responses.ts`
- Test: `tests/routes-shapes.test.ts`

- [ ] **Step 1: Write failing tests**

Test that model list helpers include `gemini-deepsearch`, OpenAI response format contains final report plus Deep Research metadata, and Gemini response format contains text plus metadata.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/routes-shapes.test.ts`
Expected: FAIL because helpers are not implemented.

- [ ] **Step 3: Implement route wiring**

Add model list entries, route branch on `gemini-deepsearch`, response formatters, and SSE status chunks for stream requests.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/routes-shapes.test.ts`
Expected: PASS.

### Task 4: Verification and Docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update docs**

Document `gemini-deepsearch`, OpenAI and Gemini examples, Deep Research account eligibility, and generated media response extensions.

- [ ] **Step 2: Verify typecheck and build**

Run: `npm run typecheck`
Expected: Exit 0 or report existing unrelated strict-mode issues with exact errors.

Run: `npm run build`
Expected: Exit 0.
