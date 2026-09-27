/**
 * Every hill at a glance (`GET /api/hills/overview`): each hill's scores in rank order, its
 * matches, challenges, and crowns, when it last changed, and the newest board changes on any hill.
 * One D1 batch, then the events' bot labels.
 */
import { type HillOverview, type HillPulse, OVERVIEW_EVENTS } from '@asmbots/protocol'
import { type HillHistoryRow, listBotLabels, toHillEvent } from './queries'

interface PulseRow {
  id: string
  slug: string
  matches: number
  challenges: number
  crowns: number
  history_at: string | null
  match_at: string | null
}

type EventRow = HillHistoryRow & { hill_slug: string; hill_name: string }

/** The later of two ISO times, either of which may be missing. */
function later(a: string | null, b: string | null): string | null {
  if (a === null) return b
  if (b === null) return a
  return a > b ? a : b
}

/** Every hill's pulse and the newest `OVERVIEW_EVENTS` board changes, as of `now`. */
export async function readHillOverview(db: D1Database, now: Date): Promise<HillOverview> {
  const [pulses, scores, events] = await db.batch<Record<string, unknown>>([
    db.prepare(
      `SELECT h.id, h.slug,
           (SELECT COUNT(*) FROM matches m WHERE m.hill_id = h.id AND m.result_json IS NOT NULL)
             AS matches,
           (SELECT COUNT(*) FROM hill_submissions s WHERE s.hill_id = h.id AND s.status = 'finished')
             AS challenges,
           (SELECT COUNT(*) FROM hill_history x WHERE x.hill_id = h.id AND x.event = 'entered'
             AND x.rank = 1) AS crowns,
           (SELECT MAX(x.at) FROM hill_history x WHERE x.hill_id = h.id) AS history_at,
           (SELECT MAX(m.finished_at) FROM matches m WHERE m.hill_id = h.id) AS match_at
         FROM hills h ORDER BY h.created_at, h.slug`,
    ),
    db.prepare('SELECT hill_id, score FROM hill_entries ORDER BY hill_id, rank'),
    db
      .prepare(
        `SELECT e.*, h.slug AS hill_slug, h.name AS hill_name
           FROM hill_history e JOIN hills h ON h.id = e.hill_id
           ORDER BY e.at DESC, e.rowid DESC LIMIT ?`,
      )
      .bind(OVERVIEW_EVENTS),
  ])
  const rows = <T>(result: D1Result<Record<string, unknown>> | undefined) =>
    (result?.results ?? []) as unknown as T[]
  const byHill = new Map<string, number[]>()
  for (const { hill_id, score } of rows<{ hill_id: string; score: number }>(scores)) {
    const list = byHill.get(hill_id)
    if (list === undefined) byHill.set(hill_id, [score])
    else list.push(score)
  }
  const eventRows = rows<EventRow>(events)
  const labels = await listBotLabels(
    db,
    eventRows.map((row) => row.bot_version_id),
  )
  return {
    at: now.toISOString(),
    hills: rows<PulseRow>(pulses).map(
      (row): HillPulse => ({
        slug: row.slug,
        scores: byHill.get(row.id) ?? [],
        matches: row.matches,
        challenges: row.challenges,
        crowns: row.crowns,
        lastAt: later(row.history_at, row.match_at),
      }),
    ),
    events: eventRows.map((row) => ({
      hill: { slug: row.hill_slug, name: row.hill_name },
      event: toHillEvent(row),
      bot: labels.get(row.bot_version_id) ?? null,
    })),
  }
}
