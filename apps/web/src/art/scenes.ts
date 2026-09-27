/**
 * The dither plates' scenes (DESIGN_SYSTEM §10). Each measures in plate heights from its center
 * line, so it keeps its shape on any width; a scene that needs a width says so on its doc comment.
 */
import { aspect, BRIGHT, clamp01, type Grid, noise, type Scene, smoothstep } from './dither'

/** A peak of a `range`: where it stands, how high, and how wide its foot. */
export interface Peak {
  /** Its apex, 0..1 across the plate. */
  readonly x: number
  /** Its apex's height, 0..1 of the plate's. */
  readonly height: number
  /** Half its foot, 0..1 of the plate's width. */
  readonly spread: number
  /** A flag on the apex: a hill with a king. */
  readonly flag?: boolean | undefined
}

export interface RangeOptions {
  readonly peaks: readonly Peak[]
  /** The sun's center (`x` across, `y` down, 0..1) and radius in heights. None when absent. */
  readonly sun?: { readonly x: number; readonly y: number; readonly r: number } | undefined
  /** How many stars in the upper sky: none at 0, about 1 cell in 200 at 1. */
  readonly stars?: number | undefined
  /** A flag's pole, 0..1 of the plate's height; the cloth scales with it. 0.24 when absent. */
  readonly pole?: number | undefined
}

/** The height of the near ridge at `x`, 0..1 of the plate's: the highest peak there. */
export function ridgeHeight(peaks: readonly Peak[], x: number): number {
  let height = 0
  for (const peak of peaks) {
    const d = Math.abs(x - peak.x) / peak.spread
    if (d >= 1) continue
    const fall = (1 - d) ** 1.35
    // Rough flanks, a clean apex.
    const rough = 0.018 * Math.sin(x * 97 + peak.x * 13) * d + 0.01 * Math.sin(x * 211) * d
    height = Math.max(height, peak.height * fall + rough)
  }
  return height
}

/** The height of the far ridge at `x`: low rolling hills behind the peaks. */
function farHeight(x: number): number {
  return (
    0.3 + 0.07 * Math.sin(x * 7.3 + 1.1) + 0.04 * Math.sin(x * 23 + 0.4) + 0.015 * Math.sin(x * 71)
  )
}

/**
 * Mountains under a sky: a far ridge, the near peaks lit from the sun's side with a solid rim,
 * a flag on each peak that has one (a hill with a king), a banded sun, and stars. The footer's
 * range and the `/hills` banner.
 */
export function range({ peaks, sun, stars = 0, pole = 0.24 }: RangeOptions): Scene {
  const flag = pole / 0.24
  return (x, y, grid) => {
    const cell = 1 / grid.rows
    const wide = aspect(grid)
    // Flags first: they stand over the sky and the sun.
    for (const peak of peaks) {
      if (peak.flag !== true) continue
      const top = 1 - peak.height
      const dx = (x - peak.x) * wide
      if (Math.abs(dx) < cell * 0.6 && y <= top && y >= top - pole) return BRIGHT
      const cloth = dx >= 0 && dx < 0.13 * flag && y >= top - pole
      const wave = 0.012 * flag * Math.sin((dx / flag) * 55)
      if (cloth && y + wave < top - pole + 0.075 * flag) return BRIGHT
    }
    const near = 1 - ridgeHeight(peaks, x)
    if (y >= near) {
      const depth = y - near
      if (depth < cell * 1.2) return 1
      const slope = ridgeHeight(peaks, x + 0.002) - ridgeHeight(peaks, x - 0.002)
      const toward = sun === undefined ? 0 : Math.sign(sun.x - x) * Math.sign(slope)
      return 0.5 + 0.08 * toward + 0.32 * smoothstep(0, 0.6, depth)
    }
    if (y >= 1 - farHeight(x)) return 0.26
    if (sun !== undefined) {
      const d = Math.hypot((x - sun.x) * wide, y - sun.y)
      if (d < sun.r) {
        // The lower half's bands, thicker toward the horizon.
        const below = (y - sun.y) / sun.r
        if (below > 0.1 && Math.sin(below * 22) > 1.2 - below) return 0
        return 0.94
      }
      const halo = 1 - (d - sun.r) / (sun.r * 1.4)
      if (halo > 0) return 0.1 + 0.2 * halo * halo
    }
    if (stars > 0 && y < 0.55 && noise(x, y) > 1 - 0.005 * stars) return 1
    return 0.13 * smoothstep(0.25, 1, y)
  }
}

