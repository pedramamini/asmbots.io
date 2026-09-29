import type { SiteStats, StatsHill, StatsRecord } from '@asmbots/protocol'
import {
  EmptyState,
  Panel,
  PanelGrid,
  Segmented,
  Skeleton,
  Sparkline,
  Stat,
  Table,
  type TableColumn,
} from '@asmbots/ui'
import { Link, useNavigate } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { IntroArt } from '../../app/IntroArt'
import { STATS_ABOUT } from '../../app/intros/stats'
import { LoadFailure, readStatus } from '../../app/LoadFailure'
import { useLinkAction } from '../../app/link-action'
import { PageIntro } from '../../app/PageIntro'
import { BotLink, CELL_LINK, count, day, plural } from '../hills/links'
import { bandWeight, hillOrder } from '../hills/rules'
import { WeightChip } from '../hills/WeightChip'
import { ClassCounts, DayChart, SizeChart, Split } from './charts'
import { useStats } from './query'
import { StatsTabs } from './StatsTabs'
import { compact, type DayMetric, everyDay, runningTotal, sizeBins, uptime } from './series'

/** The days the activity chart shows: at least the last 30, at most the last 90. */
const LEAST_DAYS = 30
const CHART_DAYS = 90

const METRICS = [
  { value: 'matches', label: 'matches' },
  { value: 'rounds', label: 'rounds' },
  { value: 'deaths', label: 'deaths' },
  { value: 'cycles', label: 'cycles' },
] as const satisfies readonly { value: DayMetric; label: string }[]

/** Today, UTC, as the API's days read it. */
const today = () => new Date().toISOString().slice(0, 10)

/**
 * `/stats` (PRODUCT_SPEC §12): the site in numbers. How long it has run, who signed up, the bots
 * and their classes, every server match by day, life and death in the rounds, the records, and
 * each hill.
 */
export function StatsPage() {
  const read = useStats()
  const { data, error } = read
  return (
    <PanelGrid className="p-3">
      <PageIntro about={STATS_ABOUT} art={<IntroArt name="chart" />} more={<StatsTabs />} />
      {error !== null && data === undefined ? (
        <Panel className="col-span-12" title="stats" status="error">
          <LoadFailure read={read} what="the stats" />
        </Panel>
      ) : (
        <>
          <Totals data={data} />
          <Activity data={data} />
          <LifeAndDeath data={data} />
          <Classes data={data} />
          <Records data={data} />
          <Hills data={data} />
        </>
      )}
    </PanelGrid>
  )
}

type Part = { data: SiteStats | undefined }

/** The headline numbers, each with its note and, where it has one, its line over time. */
function Totals({ data }: Part) {
  const loading = data === undefined
  const days = data === undefined ? [] : everyDay(data.days, today(), data.since)
  const users = runningTotal(days.map((d) => d.users))
  const bots = runningTotal(days.map((d) => d.bots))
  const line = (values: number[], label: string) =>
    values.length > 1 ? (
      <Sparkline values={values} min={0} width={64} height={24} aria-label={label} />
    ) : null
  const tile = 'min-w-0'
  return (
    <Panel
      className="col-span-12"
      title="the site in numbers"
      status={readStatus(data, null, (d) => `as of ${d.at.slice(11, 16)} utc`)}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
        <Stat
          className={tile}
          loading={loading}
          label="uptime"
          value={data && (data.since === null ? '–' : uptime(data.since, Date.now()))}
          note={data?.since ? `since ${day(data.since)}` : undefined}
        />
        <Stat
          className={tile}
          loading={loading}
          label="users"
          value={data && count(data.users)}
          note={data && `${count(data.builders)} with a bot`}
        >
          {line(users, 'users over time')}
        </Stat>
        <Stat
          className={tile}
          loading={loading}
          label="bots"
          value={data && count(data.bots)}
          note={data && `${count(data.rosterBots)} house · ${count(data.versions)} versions`}
        >
          {line(bots, 'bots over time')}
        </Stat>
        <Stat
          className={tile}
          loading={loading}
          label="matches"
          value={data && count(data.matches)}
          note={data && `${count(data.melees)} ${data.melees === 1 ? 'melee' : 'melees'}`}
        >
          {days.length > 1 && (
            <Sparkline
              values={days.slice(-30).map((d) => d.matches)}
              bars
              width={64}
              height={24}
              aria-label="matches a day, last 30 days"
            />
          )}
        </Stat>
        <Stat
          className={tile}
          loading={loading}
          label="rounds"
          value={data && count(data.rounds)}
          note={data && data.matches > 0 && `${(data.rounds / data.matches).toFixed(1)} a match`}
        />
        <Stat
          className={tile}
          loading={loading}
          label="deaths"
          value={data && count(data.deaths)}
          note={data && data.rounds > 0 && `${(data.deaths / data.rounds).toFixed(2)} a round`}
        />
        <Stat
          className={tile}
          loading={loading}
          label="cycles"
          value={data && <span title={count(data.cycles)}>{compact(data.cycles)}</span>}
          note={
            data && data.rounds > 0 && `${compact(Math.round(data.cycles / data.rounds))} a round`
          }
        />
        <Stat
          className={tile}
          loading={loading}
          label="tournaments"
          value={data && count(data.tournaments)}
          note={data && plural(data.championships, 'championship')}
        />
      </div>
    </Panel>
  )
}

