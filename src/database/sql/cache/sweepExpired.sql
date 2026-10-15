DELETE FROM cache_entries
WHERE expires_at IS NOT NULL
  AND expires_at <= ?;
