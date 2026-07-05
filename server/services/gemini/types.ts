export interface GeminiImage {
  url: string
  title: string
  alt: string
  isGenerated: boolean
}

export interface GeminiVideo {
  url: string
  thumbnail: string
  conversationId: string
  replyId: string
  candidateId: string
}

export interface GeminiMedia {
  mp3Url: string
  mp3Thumbnail: string
  mp4Url: string
  mp4Thumbnail: string
  conversationId: string
  replyId: string
  candidateId: string
}

export interface DeepResearchPlan {
  researchId: string | null
  title: string | null
  query: string | null
  steps: string[]
  etaText: string | null
  confirmPrompt: string | null
  modifyPrompt: string | null
  confirmationUrl: string | null
  metadata?: any[]
  cid?: string | null
  responseText: string | null
  rawState: number | null
}

export interface DeepResearchStatus {
  researchId: string
  state: 'running' | 'awaiting_confirmation' | 'completed'
  title: string | null
  query: string | null
  cid: string | null
  notes: string[]
  done: boolean
  rawState: number | null
  raw: unknown
}
