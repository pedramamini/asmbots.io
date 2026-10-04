/**
 * A bot page's charts (PRODUCT_SPEC §6), across its top: its form (its record and its latest
 * matches, a cell each), its rank on each hill over time, its rivals head to head, and its machine
 * code as a map of its bytes. Drawn in the theme's tokens, no chart library; each chart is one
 * image to assistive tech, its `aria-label` the numbers it shows. Its own chunk, loaded after the
 * page: it imports nothing the route does, so the route keeps its own chunk.
 */
import { type BotPlacement, fromBase64 } from '@asmbots/protocol'
import { cx, Panel, Skeleton } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { type ReactNode, useMemo, useState } from 'react'
import { useBotActivity } from '../../api/bot-activity'
import {
  bytesStats,
  type Fought,
  foughtOf,
  type Outcome,
  type RankSeries,
  type Rival,
  rankSeriesOf,
  recordOf,
  rivalsOf,
  type WinRecord,
} from './activity'

/** The most matches the form strip draws, the latest. */
const FORM = 60
/** The most rivals listed. */
const RIVALS = 5

const n = (value: number) => value.toLocaleString('en-US')
const percent = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((100 * part) / whole)

const OUTCOME_FILL: Record<Outcome, string> = {
  win: 'bg-accent',
  tie: 'bg-dim',
  loss: 'bg-danger',
}

export function BotCharts({ id, placements }: { id: string; placements: readonly BotPlacement[] }) {
  const activity = useBotActivity(id)
  const data = activity.data
  const fought = useMemo(() => (data === undefined ? [] : foughtOf(data, id)), [data, id])
  const series = useMemo(
    () => (data === undefined ? [] : rankSeriesOf(data.events, placements)),
    [data, placements],
  )
  const bytes = useMemo(() => (data?.bytes == null ? null : fromBase64(data.bytes)), [data?.bytes])
  return (
    <Panel
      className="col-span-12"
      title="battle record"
      status={data === undefined ? undefined : `${n(fought.length)} matches`}
    >
      {data === undefined ? (
        activity.isError ? (
          <p className="text-data text-muted">could not read its matches.</p>
        ) : (
          <Skeleton rows={6} />
        )
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
          <Tile title="form">
            <Form fought={fought} />
          </Tile>
          <Tile title="hill rank">
            <RankChart series={series} />
          </Tile>
          <Tile title="rivals">
            <Rivals rivals={rivalsOf(fought, RIVALS)} />
          </Tile>
          <Tile title="machine code">
            {bytes === null ? (
              <Empty>its machine code is not stored.</Empty>
            ) : (
              <ByteMap bytes={bytes} />
            )}
          </Tile>
        </div>
      )}
    </Panel>
  )
}

function Tile({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-2">
      <h2 className="text-panel-status text-muted">{title}</h2>
      {children}
    </section>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="py-4 text-data text-muted">{children}</p>
}

/** The record as a win rate and a bar split three ways, and the latest matches as cells. */
function Form({ fought }: { fought: readonly Fought[] }) {
  if (fought.length === 0) return <Empty>no matches on the server yet.</Empty>
  const record = recordOf(fought)
  const latest = fought.slice(-FORM)
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-baseline gap-2">
        <span className="text-stat text-bright tabular-nums">
          {percent(record.wins, fought.length)}%
        </span>
        <span className="text-data text-muted">won of {n(fought.length)}</span>
      </p>
      <Split record={record} />
      <div
        role="img"
        aria-label={`the latest ${latest.length} matches, oldest first: ${latest
          .map((f) => f.outcome)
          .join(', ')}`}
        className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-px"
      >
        {latest.map((f) => (
          <span
            key={f.id}
            title={`${f.outcome} · ${n(f.points)} of ${n(f.top)} points${
              f.rivals.length === 1 && f.rivals[0] ? ` · vs ${f.rivals[0].name}` : ''
            }${f.at === null ? '' : ` · ${f.at.slice(0, 10)}`}`}
            className={cx('aspect-square rounded-[1px]', OUTCOME_FILL[f.outcome])}
          />
        ))}
      </div>
      <p className="flex gap-3 text-panel-status text-muted">
        <Key fill="bg-accent">win</Key>
        <Key fill="bg-dim">tie</Key>
        <Key fill="bg-danger">loss</Key>
      </p>
    </div>
  )
}

