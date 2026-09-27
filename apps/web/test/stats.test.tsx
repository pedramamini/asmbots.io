/**
 * `/stats` (src/features/stats): the day series, the classes and size bins, the short counts; and
 * the page drawing the API's numbers, its charts, its records, and its hills, a failed read too.
 */
import { describe, expect, it } from 'bun:test'
import type { SiteStats, StatsDay } from '@asmbots/protocol'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { useDom, window } from '../../../packages/ui/test/dom'
import { metricText } from '../src/features/stats/charts'
import { StatsPage } from '../src/features/stats/StatsPage'
import {
  botsByClass,
  compact,
  daysSince,
  everyDay,
  nextDay,
  percent,
  runningTotal,
  sizeBins,
  uptime,
} from '../src/features/stats/series'
import { answer, refuse, renderAt, useApiServer } from './api-server'

useDom()
window.scrollTo = () => {}

const day = (d: string, change: Partial<StatsDay> = {}): StatsDay => ({
  day: d,
  matches: 0,
  rounds: 0,
  deaths: 0,
  cycles: 0,
  users: 0,
  bots: 0,
  ...change,
})

const label = (slug: string, name: string) => ({
  botId: `b-${slug}`,
  versionId: `v-${slug}`,
  slug,
  name,
  version: 1,
  owner: 'system',
  author: null,
})

const STATS: SiteStats = {
  at: '2026-09-27T12:34:00.000Z',
  since: '2026-09-24T23:32:32.208Z',
  users: 1,
  builders: 1,
  bots: 60,
  rosterBots: 59,
  versions: 61,
  sizes: [
    { size: 4, bots: 10 },
    { size: 300, bots: 20 },
    { size: 900, bots: 15 },
    { size: 1500, bots: 10 },
    { size: 3000, bots: 5 },
  ],
  matches: 461,
  melees: 1,
  rounds: 4610,
  deaths: 3724,
  survivals: 5556,
  cycles: 142_293_242,
  challenges: 5,
  tournaments: 5,
  championships: 2,
  days: [
    day('2026-09-24', { matches: 376, rounds: 3760, deaths: 3000, cycles: 100_000_000, bots: 14 }),
    day('2026-09-25', { matches: 45, rounds: 450, deaths: 400, users: 1 }),
    day('2026-09-27', { matches: 40, rounds: 400, deaths: 324, bots: 46 }),
  ],
  hills: [
    {
      slug: 'main',
      name: 'main',
      scoring: 'duel',
      minBotBytes: 1,
      maxBotBytes: 512,
      entrants: 12,
      matches: 300,
      challenges: 5,
      crowns: 2,
      king: label('paper', 'Paper'),
      reign: 7,
    },
    {
      slug: 'heavyweight',
      name: 'heavyweight',
      scoring: 'duel',
      minBotBytes: 1025,
      maxBotBytes: 2048,
      entrants: 0,
      matches: 0,
      challenges: 0,
      crowns: 0,
      king: null,
      reign: null,
    },
  ],
  records: {
    fastestKill: {
      bot: label('stone', 'Stone'),
      other: label('imp', 'Imp'),
      value: 60,
      hill: { slug: 'main', name: 'main' },
      replayKey: 'ab'.repeat(32),
    },
    longestFight: null,
    longestReign: {
      bot: label('paper', 'Paper'),
      other: null,
      value: 7,
      hill: { slug: 'main', name: 'main' },
      replayKey: null,
    },
    mostMatches: {
      bot: label('dwarf', 'Dwarf'),
      other: null,
      value: 120,
      hill: null,
      replayKey: null,
    },
  },
}

