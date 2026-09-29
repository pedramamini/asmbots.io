/**
 * `/tournaments/championships` (PRODUCT_SPEC §4): the weekly championships. The next week's five
 * (a clock to the start, the entry window, and each class's entrants and `enter`; live while they
 * run), the champions of every week, class by class, the schedule of the Fridays to come, and the
 * builders with the most titles. From `GET /api/championships`.
 */
import {
  type BotLabel,
  ChampionshipList,
  classOfRange,
  OPEN_WEIGHT,
  parse,
  type Tournament,
  type TournamentSummary,
  WEIGHT_CLASSES,
  type WeightClass,
} from '@asmbots/protocol'
import {
  Button,
  Chip,
  type ChipVariant,
  EmptyState,
  Identicon,
  Panel,
  PanelGrid,
  Skeleton,
  Table,
  type TableColumn,
} from '@asmbots/ui'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiGet } from '../../api/client'
import { useTournament } from '../../api/queries'
import { AuthorLink, CELL_LINK, ownerAuthor } from '../../app/author'
import { IntroArt } from '../../app/IntroArt'
import { CHAMPIONSHIPS_ABOUT } from '../../app/intros/championships'
import { LoadFailure, readStatus } from '../../app/LoadFailure'
import { useLinkAction } from '../../app/link-action'
import { PageIntro } from '../../app/PageIntro'
import { countdown } from '../../app/ticker'
import { plural } from '../hills/links'
import { EnterButton } from './EnterModal'
import { takesEntries } from './entry'
import { TournamentsTabs } from './TournamentsTabs'

/** The finished championships the page reads: 20 weeks of five. */
const FINISHED = 100

/**
 * `GET /api/championships`. Here, not in `api/queries.ts`: Rollup places a module whole, and every
 * page takes that one; only this page reads it.
 */
export const championshipsQuery = () =>
  queryOptions({
    queryKey: ['championships'],
    queryFn: ({ signal }) =>
      apiGet(
        `/championships?limit=${FINISHED}`,
        (v) => parse(ChampionshipList, v, 'the championships'),
        signal,
      ),
    // A running week moves on match by match.
    refetchInterval: (query) =>
      query.state.data?.upcoming.some((s) => s.tournament.status === 'running') ? 5000 : 60_000,
  })

/** The classes that have a championship, lightest first, open weight last. */
export const CLASSES: readonly WeightClass[] = [...WEIGHT_CLASSES, OPEN_WEIGHT]

/** A championship's class, from its size band; null for a band no class has. */
export function classOf(t: Tournament): WeightClass | null {
  const { minBotBytes = 1, maxBotBytes } = t.config.battle
  return classOfRange(minBotBytes, maxBotBytes)
}

/** Where a championship's class sorts: `CLASSES`' order, a band of no class last. */
const classRank = (t: Tournament) => {
  const c = classOf(t)
  return c === null ? CLASSES.length : CLASSES.findIndex((k) => k.slug === c.slug)
}

/** The week a championship belongs to: the Central day its id names, else its start's UTC day. */
export function weekOf(t: Tournament): string {
  return /^weekly-(\d{4}-\d{2}-\d{2})/.exec(t.id)?.[1] ?? (t.startsAt ?? t.createdAt).slice(0, 10)
}

/** A week of championships: its day and each class's championship, lightest first. */
export interface Week {
  readonly day: string
  readonly startsAt: string | null
  readonly championships: readonly TournamentSummary[]
}

/** `summaries` by week, in the order each week first appears; a week's classes lightest first. */
export function byWeek(summaries: readonly TournamentSummary[]): Week[] {
  const weeks = new Map<string, TournamentSummary[]>()
  for (const s of summaries) {
    const day = weekOf(s.tournament)
    weeks.set(day, [...(weeks.get(day) ?? []), s])
  }
  return [...weeks].map(([day, list]) => ({
    day,
    startsAt: list[0]?.tournament.startsAt ?? null,
    championships: list.sort((a, b) => classRank(a.tournament) - classRank(b.tournament)),
  }))
}

/** A builder's titles: the championships their bots won, and in which classes. */
export interface TitleHolder {
  readonly owner: string
  readonly titles: number
  readonly classes: readonly string[]
  /** The day of their latest title: the tie-break, the latest first. */
  readonly last: string
}

