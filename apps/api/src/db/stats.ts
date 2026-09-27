/**
 * The site in numbers (`GET /api/stats`, PRODUCT_SPEC §12): counts, a row per day, each hill, and
 * the records, read in one D1 batch. Deaths and cycles come from the rounds a match's result keeps
 * (`MatchOutcome.rounds`); a match stored without them counts its matches and rounds only.
 */
import type {
  BotLabel,
  HillScoring,
  ReplayConfig,
  SiteStats,
  StatsDay,
  StatsHill,
  StatsRecord,
} from '@asmbots/protocol'
import { listBotLabels } from './queries'

/** Every round of every finished match, one row each, with the day its match finished. */
const ROUNDS = `SELECT m.id AS match_id, substr(m.finished_at, 1, 10) AS day,
    json_array_length(x.value, '$.order') - json_array_length(x.value, '$.survivors') AS deaths,
    json_array_length(x.value, '$.survivors') AS survivors,
    json_extract(x.value, '$.durationCycles') AS cycles
  FROM matches m, json_each(m.result_json, '$.rounds') x
  WHERE m.result_json IS NOT NULL`

/** The duel rounds that ended with one bot alive: who won, and the cycle the other died. */
const KILLS = `SELECT m.id AS match_id, m.replay_key, m.hill_id, m.participants_json,
    json_extract(x.value, '$.survivors[0]') AS winner,
    json_extract(x.value, '$.survival[' || (1 - json_extract(x.value, '$.survivors[0]')) || ']')
      AS died,
    json_extract(x.value, '$.durationCycles') AS cycles
  FROM matches m, json_each(m.result_json, '$.rounds') x
  WHERE m.result_json IS NOT NULL AND m.a_version_id IS NOT NULL AND m.b_version_id IS NOT NULL
    AND json_array_length(x.value, '$.survivors') = 1`

interface TotalsRow {
  since: string | null
  users: number
  builders: number
  bots: number
  roster_bots: number
  versions: number
  matches: number
  melees: number
  challenges: number
  tournaments: number
  championships: number
}

interface RoundTotalsRow {
  rounds: number
  deaths: number | null
  survivals: number | null
  cycles: number | null
}

interface DayRow {
  day: string
  matches?: number
  rounds?: number
  deaths?: number
  cycles?: number
  n?: number
}

interface HillStatsRow {
  id: string
  slug: string
  name: string
  scoring: HillScoring
  config_json: string
  entrants: number
  matches: number
  challenges: number
  crowns: number
  king_id: string | null
  reign: number | null
}

interface KillRow {
  match_id: string
  replay_key: string | null
  hill_id: string | null
  participants_json: string
  winner: number
  died: number
  cycles: number
}

interface MostRow {
  version_id: string
  n: number
}

/** A day's row with nothing in it yet. */
const emptyDay = (day: string): StatsDay => ({
  day,
  matches: 0,
  rounds: 0,
  deaths: 0,
  cycles: 0,
  users: 0,
  bots: 0,
})

