-- Ensure pgcrypto extension exists (migration 0001 already creates this but ensure idempotency)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional index: unique constraint on email already creates an index
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