describe('the series', () => {
  it('fills every day from the first to today, and keeps the last ones', () => {
    expect(nextDay('2026-09-30')).toBe('2026-10-01')
    const days = everyDay(STATS.days, '2026-09-28')
    expect(days.map((d) => d.day)).toEqual([
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
      '2026-09-28',
    ])
    expect(days[2]).toEqual(day('2026-09-26'))
    expect(everyDay(STATS.days, '2026-09-28', null, { limit: 2 }).map((d) => d.day)).toEqual([
      '2026-09-27',
      '2026-09-28',
    ])
    // The database's birth starts the days, when it comes before any day with something in it.
    expect(everyDay([], '2026-09-25', '2026-09-24T10:00:00.000Z')).toHaveLength(2)
    expect(everyDay([], '2026-09-25')).toEqual([])
    // A young site's chart still spans `least` days, the ones before it empty.
    const young = everyDay(STATS.days, '2026-09-28', null, { least: 30 })
    expect(young).toHaveLength(30)
    expect(young[0]?.day).toBe('2026-08-30')
    expect(young.at(-4)?.matches).toBe(45)
  })

  it('runs totals, counts days, and shortens big counts', () => {
    expect(runningTotal([1, 2, 0, 4])).toEqual([1, 3, 3, 7])
    expect(uptime('2026-09-24T00:00:00.000Z', Date.parse('2026-09-27T04:30:00.000Z'))).toBe('3d 04h')
    expect(uptime('2026-09-27T00:00:00.000Z', Date.parse('2026-09-27T14:05:00.000Z'))).toBe('14h 05m')
    expect(uptime('2026-09-27T00:00:00.000Z', Date.parse('2026-09-27T00:12:00.000Z'))).toBe('12m')
    expect(daysSince('2026-09-24T00:00:00.000Z', Date.parse('2026-09-27T01:00:00.000Z'))).toBe(3)
    expect(compact(980)).toBe('980')
    expect(compact(12_480)).toBe('12.5k')
    expect(compact(142_293_242)).toBe('142M')
    expect(compact(2_500_000)).toBe('2.5M')
    expect(compact(3_100_000_000)).toBe('3.1B')
    expect(percent(1, 3)).toBe(33)
    expect(percent(1, 0)).toBe(0)
    expect(metricText('matches', 1)).toBe('1 match')
    expect(metricText('cycles', 142_293_242)).toBe('142M cycles')
  })

  it('counts the bots of each class, and bins them by powers of two', () => {
    expect(botsByClass(STATS.sizes).map((c) => [c.slug, c.bots])).toEqual([
      ['lightweight', 30],
      ['middleweight', 15],
      ['heavyweight', 10],
      ['super-heavy', 5],
    ])
    const bins = sizeBins(STATS.sizes)
    expect(bins).toHaveLength(13)
    expect(bins[0]).toEqual({ min: 1, max: 1, bots: 0 })
    expect(bins[2]).toEqual({ min: 3, max: 4, bots: 10 })
    expect(bins[9]).toEqual({ min: 257, max: 512, bots: 20 })
    expect(bins[12]).toEqual({ min: 2049, max: 4096, bots: 5 })
    expect(bins.reduce((n, b) => n + b.bots, 0)).toBe(60)
  })
})

describe('the stats page', () => {
  useApiServer(answer('/stats', STATS))

  it('shows the headline numbers', async () => {
    await renderAt('/stats', () => <StatsPage />)
    const totals = await screen.findByRole('region', { name: 'the site in numbers' })
    expect(await within(totals).findByText('4,610')).toBeTruthy()
    expect(within(totals).getByText('3,724')).toBeTruthy()
    expect(within(totals).getByText('142M')).toBeTruthy()
    expect(within(totals).getByText('59 house · 61 versions')).toBeTruthy()
    expect(within(totals).getByText('since 2026-09-24')).toBeTruthy()
  })

  it('charts the days by the metric picked', async () => {
    await renderAt('/stats', () => <StatsPage />)
    const activity = await screen.findByRole('region', { name: 'activity' })
    const chart = await within(activity).findByRole('img', { name: /^matches a day/ })
    expect(chart.getAttribute('aria-label')).toContain('461 matches in all')
    await act(async () => {
      fireEvent.click(within(activity).getByRole('radio', { name: 'deaths' }))
    })
    expect(within(activity).getByRole('img', { name: /^deaths a day/ })).toBeTruthy()
  })

  it('splits life and death, and counts the classes', async () => {
    await renderAt('/stats', () => <StatsPage />)
    expect(
      await screen.findByRole('img', { name: '3,724 died (40%), 5,556 lived (60%)' }),
    ).toBeTruthy()
    const classes = screen.getByRole('region', { name: 'weight classes' })
    expect(
      within(classes).getByRole('img', { name: /^bots by size: 10 of 3 to 4 bytes/ }),
    ).toBeTruthy()
  })

  it('lists the records, with a link to watch a kill', async () => {
    await renderAt('/stats', () => <StatsPage />)
    const records = await screen.findByRole('region', { name: 'records' })
    expect(await within(records).findByText('60 cycles')).toBeTruthy()
    expect(within(records).getByRole('link', { name: 'Stone' })).toBeTruthy()
    expect(within(records).getByRole('link', { name: 'watch' }).getAttribute('href')).toBe(
      `/arena/${'ab'.repeat(32)}`,
    )
    expect(within(records).getByText('120 matches')).toBeTruthy()
    expect(within(records).getByText('no record yet.')).toBeTruthy()
  })

  it('lists each hill, its king and reign', async () => {
    await renderAt('/stats', () => <StatsPage />)
    const table = await screen.findByRole('table', { name: 'hills' })
    const rows = await within(table).findAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(within(rows[1] as HTMLElement).getByRole('link', { name: 'Paper' })).toBeTruthy()
    expect(within(rows[2] as HTMLElement).getByText('none')).toBeTruthy()
  })
})

describe('the stats page, when the read fails', () => {
  useApiServer(refuse('/stats', 500, 'internal', 'boom'))

  it('says so, with a retry', async () => {
    await renderAt('/stats', () => <StatsPage />)
    expect(await screen.findByRole('button', { name: 'retry' })).toBeTruthy()
  })
})
