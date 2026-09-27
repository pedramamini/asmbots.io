/**
 * The part of `/hills` under the cards: how a challenge runs, when hills run, the weight classes to
 * scale, the newest board changes on every hill, and the hills side by side. A chunk of its own,
 * loaded once the page is up, so the diagram, the ruler, the feed, and the table stay out of the
 * page's cold JS.
 */
import type { HillBest, HillOverview, HillPulse, HillSummary } from '@asmbots/protocol'
import { type EmptyStateAction, Panel, Skeleton, Table, type TableColumn } from '@asmbots/ui'
import type { UseQueryResult } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { LoadFailure, readStatus } from '../../app/LoadFailure'
import { BoardFeed } from './BoardFeed'
import { ChallengeDiagram } from './ChallengeDiagram'
import { HillCadence } from './HillCadence'
import { ago, BotLink, CELL_LINK, count } from './links'
import { bandWeight, hillOrder, rules } from './rules'
import { WeightChip } from './WeightChip'
import { WeightRuler } from './WeightRuler'

/** `16.8M`, `800k`, `4,000`: a cycle count, short. */
export function cycles(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  return count(n)
}

/**
 * What one challenge on a hill fights: a match against each entry, each of the hill's rounds at
 * most its cycles. A melee hill takes no submissions.
 */
export function challengeCost({ hill, entrants }: HillSummary): string {
  if (hill.scoring === 'melee') return 'no submissions'
  if (entrants === 0) return 'no entries yet'
  return `${count(entrants)} ${entrants === 1 ? 'match' : 'matches'} · ≤ ${cycles(entrants * hill.rounds * hill.config.maxCycles)} cycles`
}

const COLUMNS: TableColumn<HillSummary>[] = [
  {
    id: 'hill',
    header: 'hill',
    cell: ({ hill }) => (
      <Link to="/hills/$slug" params={{ slug: hill.slug }} className={CELL_LINK}>
        {hill.name}
      </Link>
    ),
    sortValue: ({ hill }) => hill.name,
    className: 'w-28',
  },
  {
    id: 'class',
    header: 'class',
    cell: ({ hill }) => {
      const weight = bandWeight(hill.config)
      return weight === null ? (
        <span className="text-muted">–</span>
      ) : (
        <WeightChip weight={weight} />
      )
    },
    sortValue: ({ hill }) => hillOrder(hill),
    className: 'w-20',
  },
  {
    id: 'rules',
    header: 'rules',
    cell: ({ hill }) => <span className="text-muted">{rules(hill.rounds, hill.config)}</span>,
  },
  {
    id: 'entrants',
    header: 'entrants',
    cell: ({ hill, entrants }) => `${count(entrants)} / ${count(hill.size)}`,
    align: 'right',
    sortValue: ({ entrants }) => entrants,
    className: 'w-24',
  },
  {
    id: 'king',
    header: 'king',
    cell: ({ king }) =>
      king === null ? <span className="text-muted">none</span> : <BotLink bot={king.bot} by />,
    sortValue: ({ king }) => king?.bot.name ?? '',
  },
  {
    id: 'score',
    header: 'score',
    cell: ({ king }) => (king === null ? '' : count(king.entry.score)),
    align: 'right',
    className: 'w-16',
  },
  {
    id: 'cost',
    header: 'a challenge',
    cell: (summary) => <span className="text-muted">{challengeCost(summary)}</span>,
    sortValue: ({ hill, entrants }) =>
      hill.scoring === 'melee' ? -1 : entrants * hill.rounds * hill.config.maxCycles,
  },
]

