/**
 * The intro dialogs' pictures (`PageAbout.figure`): a screenshot of a page in the reader's theme,
 * framed as a window, or a diagram drawn in the theme's tokens. Their own chunk, loaded when a
 * dialog first opens. The drawings are art (DESIGN_SYSTEM §10): hidden from assistive tech, the
 * caption says what they show.
 */
import type { ReactNode } from 'react'
import type { AboutFigure } from '../PageIntro'
import { useShotSrc } from '../shots'

/** The frame every figure sits in: a window bar, the picture at 16:10, the caption under it. */
function Frame({
  page,
  caption,
  children,
}: {
  page: string
  caption: string
  children: ReactNode
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-1.5">
      <div className="overflow-hidden rounded-sm border border-border bg-panel-2">
        <span className="flex items-center gap-1.5 border-border border-b px-2 py-1 text-muted text-panel-status">
          <span className="text-accent-fg">ASM BOTS</span>
          <span>{`// ${page}`}</span>
        </span>
        <div className="aspect-[16/10] w-full">{children}</div>
      </div>
      <figcaption className="text-data text-muted">{caption}</figcaption>
    </figure>
  )
}

function Shot({ name, caption }: { name: string; caption: string }) {
  const src = useShotSrc(name)
  return (
    <img
      src={src}
      width={1280}
      height={800}
      decoding="async"
      alt={caption}
      className="block h-full w-full object-cover"
    />
  )
}

/** A drawing's box: 320 × 200 units, the frame's 16:10. */
function Drawing({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 320 200"
      aria-hidden="true"
      className="block h-full w-full"
      fontSize={9}
      fontFamily="inherit"
    >
      {children}
    </svg>
  )
}

/** A label in the drawing: muted UPPER, spaced as the panel titles are. */
function Label({
  x,
  y,
  children,
  anchor = 'start',
  className = 'fill-muted',
}: {
  x: number
  y: number
  children: ReactNode
  anchor?: 'start' | 'middle' | 'end'
  className?: string
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} letterSpacing="0.06em" className={className}>
      {children}
    </text>
  )
}

/**
 * A hill of five after a challenge: the king on top, the challenger in at #3, and the bot that
 * fell under the hill's size pushed off.
 */
function HillDiagram() {
  const rows = [
    { name: 'KING', score: 300, kind: 'king' },
    { name: '#2', score: 262, kind: 'entry' },
    { name: 'YOU', score: 240, kind: 'challenger' },
    { name: '#4', score: 205, kind: 'entry' },
    { name: '#5', score: 176, kind: 'entry' },
    { name: 'OUT', score: 150, kind: 'out' },
  ] as const
  const top = 22
  const step = 25
  const x = 56
  const width = (score: number) => (score / 300) * 190
  const line = top + 5 * step - 4
  return (
    <Drawing>
      <Label x={16} y={14}>
        RANK BY SCORE
      </Label>
      {rows.map((row, i) => {
        const y = top + i * step + (row.kind === 'out' ? 6 : 0)
        const w = width(row.score)
        return (
          <g key={row.name} opacity={row.kind === 'out' ? 0.55 : 1}>
            <Label
              x={46}
              y={y + 11}
              anchor="end"
              className={
                row.kind === 'challenger'
                  ? 'fill-accent-fg'
                  : row.kind === 'out'
                    ? 'fill-danger'
                    : 'fill-muted'
              }
            >
              {row.name}
            </Label>
            <rect
              x={x}
              y={y}
              width={w}
              height={16}
              rx={2}
              className={
                row.kind === 'king'
                  ? 'fill-bright'
                  : row.kind === 'challenger'
                    ? 'fill-accent-25 stroke-accent'
                    : row.kind === 'out'
                      ? 'fill-danger/40 stroke-danger'
                      : 'fill-accent-45'
              }
              strokeDasharray={row.kind === 'challenger' ? '3 2' : undefined}
            />
            <Label x={x + w + 6} y={y + 11} className="fill-text">
              {row.score}
            </Label>
          </g>
        )
      })}
      {/* The crown over the king's bar. */}
      <path
        d={`M${x + width(300) - 22} ${top - 2} l3 -7 l4 4 l4 -6 l4 6 l4 -4 l3 7 z`}
        className="fill-accent"
      />
      {/* The hill's size: under the line, a bot is off the hill. */}
      <line
        x1={x}
        x2={304}
        y1={line + 3}
        y2={line + 3}
        strokeDasharray="4 3"
        className="stroke-danger"
      />
      <Label x={304} y={line} anchor="end" className="fill-danger">
        SIZE 5
      </Label>
      {/* The challenger comes in from the right. */}
      <path
        d={`M304 ${top + 2 * step + 8} h-${304 - (x + width(240) + 34)}`}
        className="stroke-accent"
        markerEnd="url(#hill-arrow)"
      />
      <defs>
        <marker
          id="hill-arrow"
          viewBox="0 0 6 6"
          refX="5"
          refY="3"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 z" className="fill-accent" />
        </marker>
      </defs>
      <Label x={304} y={top + 2 * step + 4} anchor="end" className="fill-accent-fg">
        SUBMIT
      </Label>
    </Drawing>
  )
}

