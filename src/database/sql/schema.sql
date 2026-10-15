CREATE TABLE IF NOT EXISTS cache_entries (
  cache_key TEXT PRIMARY KEY,
  cache_value TEXT NOT NULL,
  expires_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS cache_entries_expiration_idx
ON cache_entries(expires_at);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  balance REAL NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS users_updated_at_idx
ON users(updated_at);