/** The columns of the hills' pulse: their matches and when each last changed. */
function pulseColumns(pulse: ReadonlyMap<string, HillPulse>): TableColumn<HillSummary>[] {
  return [
    {
      id: 'matches',
      header: 'matches',
      cell: ({ hill }) => {
        const p = pulse.get(hill.slug)
        return p === undefined ? '' : count(p.matches)
      },
      align: 'right',
      sortValue: ({ hill }) => pulse.get(hill.slug)?.matches ?? 0,
      className: 'w-20',
    },
    {
      id: 'changed',
      header: 'changed',
      cell: ({ hill }) => {
        const at = pulse.get(hill.slug)?.lastAt
        return at == null ? (
          <span className="text-muted">–</span>
        ) : (
          <time dateTime={at} className="text-muted">
            {ago(at)}
          </time>
        )
      },
      sortValue: ({ hill }) => pulse.get(hill.slug)?.lastAt ?? '',
      className: 'w-24',
    },
  ]
}

/** The column of the reader's best place on each hill: rank and bot, or `–`. */
function bestColumn(best: ReadonlyMap<string, HillBest> | null): TableColumn<HillSummary> {
  return {
    id: 'best',
    header: 'your best',
    cell: ({ hill }) => {
      if (best === null) return ''
      const place = best.get(hill.slug)
      return place === undefined ? (
        <span className="text-muted">–</span>
      ) : (
        <span>
          #{place.entry.rank} <BotLink bot={place.bot} />
        </span>
      )
    },
    sortValue: ({ hill }) => best?.get(hill.slug)?.entry.rank ?? Number.POSITIVE_INFINITY,
  }
}

export interface HillsLowerProps {
  /** The hills in list order; undefined while they load. */
  hills: readonly HillSummary[] | undefined
  overview: UseQueryResult<HillOverview, Error>
  /** Signed in: the reader's handle, and their best place on each hill once read. */
  handle: string | null
  best: ReadonlyMap<string, HillBest> | null
  emptyAction: EmptyStateAction
}

export default function HillsLower({
  hills,
  overview,
  handle,
  best,
  emptyAction,
}: HillsLowerProps) {
  const navigate = useNavigate()
  const pulse = new Map((overview.data?.hills ?? []).map((p) => [p.slug, p]))
  const columns = [...COLUMNS, ...pulseColumns(pulse)]
  return (
    <>
      <Panel
        className="col-span-12 lg:col-span-8"
        title="how a challenge runs"
        status="a hill of 6"
      >
        <ChallengeDiagram />
      </Panel>
      <Panel className="col-span-12 lg:col-span-4" title="when hills run" status="always">
        <HillCadence />
      </Panel>
      <Panel className="col-span-12 lg:col-span-7" title="weight classes" status="to scale">
        <div className="flex flex-col gap-3">
          <p className="text-data text-muted">
            A class hill takes bots from its floor to its cap, so a bot fights bots of its own size.
            Each class is twice the last, and its bots start further apart in the core.{' '}
            <span className="text-bright">open weight</span> mixes every class;{' '}
            <span className="text-bright">tiny</span> and <span className="text-info">melee</span>{' '}
            (eight bots in one core) change the game instead.
          </p>
          {hills === undefined ? <Skeleton rows={7} /> : <WeightRuler hills={hills} />}
        </div>
      </Panel>
      <Panel
        className="col-span-12 lg:col-span-5"
        title="board changes"
        status={readStatus(overview.data, overview.error, () => 'every hill')}
      >
        {overview.error !== null && overview.data === undefined ? (
          <LoadFailure read={overview} />
        ) : overview.data === undefined ? (
          <Skeleton rows={6} />
        ) : (
          <BoardFeed events={overview.data.events} emptyAction={emptyAction} />
        )}
      </Panel>
      {hills !== undefined && hills.length > 0 && (
        <Panel className="col-span-12" title="side by side" status="sortable">
          <Table
            aria-label="hills"
            columns={handle === null ? columns : [...columns, bestColumn(best)]}
            rows={hills}
            rowKey={({ hill }) => hill.id}
            onRowClick={({ hill }) =>
              void navigate({ to: '/hills/$slug', params: { slug: hill.slug } })
            }
          />
        </Panel>
      )}
    </>
  )
}
