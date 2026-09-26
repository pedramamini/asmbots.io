/**
 * The launch seed's weight-class hills on the real roster, as `bun run seed:remote` seeds them:
 * each class hill takes the roster bots of its class and no other, at least two of them. `main`
 * and `tiny` are left out, a few seconds of lightweight duels the read API's tests cover.
 */
import { env, exports } from 'cloudflare:workers'
import { loadRoster, ROSTER } from '@asmbots/bots'
import {
  HillList,
  OPEN_WEIGHT,
  parse,
  type ReplayConfig,
  WEIGHT_CLASSES,
  type WeightClass,
  weightClassOf,
} from '@asmbots/protocol'
import { beforeAll, describe, expect, it } from 'vitest'
import { applySeed, buildSeed, fits, SEED_HILLS } from '../src/db/seed'

const roster = loadRoster()
const SOURCES = ROSTER.filter((e) => e.tier !== 'test').map((e) => ({
  slug: e.slug,
  source: roster.get(e.slug)?.source ?? '',
  melee: e.tier === 'showcase',
}))

beforeAll(async () => {
  const hills = SEED_HILLS.filter((h) => h.slug !== 'main' && h.slug !== 'tiny')
  await applySeed(env, await buildSeed(SOURCES, { hills }))
}, 60_000)

async function hillList(): Promise<HillList> {
  const res = await exports.default.fetch(new Request('https://asmbots.test/api/hills'))
  expect(res.status).toBe(200)
  return parse(HillList, await res.json(), '/api/hills')
}

/** The sizes of the bots on the hill `slug`. */
async function sizesOn(slug: string): Promise<number[]> {
  const { results } = await env.DB.prepare(
    `SELECT v.size FROM hill_entries e JOIN bot_versions v ON v.id = e.bot_version_id
     JOIN hills h ON h.id = e.hill_id WHERE h.slug = ?`,
  )
    .bind(slug)
    .all<{ size: number }>()
  return results.map((r) => r.size)
}

const CLASS_HILLS: readonly [string, WeightClass][] = [
  ['middleweight', WEIGHT_CLASSES[1]],
  ['heavyweight', WEIGHT_CLASSES[2]],
  ['super-heavy', WEIGHT_CLASSES[3]],
  ['open-weight', OPEN_WEIGHT],
]

describe('the weight-class hills', () => {
  it.each(CLASS_HILLS)('seeds %s with its class bounds and its bots', async (slug, c) => {
    const summary = (await hillList()).hills.find((h) => h.hill.slug === slug)
    expect(summary?.hill.config).toMatchObject({
      maxCycles: 80_000,
      minBotBytes: c.min,
      maxBotBytes: c.max,
      minSpacing: c.minSpacing,
    })
    expect(summary).toMatchObject({ hill: { size: slug === 'open-weight' ? 32 : 16, rounds: 10 } })
    expect(summary?.hill.scoring).toBe('duel')
    expect(summary?.entrants).toBeGreaterThanOrEqual(2)
    const sizes = await sizesOn(slug)
    expect(sizes.every((n) => n >= c.min && n <= c.max)).toBe(true)
  })

  it('mixes every class on open weight', async () => {
    const classes = new Set((await sizesOn('open-weight')).map((n) => weightClassOf(n)?.slug))
    expect(classes.size).toBe(WEIGHT_CLASSES.length)
  })

  it('keeps melee lightweight', async () => {
    const summary = (await hillList()).hills.find((h) => h.hill.slug === 'melee')
    expect(summary?.hill.config.maxBotBytes).toBe(512)
    expect(summary?.entrants).toBeGreaterThanOrEqual(2)
    expect(Math.max(...(await sizesOn('melee')))).toBeLessThanOrEqual(512)
  })
})

describe('fits', () => {
  const main = SEED_HILLS.find((h) => h.slug === 'main')?.config as ReplayConfig
  const config: ReplayConfig = { ...main, minBotBytes: 513, maxBotBytes: 1024 }
  it.each([
    [512, false],
    [513, true],
    [1024, true],
    [1025, false],
  ])('a %i-byte bot fits 513..1024: %s', (size, want) => {
    expect(fits(size, config)).toBe(want)
  })

  it('takes a config with no floor as 1', () => {
    const { minBotBytes: _, ...noFloor } = config
    expect(fits(1, noFloor)).toBe(true)
  })
})
