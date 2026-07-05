import { randomInt, randomUUID } from 'node:crypto'
import { ProxyAgent } from 'undici'
import { getDb, getSetting } from '../../database/client'
import { ENDPOINTS, GRPC, MODEL_HEADER_KEY, DEFAULT_METADATA, STREAMING_FLAG_INDEX, MODELS, MODEL_ALIASES } from './constants'
import { getNestedValue, extractJsonFromResponse, parseCandidateResponse } from './utils'

export interface GeminiSession {
  accessToken: string
  buildLabel: string
  sessionId: string
  language: string
  pushId: string
  cookies: Record<string, string>
  accountId: number
  proxy: string
}

interface GeminiAccount {
  id: number
  name: string
  secure_1psid: string
  secure_1psidts: string
  proxy: string
  is_active: number
}

let initializedSessions: Map<number, GeminiSession> = new Map()

function parseCookiesFromResponse(resp: Response): Record<string, string> {
  const cookies: Record<string, string> = {}
  const setCookieHeaders = resp.headers.getSetCookie?.() ?? []
  for (const h of setCookieHeaders) {
    const [cookiePair] = h.split(';')
    if (!cookiePair) continue
    const eqIdx = cookiePair.indexOf('=')
    if (eqIdx === -1) continue
    const name = cookiePair.slice(0, eqIdx).trim()
    const value = cookiePair.slice(eqIdx + 1).trim()
    cookies[name] = value
  }
  return cookies
}

function serializeCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('; ')
}

function getAccountProxy(accountId: number): string {
  const db = getDb()
  const row = db.prepare('SELECT proxy FROM accounts WHERE id = ?').get(accountId) as any
  if (row?.proxy) return row.proxy
  return getSetting('global_proxy') || ''
}

async function doFetch(
  url: string,
  options: RequestInit & { cookies?: Record<string, string>; proxy?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    ...(options.headers as Record<string, string> ?? {}),
  }

  if (options.cookies) {
    headers['Cookie'] = serializeCookies(options.cookies)
  }

  const fetchOpts: any = {
    ...options,
    headers,
    redirect: 'follow',
  }

  const proxy = options.proxy
  if (proxy) {
    try {
      fetchOpts.dispatcher = new ProxyAgent(proxy)
    } catch {
      console.warn(`[gemini] Failed to create proxy agent for: ${proxy}`)
    }
  }

  delete fetchOpts.cookies
  delete fetchOpts.proxy

  return fetch(url, fetchOpts)
}

export async function initSession(accountId?: number): Promise<GeminiSession> {
  const db = getDb()
  let account: GeminiAccount | undefined

  if (accountId) {
    account = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1').get(accountId) as GeminiAccount | undefined
  } else {
    account = db.prepare('SELECT * FROM accounts WHERE is_active = 1 ORDER BY last_used_at ASC LIMIT 1').get() as GeminiAccount | undefined
  }

  if (!account) {
    throw new Error('No active account found. Add accounts via the admin panel (/admin).')
  }

  if (!account.secure_1psid) {
    throw new Error(`Account "${account.name}" has no __Secure-1PSID configured`)
  }

  const proxy = account.proxy || getSetting('global_proxy') || ''

  let cookies: Record<string, string> = {
    '__Secure-1PSID': account.secure_1psid,
  }
  if (account.secure_1psidts) {
    cookies['__Secure-1PSIDTS'] = account.secure_1psidts
  }

  const preflightResp = await doFetch(ENDPOINTS.GOOGLE, { cookies, proxy })
  const preflightCookies = parseCookiesFromResponse(preflightResp)
  Object.assign(cookies, preflightCookies)

  // Step 2: GET gemini.google.com/app to extract tokens
  const initResp = await doFetch(ENDPOINTS.INIT, {
    cookies,
    proxy,
    headers: {
      'Origin': 'https://gemini.google.com',
      'Referer': 'https://gemini.google.com/',
    },
  })

  const initText = await initResp.text()
  const initCookies = parseCookiesFromResponse(initResp)
  Object.assign(cookies, initCookies)

  const extractToken = (re: RegExp) => {
    const m = re.exec(initText)
    return m ? m[1] : undefined
  }

  const accessToken = extractToken(/"SNlM0e":\s*"(.*?)"/)
  const buildLabel = extractToken(/"cfb2h":\s*"(.*?)"/)
  const sessionId = extractToken(/"FdrFJe":\s*"(.*?)"/)
  const language = extractToken(/"TuX5cc":\s*"(.*?)"/)
  const pushId = extractToken(/"qKIAYe":\s*"(.*?)"/)

  if (!accessToken) {
    throw new Error('Failed to get access token (SNlM0e). Check your cookies.')
  }

  const session: GeminiSession = {
    accessToken,
    buildLabel: buildLabel ?? '',
    sessionId: sessionId ?? '',
    language: language ?? 'en',
    pushId: pushId ?? 'feeds/mcudyrk2a4khkz',
    cookies,
    accountId: account.id,
    proxy,
  }

  initializedSessions.set(account.id, session)

  // Update last_used_at
  db.prepare('UPDATE accounts SET last_used_at = datetime(\'now\') WHERE id = ?').run(account.id)

  // Send initial RPCs
  await sendBatchExecute(session, [
    { rpcid: GRPC.BARD_SETTINGS, payload: '[[["adaptive_device_responses_enabled"]]]' },
  ])

  return session
}

