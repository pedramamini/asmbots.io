/**
 * The weekly championship (PRODUCT_SPEC §1, §4): an open bracket of up to 32 bots, seeded by
 * rating, with a third-place match, under the main hill's rules. It starts Fridays at 18:00 US
 * Central (`CHAMPIONSHIP_ZONE`): 23:00 UTC in daylight time, 00:00 UTC Saturday in standard time.
 * The cron (`cron.ts`, at both) starts the championship due and makes next week's, which takes
 * entries for six days: from then until the day before it, at the same hour. A championship has no
 * owner; its results go to the championships feed (`listChampionships`) when its `Runner` finishes
 * it.
 *
 * Pure: the seed script (Bun) schedules the first championship with it too.
 */
import { DEFAULT_CONFIG } from '@asmbots/engine'
import type { ReplayConfig, TournamentConfig } from '@asmbots/protocol'

const DAY_MS = 24 * 60 * 60 * 1000

/** The engine's defaults as a config: all but the seed. */
const { seed: _, ...DEFAULTS } = DEFAULT_CONFIG

/**
 * The lightweight rules of the launch seed's `main` hill: 80,000 cycles a round, bots of 1 to 512
 * bytes. The championship stays lightweight; the heavier classes have hills of their own.
 */
export const CHAMPIONSHIP_RULES: ReplayConfig = { ...DEFAULTS, maxCycles: 80_000, maxBotBytes: 512 }

/** Rounds a championship match, as the main hill's. */
export const CHAMPIONSHIP_ROUNDS = 10

/** How long before its start a championship stops taking entries: the six-day window's end. */
export const ENTRY_CLOSES_BEFORE_MS = DAY_MS

/** The championship's clock: US Central, daylight time and standard time. */
export const CHAMPIONSHIP_ZONE = 'America/Chicago'

/** The championship's start: Fridays (`getUTCDay` 5), 18:00 in `CHAMPIONSHIP_ZONE`. */
const START_DAY = 5
const START_HOUR = 18

const ZONE_CLOCK = new Intl.DateTimeFormat('en-US', {
  timeZone: CHAMPIONSHIP_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

/** Ms the zone's clock is ahead of UTC at `at`: negative, as the zone is west of Greenwich. */
function zoneOffset(at: number): number {
  const parts = ZONE_CLOCK.formatToParts(new Date(at))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)
  const wall = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  )
  // The clock has no milliseconds.
  return wall - Math.floor(at / 1000) * 1000
}

/** The zone's wall clock at `at`, as a UTC date: read it with `getUTC*`. */
function zoneWall(at: number): Date {
  return new Date(at + zoneOffset(at))
}

/** The instant of `hour`:00 in the zone on its day `year`-`month`-`day` (`month` from 0). */
function zoneTime(year: number, month: number, day: number, hour: number): number {
  const wall = Date.UTC(year, month, day, hour)
  return wall - zoneOffset(wall - zoneOffset(wall))
}

/** The first Friday, 18:00 US Central, after `now`: when the next championship starts. */
export function nextChampionshipStart(now: Date): Date {
  const wall = zoneWall(now.getTime())
  const friday = wall.getUTCDate() + ((START_DAY - wall.getUTCDay() + 7) % 7)
  const at = (day: number) => zoneTime(wall.getUTCFullYear(), wall.getUTCMonth(), day, START_HOUR)
  const start = at(friday)
  return new Date(start > now.getTime() ? start : at(friday + 7))
}

/** A championship's row, before it is one. */
export interface Championship {
  /** `weekly-<day>`: its id and slug. */
  readonly id: string
  readonly name: string
  readonly startsAt: string
  readonly entryClosesAt: string
  readonly config: TournamentConfig
}

/**
 * The weekly championship that starts at `startsAt`, named for its day in US Central. Its matches
 * place from a seed of that day (`20261002`), so each week draws new placements.
 */
export function weeklyChampionship(startsAt: Date): Championship {
  const day = zoneWall(startsAt.getTime()).toISOString().slice(0, 10)
  return {
    id: `weekly-${day}`,
    name: `weekly ${day}`,
    startsAt: startsAt.toISOString(),
    entryClosesAt: new Date(startsAt.getTime() - ENTRY_CLOSES_BEFORE_MS).toISOString(),
    config: {
      rounds: CHAMPIONSHIP_ROUNDS,
      seed: Number(day.replaceAll('-', '')),
      battle: CHAMPIONSHIP_RULES,
      seeding: 'rating',
      thirdPlace: true,
    },
  }
}

/**
 * The statement that makes championship `c`, scheduled and open, unless it is there already. Its
 * placeholders are plain `?`, in order: the seed script inlines them (`sqlScript`).
 */
export function championshipInsert(c: Championship): { sql: string; params: string[] } {
  return {
    sql: `INSERT INTO tournaments
            (id, slug, name, kind, status, config_json, owner_id, starts_at, entry, entry_closes_at)
          VALUES (?, ?, ?, 'bracket', 'scheduled', ?, NULL, ?, 'open', ?) ON CONFLICT DO NOTHING`,
    params: [c.id, c.id, c.name, JSON.stringify(c.config), c.startsAt, c.entryClosesAt],
  }
}
