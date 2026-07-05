import { randomUUID } from 'node:crypto'
import { DEFAULT_METADATA, GRPC, TEMPORARY_CHAT_FLAG_INDEX, STREAMING_FLAG_INDEX } from './constants'
import { extractJsonFromResponse, getNestedValue } from './utils'
import type { GeminiSession, GenerateResult } from './client'
import type { DeepResearchPlan, DeepResearchStatus } from './types'

const DEEP_RESEARCH_MODEL = 'gemini-deepsearch'
const RESEARCH_ID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
const CHAT_ID_RE = /\bc_[A-Za-z0-9_]+\b/
const URL_RE = /^https?:\/\//

export function isDeepResearchModel(model?: string): boolean {
  if (!model) return false
  return model.replace(/^models\//, '') === DEEP_RESEARCH_MODEL
}

export function getDeepResearchModelId(): string {
  return DEEP_RESEARCH_MODEL
}

export function buildGenerateInnerRequest(options: {
  prompt: string
  language: string
  metadata?: any[]
  temporary?: boolean
  deepResearch?: boolean
  uuid?: string
  entropyToken?: string
}): any[] {
  const innerReq = new Array(69).fill(null)
  innerReq[0] = [options.prompt, 0, null, null, null, null, 0]
  innerReq[1] = [options.language]
  innerReq[2] = options.metadata ?? [...DEFAULT_METADATA]

  if (options.deepResearch) {
    const uuid = options.uuid ?? randomUUID().replace(/-/g, '')
    innerReq[3] = `!${options.entropyToken ?? randomUUID().repeat(96)}`
    innerReq[4] = uuid
  }

  innerReq[6] = [1]
  innerReq[STREAMING_FLAG_INDEX] = 1
  innerReq[10] = 1
  innerReq[11] = 0
  innerReq[17] = [[0]]
  innerReq[18] = 0
  innerReq[27] = 1
  innerReq[30] = [4]
  innerReq[41] = [1]

  if (options.temporary) {
    innerReq[TEMPORARY_CHAT_FLAG_INDEX] = 1
  }

  if (options.deepResearch) {
    innerReq[49] = 1
    innerReq[54] = [[[[[1]]]]]
    innerReq[55] = [[1]]
  }

  innerReq[53] = 0
  innerReq[59] = options.uuid ?? randomUUID().toUpperCase()
  innerReq[61] = []
  innerReq[68] = 2

  return innerReq
}

function* iterNested(data: any): Generator<any> {
  yield data
  if (Array.isArray(data)) {
    for (const item of data) yield* iterNested(item)
  } else if (data && typeof data === 'object') {
    for (const item of Object.values(data)) yield* iterNested(item)
  }
}

function findFirstMatch(data: any, pattern: RegExp): string | null {
  for (const item of iterNested(data)) {
    if (typeof item === 'string') {
      const match = pattern.exec(item)
      if (match) return match[0]
    }
  }
  return null
}

function findFirstString(data: any, exclude = new Set<string>()): string | null {
  for (const item of iterNested(data)) {
    if (typeof item === 'string' && item && !exclude.has(item)) return item
  }
  return null
}

function findFirstObjectWithKey(data: any, key: string): any | null {
  for (const item of iterNested(data)) {
    if (item && typeof item === 'object' && !Array.isArray(item) && key in item) return item
  }
  return null
}

function collectResearchNotes(data: any, exclude = new Set<string>()): string[] {
  const notes: string[] = []
  const seen = new Set<string>()
  for (const item of iterNested(data)) {
    if (typeof item !== 'string') continue
    const text = item.trim()
    if (!text || exclude.has(text) || seen.has(text) || URL_RE.test(text) || text.length < 12) continue
    seen.add(text)
    notes.push(text)
    if (notes.length >= 12) break
  }
  return notes
}

export function extractDeepResearchPlan(candidateData: any, fallbackText = ''): DeepResearchPlan | null {
  let metaDict: any | null = null
  let payload: any = null

  for (const key of ['56', '57']) {
    metaDict = findFirstObjectWithKey(candidateData, key)
    if (metaDict && Array.isArray(metaDict[key])) {
      payload = metaDict[key]
      break
    }
  }

  if (!metaDict || !payload) return null

  const title = getNestedValue(payload, [0])
  const stepsPayload = getNestedValue(payload, [1], [])
  const steps: string[] = []
  if (Array.isArray(stepsPayload)) {
    for (const step of stepsPayload) {
      if (!Array.isArray(step)) continue
      const label = typeof step[1] === 'string' ? step[1] : null
      const body = typeof step[2] === 'string' ? step[2] : null
      if (label && body) steps.push(`${label}: ${body}`)
      else if (body) steps.push(body)
      else if (label) steps.push(label)
    }
  }

  const modifyPayload = getNestedValue(payload, [5])
  const query = typeof getNestedValue(payload, [1, 0, 2]) === 'string' ? getNestedValue(payload, [1, 0, 2]) : null
  const etaText = typeof getNestedValue(payload, [2]) === 'string' ? getNestedValue(payload, [2]) : null
  const confirmPrompt = typeof getNestedValue(payload, [3, 0]) === 'string' ? getNestedValue(payload, [3, 0]) : null
  const confirmationUrl = typeof getNestedValue(payload, [4, 0]) === 'string' ? getNestedValue(payload, [4, 0]) : null
  const modifyPrompt = Array.isArray(modifyPayload) ? findFirstString(modifyPayload) : null
  const rawState = typeof metaDict['70'] === 'number' ? metaDict['70'] : null

  if (!title && !query && steps.length === 0 && !etaText && !confirmPrompt && !confirmationUrl && !modifyPrompt) {
    return null
  }

  return {
    researchId: findFirstMatch(candidateData, RESEARCH_ID_RE),
    title: typeof title === 'string' ? title : null,
    query,
    steps,
    etaText,
    confirmPrompt,
    confirmationUrl,
    modifyPrompt,
    rawState,
    responseText: fallbackText || null,
  }
}

export function extractDeepResearchStatusPayload(payload: any): DeepResearchStatus | null {
  const data = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : payload
  const researchId = findFirstMatch(data, RESEARCH_ID_RE)
  if (!researchId) return null

  const title = getNestedValue(data, [1, 4, 0])
  const query = getNestedValue(data, [1, 4, 1])
  const cid = getNestedValue(data, [1, 3, 0]) || findFirstMatch(data, CHAT_ID_RE)
  const metaDict = findFirstObjectWithKey(data, '70')
  const rawState = metaDict && typeof metaDict['70'] === 'number' ? metaDict['70'] : null
  const markerStrings = [...iterNested(data)].filter(item => typeof item === 'string' && item)
  const done = markerStrings.some(item => item.includes('immersive_entry_chip'))
  const awaitingConfirmation = markerStrings.some(item => item.includes('deep_research_confirmation_content'))
  const state = done ? 'completed' : awaitingConfirmation ? 'awaiting_confirmation' : 'running'
  const exclude = new Set([title, query, researchId, cid].filter((v): v is string => typeof v === 'string'))

  return {
    researchId,
    state,
    title: typeof title === 'string' ? title : null,
    query: typeof query === 'string' ? query : null,
    cid: typeof cid === 'string' ? cid : null,
    notes: collectResearchNotes(data, exclude),
    done,
    rawState,
    raw: payload,
  }
}

export async function inspectDeepResearchCapability(sendBatchExecute: (rpcs: { rpcid: string; payload: string }[]) => Promise<any[]>): Promise<{ deepResearchFeaturePresent: boolean; rejectedProbes: string[] }> {
  const probes = [
    { name: 'bootstrap', rpcid: GRPC.DEEP_RESEARCH_BOOTSTRAP, payload: '["en",null,null,null,4,null,null,[2,4,7,15],null,[[5]]]' },
    { name: 'model_state', rpcid: GRPC.DEEP_RESEARCH_MODEL_STATE, payload: '[[[1,4],[6,6],[1,15]]]' },
    { name: 'caps', rpcid: GRPC.DEEP_RESEARCH_CAPS, payload: '[]' },
  ]
  const rejectedProbes: string[] = []

  for (const probe of probes) {
    const result = await sendBatchExecute([{ rpcid: probe.rpcid, payload: probe.payload }])
    const rejected = result.some(part => getNestedValue(part, [5, 0]) === 7)
    if (rejected) rejectedProbes.push(probe.name)
  }

  return {
    deepResearchFeaturePresent: rejectedProbes.length === 0,
    rejectedProbes,
  }
}

export async function runDeepResearch(options: {
  prompt: string
  model?: string
  session: GeminiSession
  generateContent: (opts: any) => Promise<GenerateResult>
  sendBatchExecute: (session: GeminiSession, rpcs: { rpcid: string; payload: string }[]) => Promise<any[]>
  readChat: (session: GeminiSession, cid: string, limit?: number) => Promise<GenerateResult | null>
  pollIntervalMs?: number
  timeoutMs?: number
  onStatus?: (status: DeepResearchStatus | { state: string; plan?: DeepResearchPlan }) => void
}): Promise<GenerateResult & { deepResearchPlan: DeepResearchPlan | null; deepResearchStatuses: DeepResearchStatus[] }> {
  await options.sendBatchExecute(options.session, [
    { rpcid: GRPC.BARD_SETTINGS, payload: '[[["bard_activity_enabled"]]]' },
    { rpcid: GRPC.DEEP_RESEARCH_BOOTSTRAP, payload: '["en",null,null,null,4,null,null,[2,4,7,15],null,[[5]]]' },
  ])

  const planOutput = await options.generateContent({
    prompt: options.prompt,
    session: options.session,
    model: options.model,
    deepResearch: true,
  })

  const plan = planOutput.deepResearchPlan
  if (!plan) throw new Error('Gemini did not return a deep research plan')
  plan.metadata = [planOutput.conversationId, planOutput.replyId, planOutput.candidateId, null, null, null, null, null, null, '']
  plan.cid = planOutput.conversationId
  options.onStatus?.({ state: 'plan_created', plan })

  const startOutput = await options.generateContent({
    prompt: plan.confirmPrompt || 'Start research',
    session: options.session,
    model: options.model,
    deepResearch: true,
    conversationId: planOutput.conversationId,
    replyId: planOutput.replyId,
    candidateId: planOutput.candidateId,
  })
  options.onStatus?.({ state: 'started', plan })

  const statuses: DeepResearchStatus[] = []
  const timeoutMs = options.timeoutMs ?? 600000
  const pollIntervalMs = options.pollIntervalMs ?? 10000
  const started = Date.now()

  while (plan.researchId && Date.now() - started < timeoutMs) {
    const response = await options.sendBatchExecute(options.session, [
      { rpcid: GRPC.DEEP_RESEARCH_STATUS, payload: JSON.stringify([plan.researchId]) },
    ])
    for (const part of response) {
      const body = getNestedValue(part, [2])
      if (!body) continue
      try {
        const parsed = extractDeepResearchStatusPayload(typeof body === 'string' ? JSON.parse(body) : body)
        if (parsed) {
          statuses.push(parsed)
          options.onStatus?.(parsed)
          if (parsed.done) {
            const finalOutput = await options.readChat(options.session, parsed.cid || plan.cid || '', 5)
            return {
              ...(finalOutput || startOutput),
              deepResearchPlan: plan,
              deepResearchStatuses: statuses,
            }
          }
        }
      } catch {
        // Ignore malformed status frames.
      }
    }
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  const finalOutput = plan.cid ? await options.readChat(options.session, plan.cid, 5) : null
  return {
    ...(finalOutput || startOutput),
    deepResearchPlan: plan,
    deepResearchStatuses: statuses,
  }
}

export function parseDeepResearchBatchResponse(text: string): any[] {
  return extractJsonFromResponse(text)
}