/**
 * The footer's range: the three seeded hills, `main` tallest, each with its king's flag, and low
 * foothills between them. The plate is tall, so the heights spread wide.
 */
export const FOOTER_PEAKS: readonly Peak[] = [
  { x: 0.08, height: 0.32, spread: 0.11 },
  { x: 0.22, height: 0.54, spread: 0.12, flag: true },
  { x: 0.36, height: 0.2, spread: 0.09 },
  { x: 0.5, height: 0.8, spread: 0.17, flag: true },
  { x: 0.65, height: 0.36, spread: 0.1 },
  { x: 0.8, height: 0.64, spread: 0.12, flag: true },
  { x: 0.94, height: 0.22, spread: 0.09 },
]

/** The footer flags' pole, 0..1 of its plate: short, as the plate is tall. */
export const FOOTER_POLE = 0.15

/** The hill each footer flag stands for, left to right. */
export const FOOTER_HILLS = ['tiny', 'main', 'melee'] as const

export const footerRange: Scene = range({
  peaks: FOOTER_PEAKS,
  sun: { x: 0.64, y: 0.46, r: 0.22 },
  stars: 1,
  pole: FOOTER_POLE,
})

/** Whether (dx, y) is on a small four-point sparkle centered at (px, py), in heights. */
function sparkle(dx: number, y: number, px: number, py: number, cell: number): boolean {
  const ax = Math.abs(dx - px)
  const ay = Math.abs(y - py)
  return (ax < cell * 0.6 && ay < cell * 3) || (ay < cell * 0.6 && ax < cell * 3)
}

/**
 * A championship cup on a plinth, rays behind, a gleam down its bowl. Needs a plate at least
 * 0.8 as wide as it is high.
 */
export const trophy: Scene = (x, y, grid: Grid) => {
  const cell = 1 / grid.rows
  const dx = (x - 0.5) * aspect(grid)
  if (
    sparkle(dx, y, -0.3, 0.1, cell) ||
    sparkle(dx, y, 0.32, 0.18, cell) ||
    sparkle(dx, y, 0.25, 0.05, cell)
  ) {
    return BRIGHT
  }
  // The bowl: a quarter ellipse, widest at the rim.
  if (y >= 0.12 && y <= 0.5) {
    const t = (y - 0.12) / 0.38
    const half = 0.19 * Math.sqrt(1 - t * t)
    if (Math.abs(dx) < half) {
      if (y < 0.145) return 1
      const s = dx / half
      if (s > -0.62 && s < -0.46 && t < 0.8) return BRIGHT
      return 0.3 + 0.62 * clamp01(1 - Math.abs(s + 0.35))
    }
  }
  // The handles: the outer half of a ring each side.
  const ring = Math.hypot(Math.abs(dx) - 0.19, y - 0.24)
  if (Math.abs(dx) > 0.17 && ring > 0.055 && ring < 0.085) return 0.75
  if (y >= 0.5 && y < 0.62 && Math.abs(dx) < 0.022 + (0.02 * (y - 0.5)) / 0.12) return 0.8
  if (y >= 0.62 && y < 0.66 && Math.abs(dx) < 0.08) return 1
  if (y >= 0.66 && y < 0.8 && Math.abs(dx) < 0.13) return y < 0.675 ? 1 : 0.5
  if (y >= 0.8) return 0.08
  // The rays, fading out from the cup.
  const d = Math.hypot(dx, y - 0.3)
  const angle = Math.atan2(y - 0.3, dx)
  if (d > 0.24 && Math.sin(angle * 14) > 0.55) return 0.2 * clamp01(1 - (d - 0.24) / 0.6)
  return 0
}

/** The pins along each side of the `chip`. */
const PINS = 20

/**
 * An 8086 in its 40-pin DIP, lit from above, its traces running off the board to vias. Needs a
 * plate at least 1.5 as wide as it is high.
 */
