/**
 * A badge as the leaderboard and a profile show it (PRODUCT_SPEC §12): its 8 × 8 glyph, a title's
 * in `--info` and a milestone's in the accent, a gleam in `--text-bright`; a badge not held in
 * `--border-strong`. The glyph is art (`aria-hidden`); the tile's words say what it is.
 */
import { BADGES, type BadgeId, badgeValue, type TitleBadge } from '@asmbots/protocol'
import { cx } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { CELL_LINK } from '../hills/links'
import { GLYPHS, glyphCells } from './glyphs'

/** The glyph's color class: a title's gold, a milestone's accent, or off. */
function tone(id: BadgeId, held: boolean): string {
  if (!held) return 'text-border-strong'
  return BADGES[id].kind === 'title' ? 'text-info' : 'text-accent'
}

export function BadgeGlyph({
  id,
  held = true,
  size = 24,
  className,
}: {
  id: BadgeId
  held?: boolean
  size?: number
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      className={cx('shrink-0', tone(id, held), className)}
    >
      {glyphCells(GLYPHS[id]).map(([x, y, bright]) => (
        <rect
          key={`${x},${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={bright && held ? 'var(--text-bright)' : 'currentColor'}
        />
      ))}
    </svg>
  )
}

/** A title's number in its unit, `4,096 bytes`; a milestone's is nothing. */
export function heldValue(id: BadgeId, value: number | null): string | null {
  const badge = BADGES[id]
  return badge.kind === 'title' && value !== null ? badgeValue(badge as TitleBadge, value) : null
}

/**
 * One badge in a tile: the glyph in a dark well, the name, what it takes, `note` (who holds it,
 * or the number that won it), and a link to `replayKey`, the match that earned it. A title's tile
 * has a gold stripe; a badge not held is quiet.
 */
export function BadgeTile({
  id,
  held = true,
  note,
  replayKey,
}: {
  id: BadgeId
  held?: boolean
  note?: ReactNode
  replayKey?: string
}) {
  const hasNote = note !== undefined && note !== null
  const badge = BADGES[id]
  return (
    <li
      className={cx(
        'flex min-w-0 items-start gap-2.5 rounded-md border border-border border-l-4 bg-panel-2 p-2',
        !held ? 'border-l-border' : badge.kind === 'title' ? 'border-l-info' : 'border-l-accent',
      )}
    >
      <span className="flex shrink-0 items-center justify-center rounded-sm border border-border bg-arena-bg p-1.5">
        <BadgeGlyph id={id} held={held} size={32} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-baseline gap-2">
          <span className={cx('truncate text-data', held ? 'text-bright' : 'text-muted')}>
            {badge.name}
          </span>
          {badge.kind === 'title' && (
            <span className="text-info text-panel-status" title="one holder at a time">
              title
            </span>
          )}
        </span>
        <span className="text-data text-muted">{badge.says}</span>
        {(hasNote || replayKey !== undefined) && (
          <span className="truncate-ring text-data text-text">
            {note}
            {hasNote && replayKey !== undefined && ' · '}
            {replayKey !== undefined && (
              <Link
                to="/arena/$replayId"
                params={{ replayId: replayKey }}
                className={CELL_LINK}
                aria-label={`watch the match that earned ${badge.name}`}
              >
                watch
              </Link>
            )}
          </span>
        )}
      </span>
    </li>
  )
}
