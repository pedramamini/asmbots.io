/**
 * The leaderboard and the badges (`GET /api/leaderboard`, PRODUCT_SPEC §12): each user's numbers
 * (`PlayerFacts`), read in one D1 batch and summed here, then ranked, then awarded their badges.
 * Bot numbers count a user's public bots; match, hill, and championship numbers count every bot
 * they own, since those results are public on the hill and tournament pages. Deleted bots count
 * nowhere. The house (the `system` user, owner of the roster) has a row and no rank or badges.
 */
import {
  awardBadges,
  DELETED_HANDLE,
  type Leaderboard,
  type LeaderRow,
  type MatchOutcome,
  type PlayerFacts,
  weightClassOf,
} from '@asmbots/protocol'
import { toUser, type UserRow } from './queries'
import { SYSTEM_USER } from './seed'

/** Matches of at least this many rounds can be flawless. */
const FLAWLESS_ROUNDS = 5

interface BotRow {
  owner_id: string
  visibility: string
  size: number | null
  versions: number
}

interface VersionRow {
  id: string
  size: number
  owner_id: string
}

interface MatchRow {
  participants_json: string
  result_json: string
  rounds: number
}

interface EntryRow {
  bot_version_id: string
  rank: number
  reign: number | null
}

interface TournamentEntryRow {
  bot_version_id: string
  tournament_id: string
  championship: number
  champion_id: string | null
}

/** A user's running totals, before they are ranked. */
type Tally = {
  -readonly [K in keyof PlayerFacts]: PlayerFacts[K]
} & {
  ties: number
  losses: number
  bestRank: number | null
}

function emptyTally(joinedAt: string, since: string, at: string): Tally {
  return {
    bots: 0,
    versions: 0,
    biggest: null,
    smallest: null,
    classes: 0,
    mostVersions: 0,
    matches: 0,
    wins: 0,
    ties: 0,
    losses: 0,
    kills: 0,
    fastestKill: null,
    rounds: 0,
    survived: 0,
    cycles: 0,
    flawless: 0,
    giantKills: 0,
    lastStanding: 0,
    challenges: 0,
    entries: 0,
    kings: 0,
    reign: null,
    bestRank: null,
    crowns: 0,
    tournaments: 0,
    championships: 0,
    titles: 0,
    joinedAt,
    since,
    at,
  }
}

const least = (a: number | null, b: number) => (a === null ? b : Math.min(a, b))
const most = (a: number | null, b: number) => (a === null ? b : Math.max(a, b))