/** The builders whose bots won `finished`, the most titles first, then the latest. */
export function titleHolders(finished: readonly TournamentSummary[]): TitleHolder[] {
  const holders = new Map<string, { titles: number; classes: Set<string>; last: string }>()
  for (const s of finished) {
    if (s.champion === null) continue
    const held = holders.get(s.champion.owner) ?? { titles: 0, classes: new Set(), last: '' }
    held.titles += 1
    held.classes.add(classOf(s.tournament)?.name ?? s.tournament.name)
    const day = weekOf(s.tournament)
    if (day > held.last) held.last = day
    holders.set(s.champion.owner, held)
  }
  return [...holders]
    .map(([owner, h]) => ({ owner, titles: h.titles, classes: [...h.classes], last: h.last }))
    .sort((a, b) => b.titles - a.titles || b.last.localeCompare(a.last))
}

/** The fields a time shows: `Fri`, `Oct`, `2`, `6`, `00`, `PM`, `CDT`. */
const FIELDS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
}

/** The championship's clock, US Central, and the reader's. */
const CENTRAL = new Intl.DateTimeFormat('en-US', { ...FIELDS, timeZone: 'America/Chicago' })
const LOCAL = new Intl.DateTimeFormat('en-US', FIELDS)

/**
 * `Fri, Oct 2, 6:00 PM CDT`, or with `dayOnly` `Fri, Oct 2`: put together from the parts, as ICU
 * versions join them differently (`Oct 2 at 6:00`).
 */
function format(clock: Intl.DateTimeFormat, at: Date, dayOnly = false): string {
  const parts = clock.formatToParts(at)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  const day = `${part('weekday')}, ${part('month')} ${part('day')}`
  if (dayOnly) return day
  return `${day}, ${part('hour')}:${part('minute')} ${part('dayPeriod')} ${part('timeZoneName')}`
}

/** A Central day: `Fri, Oct 2`. */
export const centralDay = (iso: string) => format(CENTRAL, new Date(iso), true)

/** `Fri, Oct 2, 6:00 PM CDT`, and the reader's time after it when their clock is not Central's. */
export function when(iso: string): { central: string; local: string | null } {
  const at = new Date(iso)
  const central = format(CENTRAL, at)
  const local = format(LOCAL, at)
  return { central, local: local === central ? null : local }
}

/** A time, as `when` says it: Central, then the reader's, muted. */
function When({ iso }: { iso: string }) {
  const { central, local } = when(iso)
  return (
    <>
      <time dateTime={iso}>{central}</time>
      {local !== null && <span className="text-muted"> · {local} here</span>}
    </>
  )
}