export async function rotateCookies(session: GeminiSession): Promise<void> {
  const resp = await doFetch(ENDPOINTS.ROTATE_COOKIES, {
    method: 'POST',
    cookies: session.cookies,
    proxy: session.proxy,
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://accounts.google.com',
    },
    body: '[000,"-0000000000000000000"]',
  })

  if (resp.status === 401) {
    throw new Error('Cookie rotation failed: unauthorized')
  }

  const newCookies = parseCookiesFromResponse(resp)
  Object.assign(session.cookies, newCookies)

  const db = getDb()
  const psidts = session.cookies['__Secure-1PSIDTS']
  if (psidts) {
    db.prepare('UPDATE accounts SET secure_1psidts = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(psidts, session.accountId)
  }
}

export async function sendBatchExecute(
  session: GeminiSession,
  rpcs: { rpcid: string; payload: string }[],
): Promise<any[]> {
  const reqId = randomInt(10000, 99999)
  const params = new URLSearchParams({
    'rpcids': rpcs.map(r => r.rpcid).join(','),
    'bl': session.buildLabel,
    '_reqid': String(reqId),
    'f.sid': session.sessionId,
    'hl': session.language,
    'rt': 'c',
  })

  const bodyLines = rpcs.map(r => `[${JSON.stringify(r.rpcid)},"${r.payload.replace(/"/g, '\\"')}",null,null,${randomInt(1, 999)}]`)
  const body = `f.req=${encodeURIComponent(`[${bodyLines.join(',')}]`)}&at=${session.accessToken}`

  const resp = await doFetch(`${ENDPOINTS.BATCH_EXEC}?${params.toString()}`, {
    method: 'POST',
    cookies: session.cookies,
    proxy: session.proxy,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      'Origin': 'https://gemini.google.com',
      'Referer': 'https://gemini.google.com/',
      'X-Same-Domain': '1',
      [MODEL_HEADER_KEY]: '[1,null,null,null,null,null,null,null,[4]]',
    },
    body,
  })

  const text = await resp.text()
  try {
    return extractJsonFromResponse(text)
  } catch {
    return []
  }
}

export interface GenerateOptions {
  prompt: string
  session: GeminiSession
  model?: string
  conversationId?: string
  replyId?: string
  temporary?: boolean
  deepResearch?: boolean
  onChunk?: (text: string, done: boolean) => void
  signal?: AbortSignal
}

export interface GenerateResult {
  text: string
  thoughts: string
  images: { url: string; title: string; alt: string; isGenerated: boolean }[]
  conversationId: string
  replyId: string
  candidateId: string
}

