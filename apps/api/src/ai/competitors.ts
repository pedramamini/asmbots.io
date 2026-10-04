/**
 * The hill's best bots as the AI mode reads them: a line each for the top entries, and the source
 * of the public ones near the top. A private or unlisted bot's source is its owner's alone, so the
 * model sees only its name, size, record, and `%strategy` line.
 */
import type { Hill } from '@asmbots/protocol'

/** The entries the competitors block lists. */
export const LISTED = 10

/** The entries, from the king down, whose public source the block carries. */
export const WITH_SOURCE = 3

/**
 * The most characters of one competitor's source the model reads; past it, the rest is cut. The
 * model's context is 32,768 tokens: three of these are about 2,500 of them.
 */
export const MAX_COMPETITOR_SOURCE = 2500

export interface Competitor {
  readonly rank: number
  readonly name: string
  readonly handle: string
  readonly size: number
  readonly strategy: string | null
  readonly wins: number
  readonly ties: number
  readonly losses: number
  /** The source, when the bot is public; null when it is private, unlisted, or deleted. */
  readonly source: string | null
}

interface CompetitorRow {
  rank: number
  name: string
  handle: string
  size: number
  strategy: string | null
  wins: number
  ties: number
  losses: number
  source: string | null
}

const COMPETITORS_SQL = `SELECT e.rank, b.name, u.handle, v.size, v.strategy, e.wins, e.ties, e.losses,
  CASE WHEN b.visibility = 'public' AND b.deleted_at IS NULL THEN v.source END AS source
  FROM hill_entries e
  JOIN bot_versions v ON v.id = e.bot_version_id
  JOIN bots b ON b.id = v.bot_id
  JOIN users u ON u.id = b.owner_id
  WHERE e.hill_id = ?`

/** The hill's top `LISTED` entries, the king first. */
export async function listCompetitors(db: D1Database, hill: Hill): Promise<Competitor[]> {
  const { results } = await db
    .prepare(`${COMPETITORS_SQL} ORDER BY e.rank LIMIT ?`)
    .bind(hill.id, LISTED)
    .all<CompetitorRow>()
  return results
}

/** A competitor's line: `#1 Strigoi by caesium, 498 B, 41-3-6: hold-two-laps vampire`. */
export function competitorLine(c: Competitor): string {
  const record = `${c.wins}-${c.ties}-${c.losses}`
  const strategy = c.strategy ? `: ${c.strategy}` : ''
  return `#${c.rank} ${c.name} by ${c.handle}, ${c.size} B, W-T-L ${record}${strategy}`
}

/** A competitor's source as the model reads it, or why there is none. */
export function competitorSource(c: Competitor): string {
  if (c.source === null) return `(${c.name} is not public: its source is its owner's alone)`
  const cut = c.source.length > MAX_COMPETITOR_SOURCE
  const text = cut ? c.source.slice(0, MAX_COMPETITOR_SOURCE) : c.source
  return `\`\`\`asm\n${text}${cut ? '\n; ... cut here' : ''}\n\`\`\``
}

/** The competitors block: the hill's rules, its best bots, and the source of the top public ones. */
export function competitorsBlock(hill: Hill, competitors: readonly Competitor[]): string {
  const floor = hill.config.minBotBytes ?? 1
  const head = [
    `The hill: ${hill.name} (\`${hill.slug}\`). ${hill.description}`,
    `Size band: ${floor} to ${hill.config.maxBotBytes} bytes.`,
  ]
  if (competitors.length === 0) return [...head, 'It has no entries yet.'].join('\n')
  const shown = competitors.filter((c) => c.rank <= WITH_SOURCE && c.source !== null)
  return [
    ...head,
    '',
    'Its best bots, the king first:',
    ...competitors.map(competitorLine),
    ...shown.flatMap((c) => ['', `Source of #${c.rank} ${c.name}:`, competitorSource(c)]),
  ].join('\n')
}
