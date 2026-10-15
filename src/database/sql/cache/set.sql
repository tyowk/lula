INSERT INTO cache_entries (cache_key, cache_value, expires_at, updated_at)
VALUES (?, ?, ?, ?)
ON CONFLICT(cache_key) DO UPDATE SET
  cache_value = excluded.cache_value,
  expires_at = excluded.expires_at,
  updated_at = excluded.updated_at;
