export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS accounts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    UNIQUE NOT NULL,
  secure_1psid    TEXT    NOT NULL DEFAULT '',
  secure_1psidts  TEXT    NOT NULL DEFAULT '',
  proxy           TEXT    DEFAULT '',
  is_active       INTEGER DEFAULT 1,
  total_requests  INTEGER DEFAULT 0,
  total_tokens    INTEGER DEFAULT 0,
  last_used_at    TEXT,
  created_at      TEXT    DEFAULT (datetime('now')),
  updated_at      TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id        INTEGER,
  api_key_id        INTEGER,
  model             TEXT,
  prompt_tokens     INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  created_at        TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_account ON usage_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created  ON usage_logs(created_at);
`

export const MIGRATIONS = [
  `ALTER TABLE accounts ADD COLUMN proxy TEXT DEFAULT ''`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
]