/**
 * A match of two bots: its rounds one under another, each a run of cycles until a bot dies (or
 * the cycles run out), with the death marked.
 */
function MatchDiagram() {
  const rounds = [
    { label: 'ROUND 1', ends: 0.62, dies: 'b' },
    { label: 'ROUND 2', ends: 0.41, dies: 'a' },
    { label: 'ROUND 3', ends: 1, dies: null },
  ] as const
  const x0 = 74
  const x1 = 300
  return (
    <Drawing>
      <rect
        x={10}
        y={10}
        width={300}
        height={168}
        rx={3}
        className="fill-none stroke-border-strong"
      />
      <Label x={20} y={26} className="fill-accent-fg">
        MATCH · SAME BOTS, SAME RULES
      </Label>
      {rounds.map((round, i) => {
        const y = 48 + i * 38
        const end = x0 + (x1 - x0) * round.ends
        return (
          <g key={round.label}>
            <Label x={20} y={y + 9}>
              {round.label}
            </Label>
            {/* The cycles: a tick each, as far as the round went. */}
            {Array.from({ length: Math.floor((end - x0) / 6) + 1 }, (_, t) => (
              <line
                // biome-ignore lint/suspicious/noArrayIndexKey: a tick is its cycle.
                key={t}
                x1={x0 + t * 6}
                x2={x0 + t * 6}
                y1={y - 2}
                y2={y + 12}
                className="stroke-border-strong"
              />
            ))}
            {/* Each bot's life across the round. */}
            <line
              x1={x0}
              x2={round.dies === 'a' ? end : x1}
              y1={y + 2}
              y2={y + 2}
              strokeWidth={2}
              className="stroke-accent"
            />
            <line
              x1={x0}
              x2={round.dies === 'b' ? end : x1}
              y1={y + 8}
              y2={y + 8}
              strokeWidth={2}
              className="stroke-info"
            />
            {round.dies !== null && (
              <path
                d={`M${end - 4} ${y + (round.dies === 'a' ? 2 : 8) - 4} l8 8 m0 -8 l-8 8`}
                strokeWidth={2}
                className="stroke-danger"
              />
            )}
            {round.dies === null && (
              <Label x={x1} y={y + 22} anchor="end">
                CYCLES RAN OUT: A TIE
              </Label>
            )}
          </g>
        )
      })}
      <Label x={20} y={170}>
        │ A CYCLE
      </Label>
      <Label x={100} y={170} className="fill-danger">
        ✕ A DEATH
      </Label>
      <Label x={176} y={170}>
        … TO THE LAST ROUND
      </Label>
    </Drawing>
  )
}

