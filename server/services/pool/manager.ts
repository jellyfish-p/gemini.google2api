import { getConfig } from '../../config'
import { getDb, getSetting } from '../../database/client'
import { initSession } from '../gemini/client'
import type { GeminiSession } from '../gemini/client'

interface PoolAccount {
  id: number
  name: string
  proxy: string
  session?: GeminiSession
  inUse: boolean
  errorCount: number
}

let pool: PoolAccount[] = []
let roundRobinIndex = 0

function getPoolStrategy(): string {
  return getSetting('pool_strategy') || getConfig().pool.strategy
}

export function getPoolSize(): number {
  return pool.length
}

export function reloadPool(): void {
  pool = []
  roundRobinIndex = 0
}

export async function initializePool(): Promise<void> {
  reloadPool()
  const db = getDb()
  const accounts = db.prepare('SELECT * FROM accounts WHERE is_active = 1').all() as any[]

  pool = accounts.map((a: any) => ({
    id: a.id,
    name: a.name,
    proxy: a.proxy || '',
    session: undefined,
    inUse: false,
    errorCount: 0,
  }))

  for (const account of pool) {
    try {
      account.session = await initSession(account.id)
      console.log(`[pool] Account "${account.name}" initialized successfully${account.proxy ? ` [proxy: ${account.proxy}]` : ''}`)
    } catch (err: any) {
      console.warn(`[pool] Account "${account.name}" init failed: ${err.message}`)
    }
  }

  if (pool.length === 0) {
    console.warn('[pool] No active accounts in pool')
  }
}

export async function addAccountToPool(accountId: number): Promise<void> {
  const db = getDb()
  const a = db.prepare('SELECT * FROM accounts WHERE id = ? AND is_active = 1').get(accountId) as any
  if (!a) return

  const existing = pool.find(p => p.id === accountId)
  if (existing) {
    existing.proxy = a.proxy || ''
    existing.errorCount = 0
    try {
      existing.session = await initSession(accountId)
    } catch {}
    return
  }

  const entry: PoolAccount = {
    id: a.id,
    name: a.name,
    proxy: a.proxy || '',
    session: undefined,
    inUse: false,
    errorCount: 0,
  }
  try {
    entry.session = await initSession(accountId)
  } catch {}
  pool.push(entry)
}

export function removeAccountFromPool(accountId: number): void {
  pool = pool.filter(p => p.id !== accountId)
}

export async function acquireSession(): Promise<GeminiSession> {
  const strategy = getPoolStrategy()

  const available = pool.filter(a => !a.inUse && a.session)

  if (available.length === 0) {
    for (const account of pool) {
      if (!account.session && account.errorCount < 3) {
        try {
          account.session = await initSession(account.id)
        } catch (err: any) {
          account.errorCount++
          console.warn(`[pool] Account "${account.name}" re-init failed: ${err.message}`)
        }
      }
    }
    const retry = pool.filter(a => !a.inUse && a.session)
    if (retry.length === 0) {
      throw new Error('No available accounts in pool')
    }
    return acquireWithStrategy(retry, strategy)
  }

  return acquireWithStrategy(available, strategy)
}

function acquireWithStrategy(available: PoolAccount[], strategy: string): GeminiSession {
  if (available.length === 0) {
    throw new Error('No available accounts in pool')
  }

  let account: PoolAccount

  switch (strategy) {
    case 'random': {
      const idx = Math.floor(Math.random() * available.length)
      account = available[idx]!
      break
    }
    case 'least-used': {
      const db = getDb()
      let minUsage = Infinity
      let selected = available[0]!
      for (const a of available) {
        const row = db.prepare('SELECT total_requests FROM accounts WHERE id = ?').get(a.id) as any
        const usage = row?.total_requests ?? 0
        if (usage < minUsage) {
          minUsage = usage
          selected = a
        }
      }
      account = selected
      break
    }
    case 'round-robin':
    default: {
      const indices = available.map(a => pool.indexOf(a))
      const sorted = indices.filter(i => i >= roundRobinIndex)
      if (sorted.length > 0) {
        const selectedIndex = sorted[0]!
        account = pool[selectedIndex]!
        roundRobinIndex = selectedIndex + 1
      } else {
        account = available[0]!
        roundRobinIndex = 1
      }
      if (roundRobinIndex >= pool.length) roundRobinIndex = 0
      break
    }
  }

  account.inUse = true
  return account.session!
}

export function releaseSession(accountId: number): void {
  const account = pool.find(a => a.id === accountId)
  if (account) account.inUse = false
}

export function markAccountError(accountId: number): void {
  const account = pool.find(a => a.id === accountId)
  if (account) {
    account.errorCount++
    if (account.errorCount >= 5) {
      account.session = undefined
      const db = getDb()
      db.prepare('UPDATE accounts SET is_active = 0 WHERE id = ?').run(accountId)
      console.warn(`[pool] Account "${account.name}" disabled due to errors`)
    }
  }
}
