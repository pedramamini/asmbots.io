/**
 * The stats page's numbers made into what its charts draw (PRODUCT_SPEC §12): every day from the
 * first to today, running totals, the bots by weight class, and the bots by size in powers of two.
 */
import { MAX_BOT_BYTES_ALL, type StatsDay, WEIGHT_CLASSES } from '@asmbots/protocol'

const DAY_MS = 86_400_000

/** What a day's bar can count. */
export type DayMetric = 'matches' | 'rounds' | 'deaths' | 'cycles'

/** The day after `day` (`YYYY-MM-DD`, UTC). */
export function nextDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10)
}

/** The day `n` days before `day` (`YYYY-MM-DD`, UTC). */
export function daysBefore(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) - n * DAY_MS).toISOString().slice(0, 10)
}

/**
 * Every day from the first in `days` (or `since`'s, if earlier) to `today`, a day with nothing in
 * it as zeros: at least the last `least` days, so a young site's chart is not one fat bar, and at
 * most the last `limit`. `days` is oldest first, as the API sends it.
 */
export function everyDay(
  days: readonly StatsDay[],
  today: string,
  since: string | null = null,
  { least = 0, limit = Number.POSITIVE_INFINITY }: { least?: number; limit?: number } = {},
): StatsDay[] {
  const byDay = new Map(days.map((d) => [d.day, d]))
  const firsts = [days[0]?.day, since?.slice(0, 10)].filter((d): d is string => d !== undefined)
  if (firsts.length === 0) return []
  if (least > 0) firsts.push(daysBefore(today, least - 1))
  let day = firsts.sort()[0] as string
  const out: StatsDay[] = []
  while (day <= today) {
    out.push(
      byDay.get(day) ?? { day, matches: 0, rounds: 0, deaths: 0, cycles: 0, users: 0, bots: 0 },
    )
    day = nextDay(day)
  }
  return out.slice(Math.max(0, out.length - limit))
}

/** The running total of `values`: `[1, 2, 0]` is `[1, 3, 3]`. */
export function runningTotal(values: readonly number[]): number[] {
  let sum = 0
  return values.map((v) => {
    sum += v
    return sum
  })
}

/** Whole days from `since` to `now`, at least 0. */
export function daysSince(since: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(since)) / DAY_MS))
}

/** How long from `since` to `now`, as `uptime` says it: `3d 04h`, `14h 05m`, `12m`. */
export function uptime(since: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(since)) / 60_000))
  const pad = (n: number) => String(n).padStart(2, '0')
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days > 0) return `${days}d ${pad(hours)}h`
  if (hours > 0) return `${hours}h ${pad(minutes % 60)}m`
  return `${minutes}m`
}

/** A weight class's bots. */
export interface ClassCount {
  readonly slug: (typeof WEIGHT_CLASSES)[number]['slug']
  readonly name: string
  readonly min: number
  readonly max: number
  readonly bots: number
}

/** The bots in each weight class, lightest first. A size in no class is not counted. */
export function botsByClass(sizes: readonly { size: number; bots: number }[]): ClassCount[] {
  return WEIGHT_CLASSES.map((c) => ({
    slug: c.slug,
    name: c.name,
    min: c.min,
    max: c.max,
    bots: sizes.reduce((n, s) => (s.size >= c.min && s.size <= c.max ? n + s.bots : n), 0),
  }))
}

/** A bin of the size histogram: the bots of `min` to `max` bytes. */
export interface SizeBin {
  readonly min: number
  readonly max: number
  readonly bots: number
}

/**
 * The bots by size, one bin per power of two up to the largest bot anywhere: 1, 2, 3–4, 5–8, …,
 * 2049–4096 bytes. A bin's top is a class's top from 512 up, so the classes split on bin edges.
 */
export function sizeBins(sizes: readonly { size: number; bots: number }[]): SizeBin[] {
  const bins: SizeBin[] = []
  for (let max = 1; max <= MAX_BOT_BYTES_ALL; max *= 2) {
    const min = max === 1 ? 1 : max / 2 + 1
    const bots = sizes.reduce((n, s) => (s.size >= min && s.size <= max ? n + s.bots : n), 0)
    bins.push({ min, max, bots })
  }
  return bins
}

/** `142.3M`, `12.5k`, `980`: a big count in four characters or so. */
export function compact(n: number): string {
  if (n >= 1e9) return `${trim(n / 1e9)}B`
  if (n >= 1e6) return `${trim(n / 1e6)}M`
  if (n >= 1e4) return `${trim(n / 1e3)}k`
  return n.toLocaleString('en-US')
}

/** One decimal under 100, none from 100: `142.3`, `512`. */
function trim(n: number): string {
  return n >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10)
}

/** `a` over `b` as a whole percent, 0 when `b` is 0. */
export const percent = (a: number, b: number) => (b === 0 ? 0 : Math.round((100 * a) / b))
