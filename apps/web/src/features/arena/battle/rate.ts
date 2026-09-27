/**
 * A finished arena match, counted in the bots' records (`store/bot-records.ts`): a chunk of its
 * own, with Glicko-2, which `ArenaBattle` loads as a match ends. The match is one rating period:
 * each bot plays every other bot by match points (`@asmbots/tourney` `rateMatches`). A bot picked
 * more than once counts once, with its best points. The top points win; a share of them draws.
 */
import { DEFAULT_RATING, rateMatches } from '@asmbots/tourney'
import { type BotRecord, useBotRecords } from '../../../store/bot-records'
import { type BotRef, formatRef } from '../setup/url'

/**
 * The records of the bots of `refs` after a match that gave them `points`, in entrant order. Null
 * when fewer than two bots of their own fought.
 */
export function rateArenaMatch(
  refs: readonly BotRef[],
  points: readonly number[],
  records: Readonly<Record<string, BotRecord>>,
): Record<string, BotRecord> | null {
  const best = new Map<string, number>()
  refs.forEach((ref, i) => {
    const key = formatRef(ref)
    best.set(key, Math.max(best.get(key) ?? 0, points[i] ?? 0))
  })
  if (best.size < 2) return null
  const keys = [...best.keys()]
  const scores = keys.map((key) => best.get(key) as number)
  const before = keys.map(
    (key) => records[key] ?? { wins: 0, losses: 0, draws: 0, ...DEFAULT_RATING },
  )
  const after = rateMatches(before, [
    { entrants: keys.map((_, i) => i), result: { points: scores } },
  ])
  const top = Math.max(...scores)
  const leaders = scores.filter((s) => s === top).length
  return Object.fromEntries(
    keys.map((key, i) => {
      const was = before[i] as BotRecord
      const { rating, rd, volatility } = after[i] as BotRecord
      const first = scores[i] === top
      return [
        key,
        {
          wins: was.wins + (first && leaders === 1 ? 1 : 0),
          losses: was.losses + (first ? 0 : 1),
          draws: was.draws + (first && leaders > 1 ? 1 : 0),
          rating,
          rd,
          volatility,
        },
      ]
    }),
  )
}

/** Counts the match of `key` in the records, once. */
export function recordArenaMatch(key: string, refs: readonly BotRef[], points: readonly number[]) {
  const { records, seen, apply } = useBotRecords.getState()
  if (seen.includes(key)) return
  const next = rateArenaMatch(refs, points, records)
  if (next !== null) apply(key, next)
}
