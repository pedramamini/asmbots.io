/**
 * `/stats/leaderboard` (src/features/stats/LeaderboardPage.tsx): the builders ranked, the house
 * apart, their badges; every badge with its holders; and the glyphs.
 */
import { describe, expect, it } from 'bun:test'
import { BADGE_IDS, type Leaderboard, type LeaderRow } from '@asmbots/protocol'
import { screen, within } from '@testing-library/react'
import { useDom, window } from '../../../packages/ui/test/dom'
import { GLYPHS, glyphCells } from '../src/features/badges/glyphs'
import { LeaderboardPage } from '../src/features/stats/LeaderboardPage'
import { answer, renderAt, useApiServer } from './api-server'

useDom()
window.scrollTo = () => {}

const T = '2026-09-24T23:32:32.208Z'

const row = (handle: string, rank: number | null, change: Partial<LeaderRow> = {}): LeaderRow => ({
  user: { id: `u-${handle}`, handle, avatarUrl: null, createdAt: T },
  rank,
  bots: 0,
  versions: 0,
  biggest: null,
  smallest: null,
  matches: 0,
  wins: 0,
  ties: 0,
  losses: 0,
  kills: 0,
  rounds: 0,
  survived: 0,
  cycles: 0,
  entries: 0,
  kings: 0,
  bestRank: null,
  challenges: 0,
  championships: 0,
  titles: 0,
  badges: [],
  ...change,
})

const BOARD: Leaderboard = {
  at: T,
  users: [
    row('ada', 1, {
      bots: 40,
      matches: 10,
      wins: 7,
      losses: 3,
      kings: 2,
      bestRank: 1,
      badges: [
        { id: 'fleet', value: 40 },
        { id: 'heavy-metal', value: 4096 },
        { id: 'king', value: null },
      ],
    }),
    row('bob', 2, { matches: 4, wins: 1, losses: 3, badges: [{ id: 'king', value: null }] }),
  ],
  house: row('system', null, { bots: 20, wins: 300, matches: 400 }),
}

describe('the glyphs', () => {
  it('draw every badge in 8 × 8 cells, none of them blank', () => {
    for (const id of BADGE_IDS) {
      const rows = GLYPHS[id]
      expect(rows, id).toHaveLength(8)
      for (const r of rows) expect(r, id).toMatch(/^[.#*]{8}$/)
      expect(glyphCells(rows).length, id).toBeGreaterThan(4)
    }
  })

  it('are each their own', () => {
    const drawn = BADGE_IDS.map((id) => GLYPHS[id].join(''))
    expect(new Set(drawn).size).toBe(drawn.length)
  })
})

describe('the leaderboard page', () => {
  useApiServer(answer('/leaderboard', BOARD))

  it('ranks the builders, the house last, and opens a profile', async () => {
    await renderAt('/stats/leaderboard', () => <LeaderboardPage />)
    const table = await screen.findByRole('table', { name: 'leaderboard' })
    const rows = (await within(table).findAllByRole('row')).slice(1)
    expect(rows.map((r) => within(r).getByRole('link').textContent)).toEqual([
      'ada',
      'bob',
      'system',
    ])
    expect(within(rows[2] as HTMLElement).getByText('house')).toBeTruthy()
    expect(
      within(rows[0] as HTMLElement)
        .getByRole('link', { name: 'ada' })
        .getAttribute('href'),
    ).toBe('/u/ada')
  })

  it('lists every badge by group, with its holders', async () => {
    await renderAt('/stats/leaderboard', () => <LeaderboardPage />)
    const badges = await screen.findByRole('region', { name: 'badges' })
    expect(within(badges).getAllByRole('listitem')).toHaveLength(BADGE_IDS.length)
    const fighting = within(badges).getByRole('region', { name: 'fighting' })
    expect(fighting).toBeTruthy()
    const tile = (name: string) =>
      within(badges)
        .getAllByRole('listitem')
        .find((li) => li.textContent?.startsWith(name)) as HTMLElement
    expect(tile('heavy metal').textContent).toContain('ada · 4,096 bytes')
    expect(tile('king of the hill').textContent).toContain('2 builders')
    expect(tile('reaper').textContent).toContain('nobody yet')
    expect(screen.getByRole('region', { name: 'badges' }).textContent).toContain(
      `3 of ${BADGE_IDS.length} held`,
    )
  })

  it('links the two stats pages', async () => {
    await renderAt('/stats/leaderboard', () => <LeaderboardPage />)
    const tabs = await screen.findByRole('navigation', { name: 'stats pages' })
    expect(
      within(tabs).getByRole('link', { name: 'leaderboard' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(within(tabs).getByRole('link', { name: 'the site' }).getAttribute('href')).toBe('/stats')
  })
})
