/**
 * What a bot page's charts read of its activity (`GET /api/bots/:id/activity`): each match's
 * outcome for the bot, its record, its rivals head to head, its rank on each hill over time, and
 * its machine code's numbers. Pure: the charts draw them (`BotCharts.tsx`).
 */
import type { BotActivity, BotHillEvent, BotLabel, BotPlacement } from '@asmbots/protocol'

export type Outcome = 'win' | 'tie' | 'loss'

/** A match as the bot saw it. */
export interface Fought {
  id: string
  at: string | null
  outcome: Outcome
  /** Its points and the most anyone scored. */
  points: number
  top: number
  /** The other entrants, null for a deleted one. */
  rivals: (BotLabel | null)[]
  /** The other entrants' points, in the same order. */
  rivalPoints: number[]
}

/**
 * The bot's matches, oldest first, each with its outcome: a win is the most points alone, a tie the
 * most points shared, a loss anything less (as the profile counts them). A match it is not in
 * (a version since deleted) is left out.
 */
export function foughtOf(activity: BotActivity, botId: string): Fought[] {
  const out: Fought[] = []
  for (const { match, bots } of activity.matches) {
    const at = bots.findIndex((b) => b?.botId === botId)
    const points = match.result?.points
    if (at < 0 || points === undefined) continue
    const mine = points[at] ?? 0
    const top = Math.max(...points)
    const shared = points.filter((p) => p === top).length > 1
    out.push({
      id: match.id,
      at: match.finishedAt,
      outcome: mine < top ? 'loss' : shared ? 'tie' : 'win',
      points: mine,
      top,
      rivals: bots.filter((_, i) => i !== at),
      rivalPoints: points.filter((_, i) => i !== at),
    })
  }
  return out.reverse()
}

export interface WinRecord {
  wins: number
  ties: number
  losses: number
}

export function recordOf(fought: readonly Fought[]): WinRecord {
  const record = { wins: 0, ties: 0, losses: 0 }
  for (const f of fought) {
    if (f.outcome === 'win') record.wins++
    else if (f.outcome === 'tie') record.ties++
    else record.losses++
  }
  return record
}

/** A rival head to head: its label, and the bot's wins, ties, and losses against it. */
export interface Rival extends WinRecord {
  bot: BotLabel
  games: number
}

/**
 * The bot's most-faced rivals, the most games first, then the most wins: head to head, a game is
 * won against a rival that scored fewer points in it, tied against one that scored as many.
 */
export function rivalsOf(fought: readonly Fought[], limit: number): Rival[] {
  const byBot = new Map<string, Rival>()
  for (const f of fought) {
    f.rivals.forEach((bot, i) => {
      if (bot === null) return
      const rival = byBot.get(bot.botId) ?? { bot, games: 0, wins: 0, ties: 0, losses: 0 }
      const theirs = f.rivalPoints[i] ?? 0
      rival.games++
      if (f.points > theirs) rival.wins++
      else if (f.points === theirs) rival.ties++
      else rival.losses++
      byBot.set(bot.botId, rival)
    })
  }
  return [...byBot.values()]
    .sort((a, b) => b.games - a.games || b.wins - a.wins || a.bot.name.localeCompare(b.bot.name))
    .slice(0, limit)
}

/** A step of a rank line: from `t` (ms) the bot holds `rank`, or is off the board (null). */
export interface RankStep {
  t: number
  rank: number | null
}

export interface RankSeries {
  /** The hill, and its places when an event named them. */
  hill: { slug: string; name: string; size?: number }
  steps: RankStep[]
  /** Its rank there now, null when it holds none. */
  now: number | null
}

/**
 * The bot's rank on each hill over time, from its events: `entered` puts it on the board at its
 * rank, `evicted` takes it off; a version replaced by a newer one enters again as that one. The
 * rank now is the placement's, which moves with every challenge after (the events do not). The
 * hills it holds a place on first, the best place first.
 */
export function rankSeriesOf(
  events: readonly BotHillEvent[],
  placements: readonly BotPlacement[],
): RankSeries[] {
  const byHill = new Map<string, RankSeries>()
  const seriesOf = (hill: RankSeries['hill']) => {
    let series = byHill.get(hill.slug)
    if (series === undefined) {
      series = { hill, steps: [], now: null }
      byHill.set(hill.slug, series)
    }
    return series
  }
  for (const { event, hill } of events) {
    const t = Date.parse(event.at)
    if (event.kind === 'entered' && event.rank !== null) {
      seriesOf(hill).steps.push({ t, rank: event.rank })
    } else if (event.kind === 'evicted') {
      seriesOf(hill).steps.push({ t, rank: null })
    }
  }
  for (const p of placements) {
    const series = seriesOf(p.hill)
    series.now = series.now === null ? p.entry.rank : Math.min(series.now, p.entry.rank)
  }
  return [...byHill.values()].sort(
    (a, b) => (a.now ?? Number.MAX_SAFE_INTEGER) - (b.now ?? Number.MAX_SAFE_INTEGER),
  )
}

/** A machine code's numbers: its size, its zero bytes (DAT words), and its entropy in bits a byte. */
export function bytesStats(bytes: Uint8Array): { size: number; zero: number; entropy: number } {
  const counts = new Array<number>(256).fill(0)
  for (const b of bytes) counts[b] = (counts[b] ?? 0) + 1
  let entropy = 0
  for (const n of counts) {
    if (n === 0) continue
    const p = n / bytes.length
    entropy -= p * Math.log2(p)
  }
  return { size: bytes.length, zero: counts[0] ?? 0, entropy }
}