/** `Date.now()`, again each second. */
function useClock(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function ChampionshipsPage() {
  const read = useQuery(championshipsQuery())
  const { data, error } = read
  const weeks = data === undefined ? undefined : byWeek(data.upcoming)
  return (
    <PanelGrid className="p-3">
      <PageIntro
        about={CHAMPIONSHIPS_ABOUT}
        art={<IntroArt name="trophy" />}
        more={<TournamentsTabs />}
      />
      {error !== null && data === undefined ? (
        <Panel className="col-span-12" title="championships">
          <LoadFailure read={read} what="the championships" />
        </Panel>
      ) : (
        <>
          <NextWeek week={weeks?.[0] ?? (weeks === undefined ? undefined : null)} />
          <Champions finished={data?.championships} />
          <Schedule data={data} />
          <TitleHolders finished={data?.championships} />
        </>
      )}
    </PanelGrid>
  )
}

/** What the next week's championships are doing: live, taking entries, or waiting to start. */
type Phase = 'live' | 'open' | 'closed' | 'due'

function phaseOf(week: Week, now: number): Phase {
  const ts = week.championships.map((s) => s.tournament)
  if (ts.some((t) => t.status === 'running')) return 'live'
  if (ts.some((t) => takesEntries(t, now))) return 'open'
  return week.startsAt !== null && Date.parse(week.startsAt) > now ? 'closed' : 'due'
}

const PHASE_LABEL: Readonly<Record<Phase, string>> = {
  live: 'live now',
  open: 'entries open',
  closed: 'entries closed',
  due: 'starting',
}

const PHASE_VARIANT: Readonly<Record<Phase, ChipVariant>> = {
  live: 'accent',
  open: 'info',
  closed: 'warn',
  due: 'accent',
}

/**
 * The next week's five: a clock to the start (or `live now`), when entries close, and a card for
 * each class. Undefined while it loads; null when none is scheduled.
 */
function NextWeek({ week }: { week: Week | null | undefined }) {
  const now = useClock()
  const link = useLinkAction()
  const phase = week == null ? null : phaseOf(week, now)
  const closes = week?.championships[0]?.tournament.entryClosesAt ?? null
  const entrants = week?.championships.reduce((n, s) => n + s.entrants, 0) ?? 0
  return (
    <Panel
      className="col-span-12"
      title={phase === 'live' ? 'live now' : 'next championships'}
      status={week === undefined ? 'loading' : week === null ? 'none' : plural(entrants, 'entrant')}
    >
      {week === undefined ? (
        <Skeleton rows={3} />
      ) : week === null ? (
        <EmptyState action={link('write a bot meanwhile', '/editor')}>
          no championship is scheduled: the cron makes next week's each Friday at 18:00 Central.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            <Clock
              label={phase === 'live' ? 'started' : 'starts in'}
              ms={week.startsAt === null ? 0 : Date.parse(week.startsAt) - now}
              live={phase === 'live' || phase === 'due'}
            />
            <div className="flex min-w-0 flex-col gap-1 text-data">
              <p className="flex flex-wrap items-center gap-2">
                <Chip variant={phase === null ? 'neutral' : PHASE_VARIANT[phase]}>
                  {phase === null ? '' : PHASE_LABEL[phase]}
                </Chip>
                <span className="text-bright">week of {week.day}</span>
              </p>
              {week.startsAt !== null && (
                <p>
                  <span className="text-muted">starts </span>
                  <When iso={week.startsAt} />
                </p>
              )}
              {closes !== null && phase !== 'live' && (
                <p>
                  <span className="text-muted">
                    {phase === 'open'
                      ? `entries close in ${countdown(Date.parse(closes) - now)} · `
                      : 'entries closed '}
                  </span>
                  <When iso={closes} />
                </p>
              )}
            </div>
          </div>
          <ul
            aria-label="this week's championships"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          >
            {week.championships.map((s) => (
              <ClassCard key={s.tournament.id} summary={s} />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

/** Days, hours, minutes, seconds to `ms` from now, each in a box; zeros once it has passed. */
function Clock({ label, ms, live }: { label: string; ms: number; live: boolean }) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const parts: [string, number][] = [
    ['days', Math.floor(s / 86_400)],
    ['hrs', Math.floor((s % 86_400) / 3600)],
    ['min', Math.floor((s % 3600) / 60)],
    ['sec', s % 60],
  ]
  if (live) {
    return (
      <p className="flex items-center gap-3 text-stat text-accent-fg">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)] motion-safe:animate-skeleton"
        />
        LIVE
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <span aria-hidden="true" className="text-panel-status text-muted">
        {label}
      </span>
      <p className="flex gap-2">
        {/* To the minute, not each second: the boxes are for the eye. */}
        <span className="sr-only">
          {label} {countdown(ms)}
        </span>
        {parts.map(([unit, n]) => (
          <span
            key={unit}
            aria-hidden="true"
            className="flex w-16 flex-col items-center rounded-sm border border-border-strong bg-panel-2 py-1.5"
          >
            <span className="text-stat text-bright tabular-nums">{String(n).padStart(2, '0')}</span>
            <span className="text-panel-status text-muted">{unit}</span>
          </span>
        ))}
      </p>
    </div>
  )
}

/** The most entrants a card draws; the rest are a count. */
const SHOWN_ENTRANTS = 10

/**
 * One class's championship this week: its class and sizes, its status, who has entered (their
 * identicons, mine marked), and `enter` while it takes entries, or `watch live` while it runs.
 */
function ClassCard({ summary: s }: { summary: TournamentSummary }) {
  const t = s.tournament
  const c = classOf(t)
  const detail = useTournament(t.id)
  const navigate = useNavigate()
  const entrants: readonly BotLabel[] | undefined = detail.data?.entrants
  const running = t.status === 'running'
  const open = takesEntries(t)
  return (
    <li
      aria-label={c?.name ?? t.name}
      className={`flex min-h-44 min-w-0 flex-col gap-3 rounded-md border border-l-4 border-border bg-panel-2 p-3 ${running ? 'border-l-accent' : open ? 'border-l-info' : 'border-l-border-strong'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <Link
            to="/tournaments/$id"
            params={{ id: t.id }}
            className={`truncate text-panel-title ${CELL_LINK}`}
          >
            {c?.name ?? t.name}
          </Link>
          {c !== null && (
            <span className="text-data text-muted tabular-nums">
              {c.min.toLocaleString('en-US')}–{c.max.toLocaleString('en-US')} bytes
            </span>
          )}
        </div>
        <Chip variant={running ? 'accent' : open ? 'info' : 'neutral'}>
          {running ? `live · ${s.done} / ${s.of}` : open ? 'open' : 'closed'}
        </Chip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <span className="text-panel-status text-muted">
          {s.entrants === 0 ? 'no entries yet' : plural(s.entrants, 'entrant')}
        </span>
        {s.entrants > 0 && entrants === undefined ? (
          <Skeleton className="h-6 w-32" />
        ) : (
          <ul aria-label="entrants" className="flex flex-wrap gap-1">
            {(entrants ?? []).slice(0, SHOWN_ENTRANTS).map((e) => (
              <li
                key={e.versionId}
                title={`${e.name} v${e.version} by ${ownerAuthor(e.owner).name}`}
              >
                <Identicon value={e.name} size={24} />
              </li>
            ))}
            {(entrants?.length ?? 0) > SHOWN_ENTRANTS && (
              <li className="self-center text-data text-muted">
                +{(entrants?.length ?? 0) - SHOWN_ENTRANTS}
              </li>
            )}
          </ul>
        )}
        {s.entrants === 0 && open && <p className="text-data text-info">be the first to enter</p>}
      </div>
      <div className="self-start">
        {running ? (
          <Button
            variant="primary"
            icon={Radio}
            onClick={() => void navigate({ to: '/tournaments/$id', params: { id: t.id } })}
          >
            watch live
          </Button>
        ) : (
          <EnterButton tournament={t} entrants={entrants} />
        )}
      </div>
    </li>
  )
}

/** A champion in a cell: its identicon, its name (the bracket's link), and its builder. */
function ChampionCell({ summary: s }: { summary: TournamentSummary | undefined }) {
  if (s === undefined) return <span className="text-dim">–</span>
  const champion = s.champion
  if (champion === null) {
    return (
      <Link to="/tournaments/$id" params={{ id: s.tournament.id }} className={CELL_LINK}>
        no champion
      </Link>
    )
  }
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Identicon value={champion.name} size={20} />
      <span className="flex min-w-0 flex-col">
        <Link
          to="/tournaments/$id"
          params={{ id: s.tournament.id }}
          className={`truncate ${CELL_LINK}`}
          title={`${s.tournament.name}: ${plural(s.entrants, 'entrant')}`}
        >
          {champion.name}
        </Link>
        <span className="truncate text-muted">
          by <AuthorLink author={ownerAuthor(champion.owner)} />
        </span>
      </span>
    </span>
  )
}

/** The champions, a week a row, a class a column: the latest week first. */
function Champions({ finished }: { finished: readonly TournamentSummary[] | undefined }) {
  const link = useLinkAction()
  const weeks = finished === undefined ? [] : byWeek(finished)
  const columns: TableColumn<Week>[] = [
    {
      id: 'week',
      header: 'week',
      cell: (w) => <span className="text-bright tabular-nums">{w.day}</span>,
      sortValue: (w) => w.day,
      sortFirst: 'desc',
      className: 'w-28',
    },
    ...CLASSES.map(
      (c): TableColumn<Week> => ({
        id: c.slug,
        header: c.name,
        cell: (w) => (
          <ChampionCell
            summary={w.championships.find((s) => classOf(s.tournament)?.slug === c.slug)}
          />
        ),
      }),
    ),
    {
      id: 'entrants',
      header: 'bots',
      cell: (w) => w.championships.reduce((n, s) => n + s.entrants, 0),
      sortValue: (w) => w.championships.reduce((n, s) => n + s.entrants, 0),
      align: 'right',
      className: 'w-16',
    },
  ]
  return (
    <Panel
      className="col-span-12"
      title="champions"
      status={finished === undefined ? 'loading' : plural(weeks.length, 'week')}
    >
      <div className="overflow-x-auto">
        <Table
          aria-label="champions by week"
          className="min-w-[56rem]"
          columns={columns}
          rows={weeks}
          rowKey={(w) => w.day}
          defaultSort={{ column: 'week', direction: 'desc' }}
          empty={
            finished === undefined ? (
              <Skeleton rows={4} />
            ) : (
              <EmptyState action={link('write a bot', '/editor')}>
                no championship has finished yet: enter one, and be the first champion.
              </EmptyState>
            )
          }
        />
      </div>
    </Panel>
  )
}

/**
 * The Fridays to come: each one's start, and its entries. A week's championships are made when
 * the week before starts, so the week after next takes entries from then.
 */
function Schedule({ data }: { data: ChampionshipList | undefined }) {
  const now = useClock()
  const made = new Map(
    data === undefined ? [] : byWeek(data.upcoming).map((w) => [w.startsAt, w] as const),
  )
  // A week running now is not in `schedule`, which starts after now: it leads the list.
  const running =
    data === undefined ? [] : byWeek(data.upcoming).filter((w) => phaseOf(w, now) === 'live')
  const starts = [
    ...running.flatMap((w) => (w.startsAt === null ? [] : [w.startsAt])),
    ...(data?.schedule ?? []),
  ]
  return (
    <Panel
      className="col-span-12 lg:col-span-7"
      title="schedule"
      status={data === undefined ? 'loading' : 'fridays 18:00 central'}
    >
      {data === undefined ? (
        <Skeleton rows={6} />
      ) : (
        <ol aria-label="championship schedule" className="flex flex-col">
          {starts.map((iso, i) => {
            const week = made.get(iso)
            const phase = week === undefined ? null : phaseOf(week, now)
            const bots = week?.championships.reduce((n, s) => n + s.entrants, 0) ?? 0
            const opens = starts[i - 1]
            return (
              <li
                key={iso}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-2 text-data last:border-b-0"
              >
                <span className="w-6 text-right text-dim tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <When iso={iso} />
                </span>
                {phase !== null ? (
                  <>
                    <span className="text-muted">{plural(bots, 'bot')}</span>
                    <Chip variant={PHASE_VARIANT[phase]}>{PHASE_LABEL[phase]}</Chip>
                  </>
                ) : (
                  <span className="text-muted">
                    {opens === undefined
                      ? 'entries open soon'
                      : `entries open ${centralDay(opens)}`}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}

/** The builders with the most championship titles. */
function TitleHolders({ finished }: { finished: readonly TournamentSummary[] | undefined }) {
  const link = useLinkAction()
  const holders = finished === undefined ? [] : titleHolders(finished).slice(0, 10)
  return (
    <Panel
      className="col-span-12 lg:col-span-5"
      title="most titles"
      status={readStatus(finished, null, () => plural(holders.length, 'builder'))}
    >
      {finished === undefined ? (
        <Skeleton rows={5} />
      ) : holders.length === 0 ? (
        <EmptyState action={link('write a bot', '/editor')}>nobody holds a title yet.</EmptyState>
      ) : (
        <ol aria-label="most titles" className="flex flex-col">
          {holders.map((h, i) => (
            <li
              key={h.owner}
              className="flex items-center gap-3 border-b border-border py-2 text-data last:border-b-0"
            >
              <span className="w-6 shrink-0 text-right text-dim tabular-nums">{i + 1}</span>
              <span className="shrink-0">
                <AuthorLink author={ownerAuthor(h.owner)} />
              </span>
              <span className="hidden min-w-0 flex-1 truncate text-right text-muted sm:inline">
                {h.classes.join(' · ')}
              </span>
              <span className="ml-auto shrink-0 whitespace-nowrap text-right text-bright tabular-nums">
                {h.titles} <span className="text-muted">{h.titles === 1 ? 'title' : 'titles'}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