export const chip: Scene = (x, y, grid: Grid) => {
  const cell = 1 / grid.rows
  const dx = (x - 0.5) * aspect(grid)
  const inBody = Math.abs(dx) < 0.62 && y >= 0.36 && y <= 0.64
  if (inBody) {
    if (Math.hypot(dx + 0.62, y - 0.5) < 0.05) return 0
    if (Math.hypot(dx + 0.52, y - 0.575) < 0.022) return 0.12
    if (y < 0.372) return 1
    return 0.48 + 0.3 * (1 - (y - 0.36) / 0.28)
  }
  for (let i = 0; i < PINS; i++) {
    const px = -0.57 + (i * 1.14) / (PINS - 1)
    const off = Math.abs(dx - px)
    const top = y >= 0.3 && y < 0.36
    const bottom = y > 0.64 && y <= 0.7
    if (off < 0.018 && (top || bottom)) return y < 0.31 || y > 0.69 ? BRIGHT : 1
    // Every other pin's trace, out to a via at its own length.
    if (i % 2 === 1) continue
    const length = 0.06 + 0.2 * noise(i, top || y < 0.5 ? 1 : 2)
    const end = y < 0.5 ? 0.3 - length : 0.7 + length
    const via = Math.hypot(dx - px, y - end)
    if (via < 0.02 && via > 0.009) return 1
    const onTrace = y < 0.5 ? y >= end && y < 0.3 : y > 0.7 && y <= end
    if (off < cell * 0.6 && onTrace) return 0.7
  }
  return 0
}

/** The podium's digits, 3 × 5, row by row: `#` on. */
const DIGITS: Record<1 | 2 | 3, readonly string[]> = {
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['###', '..#', '###', '#..', '###'],
  3: ['###', '..#', '.##', '..#', '###'],
}

/** Whether (dx, y) is on the podium's `digit`, centered at (cx, cy) in heights, snapped to cells. */
function digitAt(digit: 1 | 2 | 3, dx: number, y: number, cx: number, cy: number, grid: Grid) {
  const cell = 1 / grid.rows
  const px = cell * Math.max(1, Math.round(0.04 / cell))
  // Snap the origin to a cell edge, so every pixel of the digit is the same count of cells.
  const edge = -aspect(grid) / 2
  const ox = edge + Math.round((cx - 1.5 * px - edge) / cell) * cell
  const oy = Math.round((cy - 2.5 * px) / cell) * cell
  const col = Math.floor((dx - ox) / px)
  const row = Math.floor((y - oy) / px)
  return DIGITS[digit][row]?.[col] === '#'
}

/** The distance from (x, y) to the segment from (ax, ay) to (bx, by). */
function toSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax
  const vy = by - ay
  const t = clamp01(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy))
  return Math.hypot(x - ax - t * vx, y - ay - t * vy)
}

/** The podium's steps: each place's center, half width, and top, in heights. */
const STEPS = [
  { place: 1, x: 0, half: 0.19, top: 0.5 },
  { place: 2, x: -0.38, half: 0.19, top: 0.62 },
  { place: 3, x: 0.38, half: 0.19, top: 0.68 },
] as const

/** The podium's floor, 0..1 down the plate. */
const FLOOR = 0.92

/** The champion: a boxy bot, arms up, a crown on its head. Its feet at `top`. */
function champion(dx: number, y: number, top: number): number {
  const ax = Math.abs(dx)
  if (y >= top - 0.36 && y < top - 0.3 && ax < 0.065) {
    // The crown: a band and three points.
    if (y >= top - 0.32) return BRIGHT
    const point = Math.min(Math.abs(dx + 0.05), Math.abs(dx), Math.abs(dx - 0.05))
    if (y >= top - 0.36 + point * 1.6) return BRIGHT
  }
  if (y >= top - 0.3 && y < top - 0.2 && ax < 0.065) {
    if (y >= top - 0.27 && y < top - 0.245 && Math.abs(ax - 0.03) < 0.013) return BRIGHT
    if (y >= top - 0.225 && y < top - 0.215 && ax < 0.03) return 0
    return 0.9
  }
  if (y >= top - 0.2 && y < top - 0.18 && ax < 0.02) return 1
  if (y >= top - 0.18 && y < top - 0.06 && ax < 0.08) {
    // A grille across the chest.
    if (ax < 0.045 && y > top - 0.15 && y < top - 0.09 && Math.sin(y * 260) > 0.3) return 0
    return 0.7
  }
  if (y >= top - 0.06 && y < top && Math.abs(ax - 0.042) < 0.02) return 0.85
  // The arms, raised.
  if (toSegment(ax, y, 0.075, top - 0.16, 0.16, top - 0.29) < 0.016) return 0.85
  if (Math.hypot(ax - 0.165, y - (top - 0.305)) < 0.024) return 1
  return -1
}

