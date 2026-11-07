/**
 * What the AI mode spends, in US dollars a UTC day, counted in KV: the site's total, and each
 * user's. A turn starts only while both are under their caps (`AI_DAILY_USD`, `AI_USER_DAILY_USD`),
 * and adds its cost when it ends, so the last turn of a day can pass a cap by one turn's cost. KV
 * has no atomic add: turns that end together can undercount a little. Fine for a cap, not a bill.
 */

/** A model's prices, US dollars a million tokens. */
export interface Prices {
  readonly input: number
  readonly output: number
}

/**
 * The model the AI mode runs on Workers AI: Gemma 4 26B A4B, a mixture of experts, cheap and fast,
 * with its thinking off (`routes/ai.ts`). Qwen3 30B A3B until Cloudflare retired it on 2026-11-20.
 */
export const MODEL = '@cf/google/gemma-4-26b-a4b-it'

/** What `MODEL` costs past Workers AI's free 10,000 neurons a day (its model page, 2026-11). */
export const PRICES: Prices = { input: 0.1, output: 0.3 }

/** The caps when the vars set none, US dollars a day: a turn costs about a tenth of a cent. */
export const DEFAULT_DAILY_USD = 1
export const DEFAULT_USER_DAILY_USD = 0.1

/** A response's token counts, as Workers AI's `usage` has them. */
export interface Usage {
  readonly prompt_tokens?: number | undefined
  readonly completion_tokens?: number | undefined
}

/** What `usage` cost on `prices`, US dollars. */
export function costOf(usage: Usage | undefined, prices: Prices = PRICES): number {
  return (
    ((usage?.prompt_tokens ?? 0) * prices.input + (usage?.completion_tokens ?? 0) * prices.output) /
    1_000_000
  )
}

/** A positive number of dollars from a var, or the fallback. */
export function dollars(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return value !== undefined && value !== '' && Number.isFinite(n) && n >= 0 ? n : fallback
}

const day = (now: Date) => now.toISOString().slice(0, 10)
const siteKey = (now: Date) => `ai:spend:${day(now)}`
const userKey = (now: Date, userId: string) => `ai:spend:${day(now)}:u:${userId}`
/** A day's counters outlive it by a day, for a look the morning after. */
const TTL = 2 * 24 * 60 * 60

/** Today's spend so far, the site's and the user's, US dollars. */
export async function spentToday(
  kv: KVNamespace,
  userId: string,
  now = new Date(),
): Promise<{ site: number; user: number }> {
  const [site, user] = await Promise.all([kv.get(siteKey(now)), kv.get(userKey(now, userId))])
  return { site: Number(site ?? 0), user: Number(user ?? 0) }
}

/** Adds `usd` to today's counters. */
export async function addSpend(
  kv: KVNamespace,
  userId: string,
  usd: number,
  now = new Date(),
): Promise<void> {
  if (!(usd > 0)) return
  const { site, user } = await spentToday(kv, userId, now)
  await Promise.all([
    kv.put(siteKey(now), String(site + usd), { expirationTtl: TTL }),
    kv.put(userKey(now, userId), String(user + usd), { expirationTtl: TTL }),
  ])
}
