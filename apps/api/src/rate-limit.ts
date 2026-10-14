/**
 * A fixed-window rate limit per client, counted in KV: per user when the request carries a
 * session (`loadSession` runs first), else per IP. KV is eventually consistent and has no atomic
 * increment, so a burst across edge locations can slip a few requests past the limit: fine for
 * abuse control, not for billing.
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
/** Every `/api/auth/*` request, reads too: a sign-in is two (start, callback). */
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

/**
 * `POST /api/auth/signup`: accounts an IP makes, an hour and a day. Only an account made (201)
 * counts. An account needs no email, so this is what keeps one client from making many.
 */
export const SIGNUP_LIMIT: RateLimit = {
  scope: 'signup',
  limit: 3,
  windowSeconds: 60 * 60,
  counts: (status) => status === 201,
  by: 'ip',
}
export const SIGNUP_DAY_LIMIT: RateLimit = {
  scope: 'signup-day',
  limit: 10,
  windowSeconds: 24 * 60 * 60,
  counts: (status) => status === 201,
  by: 'ip',
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
 * Wrong passwords, counted by `checkBudget` and `spendBudget`: from one IP, for one username
 * from anywhere, and for one account's own password (`POST /api/me/password`, `/email`). Past
 * one, the next try is 429 before any password is checked. The username's count is the highest:
 * anyone can run it out for a name that is not theirs, so it stops a guesser, and only for the
 * hour does it stop the owner too.
 */
export const LOGIN_IP_BUDGET = { scope: 'login-ip', limit: 10, windowSeconds: 10 * 60 } as const
export const LOGIN_NAME_BUDGET = { scope: 'login-name', limit: 30, windowSeconds: 60 * 60 } as const
export const PASSWORD_BUDGET = { scope: 'password', limit: 5, windowSeconds: 15 * 60 } as const
/** `POST /api/auth/recover`: reset links one account is mailed an hour, whoever asks. */
export const RECOVER_ACCOUNT_BUDGET = {
  scope: 'recover-account',
  limit: 3,
  windowSeconds: 60 * 60,
} as const

export interface Budget {
  scope: string
  limit: number
  windowSeconds: number
}

function budgetKey({ scope, windowSeconds }: Budget, client: string, now: number): string {
  return `rl:${scope}:${client}:${Math.floor(now / windowSeconds)}`
}

/**
 * Seconds until `client` may try again under `budget`, or 0 while it has some left. A count kept
 * by hand, for what is not one request one count: only a wrong password spends a sign-in's.
 */
export async function checkBudget(
  kv: KVNamespace,
  budget: Budget,
  client: string,
): Promise<number> {
  const now = Math.floor(Date.now() / 1000)
  const used = Number((await kv.get(budgetKey(budget, client, now))) ?? 0)
  if (used < budget.limit) return 0
  return (Math.floor(now / budget.windowSeconds) + 1) * budget.windowSeconds - now
}

/** Counts one against `client`'s `budget`. */
export async function spendBudget(kv: KVNamespace, budget: Budget, client: string): Promise<void> {
  const key = budgetKey(budget, client, Math.floor(Date.now() / 1000))
  const used = Number((await kv.get(key)) ?? 0)
  await kv.put(key, String(used + 1), { expirationTtl: budget.windowSeconds + 60 })
}

/** The client's IP as Cloudflare saw it; `unknown` only outside Cloudflare's edge. */
export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown'
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
    const client = userId === undefined ? `ip:${clientIp(c.req.raw)}` : `u:${userId}`
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
