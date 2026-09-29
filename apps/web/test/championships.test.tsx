/**
 * `/tournaments/championships` (src/features/tournaments/ChampionshipsPage.tsx): the next week's
 * five with their entry window, the champions by week and class, the schedule, and the builders
 * with the most titles.
 */
import { describe, expect, it } from 'bun:test'
import {
  type BotLabel,
  type ChampionshipList,
  OPEN_WEIGHT,
  type Tournament,
  type TournamentSummary,
  WEIGHT_CLASSES,
  type WeightClass,
} from '@asmbots/protocol'
import { screen, within } from '@testing-library/react'
import { useDom, window } from '../../../packages/ui/test/dom'
import {
  byWeek,
  ChampionshipsPage,
  classOf,
  titleHolders,
  when,
} from '../src/features/tournaments/ChampionshipsPage'
import { answer, hang, renderAt, useApiServer } from './api-server'
import { CONFIG, DWARF, IMP, PAPER } from './fixtures/api'

useDom()
window.scrollTo = () => {}

const CLASSES: readonly WeightClass[] = [...WEIGHT_CLASSES, OPEN_WEIGHT]

/** Class `c`'s championship of the week of `day` (Central), as the cron makes it. */
function cup(day: string, c: WeightClass, change: Partial<Tournament> = {}): Tournament {
  return {
    id: `weekly-${day}-${c.slug}`,
    slug: `weekly-${day}-${c.slug}`,
    name: `weekly ${day} · ${c.name}`,
    kind: 'bracket',
    status: 'finished',
    config: {
      rounds: 10,
      seed: Number(day.replaceAll('-', '')),
      battle: { ...CONFIG, minBotBytes: c.min, maxBotBytes: c.max, minSpacing: c.minSpacing },
      seeding: 'rating',
      thirdPlace: true,
    },
    bracket: null,
    ownerId: null,
    startsAt: `${day}T23:00:00.000Z`,
    createdAt: `${day}T00:00:00.000Z`,
    entry: 'open',
    entryClosesAt: `${day}T23:00:00.000Z`,
    championId: null,
    finishedAt: `${day}T23:01:00.000Z`,
    ...change,
  }
}

const summary = (t: Tournament, champion: BotLabel | null, entrants = 4): TournamentSummary => ({
  tournament: t,
  entrants,
  done: t.status === 'finished' ? Math.max(0, entrants - 1) : 0,
  of: Math.max(0, entrants - 1),
  champion,
})

const ADA: BotLabel = { ...IMP, botId: 'b-ada', versionId: 'v-ada', name: 'Needle', owner: 'ada' }

/** Two finished weeks, the latest first as the feed has them; next week's five, open. */
const FEED: ChampionshipList = {
  upcoming: CLASSES.map((c, i) =>
    summary(
      cup('2026-10-02', c, {
        status: 'scheduled',
        finishedAt: null,
        entryClosesAt: '2099-10-01T23:00:00.000Z',
      }),
      null,
      i === 0 ? 3 : 0,
    ),
  ),
  schedule: ['2026-10-02T23:00:00.000Z', '2026-10-09T23:00:00.000Z', '2026-10-16T23:00:00.000Z'],
  championships: [
    // Open weight finished last in its week; the feed is by finish, not by class.
    summary(cup('2026-09-25', OPEN_WEIGHT), ADA, 20),
    ...WEIGHT_CLASSES.map((c) =>
      summary(cup('2026-09-25', c), c.slug === 'lightweight' ? ADA : DWARF),
    ),
    ...CLASSES.map((c) => summary(cup('2026-09-18', c), PAPER)),
  ],
}

