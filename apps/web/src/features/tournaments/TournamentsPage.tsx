/**
 * `/tournaments` (PRODUCT_SPEC §4): this browser's tournaments and the server's as tiles of one
 * height (`TournamentTile`: name, kind, entrants, status, matches played, and the champion and its
 * author once there is one; a server one with the `server` chip, and its entry window while it
 * takes entries), running ones first, then the newest, filtered by kind and status and searched by
 * name and bot, the first 25 at a time. Mounting it picks up the local tournaments a reload left running.
 */

import { HOUSE_AUTHOR, type Me } from '@asmbots/protocol'
import {
  Button,
  Chip,
  type ChipVariant,
  EmptyState,
  Input,
  Panel,
  PanelGrid,
  Segmented,
} from '@asmbots/ui'
import { Cloud, Plus, Trophy } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { useMe, useTournaments as useServerTournaments } from '../../api/queries'
import { type Author, ownerAuthor, sourceAuthor } from '../../app/author'
import { IntroArt } from '../../app/IntroArt'
import { TOURNAMENTS_ABOUT } from '../../app/intros/tournaments'
import { LoadFailure } from '../../app/LoadFailure'
import { PageIntro } from '../../app/PageIntro'
import { ShowMore, useShowMore } from '../../app/ShowMore'
import { assembleCached } from '../arena/setup/assembly'
import { rosterCatalog } from '../arena/setup/bots'
import { takesEntries, utcTime } from './entry'
import { type TournamentRunner, tournamentRunner, useRunnerSync } from './runner'
import { type ServerCard, serverCard } from './server'
import {
  KIND_LABELS,
  TOURNAMENT_KINDS,
  type Tournament,
  type TournamentEntrant,
  type TournamentKind,
  type TournamentStatus,
  useTournaments,
} from './store'
import { TournamentTile } from './TournamentTile'

/** The status filter: `running` takes paused ones too, `finished` cancelled and failed ones. */
export type StatusFilter = 'all' | 'scheduled' | 'running' | 'finished'
export type KindFilter = 'all' | TournamentKind

const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'scheduled', 'running', 'finished']

const FILTER_OF: Readonly<Record<TournamentStatus, StatusFilter>> = {
  scheduled: 'scheduled',
  running: 'running',
  paused: 'running',
  finished: 'finished',
  cancelled: 'finished',
  failed: 'finished',
}

export const STATUS_VARIANT: Readonly<Record<TournamentStatus, ChipVariant>> = {
  scheduled: 'info',
  running: 'accent',
  paused: 'warn',
  finished: 'neutral',
  cancelled: 'neutral',
  failed: 'danger',
}

export interface TournamentFilter {
  readonly kind: KindFilter
  readonly status: StatusFilter
  readonly query: string
}

/** Whether `filter` lets a tournament through: every word of the query in one of its `names`. */
function passes(
  kind: TournamentKind,
  status: TournamentStatus,
  names: readonly string[],
  filter: TournamentFilter,
): boolean {
  if (filter.kind !== 'all' && kind !== filter.kind) return false
  if (filter.status !== 'all' && FILTER_OF[status] !== filter.status) return false
  const text = names.join(' ').toLowerCase()
  return filter.query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}

/** The tournaments `filter` lets through: every word of the query in the name or an entrant's. */
export function filterTournaments(
  tournaments: readonly Tournament[],
  filter: TournamentFilter,
): Tournament[] {
  return tournaments.filter((t) =>
    passes(t.kind, t.status, [t.name, ...t.entrants.map((e) => e.name)], filter),
  )
}

/** The server's tournaments `filter` lets through: the query searches the name and the champion. */
export function filterServerTournaments(
  cards: readonly ServerCard[],
  filter: TournamentFilter,
): ServerCard[] {
  return cards.filter(({ summary: s, kind, status }) =>
    passes(kind, status, [s.tournament.name, s.champion?.name ?? ''], filter),
  )
}

/** What a card's status chip says: `running · 12 / 66` while it runs. */
export function statusLabel(t: Pick<Tournament, 'status' | 'progress'>): string {
  const { done, of } = t.progress
  return t.status === 'running' || t.status === 'paused'
    ? `${t.status} · ${done} / ${of}`
    : t.status
}

