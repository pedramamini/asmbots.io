/**
 * The stats page's charts (PRODUCT_SPEC §12), drawn in HTML boxes in the theme's tokens, no chart
 * library: the bars of a series of days, the bots by size, and a split of two counts. Each chart is
 * one image to assistive tech, its `aria-label` the numbers it shows; its readout says a hovered
 * bar's value. Color is identity, brightness is recency, white is now (DESIGN_SYSTEM §1): the bars
 * are the accent, today's (or the hovered one) bright.
 */
import type { StatsDay } from '@asmbots/protocol'
import { cx } from '@asmbots/ui'
import { useState } from 'react'
import { count } from '../hills/links'
import { WEIGHT_SHORT } from '../hills/weight-names'
import { botsByClass, compact, type DayMetric, percent, type SizeBin } from './series'

/** A metric's word, as the readout says it after the number. */
const METRIC_WORDS: Readonly<Record<DayMetric, [one: string, many: string]>> = {
  matches: ['match', 'matches'],
  rounds: ['round', 'rounds'],
  deaths: ['death', 'deaths'],
  cycles: ['cycle', 'cycles'],
}

/** `1 match`, `40 matches`, `12.5M cycles`. */
export function metricText(metric: DayMetric, n: number): string {
  const [one, many] = METRIC_WORDS[metric]
  return `${metric === 'cycles' ? compact(n) : count(n)} ${n === 1 ? one : many}`
}

/** A bar's height, a percent of the chart's: at least a sliver for any value over 0. */
function barHeight(value: number, max: number): string {
  if (value <= 0 || max <= 0) return '0%'
  return `${Math.max(2, (100 * value) / max)}%`
}

/** Hairlines across a chart at a quarter, a half, and three quarters of its height. */
export function Gridlines() {
  return (
    <>
      {[25, 50, 75].map((at) => (
        <div
          key={at}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-border border-t border-dashed"
          style={{ bottom: `${at}%` }}
        />
      ))}
    </>
  )
}

/**
 * The days as bars, oldest at the left: one metric's value a day. The readout above names the
 * hovered day, else the last (today); the largest value sits at the top left.
 */
