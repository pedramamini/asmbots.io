/**
 * `GET /api/leaderboard`: each user's numbers (public bots for the bot numbers, every living bot
 * for the rest), the rank by wins, the house apart, the badges; the profile's badges; the cache.
 */
import { env } from 'cloudflare:workers'
import { Leaderboard, parse, UserDetail } from '@asmbots/protocol'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { LEADERBOARD_KEY } from '../src/routes/leaderboard'
import { send } from './fake-auth'
import { Jar } from './jar'

const SHA = 'ab'.repeat(32)

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

const result = (points: number[], rounds: ReturnType<typeof round>[]) =>
  JSON.stringify({ points, survivors: [0], resultHash: '0'.repeat(16), rounds })

beforeAll(async () => {
  const run = (sql: string, ...values: unknown[]) => env.DB.prepare(sql).bind(...values)
  await env.DB.batch([
    run(
      `INSERT INTO users (id, github_id, handle, created_at) VALUES
         ('system', NULL, 'system', '2026-09-01T00:00:00.000Z'),
         ('u1', 1, 'ada', '2026-09-02T00:00:00.000Z'),
         ('u2', 2, 'bob', '2026-09-03T00:00:00.000Z'),
         ('u3', 3, 'cyd', '2026-09-04T00:00:00.000Z')`,
    ),
    run(
      `INSERT INTO bots (id, owner_id, slug, name, visibility, deleted_at) VALUES
         ('b-imp', 'system', 'imp', 'Imp', 'public', NULL),
         ('b-tiny', 'u1', 'tiny', 'Tiny', 'public', NULL),
         ('b-big', 'u1', 'big', 'Big', 'private', NULL),
         ('b-huge', 'u2', 'huge', 'Huge', 'public', NULL),
         ('b-gone', 'u2', 'gone', 'Gone', 'public', '2026-09-05T00:00:00.000Z')`,
    ),
    run(
      `INSERT INTO bot_versions (id, bot_id, version, source, bytes_sha256, size, isa) VALUES
         ('v-imp', 'b-imp', 1, '', ?1, 4, 'x16c-v1'),
         ('v-tiny', 'b-tiny', 1, '', ?1, 8, 'x16c-v1'),
         ('v-big', 'b-big', 1, '', ?1, 3000, 'x16c-v1'),
         ('v-huge1', 'b-huge', 1, '', ?1, 30, 'x16c-v1'),
         ('v-huge2', 'b-huge', 2, '', ?1, 2500, 'x16c-v1'),
         ('v-gone', 'b-gone', 1, '', ?1, 1, 'x16c-v1')`,
      SHA,
    ),
    run(
      `INSERT INTO hills (id, slug, name, size, rounds, config_json) VALUES
         ('h-main', 'main', 'main', 8, 5, '{"maxBotBytes":512}')`,
    ),
    run(
      `INSERT INTO hill_entries (hill_id, bot_version_id, rank, reign) VALUES
         ('h-main', 'v-tiny', 1, 3), ('h-main', 'v-huge2', 2, NULL)`,
    ),
    run(
      `INSERT INTO hill_submissions (id, hill_id, bot_version_id, user_id, status) VALUES
         ('s1', 'h-main', 'v-tiny', 'u1', 'finished'), ('s2', 'h-main', 'v-huge2', 'u2', 'finished'),
         ('s3', 'h-main', 'v-huge2', 'u2', 'failed')`,
    ),
    run(
      `INSERT INTO hill_history (id, hill_id, submission_id, event, bot_version_id, rank, score)
       VALUES ('e1', 'h-main', 's1', 'entered', 'v-tiny', 1, 10)`,
    ),
    // Tiny (8 B, ada's) beats Huge (2,500 B, bob's) 5 rounds to none, killing it at cycle 33 once.
    run(
      `INSERT INTO matches (id, hill_id, a_version_id, b_version_id, participants_json, rounds, seed,
         result_json, finished_at) VALUES ('m1', 'h-main', 'v-tiny', 'v-huge2', ?1, 5, 1, ?2, '2026-09-05')`,
      JSON.stringify(['v-tiny', 'v-huge2']),
      result([15, 0], [round(0, [0], [34, 33], 34), round(1, [0, 1], [900, 900], 900)]),
    ),
    // A melee: the imp (the house's) is the only one left.
    run(
      `INSERT INTO matches (id, participants_json, rounds, seed, result_json, finished_at)
       VALUES ('m2', ?1, 1, 1, ?2, '2026-09-06')`,
      JSON.stringify(['v-tiny', 'v-huge2', 'v-imp']),
      result([0, 0, 3], [round(0, [2], [5, 6, 7], 7)]),
    ),
    // A match against a deleted bot counts for the living side only (bob's both).
    run(
      `INSERT INTO matches (id, a_version_id, b_version_id, participants_json, rounds, seed,
         result_json, finished_at) VALUES ('m3', 'v-gone', 'v-huge2', ?1, 1, 1, ?2, '2026-09-06')`,
      JSON.stringify(['v-gone', 'v-huge2']),
      result([3, 0], [round(0, [0], [10, 9], 10)]),
    ),
    run(
      `INSERT INTO tournaments (id, slug, name, kind, status, config_json, owner_id, champion_id)
       VALUES ('t1', 'weekly-1', 'weekly', 'roundrobin', 'finished', '{}', NULL, 'v-huge2'),
              ('t2', 'mine', 'mine', 'roundrobin', 'finished', '{}', 'u1', 'v-tiny')`,
    ),
    run(
      `INSERT INTO tournament_entries (tournament_id, bot_version_id) VALUES
         ('t1', 'v-huge2'), ('t1', 'v-tiny'), ('t2', 'v-tiny'), ('t2', 'v-big')`,
    ),
  ])
})

