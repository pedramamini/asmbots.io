/**
 * Password accounts in D1 (migration 0015): `password_credentials`, a row for each account that
 * signs in with a username and a password, and `auth_tokens`, the tokens of mailed links. Nothing
 * here reads `users.github_id` or `users.email` (GitHub's): a password account and a GitHub
 * account are never matched to one another, by handle or by address.
 */
import { auditInsert, type UserRow } from './queries'

export interface CredentialRow {
  user_id: string
  password_hash: string
  /** The account's own address, trimmed and lowercase; null when it gave none. */
  email: string | null
  /** When the address was proven; null until then, and again when the address changes. */
  email_verified_at: string | null
  password_set_at: string
  created_at: string
}

/** What a mailed link is for. */
export type AuthTokenKind = 'verify_email' | 'reset_password'

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"

function isUnique(err: unknown, column: string): boolean {
  return err instanceof Error && err.message.includes(`UNIQUE constraint failed: ${column}`)
}

/**
 * Makes a password account in one batch: the user, already onboarded (the username they typed is
 * their handle), and their credentials. `taken` when someone has the handle in any case.
 */
export async function createPasswordUser(
  db: D1Database,
  account: { id: string; handle: string; passwordHash: string; email: string | null },
): Promise<{ user: UserRow; passwordSetAt: string } | 'taken'> {
  try {
    const [made, kept] = await db.batch<UserRow & { password_set_at: string }>([
      db
        .prepare(`INSERT INTO users (id, handle, onboarded_at) VALUES (?, ?, ${NOW}) RETURNING *`)
        .bind(account.id, account.handle),
      db
        .prepare(
          `INSERT INTO password_credentials (user_id, password_hash, email) VALUES (?, ?, ?)
           RETURNING password_set_at`,
        )
        .bind(account.id, account.passwordHash, account.email),
    ])
    const user = made?.results[0]
    const passwordSetAt = kept?.results[0]?.password_set_at
    if (user === undefined || passwordSetAt === undefined) {
      throw new Error(`making password user ${account.handle} returned no row`)
    }
    return { user, passwordSetAt }
  } catch (err) {
    if (isUnique(err, 'users.handle')) return 'taken'
    throw err
  }
}

/** The password account whose handle is `handle`, in any case; null for none, or a GitHub one. */
export async function getPasswordLogin(
  db: D1Database,
  handle: string,
): Promise<{ user: UserRow; passwordHash: string; passwordSetAt: string } | null> {
  const row = await db
    .prepare(
      `SELECT u.*, p.password_hash, p.password_set_at FROM users u
         JOIN password_credentials p ON p.user_id = u.id
       WHERE u.handle = ?`,
    )
    .bind(handle)
    .first<UserRow & { password_hash: string; password_set_at: string }>()
  if (row === null) return null
  const { password_hash, password_set_at, ...user } = row
  return { user, passwordHash: password_hash, passwordSetAt: password_set_at }
}

/** User `userId`'s credentials; null for a GitHub account. */
export async function getCredentials(
  db: D1Database,
  userId: string,
): Promise<CredentialRow | null> {
  return db
    .prepare('SELECT * FROM password_credentials WHERE user_id = ?')
    .bind(userId)
    .first<CredentialRow>()
}

/**
 * The account a reset link may go to for `login`, a username or an address: one with a verified
 * email. An unverified address finds nothing, and neither does GitHub's (`users.email`).
 */
export async function getRecoverable(
  db: D1Database,
  login: string,
): Promise<{ userId: string; handle: string; email: string } | null> {
  const by = login.includes('@') ? 'p.email' : 'u.handle'
  return db
    .prepare(
      `SELECT u.id AS userId, u.handle, p.email FROM password_credentials p
         JOIN users u ON u.id = p.user_id
       WHERE ${by} = ? AND p.email IS NOT NULL AND p.email_verified_at IS NOT NULL`,
    )
    .bind(login)
    .first<{ userId: string; handle: string; email: string }>()
}

/**
 * Keeps a new hash, `hash`, for a password that did not change (`needsRehash`), in place of
 * `was`, the hash it was checked against: a password set in between stays as it was set.
 */
export async function rehashPassword(
  db: D1Database,
  userId: string,
  was: string,
  hash: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE password_credentials SET password_hash = ? WHERE user_id = ? AND password_hash = ?',
    )
    .bind(hash, userId, was)
    .run()
}

/**
 * A new password for `userId`, with its audit row, and every reset link the account had is void.
 * With `email` (a reset): only while that is still the account's verified address, and the
 * account's API tokens go too, since whoever had the account may have made one. Returns the new
 * `password_set_at`, or null when nothing changed.
 */