export function DayChart({ days, metric }: { days: readonly StatsDay[]; metric: DayMetric }) {
  const [hover, setHover] = useState<number | null>(null)
  const values = days.map((d) => d[metric])
  const max = Math.max(0, ...values)
  const total = values.reduce((a, b) => a + b, 0)
  const shown = hover ?? days.length - 1
  const at = days[shown]
  const first = days[0]
  const last = days[days.length - 1]
  if (first === undefined || last === undefined || at === undefined) {
    return <p className="text-muted">no days yet.</p>
  }
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="flex items-baseline justify-between gap-3 text-data">
        <span className="text-muted">{hover === null ? `today · ${at.day}` : at.day}</span>
        <span className="text-bright tabular-nums">{metricText(metric, values[shown] ?? 0)}</span>
      </figcaption>
      <div
        role="img"
        aria-label={`${metric} a day, ${first.day} to ${last.day}: ${metricText(metric, total)} in all, at most ${metricText(metric, max)} in a day.`}
        className="relative flex h-44 items-end gap-px border-border border-b"
        onMouseLeave={() => setHover(null)}
      >
        <Gridlines />
        <span className="pointer-events-none absolute top-0 left-0 bg-panel pr-1 text-muted text-panel-status tabular-nums">
          {metric === 'cycles' ? compact(max) : count(max)}
        </span>
        {days.map((d, i) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: the pointer's readout only; the chart's label says every number.
          <div
            key={d.day}
            className="relative flex h-full min-w-px flex-1 items-end"
            onMouseEnter={() => setHover(i)}
          >
            <div
              className={cx(
                'w-full rounded-t-[1px] transition-colors duration-120',
                i === shown ? 'bg-bright' : 'bg-accent-80',
              )}
              style={{ height: barHeight(d[metric], max) }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-muted text-panel-status tabular-nums">
        <span>{first.day}</span>
        <span>{last.day}</span>
      </div>
    </figure>
  )
}

/** The class a size bin sits in, by its top: every bin up to 512 is light. */
const CLASS_SPANS = [
  { slug: 'lightweight', bins: 10 },
  { slug: 'middleweight', bins: 1 },
  { slug: 'heavyweight', bins: 1 },
  { slug: 'super-heavy', bins: 1 },
] as const

/** A bin's top in 4 characters: `64`, `1k`, `4k`. */
const binTop = (max: number) => (max >= 1024 ? `${max / 1024}k` : String(max))

/**
 * The bots by size, a bar per power of two (1 byte to 4 KB), and under them the weight classes,
 * each over the bins it spans.
 */
export function SizeChart({ bins }: { bins: readonly SizeBin[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(0, ...bins.map((b) => b.bots))
  const total = bins.reduce((n, b) => n + b.bots, 0)
  const at = hover === null ? null : bins[hover]
  const cols = { gridTemplateColumns: `repeat(${bins.length}, minmax(0, 1fr))` }
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="flex items-baseline justify-between gap-3 text-data">
        <span className="text-muted">
          {at == null ? 'bytes, latest version' : `${count(at.min)}–${count(at.max)} bytes`}
        </span>
        <span className="text-bright tabular-nums">
          {count(at == null ? total : at.bots)}{' '}
          {(at == null ? total : at.bots) === 1 ? 'bot' : 'bots'}
        </span>
      </figcaption>
      <div
        role="img"
        aria-label={`bots by size: ${bins
          .filter((b) => b.bots > 0)
          .map((b) => `${count(b.bots)} of ${count(b.min)} to ${count(b.max)} bytes`)
          .join(', ')}.`}
        className="relative grid h-32 items-end gap-1 border-border border-b"
        style={cols}
        onMouseLeave={() => setHover(null)}
      >
        <Gridlines />
        {bins.map((b, i) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: the pointer's readout only; the chart's label says every number.
          <div
            key={b.max}
            className="relative flex h-full items-end"
            onMouseEnter={() => setHover(i)}
          >
            <div
              className={cx(
                'w-full rounded-t-[1px] transition-colors duration-120',
                hover === i ? 'bg-bright' : 'bg-accent-80',
              )}
              style={{ height: barHeight(b.bots, max) }}
            />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="grid gap-1 text-center text-muted text-panel-status"
        style={cols}
      >
        {bins.map((b) => (
          <span key={b.max} className="tabular-nums">
            {binTop(b.max)}
          </span>
        ))}
      </div>
      <div aria-hidden="true" className="grid gap-1 text-panel-status" style={cols}>
        {CLASS_SPANS.map((c) => (
          <span
            key={c.slug}
            className="truncate border-border-strong border-t pt-0.5 text-center text-muted"
            style={{ gridColumn: `span ${c.bins} / span ${c.bins}` }}
          >
            {WEIGHT_SHORT[c.slug]}
          </span>
        ))}
      </div>
    </figure>
  )
}

/** The bots in each class as a row of counts, each with its share of all four. */
export function ClassCounts({ sizes }: { sizes: readonly { size: number; bots: number }[] }) {
  const classes = botsByClass(sizes)
  const total = classes.reduce((n, c) => n + c.bots, 0)
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {classes.map((c) => (
        <div
          key={c.slug}
          className="flex flex-col gap-1 rounded-md border border-border bg-panel-2 p-2"
        >
          <dt className="truncate text-muted text-panel-status">{c.name}</dt>
          <dd className="flex items-baseline justify-between gap-2">
            <span className="text-bright text-stat tabular-nums">{count(c.bots)}</span>
            <span className="text-data text-muted tabular-nums">{percent(c.bots, total)}%</span>
          </dd>
          <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-accent" style={{ width: `${percent(c.bots, total)}%` }} />
          </div>
        </div>
      ))}
    </dl>
  )
}

/**
 * Two counts as one bar split in two, `a` from the left in `aClass`, `b` in the accent, with a
 * legend under it: the rounds' bots that died and those that lived to the end.
 */
export function Split({
  a,
  b,
  aLabel,
  bLabel,
  aClass,
}: {
  a: number
  b: number
  aLabel: string
  bLabel: string
  aClass: string
}) {
  const aShare = percent(a, a + b)
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={`${count(a)} ${aLabel} (${aShare}%), ${count(b)} ${bLabel} (${100 - aShare}%)`}
        className="flex h-3 gap-px overflow-hidden rounded-sm bg-border"
      >
        {a > 0 && <div className={aClass} style={{ width: `${aShare}%` }} />}
        {b > 0 && <div className="flex-1 bg-accent" />}
      </div>
      <div aria-hidden="true" className="flex justify-between gap-3 text-data">
        <span className="text-muted">
          <span className="text-bright tabular-nums">{count(a)}</span> {aLabel} · {aShare}%
        </span>
        <span className="text-right text-muted">
          <span className="text-bright tabular-nums">{count(b)}</span> {bLabel} · {100 - aShare}%
        </span>
      </div>
    </div>
  )
}
