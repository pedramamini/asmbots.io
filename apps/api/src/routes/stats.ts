import { STATS_TTL_SECONDS } from '@asmbots/protocol'
import { Hono } from 'hono'
import { readSiteStats } from '../db/stats'
import type { AppEnv } from '../env'
import { kvCached } from '../kv-cache'

/** Where KV keeps the stats. */
export const STATS_KEY = 'stats'

/**
 * `GET /api/stats` (PRODUCT_SPEC §12): the site in numbers. They come from KV while they are
 * younger than `STATS_TTL_SECONDS` (5 min), so the database reads every round of every match at
 * most once each 5 min, however many read the page; no request skips the cache. A browser keeps
 * them a minute.
 */
export const stats = new Hono<AppEnv>().get('/', async (c) => {
  const now = Date.now()
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(
    await kvCached(c.env.KV, STATS_KEY, STATS_TTL_SECONDS, now, () =>
      readSiteStats(c.env.DB, new Date(now)),
    ),
  )
})