export async function setPassword(
  db: D1Database,
  userId: string,
  hash: string,
  action: 'password.change' | 'password.reset',
  email?: string,
): Promise<string | null> {
  const still = email === undefined ? '' : ' AND email = ?3 AND email_verified_at IS NOT NULL'
  const update = db
    .prepare(
      `UPDATE password_credentials SET password_hash = ?2, password_set_at = ${NOW}
       WHERE user_id = ?1${still} RETURNING password_set_at`,
    )
    .bind(...(email === undefined ? [userId, hash] : [userId, hash, email]))
  const [changed] = await db.batch<{ password_set_at: string }>([
    update,
    // Only when the update above changed a row: `changes()` is the statement before this one's.
    db
      .prepare(
        `INSERT INTO audit (id, user_id, action, target)
         SELECT ?, ?, ?, ? WHERE changes() > 0`,
      )
      .bind(crypto.randomUUID(), userId, action, userId),
  ])
  const setAt = changed?.results[0]?.password_set_at ?? null
  if (setAt === null) return null
  await db.batch([
    db
      .prepare("DELETE FROM auth_tokens WHERE user_id = ? AND kind = 'reset_password'")
      .bind(userId),
    ...(action === 'password.reset'
      ? [db.prepare('DELETE FROM api_tokens WHERE user_id = ?').bind(userId)]
      : []),
  ])
  return setAt
}

/**
 * The account's address is now `email` (null: none), unverified, with its audit row; every mailed
 * link it had is void, since each was for the address before.
 */
export async function setEmail(
  db: D1Database,
  userId: string,
  email: string | null,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        'UPDATE password_credentials SET email = ?, email_verified_at = NULL WHERE user_id = ?',
      )
      .bind(email, userId),
    db.prepare('DELETE FROM auth_tokens WHERE user_id = ?').bind(userId),
    auditInsert(db, userId, 'email.change', userId),
  ])
}

/**
 * Marks `email` verified for `userId`, while it is still their address and not yet verified.
 * `taken` when another account verified the address first; false when nothing changed.
 */
export async function verifyEmail(
  db: D1Database,
  userId: string,
  email: string,
): Promise<boolean | 'taken'> {
  try {
    const [changed] = await db.batch([
      db
        .prepare(
          `UPDATE password_credentials SET email_verified_at = ${NOW}
           WHERE user_id = ? AND email = ? AND email_verified_at IS NULL`,
        )
        .bind(userId, email),
      db
        .prepare(
          `INSERT INTO audit (id, user_id, action, target)
           SELECT ?, ?, 'email.verify', ? WHERE changes() > 0`,
        )
        .bind(crypto.randomUUID(), userId, userId),
    ])
    return (changed?.meta.changes ?? 0) > 0
  } catch (err) {
    if (isUnique(err, 'password_credentials.email')) return 'taken'
    throw err
  }
}

/**
 * Keeps the token whose SHA-256 is `hash`, for `seconds`. A verification link takes the place of
 * the one before: only the newest works. A reset link does not: each mailed in the last half hour
 * works until one is used (`RECOVER_ACCOUNT_BUDGET` says why), three at most. Tokens past their
 * time go too, anyone's.
 */
export async function putAuthToken(
  db: D1Database,
  token: { hash: string; userId: string; kind: AuthTokenKind; email: string; seconds: number },
): Promise<void> {
  const now = Date.now()
  await db.batch([
    db.prepare('DELETE FROM auth_tokens WHERE expires_at <= ?').bind(new Date(now).toISOString()),
    db
      .prepare("DELETE FROM auth_tokens WHERE user_id = ? AND kind = ? AND kind = 'verify_email'")
      .bind(token.userId, token.kind),
    db
      .prepare(
        'INSERT INTO auth_tokens (hash, user_id, kind, email, expires_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(
        token.hash,
        token.userId,
        token.kind,
        token.email,
        new Date(now + token.seconds * 1000).toISOString(),
      ),
  ])
}

/** Whose token `hash` is, while it is good; it stays. Null for none, a used one, an old one. */
export async function peekAuthToken(
  db: D1Database,
  hash: string,
  kind: AuthTokenKind,
): Promise<{ userId: string; handle: string; email: string } | null> {
  return db
    .prepare(
      `SELECT t.user_id AS userId, u.handle, t.email FROM auth_tokens t
         JOIN users u ON u.id = t.user_id
       WHERE t.hash = ? AND t.kind = ? AND t.expires_at > ?`,
    )
    .bind(hash, kind, new Date().toISOString())
    .first<{ userId: string; handle: string; email: string }>()
}

/**
 * Uses the token `hash`: deleted and returned in one statement, so of two requests with one token
 * only one gets it. Null for none, a used one, an old one.
 */
export async function takeAuthToken(
  db: D1Database,
  hash: string,
  kind: AuthTokenKind,
): Promise<{ userId: string; email: string } | null> {
  return db
    .prepare(
      `DELETE FROM auth_tokens WHERE hash = ? AND kind = ? AND expires_at > ?
       RETURNING user_id AS userId, email`,
    )
    .bind(hash, kind, new Date().toISOString())
    .first<{ userId: string; email: string }>()
}