/** A bot's versions in a row, and where each one fought: a result is a version's. */
function VersionsDiagram() {
  const versions = [
    { v: 'V1', x: 60, fought: 'TINY #9' },
    { v: 'V2', x: 160, fought: 'MAIN #4' },
    { v: 'V3', x: 260, fought: 'WEEKLY CUP' },
  ] as const
  return (
    <Drawing>
      <Label x={16} y={22}>
        A BOT
      </Label>
      <line x1={40} x2={290} y1={70} y2={70} className="stroke-border-strong" />
      {versions.map((version, i) => (
        <g key={version.v}>
          <circle
            cx={version.x}
            cy={70}
            r={12}
            className={
              i === versions.length - 1 ? 'fill-accent stroke-accent' : 'fill-panel stroke-accent'
            }
          />
          <Label
            x={version.x}
            y={73}
            anchor="middle"
            className={i === versions.length - 1 ? 'fill-bg' : 'fill-accent-fg'}
          >
            {version.v}
          </Label>
          <Label x={version.x} y={46} anchor="middle">
            {i === 0 ? 'SAVED' : 'EDITED'}
          </Label>
          <line
            x1={version.x}
            x2={version.x}
            y1={82}
            y2={118}
            strokeDasharray="2 2"
            className="stroke-border-strong"
          />
          <rect
            x={version.x - 42}
            y={118}
            width={84}
            height={24}
            rx={2}
            className="fill-panel stroke-border-strong"
          />
          <Label x={version.x} y={133} anchor="middle" className="fill-text">
            {version.fought}
          </Label>
        </g>
      ))}
      <Label x={160} y={172} anchor="middle">
        AN EDIT MAKES A NEW VERSION
      </Label>
      <Label x={160} y={186} anchor="middle">
        OLD RESULTS STAY WITH THEIR VERSION
      </Label>
    </Drawing>
  )
}

/**
 * Builders' wins as bars: the tallest holds the title, and every bar past the dashed line has
 * the milestone.
 */
function BadgesDiagram() {
  const wins = [128, 212, 96, 164, 58, 140, 30]
  const top = Math.max(...wins)
  const base = 164
  const height = (n: number) => (n / top) * 120
  const line = base - height(120)
  return (
    <Drawing>
      <Label x={16} y={20}>
        WINS, A BAR A BUILDER
      </Label>
      <line x1={16} x2={304} y1={base} y2={base} className="stroke-border-strong" />
      {wins.map((n, i) => {
        const x = 24 + i * 34
        const title = n === top
        const milestone = n >= 120
        return (
          <g key={x}>
            <rect
              x={x}
              y={base - height(n)}
              width={22}
              height={height(n)}
              rx={1}
              className={title ? 'fill-bright' : milestone ? 'fill-accent' : 'fill-border-strong'}
            />
            {title && (
              <Label x={x + 11} y={base - height(n) - 6} anchor="middle" className="fill-bright">
                TITLE
              </Label>
            )}
          </g>
        )
      })}
      <line x1={16} x2={304} y1={line} y2={line} strokeDasharray="4 3" className="stroke-accent" />
      <Label x={304} y={line - 4} anchor="end" className="fill-accent-fg">
        MILESTONE · 120
      </Label>
      <Label x={16} y={184}>
        ONE BUILDER HOLDS A TITLE; ANYONE PAST THE LINE
      </Label>
      <Label x={16} y={196}>
        EARNS THE MILESTONE
      </Label>
    </Drawing>
  )
}

const DIAGRAMS = {
  hill: HillDiagram,
  match: MatchDiagram,
  versions: VersionsDiagram,
  badges: BadgesDiagram,
} as const

/** The pages the diagrams stand for, in their window bar. */
const DIAGRAM_PAGES = {
  hill: 'HILLS',
  match: 'STATS',
  versions: 'BOTS',
  badges: 'LEADERBOARD',
} as const

export default function FigureView({ figure }: { figure: AboutFigure }) {
  if (figure.kind === 'shot') {
    return (
      <Frame page={figure.page} caption={figure.caption}>
        <Shot name={figure.name} caption={figure.caption} />
      </Frame>
    )
  }
  const Diagram = DIAGRAMS[figure.name]
  return (
    <Frame page={DIAGRAM_PAGES[figure.name]} caption={figure.caption}>
      <Diagram />
    </Frame>
  )
}
