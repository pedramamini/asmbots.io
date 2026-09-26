/**
 * A hill's rules in words: its size band and the class it names. Apart from `links.tsx`, which the
 * home page takes: only the hill pages read rules, and the home page has no budget left.
 */
import { classOfRange, type ReplayConfig, WEIGHT_CLASSES } from '@asmbots/protocol'
import { count, short } from './links'

/** A config's size band: `minBotBytes ?? 1` to `maxBotBytes`. */
export type SizeBand = Pick<ReplayConfig, 'minBotBytes' | 'maxBotBytes'>

/**
 * The class of a size band: one of the four, open weight, or null for a band that is no class
 * (the `tiny` hill, 1 to 256 bytes).
 */
export function bandWeight(config: SizeBand) {
  return classOfRange(config.minBotBytes ?? 1, config.maxBotBytes)
}

/** A size band in words: `middleweight · 513–1,024 B`, or `1–256 B` for a band that is no class. */
export function bandText(config: SizeBand): string {
  const weight = bandWeight(config)
  const bytes = `${count(config.minBotBytes ?? 1)}–${count(config.maxBotBytes)} B`
  return weight === null ? bytes : `${weight.name} · ${bytes}`
}

/** A hill's rules in one line: `10 rounds · 100k cycles · lightweight · 1–512 B`. */
export function rules(rounds: number, config: ReplayConfig): string {
  return `${rounds} rounds · ${short(config.maxCycles)} cycles · ${bandText(config)}`
}

/**
 * Where a hill stands in a list of hills: the classes lightest first, then open weight, then the
 * hills of no class (`tiny`), then the melee.
 */
export function hillOrder(hill: { config: SizeBand; scoring: string }): number {
  const last = WEIGHT_CLASSES.length
  if (hill.scoring === 'melee') return last + 2
  const weight = bandWeight(hill.config)
  if (weight === null) return last + 1
  if (weight.slug === 'open') return last
  return WEIGHT_CLASSES.findIndex((c) => c.slug === weight.slug)
}
