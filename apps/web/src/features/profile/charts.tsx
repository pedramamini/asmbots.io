/**
 * A profile's charts (PRODUCT_SPEC §6), drawn in the theme's tokens, no chart library: gauges for
 * its rates, a calendar of its days, its bots and versions over time, its bots by class, a rank in
 * a hill's field, and a record split three ways. Each chart is one image to assistive tech, its
 * `aria-label` the numbers it shows. Color is identity, brightness is recency, white is now
 * (DESIGN_SYSTEM §1): the accent fills, the reading or the hovered day is bright.
 */
import type { UserDay } from '@asmbots/protocol'
import { cx } from '@asmbots/ui'
import { type ReactNode, useState } from 'react'
import { count, plural } from '../hills/links'
import { Gridlines, metricText } from '../stats/charts'
import { botsByClass, percent, runningTotal } from '../stats/series'
import { type ActivityMetric, shade, type Week } from './series'

/** The segments of a gauge's half circle. */
const SEGMENTS = 24

/** The gauge's arc, a path a segment: a half circle of radius 48 about (60, 60), left to right. */
const ARC = Array.from({ length: SEGMENTS }, (_, i) => {
  const gap = 0.018
  const a0 = Math.PI * (1 - i / SEGMENTS) - gap
  const a1 = Math.PI * (1 - (i + 1) / SEGMENTS) + gap
  const at = (a: number) =>
    `${(60 + 48 * Math.cos(a)).toFixed(2)} ${(60 - 48 * Math.sin(a)).toFixed(2)}`
  return `M${at(a0)}A48 48 0 0 1 ${at(a1)}`
})

/**
 * A rate as a dial: a half circle of segments, lit from the left to `value` (0..1), the last lit
 * one bright; the reading under the arc. `value` null (nothing to rate yet) lights none.
 */
export function Gauge({
  label,
  value,
  reading,
  note,
}: {
  label: string
  value: number | null
  reading: string
  note?: ReactNode
}) {
  const lit = value === null ? 0 : Math.round(Math.min(1, Math.max(0, value)) * SEGMENTS)
  return (
    <figure className="flex min-w-0 flex-col items-center gap-1 rounded-md border border-border bg-panel-2 px-3 pt-3 pb-2">
      <div className="relative w-full max-w-44">
        <svg viewBox="0 0 120 64" className="block w-full" aria-hidden="true">
          {ARC.map((d, i) => (
            <path
              key={d}
              d={d}
              fill="none"
              strokeWidth={9}
              className={cx(
                'transition-colors duration-120',
                i >= lit ? 'stroke-border' : i === lit - 1 ? 'stroke-bright' : 'stroke-accent',
              )}
            />
          ))}
        </svg>
        <span className="absolute inset-x-0 bottom-0 text-center text-bright text-stat tabular-nums">
          {reading}
        </span>
      </div>
      <figcaption className="flex min-w-0 flex-col items-center text-center">
        <span className="text-muted text-panel-status">{label}</span>
        {note !== undefined && <span className="truncate text-data text-muted">{note}</span>}
      </figcaption>
    </figure>
  )
}

/** A calendar day's fill by its shade, 0 (nothing) to 4 (the busiest day shown). */
const SHADES = ['bg-border', 'bg-accent-25', 'bg-accent-45', 'bg-accent-80', 'bg-accent'] as const