describe('the championships feed', () => {
  it('groups by week, the classes lightest first, open weight last', () => {
    const weeks = byWeek(FEED.championships)
    expect(weeks.map((w) => w.day)).toEqual(['2026-09-25', '2026-09-18'])
    expect(weeks[0]?.championships.map((s) => classOf(s.tournament)?.slug)).toEqual(
      CLASSES.map((c) => c.slug),
    )
  })

  it("counts each builder's titles, the most first", () => {
    const holders = titleHolders(FEED.championships)
    expect(holders.map((h) => [h.owner, h.titles])).toEqual([
      ['system', 8],
      ['ada', 2],
    ])
    expect(holders[1]?.classes).toEqual(['open weight', 'lightweight'])
  })

  it('says a start in Central time', () => {
    expect(when('2026-10-02T23:00:00.000Z').central).toBe('Fri, Oct 2, 6:00 PM CDT')
    // Standard time: 18:00 Central is midnight UTC.
    expect(when('2026-11-07T00:00:00.000Z').central).toBe('Fri, Nov 6, 6:00 PM CST')
  })
})

describe('the championships page', () => {
  useApiServer(answer('/championships', FEED), hang('/tournaments/*'))

  it("shows next week's five, each open, with the clock and the entry window", async () => {
    await renderAt('/tournaments/championships', () => <ChampionshipsPage />)
    const cards = await screen.findByRole('list', { name: "this week's championships" })
    const items = within(cards).getAllByRole('listitem', { name: /weight|heavy/ })
    expect(items.map((li) => li.getAttribute('aria-label'))).toEqual(CLASSES.map((c) => c.name))
    expect(within(items[0] as HTMLElement).getByText('3 entrants')).toBeTruthy()
    expect(within(items[1] as HTMLElement).getByText('be the first to enter')).toBeTruthy()
    // Nobody is signed in.
    expect(await within(items[0] as HTMLElement).findByText(/sign in to enter/)).toBeTruthy()
    const next = screen.getByRole('region', { name: 'next championships' })
    expect(within(next).getByText('entries open')).toBeTruthy()
    expect(next.textContent).toContain('Fri, Oct 2, 6:00 PM CDT')
    expect(
      within(items[0] as HTMLElement)
        .getByRole('link', { name: 'lightweight' })
        .getAttribute('href'),
    ).toBe('/tournaments/weekly-2026-10-02-lightweight')
  })

  it('lists the champions a week a row, a class a column', async () => {
    await renderAt('/tournaments/championships', () => <ChampionshipsPage />)
    const table = await screen.findByRole('table', { name: 'champions by week' })
    const rows = (await within(table).findAllByRole('row')).slice(1)
    expect(rows.map((r) => r.querySelector('td')?.textContent)).toEqual([
      '2026-09-25',
      '2026-09-18',
    ])
    const latest = within(rows[0] as HTMLElement)
    expect(latest.getAllByRole('link', { name: 'Dwarf' })).toHaveLength(3)
    expect(latest.getAllByRole('link', { name: 'Needle' })).toHaveLength(2)
    expect(latest.getAllByRole('link', { name: 'Needle' })[0]?.getAttribute('href')).toBe(
      '/tournaments/weekly-2026-09-25-lightweight',
    )
  })

  it('schedules the Fridays to come, and ranks the title holders', async () => {
    await renderAt('/tournaments/championships', () => <ChampionshipsPage />)
    const schedule = await screen.findByRole('list', { name: 'championship schedule' })
    const weeks = within(schedule).getAllByRole('listitem')
    expect(weeks).toHaveLength(3)
    expect(weeks[0]?.textContent).toContain('3 bots')
    expect(weeks[1]?.textContent).toContain('entries open Fri, Oct 2')
    const titles = screen.getByRole('list', { name: 'most titles' })
    expect(within(titles).getAllByRole('listitem')[0]?.textContent).toContain('8 titles')
  })

  it('links the two tournament pages', async () => {
    await renderAt('/tournaments/championships', () => <ChampionshipsPage />)
    const tabs = await screen.findByRole('navigation', { name: 'tournament pages' })
    expect(
      within(tabs).getByRole('link', { name: 'championships' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(within(tabs).getByRole('link', { name: 'tournaments' }).getAttribute('href')).toBe(
      '/tournaments',
    )
  })
})
