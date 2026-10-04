/**
 * The players' public bots in the arena's roster (`GET /api/bots`), in jsdom: listed beside the
 * house's with their owner and hill place, filtered by player, sorted, picked as `cloud:` refs, and
 * read back from a link.
 */
import 'fake-indexeddb/auto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { rosterImage } from '@asmbots/bots'
import { type PublicBot, type PublicBotList, toBase64 } from '@asmbots/protocol'
import { ToastProvider } from '@asmbots/ui'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useDom, window } from '../../../packages/ui/test/dom'
import { ArenaPage } from '../src/features/arena/ArenaPage'
import { validateArenaSearch } from '../src/features/arena/setup/search'
import type { ArenaClient } from '../src/features/arena/worker/client'
import { stringifySearch } from '../src/router'
import { useBotRecords } from '../src/store/bot-records'
import { clearLocalBots } from '../src/store/local-bots'
import { DEFAULT_SETTINGS, useSettings } from '../src/store/settings'
import { answer, useApiServer } from './api-server'

useDom()
window.scrollTo = () => {}

function publicBot(name: string, owner: string, slug: string, best: PublicBot['best']): PublicBot {
  const id = name.toLowerCase()
  return {
    bot: { botId: id, versionId: `${id}-v1`, slug: id, name, version: 1, owner, author: null },
    strategy: `a ${slug}`,
    bytes: toBase64(rosterImage(slug).bytes),
    updatedAt: '2026-09-20T00:00:00.000Z',
    best,
  }
}

const KING = {
  hill: { slug: 'main', name: 'main' },
  rank: 1,
  rating: 1712,
  wins: 9,
  ties: 1,
  losses: 2,
}
const LIST: PublicBotList = {
  bots: [
    publicBot('Tidal', 'alice', 'dwarf', null),
    publicBot('Crowned', 'alice', 'imp', KING),
    publicBot('Drifter', 'bob', 'paper', null),
  ],
}

useApiServer(answer('/bots', LIST), answer('/me', null, 401))

let restoreCanvas = () => {}
beforeAll(() => {
  const proto = window.HTMLCanvasElement.prototype
  const getContext = proto.getContext
  proto.getContext = (() => null) as typeof proto.getContext
  restoreCanvas = () => {
    proto.getContext = getContext
  }
})
afterAll(() => restoreCanvas())

beforeEach(async () => {
  await clearLocalBots()
  useBotRecords.setState({ records: {}, seen: [] })
  useSettings.setState({ ...structuredClone(DEFAULT_SETTINGS), theme: 'sentinel' })
})

const noClient = {
  store: undefined,
  load: () => {},
  play: () => {},
  pause: () => {},
  seek: () => {},
  speed: () => {},
  dispose: () => {},
  on: () => () => {},
}

async function renderArena(path = '/arena') {
  const root = createRootRoute({ component: Outlet })
  const arena = createRoute({
    getParentRoute: () => root,
    path: 'arena',
    validateSearch: validateArenaSearch,
    component: () => (
      <ArenaPage createClient={() => noClient as unknown as ArenaClient} urlDelay={0} />
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([arena]),
    history: createMemoryHistory({ initialEntries: [path] }),
    stringifySearch,
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  await screen.findByRole('region', { name: 'config' })
  return router
}

const cards = () =>
  within(screen.getByRole('list', { name: 'bots to add' }))
    .getAllByRole('listitem')
    .map((card) => card.getAttribute('aria-label'))

describe("the players' bots in the roster", () => {
  it('lists them beside the house, with their owner, hill place, and a player chip', async () => {
    await renderArena()
    const crowned = await screen.findByRole('listitem', { name: 'Crowned' })
    expect(within(crowned).getByText('king')).toBeTruthy()
    expect(crowned.textContent).toContain('main · 1712')
    expect(within(crowned).getByRole('link', { name: 'alice' })).toBeTruthy()
    expect(within(crowned).getByText('player')).toBeTruthy()
    expect(cards()).toContain('Dwarf')
    expect(cards()).toContain('Drifter')
  })

  it('filters by player, and sorts by hill place', async () => {
    await renderArena()
    await screen.findByRole('listitem', { name: 'Crowned' })
    const player = within(screen.getByRole('radiogroup', { name: 'player' }))
    const pills = player.getAllByRole('radio').map((pill) => pill.textContent)
    expect(pills[0]).toMatch(/^all \d+$/)
    expect(pills.slice(1)).toEqual([expect.stringMatching(/^ASM Bots \d+$/), 'alice 2', 'bob 1'])
    fireEvent.click(player.getByRole('radio', { name: /^alice/ }))
    expect(cards().sort()).toEqual(['Crowned', 'Tidal'])
    fireEvent.click(player.getByRole('radio', { name: /^ASM Bots/ }))
    expect(cards()).not.toContain('Crowned')
    expect(cards()).toContain('Dwarf')
    fireEvent.click(player.getByRole('radio', { name: /^all/ }))
    // The pills count the bots in the weight class: the players' light bots are not heavy.
    const weight = within(screen.getByRole('radiogroup', { name: 'weight class' }))
    fireEvent.click(weight.getByRole('radio', { name: /^heavy / }))
    const heavy = player.getAllByRole('radio').map((pill) => pill.textContent)
    expect(heavy.slice(2)).toEqual(['alice 0', 'bob 0'])
    expect(heavy[0]?.split(' ')[1]).toBe(heavy[1]?.split(' ').at(-1))
    expect(heavy[0]).toBe(`all ${cards().length}`)
    fireEvent.click(weight.getByRole('radio', { name: /^all / }))
    const sort = within(screen.getByRole('radiogroup', { name: 'sort bots' }))
    fireEvent.click(sort.getByRole('radio', { name: 'hill' }))
    expect(cards()[0]).toBe('Crowned')
  })

  it('picks one as a cloud ref in the URL', async () => {
    const router = await renderArena()
    const crowned = await screen.findByRole('listitem', { name: 'Crowned' })
    fireEvent.click(within(crowned).getByRole('button', { name: 'add Crowned' }))
    await waitFor(() => expect(router.state.location.searchStr).toContain('b=cloud:crowned'))
  })

  it('reads a cloud ref from the URL once the list loads, and misses one it does not list', async () => {
    await renderArena('/arena?b=cloud:drifter,cloud:gone')
    const list = screen.getByRole('list', { name: 'bots picked' })
    await waitFor(() => expect(within(list).getByText('player')).toBeTruthy())
    expect(within(list).getByText('missing')).toBeTruthy()
  })
})
