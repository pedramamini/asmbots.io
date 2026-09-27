/**
 * `GET /api/hills/overview`: every hill at a glance, as the `/hills` page draws it. A module of its
 * own, not in `api.ts`: every page takes that one, and only `/hills` reads this.
 */
import * as z from 'zod/mini'
import { TickerHillEvent } from './api'
import { Slug, Timestamp, whole } from './schema'

const COUNT = (what: string) => whole(what, 0, Number.MAX_SAFE_INTEGER)

/** A hill's shape and pulse: its entries' scores, what it has played, and when it last changed. */
export const HillPulse = z.object({
  slug: Slug,
  /** Every entry's score, in rank order: the king's first. */
  scores: z.array(z.number()),
  /** Its finished matches. */
  matches: COUNT('matches'),
  /** Its finished submissions. */
  challenges: COUNT('challenges'),
  /** The submissions that entered at rank 1. */
  crowns: COUNT('crowns'),
  /** Its newest board change or finished match; null for a hill that has done nothing. */
  lastAt: z.nullable(Timestamp),
})
export type HillPulse = z.output<typeof HillPulse>

/** The newest board changes on any hill, as many as the overview names. */
export const OVERVIEW_EVENTS = 16

/** `GET /api/hills/overview`: each hill's pulse, and the newest board changes on every hill. */
export const HillOverview = z.object({
  at: Timestamp,
  hills: z.array(HillPulse),
  /** Newest first, at most `OVERVIEW_EVENTS`. */
  events: z.array(TickerHillEvent),
})
export type HillOverview = z.output<typeof HillOverview>
