/**
 * The arena's hex dump, zoomed far in (`BYTE_CELL`): the rulers' canvas draws it, from its own
 * chunk, loaded the first time the camera zooms in that far.
 */
import { hexByte } from '@asmbots/ui'
import { ARENA_COLORS, BOT_HUES, type Theme } from '@asmbots/ui/themes'
import { type Camera, type CellRange, COLUMN_RULER } from './camera'
import { byteType } from './overlay'
import { type ArenaScene, GLOW_MS, SIDE, WRITE_FADE_MS } from './scene'

/** A byte's hex, as the boot screen's dump sets it: a bot's zero byte at half its hue… */
const OWNED_ZERO_ALPHA = 0.5
/** …and a byte no bot owns in the ruler's color, fainter when zero. */
const FREE_ALPHA = 0.8
const FREE_ZERO_ALPHA = 0.4
/** Each byte value's two hex digits. */
const HEX = Array.from({ length: 256 }, (_, value) => hexByte(value))

/**
 * Each byte of `cells` in hex, centered in its cell: in its owner's hue (`ruler` for none),
 * dimmer when zero, faded or dimmed as its bot's territory is, with a write's flash in `write`
 * over it. It fades in with `camera.hex`. Clipped to the view below the column ruler's band,
 * and off the minimap.
 */
export function drawBytes(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  scene: ArenaScene,
  cells: CellRange,
  theme: Theme,
  minimapOn: boolean,
): void {
  const { write, ruler } = ARENA_COLORS[theme]
  const { bytes, owner, writeAge } = scene
  const hues = BOT_HUES[theme]
  const show = camera.hex
  const view = camera.view
  const band = camera.lattice ? COLUMN_RULER : 0
  const cell = camera.cell
  ctx.save()
  ctx.beginPath()
  ctx.rect(view.x, view.y + band, view.width, view.height - band)
  const minimap = minimapOn ? camera.minimap() : null
  if (minimap !== null) ctx.rect(minimap.x, minimap.y, minimap.width, minimap.height)
  ctx.clip('evenodd')
  ctx.font = `500 ${byteType(cell)}px "JetBrains Mono", ui-monospace, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let row = cells.top; row < cells.bottom; row++) {
    const y = camera.originY + (row + 0.5) * cell
    for (let col = cells.left; col < cells.right; col++) {
      const a = row * SIDE + col
      const value = bytes[a] ?? 0
      const tag = owner[a] ?? 0
      const text = HEX[value] ?? ''
      const x = camera.originX + (col + 0.5) * cell
      if (tag === 0) {
        ctx.fillStyle = ruler
        ctx.globalAlpha = show * (value === 0 ? FREE_ZERO_ALPHA : FREE_ALPHA)
      } else {
        ctx.fillStyle = hues[(tag - 1) % hues.length] ?? ruler
        ctx.globalAlpha =
          show *
          (value === 0 ? OWNED_ZERO_ALPHA : 1) *
          (1 - (scene.fade[tag] ?? 0)) *
          (scene.dim[tag] ?? 1)
      }
      ctx.fillText(text, x, y)
      const age = writeAge[a] ?? GLOW_MS
      if (age < GLOW_MS) {
        ctx.fillStyle = write
        ctx.globalAlpha = show * Math.exp(-age / WRITE_FADE_MS) * (scene.dim[tag] ?? 1)
        ctx.fillText(text, x, y)
      }
    }
  }
  ctx.restore()
}
