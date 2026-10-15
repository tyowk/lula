INSERT INTO users (user_id, balance, data, created_at, updated_at)
VALUES (?, ?, '{}', ?, ?)
ON CONFLICT(user_id) DO UPDATE SET
  balance = excluded.balance,
  updated_at = excluded.updated_at;