/** The runner-up: a round bot, a visor with one eye, an antenna. Its feet at `top`. */
function dome(dx: number, y: number, top: number): number {
  const ax = Math.abs(dx)
  if (y >= top - 0.03 && y < top && Math.abs(ax - 0.05) < 0.03) return 0.85
  if (Math.hypot(dx, y - (top - 0.32)) < 0.02) return BRIGHT
  if (ax < 0.009 && y >= top - 0.3 && y < top - 0.22) return 1
  const r = Math.hypot(dx, y - (top - 0.13))
  if (r < 0.11 && y < top - 0.02) {
    if (y >= top - 0.17 && y < top - 0.12 && ax < 0.08) {
      return Math.abs(dx - 0.02) < 0.02 && y >= top - 0.155 && y < top - 0.135 ? BRIGHT : 0
    }
    if (Math.hypot(dx - 0.045, y - (top - 0.2)) < 0.015) return BRIGHT
    // Lit from the upper right.
    return 0.4 + 0.5 * clamp01(0.5 + (dx - (y - (top - 0.13))) / 0.2)
  }
  return -1
}

/** The third: a squat tank on treads, a round turret, one arm out. Its treads at `top`. */
function tank(dx: number, y: number, top: number): number {
  // The treads: a capsule, its wheels dark hubs.
  const tread = Math.max(0, Math.abs(dx) - 0.11)
  if (Math.hypot(tread, y - (top - 0.032)) < 0.032) {
    for (const wx of [-0.11, -0.037, 0.037, 0.11]) {
      if (Math.hypot(dx - wx, y - (top - 0.032)) < 0.014) return 0
    }
    return 1
  }
  if (y >= top - 0.11 && y < top - 0.07 && Math.abs(dx) < 0.13) return y < top - 0.1 ? 1 : 0.55
  if (toSegment(dx, y, 0.04, top - 0.15, 0.16, top - 0.22) < 0.011) return 1
  if (Math.hypot(dx - 0.17, y - (top - 0.225)) < 0.018) return BRIGHT
  const turret = Math.hypot(dx, y - (top - 0.11))
  if (turret < 0.08 && y < top - 0.11) {
    if (y >= top - 0.16 && y < top - 0.14 && Math.abs(dx) < 0.05) {
      return Math.abs(dx - 0.015) < 0.012 ? BRIGHT : 0
    }
    return turret > 0.07 ? 1 : 0.8
  }
  return -1
}

/**
 * The `climb` plate: a podium, first in the middle, second left, third right, a different bot
 * on each step, rays behind the champion. Needs a plate at least 1.4 as wide as it is high.
 */
export const podium: Scene = (x, y, grid: Grid) => {
  const cell = 1 / grid.rows
  const dx = (x - 0.5) * aspect(grid)
  if (sparkle(dx, y, -0.3, 0.14, cell) || sparkle(dx, y, 0.28, 0.08, cell)) return BRIGHT
  const [first, second, third] = STEPS
  for (const tone of [
    champion(dx - first.x, y, first.top),
    dome(dx - second.x, y, second.top),
    tank(dx - third.x, y, third.top),
  ]) {
    if (tone >= 0) return tone
  }
  for (const step of STEPS) {
    const off = Math.abs(dx - step.x)
    if (off >= step.half || y < step.top || y >= FLOOR) continue
    if (y < step.top + cell * 1.2) return 1
    if (digitAt(step.place, dx, y, step.x, (step.top + FLOOR) / 2, grid)) return BRIGHT
    // A dark seam where two steps meet, and each step's front a shade apart.
    if (off > step.half - cell) return 0
    return 0.62 - 0.08 * step.place
  }
  if (y >= FLOOR) return y < FLOOR + cell * 1.2 ? 0.7 : 0.1
  const d = Math.hypot(dx, y - 0.3)
  const angle = Math.atan2(y - 0.3, dx)
  if (d > 0.2 && Math.sin(angle * 12) > 0.8) return 0.16 * clamp01(1 - (d - 0.2) / 0.6)
  if (y < 0.4 && noise(x, y) > 0.996) return 1
  return 0
}