export async function generateContent(options: GenerateOptions): Promise<GenerateResult> {
  const { prompt, session, model, temporary } = options

  if (!prompt) throw new Error('Prompt cannot be empty')

  const reqId = randomInt(100000, 999999)
  const resolvedModel = resolveModel(model, session)

  const chatMetadata = options.conversationId
    ? [...DEFAULT_METADATA]
    : [...DEFAULT_METADATA]

  const innerReq: any[] = new Array(69).fill(null)
  innerReq[0] = [prompt, 0, null, null, null, null, 0]
  innerReq[1] = [session.language]
  innerReq[2] = chatMetadata
  innerReq[6] = [1]
  innerReq[STREAMING_FLAG_INDEX] = 1
  innerReq[10] = 1
  innerReq[11] = 0
  innerReq[17] = [[0]]
  innerReq[18] = 0
  innerReq[27] = 1
  innerReq[30] = [4]
  innerReq[41] = [1]
  innerReq[53] = 0
  innerReq[61] = []
  innerReq[68] = 2

  if (temporary) {
    innerReq[TEMPORARY_CHAT_FLAG_INDEX] = 1
  }

  const uuid = randomUUID().toUpperCase()
  innerReq[59] = uuid

  const params = new URLSearchParams({
    'bl': session.buildLabel,
    '_reqid': String(reqId),
    'f.sid': session.sessionId,
    'hl': session.language,
    'rt': 'c',
  })

  const fReqPayload = JSON.stringify(JSON.stringify(innerReq))
  const body = `f.req=${encodeURIComponent(`[null,${fReqPayload}]`)}&at=${session.accessToken}`

  const modelHeader = resolvedModel?.modelHeader ?? {}

  const resp = await doFetch(`${ENDPOINTS.GENERATE}?${params.toString()}`, {
    method: 'POST',
    cookies: session.cookies,
    proxy: session.proxy,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      'Origin': 'https://gemini.google.com',
      'Referer': 'https://gemini.google.com/',
      'X-Same-Domain': '1',
      ...modelHeader,
      [`x-goog-ext-525005358-jspb`]: `["${uuid}",1]`,
    },
    body,
    signal: options.signal,
  })

  if (resp.status !== 200) {
    const errText = await resp.text().catch(() => '')
    throw new Error(`Gemini API error: ${resp.status} ${errText}`)
  }

  const reader = resp.body?.getReader()
  if (!reader) throw new Error('No response body stream')

  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''
  let fullThoughts = ''
  let allImages: { url: string; title: string; alt: string; isGenerated: boolean }[] = []

  let resultConvId = options.conversationId ?? ''
  let resultReplyId = options.replyId ?? ''
  let resultCandidateId = ''

  const { parseResponseByFrame, parseCandidateResponse } = await import('./utils')

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    const { frames, remaining } = parseResponseByFrame(buffer)
    buffer = remaining

    for (const frame of frames) {
      const innerJsonStr = getNestedValue(frame, [2])
      if (!innerJsonStr) continue

      try {
        const partJson = JSON.parse(innerJsonStr)
        const mData = getNestedValue(partJson, [1])
        if (mData) {
          resultConvId = mData[0] ?? resultConvId
          resultReplyId = mData[1] ?? resultReplyId
          chatMetadata[0] = mData[0] ?? chatMetadata[0]
          chatMetadata[1] = mData[1] ?? chatMetadata[1]
        }

        const candidatesList = getNestedValue(partJson, [4], [])
        for (const candidateData of candidatesList) {
          const rcid = getNestedValue(candidateData, [0])
          if (rcid) resultCandidateId = rcid

          const parsed = parseCandidateResponse(candidateData)
          if (parsed.text) {
            fullText = parsed.text
            allImages = [...parsed.webImages, ...parsed.generatedImages]
          }
          if (parsed.thoughts) {
            fullThoughts = parsed.thoughts
          }
        }
      } catch {
        // skip
      }
    }

    if (options.onChunk) {
      // Accumulate and send incremental text
    }
  }

  // Final parse of remaining buffer
  if (buffer.trim()) {
    try {
      const { frames } = parseResponseByFrame(buffer)
      for (const frame of frames) {
        const innerJsonStr = getNestedValue(frame, [2])
        if (!innerJsonStr) continue
        try {
          const partJson = JSON.parse(innerJsonStr)
          const candidatesList = getNestedValue(partJson, [4], [])
          for (const candidateData of candidatesList) {
            const parsed = parseCandidateResponse(candidateData)
            if (parsed.text) {
              fullText = parsed.text
              if (parsed.webImages.length || parsed.generatedImages.length) {
                allImages = [...parsed.webImages, ...parsed.generatedImages]
              }
            }
            if (parsed.thoughts) fullThoughts = parsed.thoughts

            const mData = getNestedValue(partJson, [1])
            if (mData) {
              resultConvId = mData[0] ?? resultConvId
              resultReplyId = mData[1] ?? resultReplyId
            }
          }
        } catch {
          // skip
        }
      }
    } catch {
      // skip
    }
  }

  if (options.onChunk) {
    options.onChunk(fullText, true)
  }

  return {
    text: fullText || '', // If no text extracted, use what model sent
    thoughts: fullThoughts,
    images: allImages,
    conversationId: resultConvId,
    replyId: resultReplyId,
    candidateId: resultCandidateId,
  }
}

export async function generateContentStream(
  options: GenerateOptions,
): Promise<GenerateResult> {
  return generateContent(options)
}

export function resolveModel(model?: string): { modelName: string; modelHeader: Record<string, string> } | undefined {
  if (!model || model === 'unspecified') return undefined

  const resolvedName = MODEL_ALIASES[model] ?? model
  const modelInfo = MODELS[resolvedName]

  if (modelInfo) {
    return { modelName: modelInfo.modelName, modelHeader: modelInfo.modelHeader }
  }

  // Try to use unknown model name but with a generic header
  return {
    modelName: model,
    modelHeader: {
      [MODEL_HEADER_KEY]: `[1,null,null,null,"${model}",null,null,0,[4],null,null,1]`,
    },
  }
}

export async function getAvailableModels(session: GeminiSession): Promise<any[]> {
  try {
    const result = await sendBatchExecute(session, [
      { rpcid: GRPC.GET_USER_STATUS, payload: '[]' },
    ])
    return result
  } catch {
    return []
  }
}

export async function getSessionForRequest(accountId?: number): Promise<GeminiSession> {
  if (accountId && initializedSessions.has(accountId)) {
    const sess = initializedSessions.get(accountId)!
    return sess
  }

  const session = await initSession(accountId)
  return session
}

export function clearSession(accountId: number): void {
  initializedSessions.delete(accountId)
}
