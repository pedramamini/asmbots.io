/**
 * A user in numbers (`GET /api/users/:handle`, PRODUCT_SPEC §6): the bots they made and the
 * versions they saved by day, and every finished server match their bots played, with the rounds
 * in it. Over the bots the reader may list (`publicOnly` for anyone but the user), read in one D1
 * batch.
 */
import type { MatchOutcome, UserDay, UserStats } from '@asmbots/protocol'

interface DayRow {
  day: string
  n: number
}

interface VersionRow {
  id: string
  created_at: string
}

interface MatchRow {
  participants_json: string
  result_json: string
  finished_at: string | null
}

/** The bots counted: the owner's living ones, and only the public ones for anyone else. */
const OWNED = (publicOnly: boolean) =>
  `b.owner_id = ?1 AND b.deleted_at IS NULL${publicOnly ? " AND b.visibility = 'public'" : ''}`

/** User `userId`'s numbers, over their public bots when `publicOnly`. */
export async function readUserStats(
  db: D1Database,
  userId: string,
  publicOnly: boolean,
): Promise<UserStats> {
  const owned = OWNED(publicOnly)
  const [botDays, versionDays, versions, matches] = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `SELECT substr(b.created_at, 1, 10) AS day, COUNT(*) AS n FROM bots b WHERE ${owned}
         GROUP BY day`,
      )
      .bind(userId),
    db
      .prepare(
        `SELECT substr(v.created_at, 1, 10) AS day, COUNT(*) AS n
         FROM bot_versions v JOIN bots b ON b.id = v.bot_id WHERE ${owned} GROUP BY day`,
      )
      .bind(userId),
    db
      .prepare(
        `SELECT v.id, v.created_at FROM bot_versions v JOIN bots b ON b.id = v.bot_id
         WHERE ${owned}`,
      )
      .bind(userId),
    db
      .prepare(
        `SELECT m.participants_json, m.result_json, m.finished_at FROM matches m
         WHERE m.result_json IS NOT NULL AND EXISTS (
           SELECT 1 FROM json_each(m.participants_json) p
           JOIN bot_versions v ON v.id = p.value JOIN bots b ON b.id = v.bot_id WHERE ${owned})
         ORDER BY m.finished_at`,
      )
      .bind(userId),
  ])
  const rows = <T>(result: D1Result<Record<string, unknown>> | undefined) =>
    (result?.results ?? []) as unknown as T[]
  const mine = new Set(rows<VersionRow>(versions).map((v) => v.id))

  const days = new Map<string, UserDay>()
  const dayOf = (day: string) => {
    let row = days.get(day)
    if (row === undefined) {
      row = { day, bots: 0, versions: 0, matches: 0, wins: 0 }
      days.set(day, row)
    }
    return row
  }
  for (const r of rows<DayRow>(botDays)) dayOf(r.day).bots = r.n
  let versionCount = 0
  for (const r of rows<DayRow>(versionDays)) {
    dayOf(r.day).versions = r.n
    versionCount += r.n
  }

  const out = { matches: 0, wins: 0, ties: 0, losses: 0, rounds: 0, survived: 0, cycles: 0 }
  let lastAt: string | null = null
  for (const m of rows<MatchRow>(matches)) {
    const participants = JSON.parse(m.participants_json) as string[]
    const { points, rounds = [] } = JSON.parse(m.result_json) as MatchOutcome
    const top = Math.max(...points)
    const tops = points.filter((p) => p === top).length
    const day = m.finished_at === null ? null : dayOf(m.finished_at.slice(0, 10))
    if (m.finished_at !== null && (lastAt === null || m.finished_at > lastAt))
      lastAt = m.finished_at
    participants.forEach((id, at) => {
      if (!mine.has(id)) return
      out.matches++
      if (day !== null) day.matches++
      const p = points[at] ?? 0
      if (p === top && tops === 1) {
        out.wins++
        if (day !== null) day.wins++
      } else if (p === top) out.ties++
      else out.losses++
      for (const round of rounds) {
        out.rounds++
        if (round.survivors.includes(at)) out.survived++
        out.cycles += round.survival[at] ?? 0
      }
    })
  }

  for (const v of rows<VersionRow>(versions)) {
    if (lastAt === null || v.created_at > lastAt) lastAt = v.created_at
  }

  return {
    versions: versionCount,
    ...out,
    lastAt,
    days: [...days.values()].sort((a, b) => (a.day < b.day ? -1 : 1)),
  }
}
