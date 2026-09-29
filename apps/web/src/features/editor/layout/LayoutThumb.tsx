import { cx } from '@asmbots/ui'
import { type Layout, PANEL_LABELS, tileBoxes } from './tree'

/** The thumbnail's size, in its own units: the editor page's shape, about. */
const WIDTH = 80
const HEIGHT = 48
/** The gap between two tiles, units. */
const GAP = 1.5

/**
 * A layout in little: each shown panel a tile where it sits, the source lit. It names its panels
 * for a screen reader, left to right, top to bottom.
 */
export function LayoutThumb({ layout, className }: { layout: Layout; className?: string }) {
  const boxes = tileBoxes(layout)
  const names = [...boxes]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((box) => PANEL_LABELS[box.id])
    .join(', ')
  return (
    <svg
      role="img"
      aria-label={`panels: ${names}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cx('h-12 w-20 shrink-0 rounded-sm border border-border bg-bg', className)}
    >
      {boxes.map((box) => (
        <rect
          key={box.id}
          x={box.x * WIDTH + GAP}
          y={box.y * HEIGHT + GAP}
          width={Math.max(0, box.width * WIDTH - GAP * 2)}
          height={Math.max(0, box.height * HEIGHT - GAP * 2)}
          rx={0.75}
          strokeWidth={0.6}
          className={
            box.id === 'source'
              ? 'fill-accent-25 stroke-accent'
              : 'fill-panel-2 stroke-border-strong'
          }
        />
      ))}
    </svg>
  )
}
