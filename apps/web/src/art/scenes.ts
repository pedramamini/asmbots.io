/**
 * The dither plates' scenes (DESIGN_SYSTEM §10). Each measures in plate heights from its center
 * line, so it keeps its shape on any width; a scene that needs a width says so on its doc comment.
 */
import { BOT_NAMES, BOTS, type BotName, type Sprite } from './bots'
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
  /** The near ridge's lowest height, 0..1 of the plate's, rolling a little: none when absent. */
  readonly floor?: number | undefined
  /** Bots standing about the range, each ringed in a cell of sky so it reads over the rock. */
  readonly bots?: readonly Placed[] | undefined
}

/** A bot placed on a plate: its feet at (`x`, `y`), 0..1, drawn at `scale`, facing left if `flip`. */
export interface Placed {
  readonly bot: BotName
  readonly x: number
  readonly y: number
  readonly scale: number
  readonly flip?: boolean | undefined
}

/** The tone of the first placed bot at (x, y), 0 on the cell of sky around one, -1 off them. */
function placedTone(bots: readonly Placed[], x: number, y: number, grid: Grid): number {
  const cell = 1 / grid.rows
  const wide = aspect(grid)
  let ring = false
  for (const placed of bots) {
    const sprite: Sprite = BOTS[placed.bot]
    const u = ((x - placed.x) * wide * (placed.flip === true ? -1 : 1)) / placed.scale
    const v = (y - placed.y) / placed.scale
    const local = cell / placed.scale
    // Every bot fits a box 0.25 either side and 0.45 up: skip the rest of the plate.
    if (Math.abs(u) > 0.25 + local || v < -0.45 - local || v > local) continue
    const tone = sprite(u, v, local)
    if (tone >= 0) return tone
    if (!ring) {
      ring =
        sprite(u + local, v, local) >= 0 ||
        sprite(u - local, v, local) >= 0 ||
        sprite(u, v + local, local) >= 0 ||
        sprite(u, v - local, local) >= 0
    }
  }
  return ring ? 0 : -1
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

/** The ground's height at `x`, 0..1 of the plate's: the near ridge over its rolling `floor`. */
export function groundHeight(peaks: readonly Peak[], floor: number, x: number): number {
  return Math.max(ridgeHeight(peaks, x), floor * (1 + 0.2 * Math.sin(x * 17 + 0.7)))
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
export function range({
  peaks,
  sun,
  stars = 0,
  pole = 0.24,
  floor = 0,
  bots = [],
}: RangeOptions): Scene {
  const flag = pole / 0.24
  const ground = (x: number) => groundHeight(peaks, floor, x)
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
    if (bots.length > 0) {
      const tone = placedTone(bots, x, y, grid)
      if (tone >= 0) return tone
    }
    const near = 1 - ground(x)
    if (y >= near) {
      const depth = y - near
      if (depth < cell * 1.2) return 1
      const slope = ground(x + 0.002) - ground(x - 0.002)
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

/** The footer flags' pole, 0..1 of its plate: short, as the plate is tall. */
export const FOOTER_POLE = 0.12

/** The hill each footer flag stands for, left to right. */
export const FOOTER_HILLS = ['tiny', 'main', 'melee'] as const

/** A footer's range: its peaks (the flags' links stand on them) and the picture. */
export interface FooterRange {
  readonly peaks: readonly Peak[]
  readonly bots: readonly Placed[]
  readonly scene: Scene
}

/** A fixed 0..1 stream for `seed` (FNV-1a into mulberry32): the same seed, the same numbers. */
function seeded(seed: string): () => number {
  let state = 2166136261
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The footer's flagged peaks before a seed moves them: `main` tallest, in the middle. */
const FOOTER_FLAGS = [
  { x: 0.22, height: 0.56, spread: 0.13 },
  { x: 0.5, height: 0.78, spread: 0.17 },
  { x: 0.8, height: 0.66, spread: 0.13 },
] as const

/**
 * The footer's range for a page (`seed`, its path): the three seeded hills, each with its king's
 * flag, foothills between them over a rolling floor, so no valley drops to the far ridge, a sun,
 * stars, and three bots of the 24 about the slopes. Each page moves the peaks and the sun a
 * little and picks its own bots, so each footer differs and all match.
 */
export function footerRange(seed: string): FooterRange {
  const random = seeded(seed)
  const between = (low: number, high: number) => low + (high - low) * random()
  const flags = FOOTER_FLAGS.map(
    (peak): Peak => ({
      x: peak.x + between(-0.04, 0.04),
      height: peak.height + between(-0.05, 0.05),
      spread: peak.spread + between(-0.015, 0.015),
      flag: true,
    }),
  )
  // Two foothills in each gap between flags and the plate's edges, shorter than any flag.
  const edges = [0, ...flags.map((peak) => peak.x), 1]
  const foothills: Peak[] = []
  for (let i = 0; i + 1 < edges.length; i++) {
    const left = edges[i] ?? 0
    const width = (edges[i + 1] ?? 1) - left
    for (const at of [0.33, 0.67]) {
      foothills.push({
        x: left + width * (at + between(-0.1, 0.1)),
        height: between(0.28, 0.42),
        spread: between(0.07, 0.11),
      })
    }
  }
  const peaks = [...foothills, ...flags].sort((a, b) => a.x - b.x)
  // The sun anywhere across the sky, clear of the flags and their labels; between the first two
  // when no draw is.
  const clear = (x: number) => flags.every((peak) => Math.abs(x - peak.x) > 0.11)
  let sunX = ((flags[0]?.x ?? 0.22) + (flags[1]?.x ?? 0.5)) / 2
  for (let draw = 0; draw < 8; draw++) {
    const x = between(0.08, 0.92)
    if (clear(x)) {
      sunX = x
      break
    }
  }
  const sun = { x: sunX, y: between(0.36, 0.5), r: between(0.2, 0.25) }
  // Three bots about the range, off the flags, their labels, and the sun, each on a gentle stretch.
  const floor = 0.2
  const bots: Placed[] = []
  const names = [...BOT_NAMES]
  for (let draw = 0; draw < 200 && bots.length < FOOTER_BOTS; draw++) {
    const x = between(0.04, 0.96)
    const slope = groundHeight(peaks, floor, x + 0.012) - groundHeight(peaks, floor, x - 0.012)
    const offFlags = flags.every((peak) => x < peak.x - 0.05 || x > peak.x + 0.09)
    const apart = bots.every((placed) => Math.abs(placed.x - x) > 0.1)
    const offSun = Math.abs(x - sun.x) > 0.08
    // The slope allowed widens as the draws go, so a steep range still gets its three.
    if (!offFlags || !apart || !offSun || Math.abs(slope) > 0.03 + draw * 0.0005) continue
    const [bot] = names.splice(Math.floor(random() * names.length), 1)
    if (bot === undefined) break
    // Its feet on the ground's mean under it, so neither foot hangs in the air for long.
    const y =
      1 - (groundHeight(peaks, floor, x - 0.008) + groundHeight(peaks, floor, x + 0.008)) / 2
    bots.push({ bot, x, y: y + 0.01, scale: FOOTER_BOT_SCALE, flip: random() < 0.5 })
  }
  return { peaks, bots, scene: range({ peaks, sun, stars: 1, pole: FOOTER_POLE, floor, bots }) }
}

/** How many bots stand about each footer's range. */
export const FOOTER_BOTS = 3

/** A footer bot's scale: about a quarter of the plate's height. */
const FOOTER_BOT_SCALE = 0.75

/**
 * One bot, large, on a floor under a sky of stars: a portrait for any plate that wants a bot.
 * Needs a plate at least 0.8 as wide as it is high.
 */
export function botPortrait(name: BotName): Scene {
  const sprite = BOTS[name]
  return (x, y, grid) => {
    const cell = 1 / grid.rows
    const dx = (x - 0.5) * aspect(grid)
    const tone = sprite(dx / 2, (y - 0.9) / 2, cell / 2)
    if (tone >= 0) return tone
    if (y >= 0.9) return y < 0.9 + cell * 1.2 ? 0.7 : 0.1
    if (y < 0.6 && noise(x, y) > 0.996) return 1
    return 0
  }
}

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

/** The podium's steps: each place's center, half width, and top, in heights. */
const STEPS = [
  { place: 1, x: 0, half: 0.19, top: 0.5 },
  { place: 2, x: -0.38, half: 0.19, top: 0.62 },
  { place: 3, x: 0.38, half: 0.19, top: 0.68 },
] as const

/** The podium's floor, 0..1 down the plate. */
const FLOOR = 0.92

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
    BOTS.champion(dx - first.x, y - first.top, cell),
    BOTS.dome(dx - second.x, y - second.top, cell),
    BOTS.tank(dx - third.x, y - third.top, cell),
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