function Key({ fill, children }: { fill: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1">
      <span aria-hidden="true" className={cx('size-2 rounded-[1px]', fill)} />
      {children}
    </span>
  )
}

/** Wins, ties, and losses as one bar split three ways, with the counts under it. */
function Split({ record, thin = false }: { record: WinRecord; thin?: boolean }) {
  const total = record.wins + record.ties + record.losses
  const parts = [
    { count: record.wins, word: 'won', fill: 'bg-accent' },
    { count: record.ties, word: 'tied', fill: 'bg-dim' },
    { count: record.losses, word: 'lost', fill: 'bg-danger' },
  ]
  return (
    <div
      role="img"
      aria-label={parts.map((p) => `${n(p.count)} ${p.word}`).join(', ')}
      className={cx('flex gap-px overflow-hidden rounded-sm bg-border', thin ? 'h-1.5' : 'h-3')}
    >
      {parts.map((p) =>
        p.count === 0 ? null : (
          <div
            key={p.word}
            className={p.fill}
            style={{ width: `${(100 * p.count) / Math.max(1, total)}%` }}
          />
        ),
      )}
    </div>
  )
}

/** The chart's box, in SVG units: stretched to the tile's width. */
const W = 300
const H = 120

/**
 * The bot's rank on each hill over time, one step line a hill, #1 at the top: the hill of its best
 * place now in the accent, the others dim; a line ends where the bot fell off the board, and runs
 * to now where it still holds a place. Under it, each hill and the rank there now.
 */
