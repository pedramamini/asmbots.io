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
  readonly cacheRead: number
  /** A five-minute cache write: 1.25 times the input. */
  readonly cacheWrite: number
}

const price = (input: number, output: number, cacheRead: number): Prices => ({
  input,
  output,
  cacheRead,
  cacheWrite: input * 1.25,
})

/** The models the AI mode may run, and what each costs. */
export const MODEL_PRICES: Readonly<Record<string, Prices>> = {
  'claude-haiku-4-5': price(1, 5, 0.1),
  'claude-sonnet-5-5': price(2, 10, 0.2),
  'claude-opus-5-5': price(4, 20, 0.2),
}

/** The model when `AI_MODEL` names none. */
export const DEFAULT_MODEL = 'claude-sonnet-5-5'

/** The caps when the vars set none, US dollars a day. */
export const DEFAULT_DAILY_USD = 5
export const DEFAULT_USER_DAILY_USD = 0.5

/** A response's token counts, as the API's `usage` has them. */
export interface Usage {
  readonly input_tokens: number
  readonly output_tokens: number
  readonly cache_read_input_tokens?: number | null
  readonly cache_creation_input_tokens?: number | null
}

/** What `usage` cost on `prices`, US dollars. */
export function costOf(usage: Usage, prices: Prices): number {
  const perToken = (n: number | null | undefined, rate: number) => ((n ?? 0) * rate) / 1_000_000
  return (
    perToken(usage.input_tokens, prices.input) +
    perToken(usage.output_tokens, prices.output) +
    perToken(usage.cache_read_input_tokens, prices.cacheRead) +
    perToken(usage.cache_creation_input_tokens, prices.cacheWrite)
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