/** A card of the list, local or the server's, with what orders it: running first, then newest. */
interface Card {
  readonly running: boolean
  /** ms since the epoch: its start, else when it was made. */
  readonly time: number
  readonly node: ReactNode
}

/** `cards` running first, then the newest first. */
export function orderCards<T extends Pick<Card, 'running' | 'time'>>(cards: readonly T[]): T[] {
  return [...cards].sort((a, b) => Number(b.running) - Number(a.running) || b.time - a.time)
}

/** The bytes an entrant's identicon draws: its machine code, or its name when it has none. */
export function identiconValue(entrant: TournamentEntrant): Uint8Array | string {
  if (entrant.code === undefined && entrant.bytes !== undefined && entrant.bytes.length > 0) {
    return entrant.bytes
  }
  const assembled =
    entrant.source === 'roster'
      ? rosterCatalog().find((b) => b.ref.kind === 'roster' && b.ref.slug === entrant.ref)
          ?.assembled
      : entrant.code === undefined
        ? undefined
        : assembleCached(entrant.code)
  return assembled !== undefined && assembled.bytes.length > 0 ? assembled.bytes : entrant.name
}

/**
 * Who wrote an entrant: a server bot's owner; a roster bot's `%author` (the house's); a local
 * bot's, which reads as the signed-in reader's own when it has its `code` (a bot of this browser,
 * not a link's). An entrant made before authors has its `%author` read from the roster or `code`.
 * Null for a server bot whose owner the record lacks.
 */
export function entrantAuthor(
  entrant: TournamentEntrant,
  me: Me | null | undefined,
): Author | null {
  if (entrant.source === 'server') {
    return entrant.owner === undefined ? null : ownerAuthor(entrant.owner)
  }
  const author =
    entrant.author ??
    (entrant.source === 'roster'
      ? (rosterCatalog().find((b) => b.ref.kind === 'roster' && b.ref.slug === entrant.ref)
          ?.author ?? HOUSE_AUTHOR)
      : entrant.code === undefined
        ? ''
        : assembleCached(entrant.code).author)
  return sourceAuthor(author, me, entrant.source === 'local' && entrant.code !== undefined)
}

/** Each of `entrants`' authors (`entrantAuthor`), as the signed-in reader reads them. */
export function useEntrantAuthors(entrants: readonly TournamentEntrant[]): (Author | null)[] {
  const me = useMe().data
  return useMemo(() => entrants.map((e) => entrantAuthor(e, me)), [entrants, me])
}

export interface TournamentsPageProps {
  /** Opens the new tournament form. */
  onNew?: (() => void) | undefined
  /** The runner whose saves the list shows. Default: the page's. */
  runner?: TournamentRunner | undefined
}