/** `1 version saved`, `3 versions saved`, `40 matches`, `1 win`. */
function activityText(metric: ActivityMetric, n: number): string {
  if (metric === 'versions') return `${count(n)} ${n === 1 ? 'version' : 'versions'} saved`
  if (metric === 'matches') return metricText('matches', n)
  return plural(n, 'win')
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * The days as a calendar, a column a week (Monday at the top), the oldest week at the left: each
 * day shaded by one metric on a log scale, today ringed. A month's name heads the week it starts
 * in. The readout names the hovered day, else today.
 */
export function ActivityCalendar({
  weeks,
  metric,
  today,
}: {
  weeks: readonly Week[]
  metric: ActivityMetric
  today: string
}) {
  const [hover, setHover] = useState<UserDay | null>(null)
  const days = weeks.flat().filter((d): d is UserDay => d !== null)
  const max = Math.max(0, ...days.map((d) => d[metric]))
  const total = days.reduce((n, d) => n + d[metric], 0)
  const active = days.filter((d) => d[metric] > 0).length
  const shown = hover ?? days.find((d) => d.day === today) ?? days[days.length - 1]
  const cols = { gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="flex items-baseline justify-between gap-3 text-data">
        <span className="text-muted">{hover === null ? `today · ${today}` : hover.day}</span>
        <span className="text-bright tabular-nums">
          {shown === undefined ? '' : activityText(metric, shown[metric])}
        </span>
      </figcaption>
      <div aria-hidden="true" className="grid gap-[3px] text-muted text-panel-status" style={cols}>
        {weeks.map((week, w) => {
          const first = week[0]?.day ?? ''
          const prior = weeks[w - 1]?.[0]?.day ?? ''
          const month = first.slice(5, 7)
          // The first week's month only when the next month's name is 2 weeks off or more.
          const named = w === 0 ? Number(first.slice(8, 10)) <= 14 : month !== prior.slice(5, 7)
          return (
            <span key={first || w} className="overflow-visible whitespace-nowrap">
              {named ? MONTHS[Number(month) - 1] : ''}
            </span>
          )
        })}
      </div>
      <div
        role="img"
        aria-label={`${activityText(metric, total)} over the last ${plural(weeks.length, 'week')}, on ${plural(active, 'day')}; at most ${activityText(metric, max)} in a day.`}
        className="grid grid-flow-col grid-rows-7 gap-[3px]"
        style={cols}
        onMouseLeave={() => setHover(null)}
      >
        {weeks.flatMap((week, w) =>
          week.map((d, i) =>
            d === null ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: a day after today has no date of its own.
              <span key={`${w}-${i}`} className="aspect-square" />
            ) : (
              // biome-ignore lint/a11y/noStaticElementInteractions: the pointer's readout only; the chart's label says every number.
              <span
                key={d.day}
                className={cx(
                  'aspect-square rounded-[2px] transition-colors duration-120',
                  hover?.day === d.day ? 'bg-bright' : SHADES[shade(d[metric], max)],
                  d.day === today && 'outline outline-1 outline-bright outline-offset-1',
                )}
                onMouseEnter={() => setHover(d)}
              />
            ),
          ),
        )}
      </div>
      <div
        aria-hidden="true"
        className="flex items-center justify-between gap-3 text-muted text-panel-status"
      >
        <span>
          active {plural(active, 'day')} of {count(days.length)}
        </span>
        <span className="flex items-center gap-1">
          less
          {SHADES.map((s) => (
            <span key={s} className={cx('size-2.5 rounded-[2px]', s)} />
          ))}
          more
        </span>
      </div>
    </figure>
  )
}

/**
 * The bots and versions a user has, day by day: the bots as a filled area, the versions as a line
 * over it, the day they joined a dashed rule. The readout says the hovered day's totals, else
 * today's; the most at the top left.
 */
