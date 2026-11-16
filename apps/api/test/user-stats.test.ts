/**
 * `readUserStats`: the matches it counts (duels by either version column, melees by their
 * participants, each match once, the private bots for the owner only), and a query plan that
 * reaches them through the version indexes, never a scan of every match (dr3's profile, 2026-11-15).
 * The leaderboard's and the profile's match queries read a page at a time, each match once (dr3's
 * profile again: the leaderboard's one query passed D1's 50 MB result limit).
 */
import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'
import { LEADERBOARD_MATCHES_SQL } from '../src/db/leaderboard'
import { forEachPage } from '../src/db/paged'
import { MATCHES_SQL, OWNED, readUserStats } from '../src/db/user-stats'

const SHA = 'ef'.repeat(32)
const T = '2026-11-15T05:00:00.000Z'

/** A finished match's outcome. */
const outcome = (points: number[]) =>
  JSON.stringify({ points, survivors: points.map(() => 0), resultHash: '0'.repeat(16) })

beforeAll(async () => {
  const insert = (sql: string, ...values: unknown[]) => env.DB.prepare(sql).bind(...values)
  const match = (
    id: string,
    a: string | null,
    b: string | null,
    participants: string[],
    points: number[] | null,
  ) =>
    insert(
      `INSERT INTO matches (id, a_version_id, b_version_id, participants_json, rounds, seed,
         result_json, finished_at) VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
      id,
      a,
      b,
      JSON.stringify(participants),
      points && outcome(points),
      points && T,
    )
  await env.DB.batch([
    insert("INSERT INTO users (id, handle) VALUES ('us-dre', 'us-dre'), ('us-riv', 'us-riv')"),
    insert(
      `INSERT INTO bots (id, owner_id, slug, name, visibility) VALUES
       ('us-pub', 'us-dre', 'us-pub', 'Pub', 'public'),
       ('us-priv', 'us-dre', 'us-priv', 'Priv', 'private'),
       ('us-rb', 'us-riv', 'us-rb', 'Rival', 'public')`,
    ),
    insert(
      `INSERT INTO bot_versions (id, bot_id, version, source, bytes_sha256, size, isa) VALUES
       ('us-pub-1', 'us-pub', 1, 'hlt', ?1, 1, 'x16c-v1'),
       ('us-priv-1', 'us-priv', 1, 'hlt', ?1, 1, 'x16c-v1'),
       ('us-rb-1', 'us-rb', 1, 'hlt', ?1, 1, 'x16c-v1')`,
      SHA,
    ),
    // A duel won on the A side, a duel lost on the B side, a duel of two of the user's bots.
    match('us-m1', 'us-priv-1', 'us-rb-1', ['us-priv-1', 'us-rb-1'], [3, 0]),
    match('us-m2', 'us-rb-1', 'us-pub-1', ['us-rb-1', 'us-pub-1'], [3, 0]),
    match('us-m3', 'us-priv-1', 'us-pub-1', ['us-priv-1', 'us-pub-1'], [3, 0]),
    // A melee (no version columns), tied.
    match('us-m4', null, null, ['us-rb-1', 'us-priv-1', 'us-rb-1'], [1, 1, 0]),
    // Not counted: unfinished, and no bot of the user's.
    match('us-m5', 'us-priv-1', 'us-rb-1', ['us-priv-1', 'us-rb-1'], null),
    match('us-m6', 'us-rb-1', 'us-rb-1', ['us-rb-1', 'us-rb-1'], [1, 1]),
  ])
})

describe('readUserStats', () => {
  it('counts the owner’s duels on either side, melees, and each of their entrants', async () => {
    const stats = await readUserStats(env.DB, 'us-dre', false)
    expect(stats).toMatchObject({ versions: 2, matches: 5, wins: 2, ties: 1, losses: 2 })
  })

  it('counts only the public bots for anyone else', async () => {
    const stats = await readUserStats(env.DB, 'us-dre', true)
    expect(stats).toMatchObject({ versions: 1, matches: 2, wins: 0, ties: 0, losses: 2 })
  })

  it('reaches the matches through the version indexes, never a scan of every match', async () => {
    const { results } = await env.DB.prepare(`EXPLAIN QUERY PLAN ${MATCHES_SQL(OWNED(false))}`)
      .bind('us-dre', 0, 4000)
      .all<{ detail: string }>()
    const plan = results.map((r) => r.detail)
    expect(plan.some((d) => d.includes('matches_a_version'))).toBe(true)
    expect(plan.some((d) => d.includes('matches_b_version'))).toBe(true)
    // Nor a walk of every match in rowid order (the page key), which is a scan by another name.
    expect(plan.filter((d) => /^(SCAN|SEARCH) (m|matches)\b(?!.*USING INDEX)/.test(d))).toEqual([])
  })

  it('reads each of the user’s matches once, a page at a time', async () => {
    const ids: string[] = []
    await forEachPage<{ _rowid: number; finished_at: string }>(
      env.DB,
      MATCHES_SQL(OWNED(false)),
      ['us-dre'],
      (m) => ids.push(String(m._rowid)),
      1,
    )
    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
  })
})

describe('the leaderboard’s matches', () => {
  it('reads every finished match once, a page at a time', async () => {
    const { n } = (await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM matches WHERE result_json IS NOT NULL',
    ).first<{ n: number }>()) as { n: number }
    const seen = new Set<number>()
    let rows = 0
    await forEachPage<{ _rowid: number }>(
      env.DB,
      LEADERBOARD_MATCHES_SQL,
      [],
      (m) => {
        rows++
        seen.add(m._rowid)
      },
      2,
    )
    expect(n).toBeGreaterThan(2)
    expect(rows).toBe(n)
    expect(seen.size).toBe(n)
  })
})
