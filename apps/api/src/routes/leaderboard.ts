import { type Leaderboard, STATS_TTL_SECONDS } from '@asmbots/protocol'
import { Hono } from 'hono'
import { readLeaderboard } from '../db/leaderboard'
import type { AppEnv, Env } from '../env'
import { kvCached } from '../kv-cache'

/** Where KV keeps the leaderboard. */
export const LEADERBOARD_KEY = 'leaderboard'

/** The leaderboard as of `now` (ms), from KV while it is younger than `STATS_TTL_SECONDS`. */
export function leaderboardOf(env: Env, now: number): Promise<Leaderboard> {
  return kvCached(env.KV, LEADERBOARD_KEY, STATS_TTL_SECONDS, now, () =>
    readLeaderboard(env.DB, new Date(now)),
  )
}

/**
 * `GET /api/leaderboard` (PRODUCT_SPEC §12): every user ranked, the house apart, each with their
 * badges. From KV while it is younger than 5 min, as the stats; a browser keeps it a minute.
 */
export const leaderboard = new Hono<AppEnv>().get('/', async (c) => {
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(await leaderboardOf(c.env, Date.now()))
})
