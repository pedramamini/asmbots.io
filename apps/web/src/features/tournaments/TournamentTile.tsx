/**
 * A tournament's tile in the list (`TournamentsPage`), local or the server's: all one height, so
 * the grid lines up. A glyph of its kind and a stripe of its status's color at the left, its name
 * and facts, a middle row that says what it came to (the champion, the live match count, or the
 * entry window), its chips, and a bar of the matches played.
 */
import { Chip, type ChipVariant, Identicon } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { KIND_LABELS, type TournamentKind, type TournamentStatus } from './store'

/** The stripe down a tile's left edge: its status's color. */
const STRIPE: Readonly<Record<TournamentStatus, string>> = {
  scheduled: 'border-l-info',
  running: 'border-l-accent',
  paused: 'border-l-warn',
  finished: 'border-l-border-strong',
  cancelled: 'border-l-border',
  failed: 'border-l-danger',
}

/** The link that a tile is. Hover lights the three hairlines, not the stripe. */
const TILE =
  'flex h-full min-h-44 min-w-0 flex-col gap-3 rounded-md border border-l-4 border-border bg-panel-2 p-3 transition-colors duration-120 ease-out hover:border-y-border-strong hover:border-r-border-strong focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-accent'

/** A 40 px drawing of a kind: a bracket's tree, a round robin's matrix, a melee's ring. */
export function KindGlyph({ kind, className }: { kind: TournamentKind; className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={40}
      height={40}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      {kind === 'bracket' ? (
        <path d="M4 6h8v8H4M4 18h8v-4M12 10h8v10h-8M4 22h8v8H4M4 34h8v-4M12 26h8v-6M20 20h10M30 16v8h6" />
      ) : kind === 'round-robin' ? (
        <g>
          {[0, 1, 2, 3].flatMap((row) =>
            [0, 1, 2, 3].map((col) => (
              <rect
                key={`${row}${col}`}
                x={5 + col * 8}
                y={5 + row * 8}
                width={6}
                height={6}
                rx={1}
                fill={row === col ? 'none' : 'currentColor'}
                fillOpacity={(row * 4 + col) % 3 === 0 ? 0.6 : 0.2}
                stroke={row === col ? 'currentColor' : 'none'}
              />
            )),
          )}
        </g>
      ) : (
        <g>
          <circle cx={20} cy={20} r={13} strokeDasharray="2 3" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i / 6) * 2 * Math.PI - Math.PI / 2
            return (
              <circle
                key={i}
                cx={20 + 13 * Math.cos(angle)}
                cy={20 + 13 * Math.sin(angle)}
                r={2.5}
                fill="currentColor"
                stroke="none"
              />
            )
          })}
          <circle cx={20} cy={20} r={3} fill="currentColor" stroke="none" />
        </g>
      )}
    </svg>
  )
}

export interface TournamentTileProps {
  readonly id: string
  readonly name: string
  readonly kind: TournamentKind
  readonly status: TournamentStatus
  /** What the status chip says: `running · 12 / 66`. */
  readonly statusLabel: string
  readonly statusVariant: ChipVariant
  readonly entrants: number
  /** Rounds a match. */
  readonly rounds: number
  readonly progress: { readonly done: number; readonly of: number }
  /** Its champion, once it has one: the identicon's bytes (or name) and the name. */
  readonly champion?: { readonly value: Uint8Array | string; readonly name: string } | undefined
  /** When an open one stops taking entries, as the page says it. */
  readonly entryUntil?: string | undefined
  /** Chips before the kind's: `server`, `championship`. */
  readonly chips?: ReactNode
  /** The server runs it, and has a live room: running, it offers `tune in live`. */
  readonly live?: boolean | undefined
}

/** The middle row: the champion, the live count, or what a scheduled one waits for. */
function Outcome({ status, progress, champion, entrants, entryUntil, live }: TournamentTileProps) {
  if (champion !== undefined) {
    return (
      <p className="flex min-w-0 items-center gap-3">
        <Identicon value={champion.value} size={36} className="shrink-0" />
        <span className="flex min-w-0 flex-col">
          <span className="text-panel-status text-muted">champion</span>
          <span className="truncate text-body text-accent-fg">{champion.name}</span>
        </span>
      </p>
    )
  }
  if (status === 'running' || status === 'paused') {
    return (
      <p className="flex min-w-0 flex-col">
        <span className="text-panel-status text-muted">{status}</span>
        <span className="text-body text-bright">
          match {Math.min(progress.done + 1, progress.of)} of {progress.of}
        </span>
        {live && status === 'running' && (
          <span className="mt-1 flex items-center gap-2 text-nav text-accent-fg" data-tune-in>
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)] motion-safe:animate-skeleton"
            />
            live now · tune in →
          </span>
        )}
      </p>
    )
  }
  if (entryUntil !== undefined) {
    return (
      <p className="flex min-w-0 flex-col">
        <span className="text-panel-status text-info">
          {entrants === 0 ? 'open: be the first to enter' : 'open for entries'}
        </span>
        <span className="text-data text-muted">entries open until {entryUntil}</span>
      </p>
    )
  }
  return (
    <p className="text-data text-muted">
      {status === 'scheduled' ? 'not started yet' : `${status}: no champion`}
    </p>
  )
}

export function TournamentTile(props: TournamentTileProps) {
  const { id, name, kind, status, entrants, rounds, progress, chips } = props
  const share = progress.of === 0 ? 0 : Math.min(1, progress.done / progress.of)
  return (
    <li aria-label={name} className="h-full">
      <Link to="/tournaments/$id" params={{ id }} className={`${TILE} ${STRIPE[status]}`}>
        <div className="flex min-w-0 items-start gap-3">
          <KindGlyph
            kind={kind}
            className={`shrink-0 ${status === 'running' ? 'text-accent' : 'text-dim'}`}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body text-bright">{name}</span>
            <span className="truncate text-data text-muted">
              {entrants === 0 ? 'no entries yet' : `${entrants} ${entrants === 1 ? 'bot' : 'bots'}`}{' '}
              · {rounds} {rounds === 1 ? 'round' : 'rounds'} a match
            </span>
          </div>
          <Chip variant={props.statusVariant}>{props.statusLabel}</Chip>
        </div>
        <div className="flex min-w-0 flex-1 items-center">
          <Outcome {...props} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2">
            {chips}
            <Chip>{KIND_LABELS[kind]}</Chip>
            <span className="ml-auto text-data text-muted tabular-nums">
              {progress.done} / {progress.of} matches
            </span>
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div
              className={`h-full ${status === 'running' ? 'bg-accent' : 'bg-accent-45'}`}
              style={{ width: `${share * 100}%` }}
            />
          </div>
        </div>
      </Link>
    </li>
  )
}
