import type { ChampionshipList } from '@asmbots/protocol'
import { Hono } from 'hono'
import { nextChampionshipStart } from '../championship'
import { listChampionships, listUpcomingChampionships, MAX_LIMIT } from '../db/queries'
import type { AppEnv } from '../env'
import { wholeParam } from '../params'

/** The starts `schedule` names: the next eight Fridays. */
const SCHEDULED_WEEKS = 8

/** The next `n` championship starts after `now`, the soonest first. */
export function championshipSchedule(now: Date, n = SCHEDULED_WEEKS): string[] {
  const starts: string[] = []
  for (let at = now; starts.length < n; ) {
    at = nextChampionshipStart(at)
    starts.push(at.toISOString())
  }
  return starts
}

/**
 * `GET /api/championships?limit=`: the championships page's feed. The championships not finished
 * yet, the next starts, and the finished championships with their champions, the latest first;
 * `limit` (1..100, 20 when left out) caps the finished ones. A championship lands there when its
 * `Runner` finishes it.
 */
export const championships = new Hono<AppEnv>().get('/', async (c) => {
  const limit = wholeParam(c.req.query('limit'), 'the limit', 1, MAX_LIMIT, 20)
  const [upcoming, finished] = await Promise.all([
    listUpcomingChampionships(c.env.DB),
    listChampionships(c.env.DB, limit),
  ])
  return c.json({
    upcoming,
    schedule: championshipSchedule(new Date()),
    championships: finished,
  } satisfies ChampionshipList)
})
