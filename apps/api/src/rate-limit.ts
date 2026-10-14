/**
 * A fixed-window rate limit per client, counted in KV: per user when the request carries a
 * session (`loadSession` runs first), else per address (`clientNet`). KV is eventually consistent
 * and has no atomic increment, so a burst across edge locations can slip a few requests past the
 * limit: fine for abuse control, not for billing, and not for what guards a password. Those are
 * the budgets below, counted in D1 (`takeBudget`).
 */
import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from './env'
import { errorResponse } from './middleware'

export interface RateLimit {
  /** Names the counter, so two limits on one client do not share it. */
  scope: string
  /** Requests allowed per window. */
  limit: number
  /** The window, in seconds; at least 60 (KV's shortest expiry). */
  windowSeconds: number
  /**
   * Which answers count, by status; every one when left out. A limit on work counts the
   * requests that made some, so a refused one costs the client nothing of it.
   */
  counts?: ((status: number) => boolean) | undefined
  /**
   * `ip`: count by IP even with a session. For what makes or opens accounts: a client that signs
   * in as another user each time would otherwise start a new count each time.
   */
  by?: 'ip' | undefined
}

/** Every write route: 60 requests a minute. The limits below apply on top of it. */
export const WRITE_LIMIT: RateLimit = { scope: 'write', limit: 60, windowSeconds: 60 }
/** `POST /api/assemble` */
export const ASSEMBLE_LIMIT: RateLimit = { scope: 'assemble', limit: 30, windowSeconds: 60 }
/** `POST /api/bots` and every `POST` under it (import, versions). */
export const BOTS_LIMIT: RateLimit = { scope: 'bots', limit: 20, windowSeconds: 60 }
/** `POST /api/replays`: each one runs a match again. */
export const REPLAYS_LIMIT: RateLimit = { scope: 'replays', limit: 10, windowSeconds: 60 }
/** Every `/api/auth/*` request but `GET /methods`, reads too: a GitHub sign-in is two (start, callback). */
export const AUTH_LIMIT: RateLimit = { scope: 'auth', limit: 10, windowSeconds: 60 }
/**
 * `POST /api/hills/:slug/submit`: submissions a user makes an hour, each a match against every
 * entry of a hill. Only a submission made (201) counts: a refused one runs nothing.
 */
export const SUBMIT_LIMIT: RateLimit = {
  scope: 'submit',
  limit: 5,
  windowSeconds: 60 * 60,
  counts: (status) => status === 201,
}

/**
 * `POST /api/tournaments`: tournaments a user makes an hour, each one a `Runner` job of up to 496
 * matches. Only a tournament made (201) counts.
 */
export const TOURNAMENT_LIMIT: RateLimit = {
  scope: 'tournament',
  limit: 5,
  windowSeconds: 60 * 60,
  counts: (status) => status === 201,
}

/**
 * `POST /api/ai/chat`: turns of the editor's AI mode a user takes an hour. Only a turn that ran
 * (200) counts. Each one's cost also counts against a daily cap in dollars (`ai/spend.ts`).
 */
export const AI_LIMIT: RateLimit = {
  scope: 'ai',
  limit: 30,
  windowSeconds: 60 * 60,
  counts: (status) => status === 200,
}

/** `POST /api/auth/recover`: reset links an IP asks for an hour, whoever they are for. */
export const RECOVER_LIMIT: RateLimit = {
  scope: 'recover',
  limit: 5,
  windowSeconds: 60 * 60,
  by: 'ip',
}

/** `POST /api/me/email/verify`: verification links a user asks for an hour. */
export const VERIFY_MAIL_LIMIT: RateLimit = {
  scope: 'verify-mail',
  limit: 3,
  windowSeconds: 60 * 60,
}

/**
 * A count that holds under a burst (`takeBudget`, in D1): what guards a password or makes an
 * account, where a hundred requests at once must not each read the same count, as they would in
 * KV. Each is taken before the work it guards, and given back when the work was no abuse (the
 * password was right, the username was taken).
 */
export interface Budget {
  scope: string
  limit: number
  windowSeconds: number
}

/**
 * Sign-ins tried from one address in ten minutes, the right password not counted: what a guesser
 * at many usernames spends.
 */
export const LOGIN_IP_BUDGET: Budget = { scope: 'login-ip', limit: 10, windowSeconds: 10 * 60 }
/**
 * Wrong passwords for one username an hour, from every address but a browser that has signed in
 * to the account before (`LOGIN_DEVICE_BUDGET`): what a guesser at one account spends, however
 * many addresses it has. It counts for a username nobody has too, so the answer says nothing.
 * Anyone can run it out for a name that is not theirs; the account's own browsers are not held
 * by it, so that locks out the guesser and not the owner.
 */
export const LOGIN_NAME_BUDGET: Budget = { scope: 'login-name', limit: 30, windowSeconds: 60 * 60 }
/** Wrong passwords an hour from one browser the account has signed in from before. */
export const LOGIN_DEVICE_BUDGET: Budget = {
  scope: 'login-device',
  limit: 10,
  windowSeconds: 60 * 60,
}
/** Wrong current passwords on the settings page (`POST /api/me/password`, `/email`), a user. */
export const PASSWORD_BUDGET: Budget = { scope: 'password', limit: 5, windowSeconds: 15 * 60 }
/**
 * `POST /api/auth/signup`: accounts one address makes, an hour and a day. An account needs no
 * email, so this is what keeps one client from making many.
 */
