import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { getConfig } from '../config'
import { CREATE_TABLES, MIGRATIONS } from './schema'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const config = getConfig()
  const dbPath = resolve(config.database.path)
  const dbDir = dirname(dbPath)

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(CREATE_TABLES)
  runMigrations(db)

  return db
}

function runMigrations(d: Database.Database): void {
  for (const sql of MIGRATIONS) {
    try { d.exec(sql) } catch { /* ignore duplicates */ }
  }
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

export function getSetting(key: string): string | undefined {
  const d = getDb()
  const row = d.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
  return row?.value ?? undefined
}

export function setSetting(key: string, value: string): void {
  const d = getDb()
  d.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value)
}

export function getAllSettings(): Record<string, string> {
  const d = getDb()
  const rows = d.prepare('SELECT key, value FROM settings').all() as any[]
  const out: Record<string, string> = {}
  for (const r of rows) out[r.key] = r.value
  return out
}

export function initDatabase(): void {
  getDb()
}