/** The site in numbers as of `now`. */
export async function readSiteStats(db: D1Database, now: Date): Promise<SiteStats> {
  const [
    totals,
    roundTotals,
    sizes,
    matchDays,
    roundDays,
    userDays,
    botDays,
    hills,
    fastest,
    longest,
    most,
  ] = await db.batch<Record<string, unknown>>([
    db.prepare(
      `SELECT
           (SELECT MIN(created_at) FROM users) AS since,
           (SELECT COUNT(*) FROM users WHERE github_id IS NOT NULL) AS users,
           (SELECT COUNT(DISTINCT b.owner_id) FROM bots b JOIN users u ON u.id = b.owner_id
             WHERE b.deleted_at IS NULL AND u.github_id IS NOT NULL) AS builders,
           (SELECT COUNT(*) FROM bots WHERE deleted_at IS NULL) AS bots,
           (SELECT COUNT(*) FROM bots b JOIN users u ON u.id = b.owner_id
             WHERE b.deleted_at IS NULL AND u.github_id IS NULL AND u.id <> 'deleted') AS roster_bots,
           (SELECT COUNT(*) FROM bot_versions) AS versions,
           (SELECT COUNT(*) FROM matches WHERE result_json IS NOT NULL) AS matches,
           (SELECT COUNT(*) FROM matches WHERE result_json IS NOT NULL
             AND json_array_length(participants_json) > 2) AS melees,
           (SELECT COUNT(*) FROM hill_submissions WHERE status = 'finished') AS challenges,
           (SELECT COUNT(*) FROM tournaments WHERE status = 'finished') AS tournaments,
           (SELECT COUNT(*) FROM tournaments WHERE status = 'finished' AND owner_id IS NULL)
             AS championships`,
    ),
    db.prepare(
      `SELECT (SELECT COALESCE(SUM(rounds), 0) FROM matches WHERE result_json IS NOT NULL) AS rounds,
           SUM(deaths) AS deaths, SUM(survivors) AS survivals, SUM(cycles) AS cycles
         FROM (${ROUNDS})`,
    ),
    db.prepare(
      `SELECT v.size, COUNT(*) AS bots FROM bots b JOIN bot_versions v ON v.bot_id = b.id
         WHERE b.deleted_at IS NULL
           AND v.version = (SELECT MAX(version) FROM bot_versions WHERE bot_id = b.id)
         GROUP BY v.size ORDER BY v.size`,
    ),
    db.prepare(
      `SELECT substr(finished_at, 1, 10) AS day, COUNT(*) AS matches, SUM(rounds) AS rounds
         FROM matches WHERE result_json IS NOT NULL AND finished_at IS NOT NULL GROUP BY day`,
    ),
    db.prepare(
      `SELECT day, SUM(deaths) AS deaths, SUM(cycles) AS cycles FROM (${ROUNDS})
         WHERE day IS NOT NULL GROUP BY day`,
    ),
    db.prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM users
         WHERE github_id IS NOT NULL GROUP BY day`,
    ),
    db.prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS n FROM bots
         WHERE deleted_at IS NULL GROUP BY day`,
    ),
    db.prepare(
      `SELECT h.id, h.slug, h.name, h.scoring, h.config_json,
           (SELECT COUNT(*) FROM hill_entries e WHERE e.hill_id = h.id) AS entrants,
           (SELECT COUNT(*) FROM matches m WHERE m.hill_id = h.id AND m.result_json IS NOT NULL)
             AS matches,
           (SELECT COUNT(*) FROM hill_submissions s WHERE s.hill_id = h.id AND s.status = 'finished')
             AS challenges,
           (SELECT COUNT(*) FROM hill_history x WHERE x.hill_id = h.id AND x.event = 'entered'
             AND x.rank = 1) AS crowns,
           k.bot_version_id AS king_id, k.reign
         FROM hills h LEFT JOIN hill_entries k ON k.hill_id = h.id AND k.rank = 1
         ORDER BY h.created_at, h.slug`,
    ),
    db.prepare(`${KILLS} ORDER BY died ASC, m.finished_at ASC, m.id LIMIT 1`),
    db.prepare(`${KILLS} ORDER BY cycles DESC, m.finished_at ASC, m.id LIMIT 1`),
    db.prepare(
      `SELECT MAX(v.id) AS version_id, COUNT(*) AS n
         FROM matches m, json_each(m.participants_json) p
         JOIN bot_versions v ON v.id = p.value JOIN bots b ON b.id = v.bot_id
         WHERE m.result_json IS NOT NULL AND b.deleted_at IS NULL
         GROUP BY v.bot_id ORDER BY n DESC, v.bot_id LIMIT 1`,
    ),
  ])
  const rows = <T>(result: D1Result<Record<string, unknown>> | undefined) =>
    (result?.results ?? []) as unknown as T[]
  const t = rows<TotalsRow>(totals)[0] as TotalsRow
  const r = rows<RoundTotalsRow>(roundTotals)[0] as RoundTotalsRow
  const hillRows = rows<HillStatsRow>(hills)
  const fastestKill = rows<KillRow>(fastest)[0]
  const longestFight = rows<KillRow>(longest)[0]
  const mostRow = rows<MostRow>(most)[0]

  const kings = hillRows.filter((h) => h.king_id !== null)
  const reigning = kings.reduce<HillStatsRow | undefined>(
    (best, h) => ((h.reign ?? 0) > (best?.reign ?? -1) ? h : best),
    undefined,
  )
  const duelIds = (kill: KillRow | undefined): string[] =>
    kill === undefined ? [] : (JSON.parse(kill.participants_json) as string[])
  const labels = await listBotLabels(db, [
    ...kings.map((h) => h.king_id as string),
    ...duelIds(fastestKill),
    ...duelIds(longestFight),
    ...(mostRow === undefined ? [] : [mostRow.version_id]),
  ])
  const hillOf = new Map(hillRows.map((h) => [h.id, { slug: h.slug, name: h.name }]))

  const killRecord = (kill: KillRow | undefined, value: (k: KillRow) => number) => {
    if (kill === undefined) return null
    const ids = duelIds(kill)
    const bot = labels.get(ids[kill.winner] ?? '')
    if (bot === undefined) return null
    return {
      bot,
      other: labels.get(ids[1 - kill.winner] ?? '') ?? null,
      value: value(kill),
      hill: kill.hill_id === null ? null : (hillOf.get(kill.hill_id) ?? null),
      replayKey: kill.replay_key,
    } satisfies StatsRecord
  }

  const days = new Map<string, StatsDay>()
  const dayOf = (day: string) => {
    let row = days.get(day)
    if (row === undefined) {
      row = emptyDay(day)
      days.set(day, row)
    }
    return row
  }
  for (const d of rows<DayRow>(matchDays)) {
    Object.assign(dayOf(d.day), { matches: d.matches ?? 0, rounds: d.rounds ?? 0 })
  }
  for (const d of rows<DayRow>(roundDays)) {
    Object.assign(dayOf(d.day), { deaths: d.deaths ?? 0, cycles: d.cycles ?? 0 })
  }
  for (const d of rows<DayRow>(userDays)) dayOf(d.day).users = d.n ?? 0
  for (const d of rows<DayRow>(botDays)) dayOf(d.day).bots = d.n ?? 0

  const label = (id: string | null): BotLabel | null =>
    id === null ? null : (labels.get(id) ?? null)

  return {
    at: now.toISOString(),
    since: t.since,
    users: t.users,
    builders: t.builders,
    bots: t.bots,
    rosterBots: t.roster_bots,
    versions: t.versions,
    sizes: rows<{ size: number; bots: number }>(sizes),
    matches: t.matches,
    melees: t.melees,
    rounds: r.rounds,
    deaths: r.deaths ?? 0,
    survivals: r.survivals ?? 0,
    cycles: r.cycles ?? 0,
    challenges: t.challenges,
    tournaments: t.tournaments,
    championships: t.championships,
    days: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
    hills: hillRows.map((h): StatsHill => {
      const config = JSON.parse(h.config_json) as ReplayConfig
      return {
        slug: h.slug,
        name: h.name,
        scoring: h.scoring,
        minBotBytes: config.minBotBytes ?? 1,
        maxBotBytes: config.maxBotBytes,
        entrants: h.entrants,
        matches: h.matches,
        challenges: h.challenges,
        crowns: h.crowns,
        king: label(h.king_id),
        reign: h.king_id === null ? null : (h.reign ?? 0),
      }
    }),
    records: {
      fastestKill: killRecord(fastestKill, (k) => k.died),
      longestFight: killRecord(longestFight, (k) => k.cycles),
      longestReign:
        reigning === undefined || label(reigning.king_id) === null
          ? null
          : {
              bot: label(reigning.king_id) as BotLabel,
              other: null,
              value: reigning.reign ?? 0,
              hill: { slug: reigning.slug, name: reigning.name },
              replayKey: null,
            },
      mostMatches:
        mostRow === undefined || label(mostRow.version_id) === null
          ? null
          : {
              bot: label(mostRow.version_id) as BotLabel,
              other: null,
              value: mostRow.n,
              hill: null,
              replayKey: null,
            },
    },
  }
}
