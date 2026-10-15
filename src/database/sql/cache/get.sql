SELECT cache_value, expires_at
FROM cache_entries
WHERE cache_key = ?;
