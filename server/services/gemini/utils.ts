/**
 * Gemini response parsing utilities, ported from the Python gemini_webapi library.
 */

const LENGTH_MARKER_RE = /(\d+)\n/

export function getNestedValue(
  data: any,
  path: (number | string)[],
  defaultValue?: any,
): any {
  let current = data
  for (let i = 0; i < path.length; i++) {
    const key = path[i]
    if (typeof key === 'number') {
      if (Array.isArray(current) && key >= -current.length && key < current.length) {
        current = current[key]
      } else {
        return defaultValue
      }
    } else if (typeof key === 'string') {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return defaultValue
      }
    } else {
      return defaultValue
    }
  }
  return current ?? defaultValue
}

function getUtf16Units(s: string): number {
  let units = 0
  for (let i = 0; i < s.length; i++) {
    units += s.charCodeAt(i) > 0xFFFF ? 2 : 1
  }
  return units
}

function getCharCountForUtf16Units(s: string, startIdx: number, utf16Units: number): { chars: number; units: number } {
  let count = 0
  let units = 0
  const limit = s.length

  while (units < utf16Units && startIdx + count < limit) {
    const c = s.charCodeAt(startIdx + count)
    const u = c > 0xFFFF ? 2 : 1
    if (units + u > utf16Units) break
    units += u
    count++
  }

  return { chars: count, units }
}

export function parseResponseByFrame(content: string): { frames: any[]; remaining: string } {
  let consumedPos = 0
  const totalLen = content.length
  const parsedFrames: any[] = []

  while (consumedPos < totalLen) {
    while (consumedPos < totalLen && content[consumedPos].trim() === '') {
      consumedPos++
    }
    if (consumedPos >= totalLen) break

    const match = LENGTH_MARKER_RE.exec(content.slice(consumedPos))
    if (!match || match.index !== 0) break

    const lengthVal = parseInt(match[1], 10)
    const startContent = consumedPos + match[0].length

    const { chars, units } = getCharCountForUtf16Units(content, startContent, lengthVal)

    if (units < lengthVal) break

    const endPos = startContent + chars
    const chunk = content.slice(startContent, endPos).trim()
    consumedPos = endPos

    if (!chunk) continue

    try {
      const parsed = JSON.parse(chunk)
      if (Array.isArray(parsed)) {
        parsedFrames.push(...parsed)
      } else {
        parsedFrames.push(parsed)
      }
    } catch {
      // skip unparseable chunk
    }
  }

  return { frames: parsedFrames, remaining: content.slice(consumedPos) }
}

export function extractJsonFromResponse(text: string): any[] {
  if (typeof text !== 'string') {
    throw new TypeError(`Expected string, got ${typeof text}`)
  }

  let content = text
  if (content.startsWith(")]}'")) {
    content = content.slice(4)
  }
  content = content.trimStart()

  const { frames } = parseResponseByFrame(content)
  if (frames.length > 0) return frames

  try {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    // try NDJSON
  }

  const lines: any[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) lines.push(...parsed)
      else lines.push(parsed)
    } catch {
      // skip
    }
  }

  if (lines.length > 0) return lines
  throw new Error('Could not find valid JSON in the response')
}

export function parseCandidateResponse(candidateData: any): {
  text: string
  thoughts: string
  webImages: any[]
  generatedImages: any[]
} {
  let text = ''
  let thoughts = ''
  const webImages: any[] = []
  const generatedImages: any[] = []

  const textBlocks = getNestedValue(candidateData, [4, 0])
  const thoughtBlocks = getNestedValue(candidateData, [4, 1])

  if (Array.isArray(textBlocks)) {
    text = textBlocks.map((b: any) => {
      if (typeof b === 'string') return b
      const t = getNestedValue(b, [0, 0])
      return typeof t === 'string' ? t : ''
    }).join('')
  }

  if (Array.isArray(thoughtBlocks)) {
    thoughts = thoughtBlocks.map((b: any) => {
      if (typeof b === 'string') return b
      const t = getNestedValue(b, [0, 0])
      return typeof t === 'string' ? t : ''
    }).join('')
  }

  const media = getNestedValue(candidateData, [12], [])
  if (Array.isArray(media)) {
    for (const item of media) {
      const url = getNestedValue(item, [0, 0, 0])
      const title = getNestedValue(item, [1], '')
      const alt = getNestedValue(item, [2], '')
      if (url) {
        const isGenerated = getNestedValue(item, [0, 1]) === 2
        const img = { url, title: title || '', alt: alt || '', isGenerated }
        if (isGenerated) generatedImages.push(img)
        else webImages.push(img)
      }
    }
  }

  return { text, thoughts, webImages, generatedImages }
}

export function getTextDelta(newRaw: string, lastSentClean: string, isFinal: boolean): string {
  const newC = isFinal ? newRaw : newRaw

  if (newC.startsWith(lastSentClean)) {
    return newC.slice(lastSentClean.length)
  }

  return newC
}
