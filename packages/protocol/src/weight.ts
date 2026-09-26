/**
 * Weight classes: bots come in sizes, and a hill or a tournament takes one size band. The core
 * stays 64 KB; only the bots grow. A class has a floor as well as a cap, because a smaller bot is a
 * smaller target: without a floor, the small bots win every class. Open weight mixes every size.
 *
 * No imports here: the web home and arena chunks take this module, and they have no budget left.
 */

/** A weight class's slug, lightest first. Open weight is not one of them: it mixes them all. */
export type WeightClassSlug = 'lightweight' | 'middleweight' | 'heavyweight' | 'super-heavy'

/** A size band: bots of `min` to `max` bytes, spaced `minSpacing` apart, in melees or duels only. */
export interface WeightClass {
  readonly slug: WeightClassSlug | 'open'
  readonly name: string
  /** The smallest bot the class takes, in bytes. */
  readonly min: number
  /** The largest bot the class takes, in bytes. */
  readonly max: number
  /** The `minSpacing` of the class's hill. */
  readonly minSpacing: number
  /** Whether the class runs melees; the heavier classes run duels only (8 big bots do not fit). */
  readonly melee: boolean
}

/** The largest bot anywhere: the top of super-heavy, and of open weight. */
export const MAX_BOT_BYTES_ALL = 4096

/** The four classes, lightest first. Their bands touch and do not overlap. */
export const WEIGHT_CLASSES = [
  { slug: 'lightweight', name: 'lightweight', min: 1, max: 512, minSpacing: 1024, melee: true },
  {
    slug: 'middleweight',
    name: 'middleweight',
    min: 513,
    max: 1024,
    minSpacing: 1024,
    melee: true,
  },
  {
    slug: 'heavyweight',
    name: 'heavyweight',
    min: 1025,
    max: 2048,
    minSpacing: 2048,
    melee: false,
  },
  {
    slug: 'super-heavy',
    name: 'super-heavy',
    min: 2049,
    max: MAX_BOT_BYTES_ALL,
    minSpacing: 4096,
    melee: false,
  },
] as const satisfies readonly (WeightClass & { slug: WeightClassSlug })[]

/** Open weight: any bot from 1 byte to the absolute cap, every class mixed, duels only. */
export const OPEN_WEIGHT = {
  slug: 'open',
  name: 'open weight',
  min: 1,
  max: MAX_BOT_BYTES_ALL,
  minSpacing: 4096,
  melee: false,
} as const satisfies WeightClass

/** The class a bot of `size` bytes belongs to, or null when no bot can be that size. */
export function weightClassOf(size: number): (typeof WEIGHT_CLASSES)[number] | null {
  return WEIGHT_CLASSES.find((c) => size >= c.min && size <= c.max) ?? null
}

/**
 * The class whose bounds are exactly `[min, max]`: one of the four, open weight for the whole
 * range, or null for any other band (a `tiny` hill at 1 to 256 bytes has no class).
 */
export function classOfRange(
  min: number,
  max: number,
): (typeof WEIGHT_CLASSES)[number] | typeof OPEN_WEIGHT | null {
  if (min === OPEN_WEIGHT.min && max === OPEN_WEIGHT.max) return OPEN_WEIGHT
  return WEIGHT_CLASSES.find((c) => c.min === min && c.max === max) ?? null
}
