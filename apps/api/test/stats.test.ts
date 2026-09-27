/**
 * `GET /api/stats`: the counts (the house's bots apart, deleted bots out), the deaths and cycles
 * of the rounds a result keeps, the days, each hill and its king, the records, and the 5-minute
 * cache in KV.
 */
import { env } from 'cloudflare:workers'
import { parse, SiteStats, STATS_TTL_SECONDS } from '@asmbots/protocol'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { STATS_KEY } from '../src/routes/stats'
import { send } from './fake-auth'
import { Jar } from './jar'

const SHA = 'ab'.repeat(32)
const MAIN = JSON.stringify({ maxBotBytes: 512, coreSize: 65536 })
const HEAVY = JSON.stringify({ minBotBytes: 1025, maxBotBytes: 2048, coreSize: 65536 })

/** A round of a duel or a melee: its entrants in order, who lived, and when each died. */
function round(n: number, survivors: number[], survival: number[], durationCycles: number) {
  return {
    round: n,
    seed: n,
    order: survival.map((_, i) => i),
    resultHash: '0'.repeat(16),
    durationCycles,
    points: survival.map(() => 0),
    survivors,
    survival,
  }
}

function result(rounds: ReturnType<typeof round>[]) {
  return JSON.stringify({ points: [0, 0], survivors: [0], resultHash: '0'.repeat(16), rounds })
}

beforeAll(async () => {
  const run = (sql: string, ...values: unknown[]) => env.DB.prepare(sql).bind(...values)
  await env.DB.batch([
    run(
      `INSERT INTO users (id, github_id, handle, created_at) VALUES
         ('system', NULL, 'system', '2026-09-01T00:00:00.000Z'),
         ('u1', 1, 'pedram', '2026-09-02T10:00:00.000Z'),
         ('u2', 2, 'lurker', '2026-09-03T10:00:00.000Z')`,
    ),
    run(
      `INSERT INTO bots (id, owner_id, slug, name, visibility, created_at, deleted_at) VALUES
         ('b-imp', 'system', 'imp', 'Imp', 'public', '2026-09-01T00:00:00.000Z', NULL),
         ('b-dwarf', 'system', 'dwarf', 'Dwarf', 'public', '2026-09-01T00:00:00.000Z', NULL),
         ('b-mine', 'u1', 'mine', 'Mine', 'private', '2026-09-02T11:00:00.000Z', NULL),
         ('b-gone', 'u1', 'gone', 'Gone', 'private', '2026-09-02T12:00:00.000Z', '2026-09-03T00:00:00.000Z')`,
    ),
    run(
      `INSERT INTO bot_versions (id, bot_id, version, source, bytes_sha256, size, isa) VALUES
         ('v-imp', 'b-imp', 1, '', ?1, 4, 'x16c-v1'),
         ('v-dwarf', 'b-dwarf', 1, '', ?1, 12, 'x16c-v1'),
         ('v-mine1', 'b-mine', 1, '', ?1, 600, 'x16c-v1'),
         ('v-mine2', 'b-mine', 2, '', ?1, 1500, 'x16c-v1'),
         ('v-gone', 'b-gone', 1, '', ?1, 12, 'x16c-v1')`,
      SHA,
    ),
    run(
      `INSERT INTO hills (id, slug, name, size, rounds, config_json, created_at, scoring) VALUES
         ('h-main', 'main', 'main', 8, 2, ?1, '2026-09-01T00:00:00.000Z', 'duel'),
         ('h-heavy', 'heavyweight', 'heavyweight', 8, 1, ?2, '2026-09-02T00:00:00.000Z', 'duel')`,
      MAIN,
      HEAVY,
    ),
    run(
      `INSERT INTO hill_entries (hill_id, bot_version_id, rank, age, reign) VALUES
         ('h-main', 'v-dwarf', 1, 5, 4), ('h-main', 'v-imp', 2, 5, NULL)`,
    ),
    run(
      `INSERT INTO hill_submissions (id, hill_id, bot_version_id, user_id, status) VALUES
         ('s1', 'h-main', 'v-dwarf', 'u1', 'finished'), ('s2', 'h-main', 'v-imp', 'u1', 'failed')`,
    ),
    run(
      `INSERT INTO hill_history (id, hill_id, submission_id, event, bot_version_id, rank, score) VALUES
         ('e1', 'h-main', 's1', 'entered', 'v-dwarf', 1, 3)`,
    ),
    // A duel on main: round 0 the dwarf (entrant 0) kills the imp at cycle 40; round 1 both live.
    run(
      `INSERT INTO matches (id, hill_id, a_version_id, b_version_id, participants_json, rounds, seed,
         result_json, finished_at, replay_key) VALUES ('m1', 'h-main', 'v-dwarf', 'v-imp', ?1, 2, 1,
         ?2, '2026-09-02T12:00:00.000Z', ?3)`,
      JSON.stringify(['v-dwarf', 'v-imp']),
      result([round(0, [0], [41, 40], 41), round(1, [0, 1], [900, 900], 900)]),
      'a1'.repeat(32),
    ),
    // A duel off any hill: the imp (entrant 1) kills the dwarf at cycle 700.
    run(
      `INSERT INTO matches (id, a_version_id, b_version_id, participants_json, rounds, seed,
         result_json, finished_at, replay_key) VALUES ('m2', 'v-dwarf', 'v-imp', ?1, 1, 1, ?2,
         '2026-09-03T12:00:00.000Z', ?3)`,
      JSON.stringify(['v-dwarf', 'v-imp']),
      result([round(0, [1], [700, 701], 701)]),
      'a2'.repeat(32),
    ),
    // A melee of three: two die.
    run(
      `INSERT INTO matches (id, participants_json, rounds, seed, result_json, finished_at)
       VALUES ('m3', ?1, 1, 1, ?2, '2026-09-03T13:00:00.000Z')`,
      JSON.stringify(['v-dwarf', 'v-imp', 'v-mine2']),
      result([round(0, [2], [10, 20, 30], 30)]),
    ),
    // A match stored without its rounds (a seed before 2026-09-27): counted, with no deaths.
    run(
      `INSERT INTO matches (id, hill_id, a_version_id, b_version_id, participants_json, rounds, seed,
         result_json, finished_at) VALUES ('m4', 'h-main', 'v-dwarf', 'v-imp', ?1, 2, 1, ?2,
         '2026-09-03T14:00:00.000Z')`,
      JSON.stringify(['v-dwarf', 'v-imp']),
      JSON.stringify({ points: [2, 0], survivors: [0], resultHash: '0'.repeat(16) }),
    ),
    // Not finished: not counted.
    run(
      `INSERT INTO matches (id, participants_json, rounds, seed) VALUES ('m5', ?1, 1, 1)`,
      JSON.stringify(['v-dwarf', 'v-imp']),
    ),
    run(
      `INSERT INTO tournaments (id, slug, name, kind, status, config_json, owner_id) VALUES
         ('t1', 'weekly-1', 'weekly', 'roundrobin', 'finished', '{}', NULL),
         ('t2', 'mine', 'mine', 'roundrobin', 'finished', '{}', 'u1'),
         ('t3', 'draft', 'draft', 'roundrobin', 'draft', '{}', 'u1')`,
    ),
  ])
})

