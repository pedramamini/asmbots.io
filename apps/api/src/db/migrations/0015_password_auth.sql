-- Password sign-in (`src/auth/password.ts`), beside GitHub's: an account with a username (its
-- handle) and a password has a row here, and a null `github_id`. A GitHub account has none, and
-- nothing ever joins the two: not a handle, not an email.
--
-- `email` is optional and the account's own (never `users.email`, which is GitHub's). Only a
-- verified one recovers a forgotten password, so one address is verified on one account at most
-- (the partial unique index); unverified, an address proves nothing and may repeat.
CREATE TABLE password_credentials (
  user_id            TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  password_hash      TEXT NOT NULL,            -- PHC scrypt: `$scrypt$ln=14,r=8,p=5$<salt>$<key>`
  email              TEXT,                     -- trimmed, lowercase
  email_verified_at  TEXT,
  password_set_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX password_credentials_verified_email
  ON password_credentials (email) WHERE email_verified_at IS NOT NULL;

-- The tokens of mailed links: one to verify an email, one to reset a password. Only the SHA-256
-- of a token is kept. A token works once (its row is deleted as it is used), until `expires_at`,
-- and only while the account's email is still `email`, the address it was mailed to.
CREATE TABLE auth_tokens (
  hash        TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('verify_email', 'reset_password')),
  email       TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX auth_tokens_user ON auth_tokens (user_id, kind);
CREATE INDEX auth_tokens_expires ON auth_tokens (expires_at);

-- Counts that must hold under a burst of requests at once (`takeBudget` in `rate-limit.ts`): wrong
-- passwords by IP and by username, accounts made, reset links mailed. KV has no atomic increment,
-- so a hundred requests at once would each read the same count; one D1 statement adds and reads
-- back in one step. `key` is `<scope>:<client>:<window>`, a row a window, gone after `expires_at`.
CREATE TABLE auth_budgets (
  key         TEXT PRIMARY KEY,
  n           INTEGER NOT NULL,
  expires_at  TEXT NOT NULL
);
CREATE INDEX auth_budgets_expires ON auth_budgets (expires_at);
