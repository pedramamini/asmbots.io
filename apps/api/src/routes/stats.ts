import { type SiteStats, STATS_TTL_SECONDS } from '@asmbots/protocol'
import { Hono } from 'hono'
import { readSiteStats } from '../db/stats'
import type { AppEnv } from '../env'

/** Where KV keeps the stats. */
export const STATS_KEY = 'stats'

/** The stats as KV keeps them, with when they were read (ms since the epoch). */
interface CachedStats {
  readonly at: number
  readonly stats: SiteStats
}

/**
 * `GET /api/stats` (PRODUCT_SPEC §12): the site in numbers. They come from KV while they are
 * younger than `STATS_TTL_SECONDS` (5 min), so the database reads every round of every match at
 * most once each 5 min, however many read the page; no request skips the cache. A browser keeps
 * them a minute.
 */
export const stats = new Hono<AppEnv>().get('/', async (c) => {
  const now = Date.now()
  c.header('Cache-Control', 'public, max-age=60')
  const cached = await c.env.KV.get<CachedStats>(STATS_KEY, 'json')
  if (cached !== null && now >= cached.at && now - cached.at < STATS_TTL_SECONDS * 1000) {
    return c.json(cached.stats)
  }
  const read = await readSiteStats(c.env.DB, new Date(now))
  await c.env.KV.put(STATS_KEY, JSON.stringify({ at: now, stats: read } satisfies CachedStats), {
    expirationTtl: STATS_TTL_SECONDS * 2,
  })
  return c.json(read)
})