afterEach(async () => {
  await env.KV.delete(LEADERBOARD_KEY)
})

async function board(): Promise<Leaderboard> {
  const res = await send(new Jar(), '/api/leaderboard')
  expect(res.status).toBe(200)
  return parse(Leaderboard, await res.json(), 'the leaderboard')
}

describe('GET /api/leaderboard', () => {
  it('ranks the users by wins, and keeps the house apart', async () => {
    const { users, house } = await board()
    expect(users.map((u) => [u.user.handle, u.rank])).toEqual([
      ['ada', 1],
      ['bob', 2],
      ['cyd', 3],
    ])
    expect(house?.user.handle).toBe('system')
    expect(house?.rank).toBeNull()
    expect(house?.badges).toEqual([])
  })

  it("counts public bots for the bot numbers, and every living bot's matches", async () => {
    const [ada, bob] = (await board()).users
    expect(ada).toMatchObject({
      bots: 1,
      versions: 1,
      biggest: 8,
      smallest: 8,
      matches: 2,
      wins: 1,
      losses: 1,
      kills: 1,
      rounds: 3,
      survived: 2,
      entries: 1,
      kings: 1,
      bestRank: 1,
      challenges: 1,
      championships: 1,
      titles: 0,
    })
    // The deleted bot is in no number; the living bot it fought counts that match.
    expect(bob).toMatchObject({
      bots: 1,
      versions: 2,
      biggest: 2500,
      matches: 3,
      wins: 0,
      losses: 3,
      rounds: 4,
      kills: 0,
      bestRank: 2,
      challenges: 1,
      titles: 1,
    })
  })

  it('awards the badges', async () => {
    const [ada, bob, cyd] = (await board()).users
    const ids = (row: typeof ada) => row?.badges.map((b) => b.id) ?? []
    expect(ids(ada)).toEqual(
      expect.arrayContaining([
        'atom',
        'top-gun',
        'reaper',
        'quickdraw',
        'long-live',
        'warlord',
        'hello-world',
        'one-liner',
        'first-blood',
        'flawless',
        'giant-killer',
        'usurper',
        'king',
        'in-the-ring',
        'day-one',
      ]),
    )
    expect(ada?.badges.find((b) => b.id === 'quickdraw')?.value).toBe(33)
    expect(ids(bob)).toEqual(
      expect.arrayContaining([
        'heavy-metal',
        'tinkerer',
        'workhorse',
        'big-iron',
        'champion',
        'on-the-board',
      ]),
    )
    expect(ids(bob)).not.toContain('king')
    // Both have 1 bot: the fleet admiral is both. Cyd has nothing but day one.
    expect(ids(ada)).toContain('fleet')
    expect(ids(bob)).toContain('fleet')
    expect(ids(cyd)).toEqual(['day-one'])
  })

  it("gives a profile the user's badges", async () => {
    const res = await send(new Jar(), '/api/users/ada')
    const detail = parse(UserDetail, await res.json(), 'the user')
    expect(detail.badges.map((b) => b.id)).toContain('king')
    const house = parse(
      UserDetail,
      await (await send(new Jar(), '/api/users/system')).json(),
      'the house',
    )
    expect(house.badges).toEqual([])
  })

  it('answers from KV until the copy is 5 minutes old', async () => {
    const first = await board()
    await env.DB.prepare("INSERT INTO users (id, github_id, handle) VALUES ('u9', 9, 'late')").run()
    expect((await board()).users).toHaveLength(first.users.length)
    await env.KV.delete(LEADERBOARD_KEY)
    expect((await board()).users).toHaveLength(first.users.length + 1)
    await env.DB.prepare("DELETE FROM users WHERE id = 'u9'").run()
  })
})
