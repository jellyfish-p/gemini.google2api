export const ENDPOINTS = {
  GOOGLE: 'https://www.google.com',
  INIT: 'https://gemini.google.com/app',
  GENERATE: 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
  ROTATE_COOKIES: 'https://accounts.google.com/RotateCookies',
  BATCH_EXEC: 'https://gemini.google.com/_/BardChatUi/data/batchexecute',
} as const

export const GRPC = {
  GET_USER_STATUS: 'otAQ7b',
  BARD_SETTINGS: 'ESY5D',
  LIST_CHATS: 'MaZiqc',
  READ_CHAT: 'hNvQHb',
  DELETE_CHAT: ['GzXR5e', 'qWymEb'],
  DEEP_RESEARCH_STATUS: 'kwDCne',
  DEEP_RESEARCH_PREFS: 'L5adhe',
  DEEP_RESEARCH_BOOTSTRAP: 'ku4Jyf',
  DEEP_RESEARCH_MODEL_STATE: 'qpEbW',
  DEEP_RESEARCH_CAPS: 'aPya6c',
  DEEP_RESEARCH_ACK: 'PCck7e',
} as const

export const MODEL_HEADER_KEY = 'x-goog-ext-525001261-jspb'

export const STREAMING_FLAG_INDEX = 7
export const GEM_FLAG_INDEX = 19
export const TEMPORARY_CHAT_FLAG_INDEX = 45
export const DEFAULT_METADATA = ['', '', '', null, null, null, null, null, null, '']

export interface ModelInfo {
  modelName: string
  displayName: string
  modelHeader: Record<string, string>
}

function buildModelHeader(modelId: string, capacityTail: number | string): Record<string, string> {
  return {
    [MODEL_HEADER_KEY]: `[1,null,null,null,"${modelId}",null,null,0,[4],null,null,${capacityTail}]`,
    'x-goog-ext-73010989-jspb': '[0]',
    'x-goog-ext-73010990-jspb': '[0]',
  }
}

export const MODELS: Record<string, ModelInfo> = {
  'gemini-2.0-flash': {
    modelName: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    modelHeader: buildModelHeader('fbb127bbb056c959', 1),
  },
  'gemini-2.0-flash-thinking': {
    modelName: 'gemini-2.0-flash-thinking',
    displayName: 'Gemini 2.0 Flash Thinking',
    modelHeader: buildModelHeader('5bf011840784117a', 1),
  },
  'gemini-2.0-pro': {
    modelName: 'gemini-2.0-pro',
    displayName: 'Gemini 2.0 Pro',
    modelHeader: buildModelHeader('9d8ca3786ebdfbea', 1),
  },
  'gemini-2.5-pro': {
    modelName: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    modelHeader: buildModelHeader('e6fa609c3fa255c0', 2),
  },
  'gemini-2.5-flash': {
    modelName: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    modelHeader: buildModelHeader('56fdd199312815e2', 2),
  },
  'gemini-2.5-flash-thinking': {
    modelName: 'gemini-2.5-flash-thinking',
    displayName: 'Gemini 2.5 Flash Thinking',
    modelHeader: buildModelHeader('e051ce1aa80aa576', 2),
  },
}

export const MODEL_ALIASES: Record<string, string> = {
  'gemini-pro': 'gemini-2.0-pro',
  'gemini-flash': 'gemini-2.0-flash',
  'gemini-2.0-flash-exp': 'gemini-2.0-flash',
  'gemini-2.5-pro-exp-03-25': 'gemini-2.5-pro',
  'gemini-2.5-flash-preview-04-17': 'gemini-2.5-flash',
  'gemini-2.5-pro-preview-03-25': 'gemini-2.5-pro',
}