export function TournamentsPage({ onNew, runner = tournamentRunner() }: TournamentsPageProps) {
  useRunnerSync(runner)
  const { data: tournaments } = useTournaments()
  const server = useServerTournaments()
  const [kind, setKind] = useState<KindFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const filter = { kind, status, query }
  const serverCards = (server.data?.tournaments ?? []).map(serverCard)
  const cards = orderCards<Card>([
    ...filterTournaments(tournaments ?? [], filter).map((t) => ({
      running: t.status === 'running',
      time: t.createdAt,
      node: <TournamentCard key={`local:${t.id}`} tournament={t} />,
    })),
    ...filterServerTournaments(serverCards, filter).map((card) => {
      const t = card.summary.tournament
      return {
        running: card.status === 'running',
        time: Date.parse(t.startsAt ?? t.createdAt),
        node: <ServerTournamentCard key={`server:${t.id}`} card={card} />,
      }
    }),
  ])
  const { visible, hidden, more } = useShowMore(cards)
  const total = (tournaments?.length ?? 0) + serverCards.length
  // The server's list may be slow or down: this browser's still show.
  const reading = tournaments === undefined || (server.isPending && server.error === null)
  const newButton = (
    <Button variant="primary" icon={Plus} disabled={onNew === undefined} onClick={onNew}>
      new tournament
    </Button>
  )
  return (
    <PanelGrid className="p-3">
      <PageIntro about={TOURNAMENTS_ABOUT} art={<IntroArt name="bracket" />} />
      <Panel
        className="col-span-12"
        title="tournaments"
        data-tour="tournaments-list"
        actions={newButton}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="search"
              aria-label="search tournaments"
              placeholder="search name or bot"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              className="w-56"
            />
            <Segmented<KindFilter>
              label="kind"
              options={[
                { value: 'all', label: 'all kinds' },
                ...TOURNAMENT_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] })),
              ]}
              value={kind}
              onValueChange={setKind}
            />
            <Segmented<StatusFilter>
              label="status"
              options={STATUS_FILTERS.map((s) => ({
                value: s,
                label: s === 'all' ? 'any status' : s,
              }))}
              value={status}
              onValueChange={setStatus}
            />
            <span className="ml-auto text-panel-status text-muted">
              {reading ? 'reading' : `${cards.length} of ${total}`}
            </span>
          </div>
          {server.error !== null && (
            <LoadFailure read={server} what="the server's tournaments" dense />
          )}
          {reading && total === 0 ? (
            <p className="text-data text-muted">reading…</p>
          ) : total === 0 ? (
            <EmptyState action={{ label: 'new tournament', onClick: () => onNew?.() }}>
              no tournaments yet: pick some bots and run one here, in this browser.
            </EmptyState>
          ) : cards.length === 0 ? (
            <EmptyState
              action={{
                label: 'clear the filters',
                onClick: () => {
                  setKind('all')
                  setStatus('all')
                  setQuery('')
                },
              }}
            >
              no tournament matches.
            </EmptyState>
          ) : (
            <>
              <ul
                aria-label="tournament list"
                className="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
              >
                {visible.map((card) => card.node)}
                {onNew !== undefined && (
                  <li className="h-full">
                    <NewTournamentTile onNew={onNew} />
                  </li>
                )}
              </ul>
              <ShowMore hidden={hidden} onMore={more} />
            </>
          )}
        </div>
      </Panel>
    </PanelGrid>
  )
}

/** The tile after the tournaments: where a new one starts. */
function NewTournamentTile({ onNew }: { onNew: () => void }) {
  return (
    <button
      type="button"
      onClick={onNew}
      className="flex size-full min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-border-strong border-dashed p-3 text-center transition-colors duration-120 ease-out hover:border-accent focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-accent"
    >
      <Plus aria-hidden="true" size={28} className="text-accent" />
      <span className="text-bright text-panel-title">new tournament</span>
      <span className="text-data text-muted">
        pick the bots and the format, and run it here, in this browser.
      </span>
    </button>
  )
}

/**
 * A server tournament's tile: the `server` chip (and `championship` for one with no owner), its
 * entry window while it takes entries, and its champion once it has one.
 */
function ServerTournamentCard({ card }: { card: ServerCard }) {
  const { summary: s, kind, status } = card
  const t = s.tournament
  return (
    <TournamentTile
      id={t.id}
      name={t.name}
      kind={kind}
      status={status}
      statusLabel={statusLabel({ status, progress: { done: s.done, of: s.of } })}
      statusVariant={STATUS_VARIANT[status]}
      entrants={s.entrants}
      rounds={t.config.rounds}
      progress={{ done: s.done, of: s.of }}
      champion={
        s.champion === null
          ? undefined
          : {
              value: s.champion.name,
              name: s.champion.name,
              author: ownerAuthor(s.champion.owner),
            }
      }
      live
      entryUntil={
        takesEntries(t) && t.entryClosesAt !== null ? utcTime(t.entryClosesAt) : undefined
      }
      chips={
        <>
          <Chip icon={Cloud} variant="info" title="the server runs it">
            server
          </Chip>
          {t.ownerId === null && (
            <Chip icon={Trophy} variant="accent">
              championship
            </Chip>
          )}
        </>
      }
    />
  )
}

function TournamentCard({ tournament: t }: { tournament: Tournament }) {
  const me = useMe().data
  const winner = t.champion === null ? undefined : t.entrants[t.champion]
  return (
    <TournamentTile
      id={t.id}
      name={t.name}
      kind={t.kind}
      status={t.status}
      statusLabel={statusLabel(t)}
      statusVariant={STATUS_VARIANT[t.status]}
      entrants={t.entrants.length}
      rounds={t.rounds}
      progress={t.progress}
      champion={
        winner === undefined
          ? undefined
          : {
              value: identiconValue(winner),
              name: winner.name,
              author: entrantAuthor(winner, me),
            }
      }
    />
  )
}