/** The server's matches a day, by the metric the reader picks. */
function Activity({ data }: Part) {
  const [metric, setMetric] = useState<DayMetric>('matches')
  const days =
    data === undefined
      ? []
      : everyDay(data.days, today(), data.since, { least: LEAST_DAYS, limit: CHART_DAYS })
  return (
    <Panel
      className="col-span-12 lg:col-span-8"
      title="activity"
      status={readStatus(data, null, () => plural(days.length, 'day'))}
      actions={
        <Segmented<DayMetric>
          label="count"
          options={METRICS}
          value={metric}
          onValueChange={setMetric}
        />
      }
    >
      {data === undefined ? (
        <Skeleton className="h-56" />
      ) : (
        <DayChart days={days} metric={metric} />
      )}
    </Panel>
  )
}

/** A number and what it is, a row of a panel's list. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-border border-b py-1 last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-bright tabular-nums">{children}</dd>
    </div>
  )
}

/** Of every bot in every round, how many died and how many lived to the end. */
function LifeAndDeath({ data }: Part) {
  return (
    <Panel
      className="col-span-12 lg:col-span-4"
      title="life and death"
      status={readStatus(data, null, (d) => `${count(d.deaths + d.survivals)} bot-rounds`)}
    >
      {data === undefined ? (
        <Skeleton rows={4} />
      ) : (
        <div className="flex flex-col gap-4 text-data">
          <p className="text-muted">
            Every bot in every round: it died, or it was still running when the round ended.
          </p>
          <Split
            a={data.deaths}
            b={data.survivals}
            aLabel="died"
            bLabel="lived"
            aClass="bg-danger"
          />
          <Split
            a={data.melees}
            b={data.matches - data.melees}
            aLabel={data.melees === 1 ? 'melee' : 'melees'}
            bLabel={data.matches - data.melees === 1 ? 'duel' : 'duels'}
            aClass="bg-info"
          />
          <dl>
            <Fact label="bots per round">
              {data.rounds === 0 ? '–' : ((data.deaths + data.survivals) / data.rounds).toFixed(2)}
            </Fact>
            <Fact label="deaths a match">
              {data.matches === 0 ? '–' : (data.deaths / data.matches).toFixed(2)}
            </Fact>
            <Fact label="cycles a round">
              {data.rounds === 0 ? '–' : count(Math.round(data.cycles / data.rounds))}
            </Fact>
          </dl>
        </div>
      )}
    </Panel>
  )
}

/** The bots by weight class, and by size in powers of two. */
function Classes({ data }: Part) {
  return (
    <Panel
      className="col-span-12 lg:col-span-6"
      title="weight classes"
      status={readStatus(data, null, (d) => plural(d.bots, 'bot'))}
    >
      {data === undefined ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="flex flex-col gap-4">
          <ClassCounts sizes={data.sizes} />
          <SizeChart bins={sizeBins(data.sizes)} />
        </div>
      )}
    </Panel>
  )
}

/** A record's line: what it is, its number, and whose it is. */
function RecordRow({
  label,
  record,
  value,
  says,
}: {
  label: string
  record: StatsRecord | null
  value: (r: StatsRecord) => string
  says: (r: StatsRecord) => ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border border-l-4 border-l-accent bg-panel-2 p-2">
      <dt className="flex items-baseline justify-between gap-3">
        <span className="text-muted text-panel-status">{label}</span>
        {record?.replayKey != null && (
          <Link
            to="/arena/$replayId"
            params={{ replayId: record.replayKey }}
            className={`${CELL_LINK} text-data`}
          >
            watch
          </Link>
        )}
      </dt>
      <dd className="flex flex-col gap-0.5">
        {record === null ? (
          <span className="text-muted text-data">no record yet.</span>
        ) : (
          <>
            <span className="text-bright text-stat tabular-nums">{value(record)}</span>
            <span className="text-data text-muted">{says(record)}</span>
          </>
        )}
      </dd>
    </div>
  )
}

/** Where a record was set: ` on main`, or nothing off any hill. */
function onHill(r: StatsRecord): ReactNode {
  return r.hill === null ? null : (
    <>
      {' '}
      on{' '}
      <Link to="/hills/$slug" params={{ slug: r.hill.slug }} className={CELL_LINK}>
        {r.hill.name}
      </Link>
    </>
  )
}