export function GrowthChart({ days, joined }: { days: readonly UserDay[]; joined: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const bots = runningTotal(days.map((d) => d.bots))
  const versions = runningTotal(days.map((d) => d.versions))
  const max = Math.max(1, ...versions, ...bots)
  const first = days[0]
  const last = days[days.length - 1]
  if (first === undefined || last === undefined) return <p className="text-muted">no days yet.</p>
  const n = days.length
  const x = (i: number) => (n === 1 ? 50 : (100 * i) / (n - 1))
  const y = (v: number) => 100 - (100 * v) / max
  const line = (values: readonly number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(3)} ${y(v).toFixed(3)}`).join('')
  const area = `${line(bots)}L100 100L0 100Z`
  const shown = hover ?? n - 1
  const joinedAt = days.findIndex((d) => d.day === joined.slice(0, 10))
  const at = days[shown] ?? last
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="flex items-baseline justify-between gap-3 text-data">
        <span className="text-muted">{hover === null ? `today · ${at.day}` : at.day}</span>
        <span className="flex gap-3 tabular-nums">
          <span className="text-bright">{plural(bots[shown] ?? 0, 'bot')}</span>
          <span className="text-accent-fg">{plural(versions[shown] ?? 0, 'version')}</span>
        </span>
      </figcaption>
      <div
        role="img"
        aria-label={`bots and versions, ${first.day} to ${last.day}: ${plural(bots[n - 1] ?? 0, 'bot')} and ${plural(versions[n - 1] ?? 0, 'version')} now.`}
        className="relative h-72 border-border border-b"
        onMouseLeave={() => setHover(null)}
      >
        <Gridlines />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
        >
          <path d={area} className="fill-accent-25 stroke-none" />
          <path
            d={line(bots)}
            fill="none"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            className="stroke-accent"
          />
          <path
            d={line(versions)}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
            className="stroke-accent-fg"
          />
        </svg>
        {joinedAt > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 border-border-strong border-l border-dashed"
            style={{ left: `${x(joinedAt)}%` }}
          >
            <span className="absolute top-0 left-1 whitespace-nowrap text-muted text-panel-status">
              joined
            </span>
          </div>
        )}
        <span className="pointer-events-none absolute top-0 left-0 bg-panel pr-1 text-muted text-panel-status tabular-nums">
          {count(max)}
        </span>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 border-bright border-l"
          style={{ left: `${x(shown)}%`, opacity: hover === null ? 0 : 1 }}
        />
        {[
          { values: bots, dot: 'bg-bright' },
          { values: versions, dot: 'bg-accent-fg' },
        ].map(({ values, dot }) => (
          <span
            key={dot}
            aria-hidden="true"
            className={cx(
              'pointer-events-none absolute size-2 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-panel',
              dot,
            )}
            style={{ left: `${x(shown)}%`, bottom: `${100 - y(values[shown] ?? 0)}%` }}
          />
        ))}
        <div className="absolute inset-0 flex">
          {days.map((d, i) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: the pointer's readout only; the chart's label says every number.
            <div key={d.day} className="h-full flex-1" onMouseEnter={() => setHover(i)} />
          ))}
        </div>
      </div>
      <div className="flex justify-between text-muted text-panel-status tabular-nums">
        <span>{first.day}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-0.5 w-3 bg-accent" /> bots
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-0 w-3 border-accent-fg border-t border-dashed" />{' '}
            versions
          </span>
        </span>
        <span>{last.day}</span>
      </div>
    </figure>
  )
}

/** A class's stroke in the ring and its key: lightweight in the full accent, each heavier fainter. */
const CLASS_STROKES = ['stroke-accent', 'stroke-accent-80', 'stroke-accent-45', 'stroke-accent-25']
const CLASS_FILLS = ['bg-accent', 'bg-accent-80', 'bg-accent-45', 'bg-accent-25']

/** The bots by weight class as a ring, lightest from the top, the count in its middle; a key beside it. */
export function ClassRing({ sizes }: { sizes: readonly { size: number; bots: number }[] }) {
  const classes = botsByClass(sizes)
  const total = classes.reduce((n, c) => n + c.bots, 0)
  let start = 0
  return (
    <div className="flex items-center gap-4">
      <div className="relative size-32 shrink-0">
        <svg
          viewBox="0 0 42 42"
          className="size-full -rotate-90"
          role="img"
          aria-label={`bots by weight class: ${classes.map((c) => `${count(c.bots)} ${c.name}`).join(', ')}.`}
        >
          <circle
            cx={21}
            cy={21}
            r={15.915}
            fill="none"
            strokeWidth={5}
            className="stroke-border"
          />
          {classes.map((c, i) => {
            const share = total === 0 ? 0 : (100 * c.bots) / total
            const offset = -start
            start += share
            return share === 0 ? null : (
              <circle
                key={c.slug}
                cx={21}
                cy={21}
                r={15.915}
                fill="none"
                strokeWidth={5}
                pathLength={100}
                strokeDasharray={`${Math.max(0, share - 0.6)} ${100 - Math.max(0, share - 0.6)}`}
                strokeDashoffset={offset}
                className={CLASS_STROKES[i]}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-bright text-stat tabular-nums">{count(total)}</span>
          <span className="text-muted text-panel-status">{total === 1 ? 'bot' : 'bots'}</span>
        </div>
      </div>
      <dl className="flex min-w-0 flex-1 flex-col gap-1.5 text-data">
        {classes.map((c, i) => (
          <div key={c.slug} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cx('size-2.5 shrink-0 rounded-[2px]', CLASS_FILLS[i])}
            />
            <dt className="min-w-0 flex-1 truncate text-muted">{c.name}</dt>
            <dd className="text-bright tabular-nums">{count(c.bots)}</dd>
            <dd className="w-10 text-right text-muted tabular-nums">{percent(c.bots, total)}%</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** The most ticks a rank strip draws; a larger field is scaled to it. */
const MAX_TICKS = 48

/**
 * A rank in a field of `entrants` as a strip of ticks, #1 at the left: the rank's tick bright and
 * tall, the ones it is ahead of in the accent, the ones ahead of it dim.
 */
export function RankStrip({ rank, entrants }: { rank: number; entrants: number }) {
  const n = Math.min(Math.max(1, entrants), MAX_TICKS)
  const at = entrants <= 1 ? 0 : Math.round(((rank - 1) / (entrants - 1)) * (n - 1))
  return (
    <div
      role="img"
      aria-label={`rank ${rank} of ${entrants}`}
      className="flex h-5 items-end gap-px"
    >
      {Array.from({ length: n }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: a tick is its place in the field.
          key={i}
          className={cx(
            'flex-1 rounded-t-[1px]',
            i === at ? 'h-full bg-bright' : i > at ? 'h-2.5 bg-accent-45' : 'h-2.5 bg-border',
          )}
        />
      ))}
    </div>
  )
}

/** Wins, ties, and losses as one bar split three ways: the accent, the dim, the danger. */
export function RecordBar({ wins, ties, losses }: { wins: number; ties: number; losses: number }) {
  const total = wins + ties + losses
  const parts = [
    { n: wins, word: 'won', fill: 'bg-accent' },
    { n: ties, word: 'tied', fill: 'bg-dim' },
    { n: losses, word: 'lost', fill: 'bg-danger' },
  ]
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={parts
          .map((p) => `${count(p.n)} ${p.word} (${percent(p.n, total)}%)`)
          .join(', ')}
        className="flex h-3 gap-px overflow-hidden rounded-sm bg-border"
      >
        {parts.map((p) =>
          p.n === 0 ? null : (
            <div key={p.word} className={p.fill} style={{ width: `${(100 * p.n) / total}%` }} />
          ),
        )}
      </div>
      <div aria-hidden="true" className="flex justify-between gap-3 text-data">
        {parts.map((p) => (
          <span key={p.word} className="text-muted">
            <span className="text-bright tabular-nums">{count(p.n)}</span> {p.word} ·{' '}
            {percent(p.n, total)}%
          </span>
        ))}
      </div>
    </div>
  )
}