/** The leaderboard as of `now`. */
export async function readLeaderboard(db: D1Database, now: Date): Promise<Leaderboard> {
  const [users, bots, versions, matches, entries, crowns, submissions, tournaments] =
    await db.batch<Record<string, unknown>>([
      db.prepare('SELECT * FROM users WHERE handle <> ? ORDER BY created_at').bind(DELETED_HANDLE),
      db.prepare(
        `SELECT b.owner_id, b.visibility,
           (SELECT v.size FROM bot_versions v WHERE v.bot_id = b.id ORDER BY v.version DESC LIMIT 1)
             AS size,
           (SELECT COUNT(*) FROM bot_versions v WHERE v.bot_id = b.id) AS versions
         FROM bots b WHERE b.deleted_at IS NULL`,
      ),
      db.prepare(
        `SELECT v.id, v.size, b.owner_id FROM bot_versions v JOIN bots b ON b.id = v.bot_id
         WHERE b.deleted_at IS NULL`,
      ),
      db.prepare(
        'SELECT participants_json, result_json, rounds FROM matches WHERE result_json IS NOT NULL',
      ),
      db.prepare('SELECT bot_version_id, rank, reign FROM hill_entries'),
      db.prepare(
        `SELECT bot_version_id FROM hill_history
         WHERE event = 'entered' AND rank = 1 AND submission_id IS NOT NULL`,
      ),
      db.prepare(
        `SELECT user_id, COUNT(*) AS n FROM hill_submissions WHERE status = 'finished'
         GROUP BY user_id`,
      ),
      db.prepare(
        `SELECT e.bot_version_id, e.tournament_id, t.owner_id IS NULL AS championship,
           t.champion_id
         FROM tournament_entries e JOIN tournaments t ON t.id = e.tournament_id
         WHERE t.status = 'finished'`,
      ),
    ])
  const rows = <T>(result: D1Result<Record<string, unknown>> | undefined) =>
    (result?.results ?? []) as unknown as T[]
  const userRows = rows<UserRow>(users)
  const at = now.toISOString()
  const since = userRows[0]?.created_at ?? at
  const tallies = new Map(userRows.map((u) => [u.id, emptyTally(u.created_at, since, at)]))
  const version = new Map(rows<VersionRow>(versions).map((v) => [v.id, v]))
  /** The tally of version `id`'s owner, if the version is a living bot's. */
  const ownerOf = (id: string | undefined) => {
    const v = id === undefined ? undefined : version.get(id)
    return v === undefined ? undefined : tallies.get(v.owner_id)
  }

  const classes = new Map<string, Set<string>>()
  for (const b of rows<BotRow>(bots)) {
    const t = tallies.get(b.owner_id)
    if (t === undefined || b.visibility !== 'public') continue
    t.bots++
    t.versions += b.versions
    t.mostVersions = Math.max(t.mostVersions, b.versions)
    if (b.size === null) continue
    t.biggest = most(t.biggest, b.size)
    t.smallest = least(t.smallest, b.size)
    const weight = weightClassOf(b.size)
    if (weight === null) continue
    const set = classes.get(b.owner_id) ?? new Set()
    set.add(weight.slug)
    classes.set(b.owner_id, set)
    t.classes = set.size
  }

  for (const m of rows<MatchRow>(matches)) {
    const ids = JSON.parse(m.participants_json) as string[]
    const { points, rounds = [] } = JSON.parse(m.result_json) as MatchOutcome
    const top = Math.max(...points)
    const tops = points.filter((p) => p === top).length
    const duel = ids.length === 2
    ids.forEach((id, at) => {
      const t = ownerOf(id)
      if (t === undefined) return
      t.matches++
      const p = points[at] ?? 0
      const won = p === top && tops === 1
      if (won) t.wins++
      else if (p === top) t.ties++
      else t.losses++
      if (won && duel) {
        const other = 1 - at
        if ((points[other] ?? 0) === 0 && m.rounds >= FLAWLESS_ROUNDS) t.flawless++
        const mine = version.get(id)?.size ?? 0
        const theirs = version.get(ids[other] ?? '')?.size ?? 0
        if (mine > 0 && theirs >= 2 * mine) t.giantKills++
      }
      for (const round of rounds) {
        t.rounds++
        const alive = round.survivors.includes(at)
        if (alive) t.survived++
        t.cycles += round.survival[at] ?? 0
        if (!alive || round.survivors.length !== 1) continue
        if (duel) {
          t.kills++
          t.fastestKill = least(t.fastestKill, round.survival[1 - at] ?? 0)
        } else {
          t.lastStanding++
        }
      }
    })
  }

  for (const e of rows<EntryRow>(entries)) {
    const t = ownerOf(e.bot_version_id)
    if (t === undefined) continue
    t.entries++
    t.bestRank = least(t.bestRank, e.rank)
    if (e.rank === 1) {
      t.kings++
      t.reign = most(t.reign, e.reign ?? 0)
    }
  }
  for (const c of rows<{ bot_version_id: string }>(crowns)) {
    const t = ownerOf(c.bot_version_id)
    if (t !== undefined) t.crowns++
  }
  for (const s of rows<{ user_id: string; n: number }>(submissions)) {
    const t = tallies.get(s.user_id)
    if (t !== undefined) t.challenges = s.n
  }
  const entered = new Map<Tally, Set<string>>()
  for (const e of rows<TournamentEntryRow>(tournaments)) {
    const t = ownerOf(e.bot_version_id)
    if (t === undefined) continue
    const set = entered.get(t) ?? new Set()
    if (set.has(e.tournament_id)) continue
    set.add(e.tournament_id)
    entered.set(t, set)
    t.tournaments++
    if (e.championship === 1) {
      t.championships++
      if (e.champion_id !== null && ownerOf(e.champion_id) === t) t.titles++
    }
  }

  const row = (u: UserRow, rank: number | null, badges: LeaderRow['badges']): LeaderRow => {
    const t = tallies.get(u.id) as Tally
    return {
      user: toUser(u),
      rank,
      bots: t.bots,
      versions: t.versions,
      biggest: t.biggest,
      smallest: t.smallest,
      matches: t.matches,
      wins: t.wins,
      ties: t.ties,
      losses: t.losses,
      kills: t.kills,
      rounds: t.rounds,
      survived: t.survived,
      cycles: t.cycles,
      entries: t.entries,
      kings: t.kings,
      bestRank: t.bestRank,
      challenges: t.challenges,
      championships: t.championships,
      titles: t.titles,
      badges,
    }
  }

  const house = userRows.find((u) => u.id === SYSTEM_USER.id)
  const players = userRows
    .filter((u) => u !== house)
    .sort((a, b) => {
      const x = tallies.get(a.id) as Tally
      const y = tallies.get(b.id) as Tally
      return (
        y.wins - x.wins ||
        y.kings - x.kings ||
        y.matches - x.matches ||
        a.handle.localeCompare(b.handle)
      )
    })
  const badges = awardBadges(players.map((u) => tallies.get(u.id) as Tally))
  return {
    at,
    users: players.map((u, i) => row(u, i + 1, badges[i] ?? [])),
    house: house === undefined ? null : row(house, null, []),
  }
}
