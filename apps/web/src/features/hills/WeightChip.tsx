/**
 * A bot's or a hill's weight class as a chip: `middle`, and on hover its full name and bounds,
 * `middleweight · 513 to 1,024 bytes`. Its own module, with only `weight.ts` behind it: the editor
 * and the arena take it, and the arena has no budget left.
 */
import type { WeightClass } from '@asmbots/protocol'
import { Chip, type ChipProps, Tooltip } from '@asmbots/ui'

/** A class's short name, as a chip and a filter option read it. */
export const WEIGHT_SHORT: Readonly<Record<WeightClass['slug'], string>> = {
  lightweight: 'light',
  middleweight: 'middle',
  heavyweight: 'heavy',
  'super-heavy': 'super',
  open: 'open',
}

const bytes = (n: number) => n.toLocaleString('en-US')

/** A class's name and bounds: `middleweight · 513 to 1,024 bytes`. */
export function weightBounds(weight: WeightClass): string {
  return `${weight.name} · ${bytes(weight.min)} to ${bytes(weight.max)} bytes`
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