/** The records: the fastest kill, the longest fight, the longest reign, the most matches. */
function Records({ data }: Part) {
  const records = data?.records
  return (
    <Panel
      className="col-span-12 lg:col-span-6"
      title="records"
      status={readStatus(data, null, () => 'all time')}
    >
      {records === undefined ? (
        <Skeleton rows={4} />
      ) : (
        <dl className="grid gap-2 sm:grid-cols-2">
          <RecordRow
            label="fastest kill"
            record={records.fastestKill}
            value={(r) => `${count(r.value)} ${r.value === 1 ? 'cycle' : 'cycles'}`}
            says={(r) => (
              <>
                <BotLink bot={r.bot} by /> killed{' '}
                {r.other === null ? 'its rival' : <BotLink bot={r.other} by />}
                {onHill(r)}
              </>
            )}
          />
          <RecordRow
            label="longest fight"
            record={records.longestFight}
            value={(r) => `${count(r.value)} ${r.value === 1 ? 'cycle' : 'cycles'}`}
            says={(r) => (
              <>
                <BotLink bot={r.bot} by /> outlasted{' '}
                {r.other === null ? 'its rival' : <BotLink bot={r.other} by />}
                {onHill(r)}
              </>
            )}
          />
          <RecordRow
            label="longest reign"
            record={records.longestReign}
            value={(r) => plural(r.value, 'challenge')}
            says={(r) => (
              <>
                <BotLink bot={r.bot} by />, king{onHill(r)}
              </>
            )}
          />
          <RecordRow
            label="most matches"
            record={records.mostMatches}
            value={(r) => `${count(r.value)} ${r.value === 1 ? 'match' : 'matches'}`}
            says={(r) => (
              <>
                <BotLink bot={r.bot} by />, every version
              </>
            )}
          />
        </dl>
      )}
    </Panel>
  )
}

const HILL_COLUMNS: TableColumn<StatsHill>[] = [
  {
    id: 'hill',
    header: 'hill',
    cell: (h) => (
      <Link to="/hills/$slug" params={{ slug: h.slug }} className={CELL_LINK}>
        {h.name}
      </Link>
    ),
    sortValue: (h) => h.name,
  },
  {
    id: 'class',
    header: 'class',
    cell: (h) => {
      const weight = bandWeight(h)
      return weight === null ? (
        <span className="text-muted">–</span>
      ) : (
        <WeightChip weight={weight} />
      )
    },
    className: 'w-20',
  },
  {
    id: 'entrants',
    header: 'entrants',
    cell: (h) => count(h.entrants),
    align: 'right',
    sortValue: (h) => h.entrants,
    className: 'hidden md:table-cell',
  },
  {
    id: 'matches',
    header: 'matches',
    cell: (h) => count(h.matches),
    align: 'right',
    sortValue: (h) => h.matches,
  },
  {
    id: 'challenges',
    header: 'challenges',
    cell: (h) => count(h.challenges),
    align: 'right',
    sortValue: (h) => h.challenges,
    className: 'hidden md:table-cell',
  },
  {
    id: 'crowns',
    header: 'crowns',
    cell: (h) => count(h.crowns),
    align: 'right',
    sortValue: (h) => h.crowns,
    className: 'hidden md:table-cell',
  },
  {
    id: 'king',
    header: 'king',
    cell: (h) =>
      h.king === null ? <span className="text-muted">none</span> : <BotLink bot={h.king} by />,
    sortValue: (h) => h.king?.name ?? '',
  },
  {
    id: 'reign',
    header: 'reign',
    cell: (h) => (h.reign === null ? '' : count(h.reign)),
    align: 'right',
    sortValue: (h) => h.reign ?? -1,
  },
]

/** The hills in the hills page's order: the classes lightest first (`hillOrder`). */
const byClass = (hills: readonly StatsHill[]) =>
  [...hills].sort(
    (a, b) =>
      hillOrder({ config: a, scoring: a.scoring }) - hillOrder({ config: b, scoring: b.scoring }),
  )

/** Each hill: how full, how busy, how often its crown changed hands, and who holds it. */
function Hills({ data }: Part) {
  const navigate = useNavigate()
  const link = useLinkAction()
  return (
    <Panel
      className="col-span-12"
      title="hills"
      status={readStatus(data, null, (d) => `${count(d.challenges)} challenges`)}
    >
      <Table
        aria-label="hills"
        columns={HILL_COLUMNS}
        rows={byClass(data?.hills ?? [])}
        rowKey={(h) => h.slug}
        empty={
          data === undefined ? (
            <Skeleton rows={4} />
          ) : (
            <EmptyState action={link('see how hills work', '/docs/tournaments/hills')}>
              no hill is open yet.
            </EmptyState>
          )
        }
        onRowClick={(h) => void navigate({ to: '/hills/$slug', params: { slug: h.slug } })}
      />
    </Panel>
  )
}
