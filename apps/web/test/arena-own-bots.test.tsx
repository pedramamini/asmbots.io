/**
 * My bots in the arena, signed in (PRODUCT_SPEC §2): this browser's and my account's
 * (`GET /api/me/bots/arena`), each listed once, each saying who may see it, the best first, and
 * a long list drawn a page at a time.
 */
import 'fake-indexeddb/auto'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { loadRoster, rosterImage } from '@asmbots/bots'
import { type Me, type OwnBot, type OwnBotList, toBase64, type Visibility } from '@asmbots/protocol'
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
import { GRID_PAGE } from '../src/features/arena/ArenaSetup'
import { validateArenaSearch } from '../src/features/arena/setup/search'
import type { ArenaClient } from '../src/features/arena/worker/client'
import { stringifySearch } from '../src/router'
import { useBotRecords } from '../src/store/bot-records'
import { clearLocalBots, saveLocalBot } from '../src/store/local-bots'
import { DEFAULT_SETTINGS, useSettings } from '../src/store/settings'
import { answer, useApiServer } from './api-server'

useDom()
window.scrollTo = () => {}

const ME: Me = {
  user: { id: 'u1', handle: 'octo', avatarUrl: null, createdAt: '2026-09-01T00:00:00.000Z' },
  onboarded: true,
}

function ownBot(name: string, slug: string, visibility: Visibility, best: OwnBot['best']): OwnBot {
  const id = name.toLowerCase().replace(/\s+/g, '-')
  return {
    bot: {
      botId: id,
      versionId: `${id}-v1`,
      slug: id,
      name,
      version: 1,
      owner: 'octo',
      author: null,
    },
    strategy: `a ${slug}`,
    bytes: toBase64(rosterImage(slug).bytes),
    updatedAt: '2026-09-20T00:00:00.000Z',
    best,
    visibility,
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
const OWN: OwnBotList = {
  bots: [
    ownBot('Crowned', 'imp', 'private', KING),
    ownBot('Tidal', 'dwarf', 'public', null),
    ownBot('Drifter', 'paper', 'unlisted', null),
  ],
}

const server = useApiServer(
  answer('/bots', { bots: [] }),
  answer('/me', ME),
  answer('/me/bots/arena', OWN),
)

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
afterEach(() => signedIn(false))

beforeEach(async () => {
  signedIn(true)
  await clearLocalBots()
  useBotRecords.setState({ records: {}, seen: [] })
  useSettings.setState({ ...structuredClone(DEFAULT_SETTINGS), theme: 'sentinel' })
})

function signedIn(on: boolean) {
  // biome-ignore lint/suspicious/noDocumentCookie: the hint cookie the API would set
  document.cookie = on ? 'signed_in=1; Path=/' : 'signed_in=; Max-Age=0; Path=/'
}

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

const list = () => within(screen.getByRole('list', { name: 'bots to add' }))
const cards = () =>
  list()
    .getAllByRole('listitem')
    .map((card) => card.getAttribute('aria-label'))
const openMine = () =>
  fireEvent.click(
    within(screen.getByRole('radiogroup', { name: 'bot source' })).getByRole('radio', {
      name: 'my bots',
    }),
  )

describe('my bots, signed in', () => {
  it("lists this browser's and my account's, each once, each with who may see it", async () => {
    const source = (slug: string) => loadRoster().get(slug)?.source ?? ''
    // A local copy of Tidal (its `%name` is Dwarf), and a bot only this browser has.
    await saveLocalBot({ name: 'Dwarf', source: source('dwarf'), cloudId: 'tidal' })
    await saveLocalBot({ name: 'Imp', source: source('imp') })
    await renderArena()
    openMine()
    await waitFor(() => expect(cards()).toHaveLength(4))
    // The best first: Crowned holds a hill.
    expect(cards()[0]).toBe('Crowned')
    expect(cards().sort()).toEqual(['Crowned', 'Drifter', 'Dwarf', 'Imp'])
    const chip = (name: string) =>
      within(list().getByRole('listitem', { name })).getByTitle(/^\w+:/)
    expect(chip('Crowned').textContent).toBe('private')
    expect(chip('Dwarf').textContent).toBe('public')
    expect(chip('Drifter').textContent).toBe('unlisted')
    expect(chip('Imp').textContent).toBe('local')
    expect(list().getByRole('listitem', { name: 'Crowned' }).textContent).toContain('king')
  })

  it('fights a private account bot by its cloud ref', async () => {
    const router = await renderArena()
    openMine()
    const crowned = await screen.findByRole('listitem', { name: 'Crowned' })
    fireEvent.click(within(crowned).getByRole('button', { name: 'add Crowned' }))
    await waitFor(() => expect(router.state.location.searchStr).toContain('b=cloud:crowned'))
    const picked = within(screen.getByRole('list', { name: 'bots picked' }))
    await waitFor(() => expect(picked.queryByText('missing')).toBeNull())
    expect(picked.getByRole('listitem', { name: 'Crowned' })).toBeTruthy()
  })

  it(`draws the first ${GRID_PAGE} cards, the best first, then more on request`, async () => {
    const many = Array.from({ length: GRID_PAGE + 10 }, (_, i) =>
      ownBot(`Bot ${i}`, 'imp', 'public', i === GRID_PAGE + 5 ? KING : null),
    )
    server.use(answer('/me/bots/arena', { bots: many }))
    await renderArena()
    openMine()
    await waitFor(() => expect(cards()).toHaveLength(GRID_PAGE))
    // The king, last in the list the server sent, leads.
    expect(cards()[0]).toBe(`Bot ${GRID_PAGE + 5}`)
    fireEvent.click(screen.getByRole('button', { name: 'show 10 more' }))
    expect(cards()).toHaveLength(GRID_PAGE + 10)
    expect(screen.queryByRole('button', { name: /^show \d+ more$/ })).toBeNull()
  })
})
