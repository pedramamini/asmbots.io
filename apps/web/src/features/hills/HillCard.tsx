/**
 * A hill's card on `/hills`: its name, class, and rules, its entries' scores drawn as a mountain
 * (the skyline), its king, and how busy it is. The card is one link to the hill, as a tournament's
 * tile is, so the king's name and author are text.
 */
import type { HillBest, HillPulse, HillSummary } from '@asmbots/protocol'
import { Chip, cx, Identicon } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { ownerAuthor } from '../../app/author'
import { ago, count, plural, short } from './links'
import { bandWeight } from './rules'
import { WEIGHT_SHORT } from './weight-names'

/**
 * The places of a hill, left to right, as a mountain: the king in the middle, #2 to its left, #3
 * to its right, and on outward; the empty places (null) at the edges. `places` is the hill's size.
 */
export function mountainOrder(scores: readonly number[], places: number): (number | null)[] {
  const columns = Math.max(places, scores.length)
  const out: (number | null)[] = new Array(columns).fill(null)
  const center = Math.floor((columns - 1) / 2)
  scores.forEach((score, i) => {
    const step = Math.ceil(i / 2)
    out[center + (i % 2 === 1 ? -step : step)] = score
  })
  return out
}

/** The pixel flag the king flies, as the footer's hills do. */
function Flag({ className, left }: { className?: string; left: string }) {
  return (
    <svg
      style={{ left }}
      viewBox="0 0 9 12"
      width={9}
      height={12}
      aria-hidden="true"
      shapeRendering="crispEdges"
      className={className}
    >
      <rect x={0} y={0} width={1} height={12} fill="currentColor" />
      <path d="M1 0h8v5H1z" fill="currentColor" fillOpacity={0.9} />
      <path d="M2 1h2v1H2zM6 1h2v1H6zM4 2h2v1H4zM2 3h2v1H2zM6 3h2v1H6z" className="fill-panel-2" />
    </svg>
  )
}

export interface HillSkylineProps {
  /** Every entry's score, king first. */
  scores: readonly number[]
  /** The hill's size, its places. */
  places: number
  /** The hill's name, for the drawing's label. */
  name: string
  className?: string | undefined
}

/**
 * A hill's standings as a dithered mountain: a column a place, as tall as its entry's score over
 * the king's, the king's in the middle, lit, under a flag; the empty places are the flat ground
 * at the edges. One image to assistive tech, its label the numbers.
 */
