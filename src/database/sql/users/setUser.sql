INSERT INTO users (user_id, balance, data, created_at, updated_at)
VALUES (?, 0, ?, ?, ?)
ON CONFLICT(user_id) DO UPDATE SET
  data = excluded.data,
  updated_at = excluded.updated_at;
