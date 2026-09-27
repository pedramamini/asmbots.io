import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { localStore } from './settings'

/** The localStorage key of the arena's bot records. */
export const BOT_RECORDS_STORAGE_KEY = 'asmbots:bot-records'

/**
 * A bot's arena record in this browser (PRODUCT_SPEC §2): its matches won, lost, and drawn, and its
 * Glicko-2 rating (`battle/rate.ts`), each match a rating period.
 */
export interface BotRecord {
  wins: number
  losses: number
  draws: number
  rating: number
  rd: number
  volatility: number
}

/** The match keys a browser remembers, so a match seen again (a rematch of one seed) counts once. */
const SEEN_KEYS = 200

interface BotRecordsState {
  /** Each bot's record, by `formatRef`. */
  records: Record<string, BotRecord>
  /** The `matchHash` keys of the matches counted, the latest last. */
  seen: string[]
  /** Counts the match of `key`: `records` replaces its bots' records. */
  apply: (key: string, records: Record<string, BotRecord>) => void
}

/** The arena's bot records, persisted to `localStorage[BOT_RECORDS_STORAGE_KEY]`. */
export const useBotRecords = create<BotRecordsState>()(
  persist(
    (set) => ({
      records: {},
      seen: [],
      apply: (key, records) =>
        set((state) =>
          state.seen.includes(key)
            ? state
            : {
                records: { ...state.records, ...records },
                seen: [...state.seen, key].slice(-SEEN_KEYS),
              },
        ),
    }),
    {
      name: BOT_RECORDS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStore),
      partialize: ({ records, seen }) => ({ records, seen }),
      // Storage is the user's to edit: keep the well-formed records only.
      merge: (stored, current) => {
        const { records, seen } = (stored ?? {}) as Partial<BotRecordsState>
        const kept = Object.entries(records ?? {}).filter(([, r]) => isRecord(r))
        return {
          ...current,
          records: Object.fromEntries(kept),
          seen: Array.isArray(seen) ? seen.filter((k) => typeof k === 'string') : [],
        }
      },
    },
  ),
)

function isRecord(value: unknown): value is BotRecord {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return ['wins', 'losses', 'draws', 'rating', 'rd', 'volatility'].every((field) =>
    Number.isFinite(r[field]),
  )
}

/** A record's matches in all. */
export function gamesOf(record: BotRecord): number {
  return record.wins + record.losses + record.draws
}

/**
 * What the ranking sorts by: the rating less twice its RD, the rating the bot surely has. A bot
 * with no record scores the default's, 1500 - 2 × 350: below a bot that has won, above one that has
 * mostly lost.
 */
export function rankScore(record: BotRecord | undefined): number {
  return record === undefined ? 800 : record.rating - 2 * record.rd
}