afterEach(async () => {
  vi.useRealTimers()
  await env.KV.delete(STATS_KEY)
})

async function stats(): Promise<SiteStats> {
  const res = await send(new Jar(), '/api/stats')
  expect(res.status).toBe(200)
  return parse(SiteStats, await res.json(), 'the stats')
}

describe('GET /api/stats', () => {
  it('counts the users, the bots, and the matches', async () => {
    const s = await stats()
    expect(s.since).toBe('2026-09-01T00:00:00.000Z')
    expect(s).toMatchObject({
      users: 2,
      builders: 1,
      bots: 3,
      rosterBots: 2,
      versions: 5,
      matches: 4,
      melees: 1,
      rounds: 6,
      challenges: 1,
      tournaments: 2,
      championships: 1,
    })
    expect(s.sizes).toEqual([
      { size: 4, bots: 1 },
      { size: 12, bots: 1 },
      { size: 1500, bots: 1 },
    ])
  })

  it('counts the deaths, survivals, and cycles of the rounds it keeps', async () => {
    const s = await stats()
    expect(s.deaths).toBe(1 + 0 + 1 + 2)
    expect(s.survivals).toBe(1 + 2 + 1 + 1)
    expect(s.cycles).toBe(41 + 900 + 701 + 30)
  })

  it('writes a row for each day with anything in it, oldest first', async () => {
    const s = await stats()
    expect(s.days).toEqual([
      { day: '2026-09-01', matches: 0, rounds: 0, deaths: 0, cycles: 0, users: 0, bots: 2 },
      { day: '2026-09-02', matches: 1, rounds: 2, deaths: 1, cycles: 941, users: 1, bots: 1 },
      { day: '2026-09-03', matches: 3, rounds: 4, deaths: 3, cycles: 731, users: 1, bots: 0 },
    ])
  })

  it('lists each hill with its band, its counts, and its king', async () => {
    const [main, heavy] = (await stats()).hills
    expect(main).toMatchObject({
      slug: 'main',
      scoring: 'duel',
      minBotBytes: 1,
      maxBotBytes: 512,
      entrants: 2,
      matches: 2,
      challenges: 1,
      crowns: 1,
      reign: 4,
    })
    expect(main?.king?.slug).toBe('dwarf')
    expect(heavy).toMatchObject({ minBotBytes: 1025, maxBotBytes: 2048, king: null, reign: null })
  })

  it('keeps the records', async () => {
    const { records } = await stats()
    expect(records.fastestKill).toMatchObject({
      value: 40,
      hill: { slug: 'main' },
      replayKey: 'a1'.repeat(32),
    })
    expect(records.fastestKill?.bot.slug).toBe('dwarf')
    expect(records.fastestKill?.other?.slug).toBe('imp')
    expect(records.longestFight).toMatchObject({
      value: 701,
      hill: null,
      replayKey: 'a2'.repeat(32),
    })
    expect(records.longestFight?.bot.slug).toBe('imp')
    expect(records.longestReign).toMatchObject({ value: 4, hill: { slug: 'main' } })
    expect(records.longestReign?.bot.slug).toBe('dwarf')
    expect(records.mostMatches?.value).toBe(4)
  })

  it('answers from KV for 5 minutes, then reads again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-01T00:00:00.000Z'))
    const first = await stats()
    await env.DB.prepare("INSERT INTO users (id, github_id, handle) VALUES ('u3', 3, 'late')").run()
    vi.setSystemTime(new Date(Date.parse(first.at) + STATS_TTL_SECONDS * 1000 - 1))
    expect((await stats()).users).toBe(2)
    vi.setSystemTime(new Date(Date.parse(first.at) + STATS_TTL_SECONDS * 1000))
    expect((await stats()).users).toBe(3)
    await env.DB.prepare("DELETE FROM users WHERE id = 'u3'").run()
  })
})
