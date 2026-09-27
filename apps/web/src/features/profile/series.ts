/**
 * A profile's numbers made into what its charts draw (PRODUCT_SPEC §6): every day from the chart's
 * first to today, the running totals of bots and versions, the weeks of the activity calendar, and
 * the rates the gauges show.
 */
import type { UserDay } from '@asmbots/protocol'
import { daysBefore, nextDay } from '../stats/series'

/** What a day of the activity calendar can count. */
export type ActivityMetric = 'versions' | 'matches' | 'wins'

/** A day with nothing in it. */
const emptyDay = (day: string): UserDay => ({ day, bots: 0, versions: 0, matches: 0, wins: 0 })

/**
 * Every day from `first` (at the latest `least` days before `today`) to `today`, a day with
 * nothing in it as zeros. `days` is oldest first, as the API sends it.
 */
export function userDays(
  days: readonly UserDay[],
  first: string,
  today: string,
  least = 0,
): UserDay[] {
  const byDay = new Map(days.map((d) => [d.day, d]))
  const starts = [first, days[0]?.day, least > 0 ? daysBefore(today, least - 1) : undefined]
  let day = starts.filter((d): d is string => d !== undefined).sort()[0] as string
  const out: UserDay[] = []
  while (day <= today) {
    out.push(byDay.get(day) ?? emptyDay(day))
    day = nextDay(day)
  }
  return out
}

/** A week of the calendar: 7 days from Monday, `null` for a day after today. */
export type Week = readonly (UserDay | null)[]

/** 0 Monday .. 6 Sunday. */
const weekday = (day: string) => (new Date(`${day}T00:00:00.000Z`).getUTCDay() + 6) % 7

/**
 * The calendar's weeks, Monday first, the last one this week: `weeks` of them, each day from
 * `days` (every day, as `userDays` gives them) or a zero day before the first.
 */
export function calendarWeeks(days: readonly UserDay[], today: string, weeks: number): Week[] {
  const byDay = new Map(days.map((d) => [d.day, d]))
  let day = daysBefore(today, weekday(today) + 7 * (weeks - 1))
  const out: Week[] = []
  for (let w = 0; w < weeks; w++) {
    const week: (UserDay | null)[] = []
    for (let d = 0; d < 7; d++) {
      week.push(day > today ? null : (byDay.get(day) ?? emptyDay(day)))
      day = nextDay(day)
    }
    out.push(week)
  }
  return out
}

/**
 * A day's shade in the calendar, 0 (nothing) to 4 (the busiest day shown): a log scale, so one
 * saved version still shows beside a day of a hundred matches.
 */
export function shade(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0
  if (max === 1) return 4
  return (1 + Math.min(3, Math.floor((3 * Math.log(value)) / Math.log(max)))) as 1 | 2 | 3 | 4
}

/** `a` over `b` as a fraction 0..1; null when `b` is 0, which a gauge draws empty with a dash. */
export const rate = (a: number, b: number) => (b === 0 ? null : a / b)
