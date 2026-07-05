import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'toml'

export interface AppConfig {
  server: {
    port: number
    host: string
  }
  database: {
    path: string
  }
  admin: {
    password: string
  }
  auth: {
    enabled: boolean
    keys: string[]
  }
  pool: {
    strategy: 'round-robin' | 'least-used' | 'random'
  }
}

function findConfigPath(): string {
  const candidates = [
    process.env.CONFIG_PATH,
    resolve(process.cwd(), 'config.toml'),
    resolve(process.cwd(), '../config.toml'),
    resolve(process.cwd(), '..', 'config.toml'),
  ]
  for (const p of candidates) {
    if (p && existsSync(p)) return p
  }
  return resolve(process.cwd(), 'config.toml')
}

export function getConfigPath(): string {
  return findConfigPath()
}

let cachedConfig: AppConfig | null = null

export function loadConfig(path?: string): AppConfig {
  if (cachedConfig) return cachedConfig

  const configPath = path || findConfigPath()
  if (!existsSync(configPath)) {
    console.warn(`[config] config.toml not found at ${configPath}, using defaults`)
    cachedConfig = getDefaultConfig()
    return cachedConfig
  }

  const raw = readFileSync(configPath, 'utf-8')
  const parsed = parse(raw) as any

  cachedConfig = {
    server: {
      port: parsed.server?.port ?? 3000,
      host: parsed.server?.host ?? '0.0.0.0',
    },
    database: {
      path: parsed.database?.path ?? './data/gemini.db',
    },
    admin: {
      password: parsed.admin?.password ?? 'admin123',
    },
    auth: {
      enabled: parsed.auth?.enabled ?? true,
      keys: parsed.auth?.keys ?? [],
    },
    pool: {
      strategy: parsed.pool?.strategy ?? 'round-robin',
    },
  }

  return cachedConfig
}

export function getConfig(): AppConfig {
  if (!cachedConfig) return loadConfig()
  return cachedConfig
}

export function resetConfig(): void {
  cachedConfig = null
}

function formatTomlString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function formatTomlArray(values: string[]): string {
  return `[${values.map(formatTomlString).join(', ')}]`
}

function replaceAuthKeys(raw: string, keys: string[]): string {
  const keysLine = `keys = ${formatTomlArray(keys)}`
  const authSectionMatch = raw.match(/(^|\r?\n)\[auth\][\s\S]*?(?=\r?\n\[[^\]]+\]|\s*$)/)

  if (!authSectionMatch || authSectionMatch.index === undefined) {
    const separator = raw.endsWith('\n') ? '\n' : '\n\n'
    return `${raw}${separator}[auth]\n${keysLine}\n`
  }

  const leadingNewline = authSectionMatch[1] ?? ''
  const start = authSectionMatch.index + leadingNewline.length
  const end = start + authSectionMatch[0].length - leadingNewline.length
  const section = raw.slice(start, end)

  let nextSection = section
  if (/^keys\s*=/m.test(section)) {
    nextSection = section.replace(/^keys\s*=.*$/m, keysLine)
  } else {
    nextSection = `${section.trimEnd()}\n${keysLine}\n`
  }

  return `${raw.slice(0, start)}${nextSection}${raw.slice(end)}`
}

export function updateAuthKeys(keys: string[]): void {
  const configPath = findConfigPath()
  const raw = existsSync(configPath) ? readFileSync(configPath, 'utf-8') : ''
  const uniqueKeys = [...new Set(keys.map(key => key.trim()).filter(Boolean))]

  writeFileSync(configPath, replaceAuthKeys(raw, uniqueKeys), 'utf-8')
  resetConfig()
}

function getDefaultConfig(): AppConfig {
  return {
    server: { port: 3000, host: '0.0.0.0' },
    database: { path: './data/gemini.db' },
    admin: { password: 'admin123' },
    auth: { enabled: false, keys: [] },
    pool: { strategy: 'round-robin' },
  }
}
