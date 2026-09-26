/**
 * A weight class's words: its short name, `middle`, and its bounds, `middleweight · 513 to 1,024
 * bytes`. Apart from `WeightChip`, so the editor's size chip takes the words without the chip and
 * the filter the arena takes (Rollup places a module whole, in every chunk that imports it).
 */
import type { WeightClass } from '@asmbots/protocol'

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