function RankChart({ series }: { series: readonly RankSeries[] }) {
  const drawn = series.filter((s) => s.steps.length > 0)
  if (drawn.length === 0) return <Empty>not on a hill yet.</Empty>
  const now = Date.now()
  const start = Math.min(...drawn.map((s) => s.steps[0]?.t ?? now))
  // The bottom is the last place of the largest hill drawn: #2 of 10 sits near the top.
  const worst = Math.max(
    2,
    ...drawn.flatMap((s) => [s.hill.size ?? 0, ...s.steps.map((p) => p.rank ?? 0), s.now ?? 0]),
  )
  const x = (t: number) => (now === start ? W : ((t - start) / (now - start)) * W)
  const y = (rank: number) => 6 + ((rank - 1) / (worst - 1)) * (H - 12)
  const path = (s: RankSeries) => {
    let d = ''
    let rank: number | null = null
    for (const step of s.steps) {
      const at = x(step.t).toFixed(1)
      if (rank !== null) d += `H${at}`
      if (step.rank !== null) {
        d += rank === null ? `M${at} ${y(step.rank).toFixed(1)}` : `V${y(step.rank).toFixed(1)}`
      }
      rank = step.rank
    }
    // Still on the board: the line slopes to now at the rank it holds now. Challenges since the
    // last event moved it, and they are not events of its own, so when is not known.
    if (rank !== null) d += `L${W} ${y(s.now ?? rank).toFixed(1)}`
    return d
  }
  return (
    <div className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={drawn
          .map((s) => `${s.hill.name}: ${s.now === null ? 'off the board' : `rank ${s.now}`}`)
          .join(', ')}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-28 w-full overflow-visible border-border border-b"
      >
        {[1, worst].map((rank) => (
          <line
            key={rank}
            x1={0}
            x2={W}
            y1={y(rank)}
            y2={y(rank)}
            className="stroke-border"
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {[...drawn].reverse().map((s, i) => (
          <path
            key={s.hill.slug}
            d={path(s)}
            fill="none"
            className={i === drawn.length - 1 ? 'stroke-accent' : 'stroke-dim'}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="flex justify-between text-panel-status text-muted tabular-nums">
        <span>since {new Date(start).toISOString().slice(0, 10)}</span>
        <span>#1 top · #{worst} bottom</span>
      </div>
      <ul className="flex flex-col gap-0.5 text-data">
        {drawn.map((s, i) => (
          <li key={s.hill.slug} className="flex items-center justify-between gap-2">
            <Link
              to="/hills/$slug"
              params={{ slug: s.hill.slug }}
              className={cx(
                'truncate underline-offset-2 hover:underline',
                i === 0 ? 'text-accent-fg' : 'text-muted',
              )}
            >
              {s.hill.name}
            </Link>
            <span className="text-bright tabular-nums">
              {s.now === null ? 'off' : s.now === 1 ? 'king' : `#${s.now}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The bot's most-faced rivals: each linked, with its record against them as a thin split. */
function Rivals({ rivals }: { rivals: readonly Rival[] }) {
  if (rivals.length === 0) return <Empty>no rivals yet.</Empty>
  return (
    <ul className="flex flex-col gap-2">
      {rivals.map((r) => (
        <li key={r.bot.botId} className="flex flex-col gap-1">
          <p className="flex items-baseline justify-between gap-2 text-data">
            <Link
              to="/bots/$id"
              params={{ id: r.bot.botId }}
              className="truncate text-bright underline-offset-2 hover:underline"
            >
              {r.bot.name}
            </Link>
            <span className="shrink-0 text-muted tabular-nums">
              {r.wins}-{r.ties}-{r.losses}
            </span>
          </p>
          <Split record={r} thin />
        </li>
      ))}
    </ul>
  )
}

/**
 * The machine code as a map, a cell a byte in load order, four times as wide as it is tall: a zero
 * byte (a DAT word's) dark, the others in the accent, brighter as the byte is larger. The pointer's
 * byte reads out under it.
 */
function ByteMap({ bytes }: { bytes: Uint8Array }) {
  const [at, setAt] = useState<number | null>(null)
  const cols = Math.max(16, Math.ceil(Math.sqrt(bytes.length * 4)))
  const rows = Math.max(1, Math.ceil(bytes.length / cols))
  const stats = bytesStats(bytes)
  const cells: ReactNode[] = []
  bytes.forEach((b, i) => {
    cells.push(
      <rect
        key={i}
        data-at={i}
        x={(i % cols) + 0.1}
        y={Math.floor(i / cols) + 0.1}
        width={0.8}
        height={0.8}
        className={b === 0 ? 'fill-border' : i === at ? 'fill-bright' : 'fill-accent'}
        fillOpacity={b === 0 || i === at ? 1 : 0.3 + (0.7 * b) / 255}
      />,
    )
  })
  const hex = (v: number, width: number) => v.toString(16).toUpperCase().padStart(width, '0')
  return (
    <div className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={`${n(stats.size)} bytes, ${percent(stats.zero, stats.size)}% zero, entropy ${stats.entropy.toFixed(1)} bits a byte`}
        viewBox={`0 0 ${cols} ${rows}`}
        className="w-full"
        onMouseMove={(event) => {
          const cell = (event.target as Element).getAttribute('data-at')
          setAt(cell === null ? null : Number(cell))
        }}
        onMouseLeave={() => setAt(null)}
      >
        {cells}
      </svg>
      <p className="flex justify-between gap-2 text-panel-status text-muted tabular-nums">
        {at === null ? (
          <>
            <span>{n(stats.size)} B</span>
            <span>{percent(stats.zero, stats.size)}% zero</span>
            <span>{stats.entropy.toFixed(1)} bits/B</span>
          </>
        ) : (
          <>
            <span>+0x{hex(at, 4)}</span>
            <span className="text-bright">{hex(bytes[at] ?? 0, 2)}</span>
          </>
        )}
      </p>
    </div>
  )
}