export function HillSkyline({ scores, places, name, className }: HillSkylineProps) {
  const columns = mountainOrder(scores, places)
  const top = Math.max(0, ...scores)
  const king = scores[0]
  const center = Math.floor((columns.length - 1) / 2)
  const lowest = scores.at(-1)
  const label =
    king === undefined
      ? `${name}: no entries, ${plural(places, 'place')} open.`
      : `${name}: ${count(scores.length)} of ${plural(places, 'place')} taken; scores from ${count(king)} (the king) down to ${count(lowest ?? king)}.`
  return (
    <div role="img" aria-label={label} className={cx('relative h-24 pt-4', className)}>
      {king !== undefined && (
        <Flag
          className="absolute top-0 text-bright"
          // The pole stands on the king's column: a column is 1 / columns of the width.
          left={`calc(${((center + 0.5) / columns.length) * 100}% - 0.5px)`}
        />
      )}
      <div className="flex h-full items-end gap-px border-border-strong border-b">
        {columns.map((score, i) => {
          if (score === null) {
            // biome-ignore lint/suspicious/noArrayIndexKey: a place is its column.
            return <span key={i} className="h-px flex-1 bg-border" />
          }
          const rank = columns.length === 0 ? 0 : Math.abs(i - center)
          const height = top <= 0 ? 4 : Math.max(4, (100 * score) / top)
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a place is its column.
              key={i}
              className={cx('dither flex-1', i === center ? 'text-bright' : 'text-accent')}
              style={{
                height: `${height}%`,
                // Older, lower places fade toward the edges; the peak is solid.
                opacity: i === center ? 1 : Math.max(0.35, 1 - rank / (scores.length + 2)),
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * What each launch hill is for, in a line: the card's own words. The rules are on the card
 * already; a hill not named here shows its description.
 */
const TAGLINES: Readonly<Record<string, string>> = {
  main: 'The classic ladder: small, fast bots. Its rules are the weekly championship’s.',
  middleweight: 'Twice the room: bots of 513 to 1,024 bytes, for bigger schemes.',
  heavyweight: 'Up to 2 KB of code: layered attacks, decoys, and repair.',
  'super-heavy': 'The largest bots, up to 4 KB, placed 4 KB apart.',
  'open-weight': 'Any size up to 4 KB on one hill: a lean imp against a fortress.',
  tiny: '256 bytes and fewer cycles a round: every byte has to earn its place.',
  melee: 'Eight bots in one core at once, scored by who outlives whom.',
}

export interface HillCardProps {
  summary: HillSummary
  /** The hill's pulse from the overview; undefined while it loads or when it failed. */
  pulse?: HillPulse | undefined
  /** The reader's best place here: signed in and on the hill. */
  best?: HillBest | undefined
  /** The clock `ago` reads; tests fix it. */
  now?: number | undefined
}

/** One hill as a card: a link to its page. */
export function HillCard({ summary, pulse, best, now }: HillCardProps) {
  const { hill, entrants, king } = summary
  const weight = bandWeight(hill.config)
  const melee = hill.scoring === 'melee'
  const full = entrants >= hill.size
  const author = king === null ? null : ownerAuthor(king.bot.owner)
  return (
    <Link
      to="/hills/$slug"
      params={{ slug: hill.slug }}
      aria-label={`${hill.name} hill`}
      className="group flex h-full min-w-0 flex-col gap-2.5 rounded-md border border-border bg-panel-2 p-3 transition-colors duration-120 ease-out hover:border-border-strong focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-accent"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-bright text-panel-title group-hover:text-accent-fg">
          {hill.name}
        </span>
        {weight !== null && <Chip data-weight={weight.slug}>{WEIGHT_SHORT[weight.slug]}</Chip>}
        {melee && <Chip variant="info">melee</Chip>}
        <span
          className={cx(
            'ml-auto shrink-0 text-data tabular-nums',
            full ? 'text-warn' : 'text-muted',
          )}
          title={full ? 'full: a new bot must push one off' : 'places taken'}
        >
          {count(entrants)} / {count(hill.size)}
        </span>
      </div>
      <p className="line-clamp-2 min-h-[2lh] text-data text-muted" title={hill.description}>
        {TAGLINES[hill.slug] ?? hill.description}
      </p>
      <HillSkyline scores={pulse?.scores ?? []} places={hill.size} name={hill.name} />
      <div className="flex min-w-0 items-center gap-2.5">
        {king === null ? (
          <p className="text-data text-muted">vacant: the first bot takes it.</p>
        ) : (
          <>
            <Identicon value={king.bot.versionId} size={32} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-accent-fg text-data">
                <span aria-hidden="true" className="text-bright">
                  ♛{' '}
                </span>
                {king.bot.name}
                <span className="text-muted"> by {author?.name}</span>
              </span>
              <span className="truncate text-muted text-panel-status">
                {king.entry.reign === null || king.entry.reign === 0
                  ? 'new king'
                  : `reign ${count(king.entry.reign)}`}{' '}
                · {king.entry.wins}/{king.entry.ties}/{king.entry.losses}
              </span>
            </div>
            <span className="shrink-0 text-right">
              <span className="block text-bright text-data tabular-nums">
                {count(king.entry.score)}
              </span>
              <span className="block text-muted text-panel-status">score</span>
            </span>
          </>
        )}
      </div>
      <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-muted text-panel-status">
        <span>{hill.rounds} rounds</span>
        <span aria-hidden="true">·</span>
        <span>{short(hill.config.maxCycles)} cycles</span>
        <span aria-hidden="true">·</span>
        <span>
          {count(hill.config.minBotBytes ?? 1)}–{count(hill.config.maxBotBytes)} B
        </span>
      </p>
      <div className="mt-auto flex min-w-0 items-center gap-2 border-border border-t pt-2 text-data">
        {pulse === undefined ? (
          <span className="text-muted">…</span>
        ) : (
          <span className="truncate text-muted">
            {count(pulse.matches)} {pulse.matches === 1 ? 'match' : 'matches'} ·{' '}
            {plural(pulse.challenges, 'challenge')}
          </span>
        )}
        <span className="ml-auto shrink-0 text-muted">
          {best !== undefined ? (
            <span className="text-accent-fg">you #{best.entry.rank}</span>
          ) : pulse?.lastAt ? (
            <time dateTime={pulse.lastAt}>{ago(pulse.lastAt, now)}</time>
          ) : (
            'quiet'
          )}
        </span>
      </div>
    </Link>
  )
}
