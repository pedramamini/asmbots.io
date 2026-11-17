/**
 * The match that earned a badge (`PlayerFacts.proof`): the leaderboard and a profile give the
 * replay of the fastest kill (quickdraw) and of a match won, flawless, against a giant, or ended
 * last alive, but only a match anyone may watch: a hill's, a tournament's, or one of public bots.
 * Badges of totals have none.
 */
import { env } from 'cloudflare:workers'
import { Leaderboard, parse, UserDetail } from '@asmbots/protocol'
import { beforeAll, describe, expect, it } from 'vitest'
import { send } from './fake-auth'
import { Jar } from './jar'

const SHA = 'cd'.repeat(32)
const key = (n: number) => String(n).repeat(64)

function round(n: number, survivors: number[], survival: number[]) {
  return {
    round: n,
    seed: n,
    order: survival.map((_, i) => i),
    resultHash: '0'.repeat(16),
    durationCycles: Math.max(...survival),
    points: survival.map(() => 0),
    survivors,
    survival,
  }
}

const result = (points: number[], rounds: ReturnType<typeof round>[]) =>
  JSON.stringify({ points, survivors: [0], resultHash: '0'.repeat(16), rounds })

beforeAll(async () => {
  const run = (sql: string, ...values: unknown[]) => env.DB.prepare(sql).bind(...values)
  const match = (
    id: string,
    where: { hill?: string; tournament?: string },
    participants: string[],
    points: number[],
    rounds: ReturnType<typeof round>[],
    replay: string | null,
  ) => {
    const duel = participants.length === 2
    return run(
      `INSERT INTO matches (id, hill_id, tournament_id, a_version_id, b_version_id,
         participants_json, rounds, seed, result_json, replay_key, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, '2026-11-17')`,
      id,
      where.hill ?? null,
      where.tournament ?? null,
      duel ? participants[0] : null,
      duel ? participants[1] : null,
      JSON.stringify(participants),
      rounds.length,
      result(points, rounds),
      replay,
    )
  }
  const five = (survival: number[]) => [
    round(0, [0], survival),
    ...[1, 2, 3, 4].map((n) => round(n, [0, 1], [900, 900])),
  ]
  await env.DB.batch([
    run(
      `INSERT INTO users (id, github_id, handle) VALUES
         ('u1', 1, 'ann'), ('u2', 2, 'ben'), ('u3', 3, 'cal')`,
    ),
    run(
      `INSERT INTO bots (id, owner_id, slug, name, visibility) VALUES
         ('b-pub', 'u1', 'pub', 'Pub', 'public'), ('b-priv', 'u1', 'priv', 'Priv', 'private'),
         ('b-foe', 'u2', 'foe', 'Foe', 'public'), ('b-foe2', 'u2', 'foe2', 'Foe 2', 'public'),
         ('b-cal', 'u3', 'cal', 'Cal', 'private')`,
    ),
    run(
      `INSERT INTO bot_versions (id, bot_id, version, source, bytes_sha256, size, isa) VALUES
         ('v-pub', 'b-pub', 1, '', ?1, 8, 'x16c-v1'), ('v-priv', 'b-priv', 1, '', ?1, 10, 'x16c-v1'),
         ('v-foe', 'b-foe', 1, '', ?1, 30, 'x16c-v1'), ('v-foe2', 'b-foe2', 1, '', ?1, 40, 'x16c-v1'),
         ('v-cal', 'b-cal', 1, '', ?1, 50, 'x16c-v1')`,
      SHA,
    ),
    run(
      `INSERT INTO hills (id, slug, name, size, rounds, config_json) VALUES
         ('h-main', 'main', 'main', 8, 5, '{"maxBotBytes":512}')`,
    ),
    run(
      `INSERT INTO tournaments (id, slug, name, kind, status, config_json, owner_id)
       VALUES ('t1', 'weekly-1', 'weekly', 'roundrobin', 'finished', '{}', NULL)`,
    ),
    // A hill duel: ann's public bot wins every round of 5 against a bot 4 times its size, killing
    // it at cycle 40: first blood, flawless, giant killer, and a kill.
    match('p1', { hill: 'h-main' }, ['v-pub', 'v-foe'], [15, 0], five([900, 40]), key(1)),
    // A faster kill by ann's private bot, off the hills: no one else may watch it.
    match('p2', {}, ['v-priv', 'v-foe'], [3, 0], [round(0, [0], [900, 20])], key(2)),
    // As fast, between public bots: this one is the proof.
    match('p3', {}, ['v-pub', 'v-foe2'], [3, 0], [round(0, [0], [900, 20])], key(3)),
    // Ben's melee win, last alive, beside a private bot off the hills: no proof.
    match('p4', {}, ['v-priv', 'v-foe', 'v-foe2'], [0, 3, 0], [round(0, [1], [5, 900, 6])], key(4)),
    // The same in a championship, whose matches are public on its page.
    match(
      'p5',
      { tournament: 't1' },
      ['v-priv', 'v-foe', 'v-foe2'],
      [0, 3, 0],
      [round(0, [1], [5, 900, 6])],
      key(5),
    ),
    // Cal's private bot kills as fast as ann's, off the hills: cal shares the title, unlinked.
    match('p6', {}, ['v-cal', 'v-foe'], [3, 0], [round(0, [0], [900, 20])], key(6)),
    // A kill with no stored replay links nothing.
    match('p7', { hill: 'h-main' }, ['v-foe2', 'v-cal'], [3, 0], [round(0, [0], [900, 700])], null),
  ])
})

async function rows() {
  const res = await send(new Jar(), '/api/leaderboard')
  expect(res.status).toBe(200)
  const { users } = parse(Leaderboard, await res.json(), 'the leaderboard')
  const of = (handle: string) => {
    const row = users.find((u) => u.user.handle === handle)
    return new Map(row?.badges.map((b) => [b.id, b]))
  }
  return { ann: of('ann'), ben: of('ben'), cal: of('cal') }
}

describe('the match that earned a badge', () => {
  it('links the fastest kill to a match anyone may watch, never a private one', async () => {
    const { ann, cal } = await rows()
    expect(ann.get('quickdraw')).toEqual({ id: 'quickdraw', value: 20, replayKey: key(3) })
    expect(cal.get('quickdraw')).toEqual({ id: 'quickdraw', value: 20 })
  })

  it("links a single match's milestones to the first match anyone may watch", async () => {
    const { ann, ben } = await rows()
    expect(ann.get('first-blood')?.replayKey).toBe(key(1))
    expect(ann.get('flawless')?.replayKey).toBe(key(1))
    expect(ann.get('giant-killer')?.replayKey).toBe(key(1))
    expect(ben.get('last-standing')?.replayKey).toBe(key(5))
    expect(ben.get('first-blood')?.replayKey).toBe(key(5))
  })

  it('links no badge of totals', async () => {
    const { ann, ben } = await rows()
    for (const badges of [ann, ben]) {
      for (const b of badges.values()) {
        if (b.replayKey === undefined) continue
        expect(['quickdraw', 'first-blood', 'flawless', 'giant-killer', 'last-standing']).toContain(
          b.id,
        )
      }
    }
    expect(ann.get('hello-world')).toEqual({ id: 'hello-world', value: null })
  })

  it("gives a profile the badges' links, to anyone", async () => {
    const res = await send(new Jar(), '/api/users/ann')
    const detail = parse(UserDetail, await res.json(), 'the user')
    expect(detail.badges.find((b) => b.id === 'quickdraw')?.replayKey).toBe(key(3))
  })
})