export const SIGNUP_BUDGET: Budget = { scope: 'signup', limit: 3, windowSeconds: 60 * 60 }
export const SIGNUP_DAY_BUDGET: Budget = {
  scope: 'signup-day',
  limit: 10,
  windowSeconds: 24 * 60 * 60,
}
/**
 * `POST /api/auth/recover`: reset links one account is mailed in half an hour, whoever asks. The
 * window is a link's lifetime, and a new link does not void the ones before: so whoever spends
 * an account's links for it has put working links in its owner's inbox, not locked them out.
 */
export const RECOVER_ACCOUNT_BUDGET: Budget = {
  scope: 'recover-account',
  limit: 3,
  windowSeconds: 30 * 60,
}
/** `POST /api/me/email`: new addresses a user sets an hour, each of which is mailed a link. */
export const EMAIL_CHANGE_BUDGET: Budget = {
  scope: 'email-change',
  limit: 5,
  windowSeconds: 60 * 60,
}
/**
 * Verification links one address is mailed an hour, whichever accounts name it: nobody's inbox
 * fills because someone typed their address into sign-up or the settings page.
 */
export const MAIL_TO_BUDGET: Budget = { scope: 'mail-to', limit: 3, windowSeconds: 60 * 60 }

function budgetKey({ scope, windowSeconds }: Budget, client: string, now: number): string {
  return `${scope}:${client}:${Math.floor(now / windowSeconds)}`
}

/**
 * Counts one against `client`'s `budget`, in one statement that adds and reads back: of a burst
 * of requests, only `limit` are told 0. Returns the seconds until the window ends when this one
 * is past the limit, else 0. Counts past their window go with it.
 */
export async function takeBudget(db: D1Database, budget: Budget, client: string): Promise<number> {
  const now = Math.floor(Date.now() / 1000)
  const ends = (Math.floor(now / budget.windowSeconds) + 1) * budget.windowSeconds
  const [, taken] = await db.batch<{ n: number }>([
    db
      .prepare('DELETE FROM auth_budgets WHERE expires_at <= ?')
      .bind(new Date(now * 1000).toISOString()),
    db
      .prepare(
        `INSERT INTO auth_budgets (key, n, expires_at) VALUES (?, 1, ?)
         ON CONFLICT (key) DO UPDATE SET n = n + 1 RETURNING n`,
      )
      .bind(budgetKey(budget, client, now), new Date(ends * 1000).toISOString()),
  ])
  const used = taken?.results[0]?.n ?? budget.limit + 1
  return used > budget.limit ? Math.max(1, ends - now) : 0
}

/** Gives back one that `takeBudget` counted: what it guarded was no abuse. */
export async function giveBackBudget(
  db: D1Database,
  budget: Budget,
  client: string,
): Promise<void> {
  await db
    .prepare('UPDATE auth_budgets SET n = MAX(n - 1, 0) WHERE key = ?')
    .bind(budgetKey(budget, client, Math.floor(Date.now() / 1000)))
    .run()
}

/** The client's IP as Cloudflare saw it; `unknown` only outside Cloudflare's edge. */
export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown'
}

/**
 * The client's address as the limits count it: an IPv4 address, or the /64 of an IPv6 one. One
 * subscriber holds a whole /64, so a count by the full address would start again at each of its
 * 2^64 addresses.
 */
export function clientNet(request: Request): string {
  const ip = clientIp(request)
  if (!ip.includes(':')) return ip
  const [head = '', tail] = ip.toLowerCase().split('::')
  const first = head === '' ? [] : head.split(':')
  const last = tail === undefined || tail === '' ? [] : tail.split(':')
  const gap = tail === undefined ? 0 : Math.max(0, 8 - first.length - last.length)
  const groups = [...first, ...Array<string>(gap).fill('0'), ...last]
  const net = groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, ''))
  return `${net.join(':')}::/64`
}

export function rateLimit({
  scope,
  limit,
  windowSeconds,
  counts,
  by,
}: RateLimit): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const now = Math.floor(Date.now() / 1000)
    const window = Math.floor(now / windowSeconds)
    const userId = by === 'ip' ? undefined : c.get('session')?.userId
    const client = userId === undefined ? `ip:${clientNet(c.req.raw)}` : `u:${userId}`
    const key = `rl:${scope}:${client}:${window}`
    const used = Number((await c.env.KV.get(key)) ?? 0)
    const resetIn = (window + 1) * windowSeconds - now
    c.header('X-RateLimit-Limit', String(limit))
    if (used >= limit) {
      c.header('Retry-After', String(resetIn))
      c.header('X-RateLimit-Remaining', '0')
      return errorResponse(c, 'rate_limited', `too many requests: try again in ${resetIn} s`)
    }
    // Expire with the window (plus a minute of slack); KV refuses a TTL under 60 s.
    const count = (n: number) => c.env.KV.put(key, String(n), { expirationTtl: windowSeconds + 60 })
    if (counts === undefined) {
      c.header('X-RateLimit-Remaining', String(limit - used - 1))
      await count(used + 1)
      await next()
      return
    }
    c.header('X-RateLimit-Remaining', String(limit - used))
    await next()
    if (!counts(c.res.status)) return
    // Read again: another request may have counted while this one ran.
    const counted = Number((await c.env.KV.get(key)) ?? 0)
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, limit - counted - 1)))
    await count(counted + 1)
  }
}
