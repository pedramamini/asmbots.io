/**
 * A bot's or a hill's weight class as a chip: `middle`, and on hover its full name and bounds,
 * `middleweight · 513 to 1,024 bytes`, and the bot lists' weight filter. Its own module, with only
 * `weight.ts` behind it: the arena takes it, and the arena has no budget left.
 */
import { type WeightClass, type WeightClassSlug, weightClassOf } from '@asmbots/protocol'
import { Chip, type ChipProps, Tooltip } from '@asmbots/ui'
import { WEIGHT_SHORT, weightBounds } from './weight-names'

export { WEIGHT_SHORT, weightBounds }

/** A bot list's weight filter: every bot, or one class's. */
export type WeightFilter = 'all' | WeightClassSlug

/**
 * The weight filter's options, as a `Segmented` takes them: `all`, then the classes, lightest first.
 * A literal, so a chunk that does not filter (the editor) drops it.
 */
export const WEIGHT_FILTERS = [
  { value: 'all', label: 'all' },
  { value: 'lightweight', label: 'light' },
  { value: 'middleweight', label: 'middle' },
  { value: 'heavyweight', label: 'heavy' },
  { value: 'super-heavy', label: 'super' },
] as const satisfies readonly { value: WeightFilter; label: string }[]

/** Whether a bot of `size` bytes passes `filter`. A bot with no size (it does not assemble) is in `all` only. */
export function inWeight(size: number | null | undefined, filter: WeightFilter): boolean {
  return filter === 'all' || (size != null && weightClassOf(size)?.slug === filter)
}

export interface WeightChipProps extends Omit<ChipProps, 'children'> {
  /** The class it names. */
  weight: WeightClass
}

/** The class's short name in a chip, with its name and bounds in a tooltip. */
export function WeightChip({ weight, ...rest }: WeightChipProps) {
  return (
    <Tooltip content={weightBounds(weight)}>
      <Chip data-weight={weight.slug} {...rest}>
        {WEIGHT_SHORT[weight.slug]}
      </Chip>
    </Tooltip>
  )
}
