/**
 * The dither bots (DESIGN_SYSTEM §10): 24 little robots in the plates' style, for the podium,
 * the footer's range, and any plate that wants a bot. Each is a `Sprite` in its own units: `dx`
 * across from its center, `y` down, its feet at 0 and its top about 0.4 up; the podium draws them
 * at scale 1, the footer at half that.
 */
import { BRIGHT, clamp01 } from './dither'

/**
 * A bot's tone at (dx, y), in its units: 0..1 or `BRIGHT` on the bot, -1 off it. `cell` is a
 * cell's side in the same units, so a thin line stays a cell wide at any scale.
 */
export type Sprite = (dx: number, y: number, cell: number) => number

/** The distance from (x, y) to the segment from (ax, ay) to (bx, by). */
export function toSegment(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const vx = bx - ax
  const vy = by - ay
  const t = clamp01(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy))
  return Math.hypot(x - ax - t * vx, y - ay - t * vy)
}

/** Whether (dx, y) is in the box from (x0, y0) to (x1, y1). */
function box(dx: number, y: number, x0: number, x1: number, y0: number, y1: number): boolean {
  return dx >= x0 && dx < x1 && y >= y0 && y < y1
}

/** Whether (dx, y) is within `r` of (cx, cy). */
function disc(dx: number, y: number, cx: number, cy: number, r: number): boolean {
  return Math.hypot(dx - cx, y - cy) < r
}

/** Whether (dx, y) is on a line `half` either side of the segment, a cell wide at the least. */
function line(
  dx: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  half: number,
  cell: number,
) {
  return toSegment(dx, y, ax, ay, bx, by) < Math.max(half, cell * 0.55)
}

/** A body's tone, lit from the upper right about (cx, cy), `r` its size. */
function lit(dx: number, y: number, cx: number, cy: number, r: number): number {
  return 0.4 + 0.5 * clamp01(0.5 + (dx - cx - (y - cy)) / (2 * r))
}

/** Whether (px, py) is inside the triangle a, b, c. */
function inTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
): boolean {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
  const negative = d1 < 0 || d2 < 0 || d3 < 0
  const positive = d1 > 0 || d2 > 0 || d3 > 0
  return !(negative && positive)
}

/** The champion: a boxy bot, arms up, a crown on its head. */
const champion: Sprite = (dx, y) => {
  const ax = Math.abs(dx)
  if (y >= -0.36 && y < -0.3 && ax < 0.065) {
    // The crown: a band and three points.
    if (y >= -0.32) return BRIGHT
    const point = Math.min(Math.abs(dx + 0.05), Math.abs(dx), Math.abs(dx - 0.05))
    if (y >= -0.36 + point * 1.6) return BRIGHT
  }
  if (y >= -0.3 && y < -0.2 && ax < 0.065) {
    if (y >= -0.27 && y < -0.245 && Math.abs(ax - 0.03) < 0.013) return BRIGHT
    if (y >= -0.225 && y < -0.215 && ax < 0.03) return 0
    return 0.9
  }
  if (y >= -0.2 && y < -0.18 && ax < 0.02) return 1
  if (y >= -0.18 && y < -0.06 && ax < 0.08) {
    // A grille across the chest.
    if (ax < 0.045 && y > -0.15 && y < -0.09 && Math.sin(y * 260) > 0.3) return 0
    return 0.7
  }
  if (y >= -0.06 && y < 0 && Math.abs(ax - 0.042) < 0.02) return 0.85
  // The arms, raised.
  if (toSegment(ax, y, 0.075, -0.16, 0.16, -0.29) < 0.016) return 0.85
  if (Math.hypot(ax - 0.165, y + 0.305) < 0.024) return 1
  return -1
}

/** A round bot, a visor with one eye, an antenna. */
const dome: Sprite = (dx, y, cell) => {
  const ax = Math.abs(dx)
  if (y >= -0.03 && y < 0 && Math.abs(ax - 0.05) < 0.03) return 0.85
  if (disc(dx, y, 0, -0.32, 0.02)) return BRIGHT
  if (ax < Math.max(0.009, cell * 0.55) && y >= -0.3 && y < -0.22) return 1
  const r = Math.hypot(dx, y + 0.13)
  if (r < 0.11 && y < -0.02) {
    if (y >= -0.17 && y < -0.12 && ax < 0.08) {
      return Math.abs(dx - 0.02) < 0.02 && y >= -0.155 && y < -0.135 ? BRIGHT : 0
    }
    if (disc(dx, y, 0.045, -0.2, 0.015)) return BRIGHT
    return lit(dx, y, 0, -0.13, 0.1)
  }
  return -1
}

/** A squat tank on treads, a round turret, one arm out. */
const tank: Sprite = (dx, y, cell) => {
  // The treads: a capsule, its wheels dark hubs.
  const tread = Math.max(0, Math.abs(dx) - 0.11)
  if (Math.hypot(tread, y + 0.032) < 0.032) {
    for (const wx of [-0.11, -0.037, 0.037, 0.11]) {
      if (disc(dx, y, wx, -0.032, 0.014)) return 0
    }
    return 1
  }
  if (y >= -0.11 && y < -0.07 && Math.abs(dx) < 0.13) return y < -0.1 ? 1 : 0.55
  if (line(dx, y, 0.04, -0.15, 0.16, -0.22, 0.011, cell)) return 1
  if (disc(dx, y, 0.17, -0.225, 0.018)) return BRIGHT
  const turret = Math.hypot(dx, y + 0.11)
  if (turret < 0.08 && y < -0.11) {
    if (y >= -0.16 && y < -0.14 && Math.abs(dx) < 0.05) {
      return Math.abs(dx - 0.015) < 0.012 ? BRIGHT : 0
    }
    return turret > 0.07 ? 1 : 0.8
  }
  return -1
}

/** Eight legs on an oval body, two bright eyes. */
const spider: Sprite = (dx, y, cell) => {
  if (disc(dx, y, 0.035, -0.135, 0.014) || disc(dx, y, 0.075, -0.13, 0.012)) return BRIGHT
  if ((dx / 0.1) ** 2 + ((y + 0.12) / 0.065) ** 2 < 1) return lit(dx, y, 0, -0.12, 0.09)
  const ax = Math.abs(dx)
  for (let i = 0; i < 4; i++) {
    const hipY = -0.15 + 0.02 * i
    const kneeX = 0.13 + 0.015 * i
    const kneeY = -0.21 + 0.035 * i
    if (line(ax, y, 0.07, hipY, kneeX, kneeY, 0.008, cell)) return 1
    if (line(ax, y, kneeX, kneeY, 0.145 + 0.03 * i, -0.008, 0.008, cell)) return 0.85
  }
  return -1
}

/** A two-legged walker: a cockpit and a gun on knees bent back. */
const walker: Sprite = (dx, y, cell) => {
  if (box(dx, y, 0.02, 0.09, -0.365, -0.345)) return BRIGHT
  if (box(dx, y, -0.1, 0.1, -0.4, -0.29)) {
    if (y < -0.388) return 1
    return lit(dx, y, 0, -0.34, 0.1)
  }
  if (box(dx, y, 0.1, 0.17, -0.325, -0.307)) return 1
  if (box(dx, y, -0.035, 0.035, -0.29, -0.26)) return 0.9
  // The knees bend back, both of them, as a bird's do.
  for (const hip of [-0.035, 0.035]) {
    const knee = hip - 0.06
    const foot = hip + 0.015
    if (disc(dx, y, knee, -0.16, 0.018)) return 1
    if (line(dx, y, hip, -0.27, knee, -0.16, 0.012, cell)) return 0.8
    if (line(dx, y, knee, -0.16, foot, -0.03, 0.011, cell)) return 0.85
    if (box(dx, y, foot - 0.04, foot + 0.05, -0.025, 0)) return 1
  }
  return -1
}

/** A hovering quad: rotors up top, a light below, its shadow on the ground. */
const drone: Sprite = (dx, y, cell) => {
  for (const s of [-1, 1]) {
    if (box(dx, y, s > 0 ? 0.04 : -0.16, s > 0 ? 0.16 : -0.04, -0.305, -0.29)) return 1
    if (disc(dx, y, s * 0.1, -0.285, 0.013)) return 1
    if (line(dx, y, s * 0.045, -0.21, s * 0.1, -0.285, 0.008, cell)) return 0.85
  }
  if (disc(dx, y, 0.015, -0.19, 0.013)) return BRIGHT
  if (disc(dx, y, 0, -0.19, 0.062)) {
    if (y > -0.205 && y < -0.175 && Math.abs(dx) < 0.048) return 0
    return lit(dx, y, 0, -0.19, 0.06)
  }
  if (y > -0.12 && y < -0.04 && Math.abs(dx) < 0.03 * (1 + (y + 0.12) * 4)) {
    return Math.sin(y * 150) > 0.3 ? 0.4 : -1
  }
  if ((dx / 0.075) ** 2 + ((y + 0.01) / 0.012) ** 2 < 1) return 0.3
  return -1
}

/** A crab: a wide shell, claws up, eyes on stalks. */
const crab: Sprite = (dx, y, cell) => {
  const ax = Math.abs(dx)
  if (disc(ax, y, 0.05, -0.2, 0.017)) return BRIGHT
  if (line(ax, y, 0.04, -0.12, 0.05, -0.19, 0.007, cell)) return 1
  // The claws: a disc bitten by a smaller one.
  if (disc(ax, y, 0.18, -0.2, 0.035) && !disc(ax, y, 0.205, -0.225, 0.02)) return 0.9
  if (line(ax, y, 0.11, -0.08, 0.17, -0.17, 0.012, cell)) return 0.85
  if ((dx / 0.13) ** 2 + ((y + 0.06) / 0.07) ** 2 < 1 && y < -0.03) {
    if (y > -0.042) return 1
    return lit(dx, y, 0, -0.07, 0.12)
  }
  for (let i = 0; i < 3; i++) {
    if (line(ax, y, 0.06 + 0.03 * i, -0.04, 0.1 + 0.035 * i, -0.007, 0.007, cell)) return 0.85
  }
  return -1
}

/** A television: a smile on its screen, rabbit ears, a boxy body on two legs. */
const tv: Sprite = (dx, y, cell) => {
  const ax = Math.abs(dx)
  if (disc(ax, y, 0.075, -0.42, 0.013)) return BRIGHT
  if (line(ax, y, 0.02, -0.36, 0.07, -0.415, 0.006, cell)) return 1
  if (box(dx, y, -0.125, 0.125, -0.36, -0.16)) {
    if (ax > 0.108 || y < -0.345 || y > -0.175) return 1
    if (box(ax, y, 0.03, 0.058, -0.305, -0.27)) return BRIGHT
    const smile = Math.hypot(dx, y + 0.265)
    if (smile > 0.045 && smile < 0.06 && y > -0.235) return BRIGHT
    return Math.sin(y * 300) > 0.6 ? 0.3 : 0.1
  }
  if (box(ax, y, 0, 0.022, -0.16, -0.125)) return 1
  if (box(dx, y, -0.075, 0.075, -0.125, -0.04)) {
    if (disc(dx, y, 0.04, -0.09, 0.012)) return BRIGHT
    return lit(dx, y, 0, -0.08, 0.07)
  }
  if (box(ax, y, 0.028, 0.055, -0.04, 0)) return 0.85
  return -1
}

/** A robot dog: four legs, a pointed ear, a tail with a light. */
const dog: Sprite = (dx, y, cell) => {
  if (disc(dx, y, 0.125, -0.205, 0.012)) return BRIGHT
  if (disc(dx, y, -0.175, -0.225, 0.013)) return BRIGHT
  if (box(dx, y, 0.06, 0.16, -0.25, -0.15)) return y < -0.24 ? 1 : 0.8
  if (box(dx, y, 0.16, 0.195, -0.19, -0.155)) return 1
  if (line(dx, y, 0.08, -0.25, 0.1, -0.3, 0.012, cell)) return 1
  if (box(dx, y, -0.13, 0.09, -0.165, -0.09)) {
    if (y < -0.155) return 1
    return lit(dx, y, -0.02, -0.13, 0.12)
  }
  if (line(dx, y, -0.12, -0.15, -0.17, -0.215, 0.008, cell)) return 0.85
  for (const lx of [-0.11, -0.07, 0.03, 0.07]) {
    if (box(dx, y, lx - 0.011, lx + 0.011, -0.09, -0.015)) return 0.85
    if (box(dx, y, lx - 0.016, lx + 0.02, -0.015, 0)) return 1
  }
  return -1
}

/** A segmented worm, its head up, one antenna. */
const worm: Sprite = (dx, y, cell) => {
  if (disc(dx, y, 0.145, -0.135, 0.013)) return BRIGHT
  if (disc(dx, y, 0.1, -0.235, 0.012)) return BRIGHT
  if (line(dx, y, 0.12, -0.17, 0.1, -0.23, 0.006, cell)) return 1
  const head = Math.hypot(dx - 0.13, y + 0.12)
  if (head < 0.05) return head > 0.04 ? 1 : lit(dx, y, 0.13, -0.12, 0.05)
  for (let i = 4; i >= 0; i--) {
    const r = 0.028 + 0.004 * i
    const cx = -0.15 + 0.05 * i
    const cy = -r - 0.02 * Math.max(0, Math.sin(i * 1.4))
    const d = Math.hypot(dx - cx, y - cy)
    if (d < r) return d > r * 0.75 ? 1 : 0.5
  }
  if (line(dx, y, 0.07, -0.05, 0.11, -0.09, 0.02, cell)) return 0.7
  return -1
}

/** The imp: a ghost with a wavy hem and big eyes, Core War's oldest warrior. */
const imp: Sprite = (dx, y) => {
  const ax = Math.abs(dx)
  if (ax >= 0.11) return -1
  const hem = -0.01 - 0.02 * (0.5 + 0.5 * Math.cos(dx * 60))
  const inDome = y < -0.17 ? Math.hypot(dx, y + 0.17) < 0.11 : y < hem
  if (!inDome || y < -0.28) return -1
  if (disc(dx, y, Math.sign(dx) * 0.04 + 0.012, -0.165, 0.013)) return BRIGHT
  if (disc(ax, y, 0.04, -0.17, 0.028)) return 0
  return lit(dx, y, 0, -0.15, 0.11)
}

/** A rocket on its fins, a porthole, a flame under it. */
const rocket: Sprite = (dx, y) => {
  const ax = Math.abs(dx)
  if (y >= -0.4 && y < -0.08) {
    const half = y < -0.3 ? 0.06 * ((y + 0.4) / 0.1) ** 0.7 : 0.06
    if (ax < half) {
      const port = Math.hypot(dx, y + 0.24)
      if (port < 0.022) return BRIGHT
      if (port < 0.032) return 0
      if (y > -0.125 && y < -0.11) return 0
      if (ax > half - 0.012) return 1
      return lit(dx, y, 0, -0.24, 0.06)
    }
  }
  // The fins.
  if (ax >= 0.06 && ax < 0.11 && y < -0.04 && y > -0.15 + (ax - 0.06) * 1.6) return 1
  if (y >= -0.08 && y < -0.005) {
    const w = 0.045 * (-y / 0.08)
    if (ax < w * 0.5) return BRIGHT
    if (ax < w) return 0.55
  }
  return -1
}

/** A unicycle bot: one spoked wheel, a round head, one hand waving. */
const unicycle: Sprite = (dx, y, cell) => {
  const thin = Math.max(0.007, cell * 0.55)
  const wheel = Math.hypot(dx, y + 0.06)
  if (wheel < 0.06) {
    if (wheel > 0.045) return 1
    if (wheel < 0.013) return BRIGHT
    if (Math.abs(dx) < thin || Math.abs(y + 0.06) < thin) return 0.7
    return -1
  }
  if (disc(dx, y, 0.018, -0.305, 0.01)) return BRIGHT
  const head = Math.hypot(dx, y + 0.3)
  if (head < 0.05) {
    if (y > -0.318 && y < -0.292 && Math.abs(dx) < 0.036) return 0
    return lit(dx, y, 0, -0.3, 0.05)
  }
  if (disc(dx, y, 0.03, -0.2, 0.012)) return BRIGHT
  if (box(dx, y, -0.07, 0.07, -0.25, -0.13)) return y < -0.24 ? 1 : lit(dx, y, 0, -0.19, 0.07)
  if (line(dx, y, 0, -0.13, 0, -0.06, 0.01, cell)) return 0.85
  if (disc(dx, y, 0.14, -0.315, 0.019)) return 1
  if (line(dx, y, 0.07, -0.22, 0.135, -0.3, 0.01, cell)) return 0.85
  if (line(dx, y, -0.07, -0.22, -0.11, -0.15, 0.01, cell)) return 0.85
  return -1
}

/** A cube with one big eye, vents for a mouth, stubby legs. */
const cyclops: Sprite = (dx, y) => {
  const ax = Math.abs(dx)
  if (box(dx, y, -0.11, 0.11, -0.3, -0.06)) {
    const eye = Math.hypot(dx, y + 0.19)
    if (disc(dx, y, 0.012, -0.195, 0.022)) return BRIGHT
    if (eye < 0.045) return 0.15
    if (eye < 0.06) return 1
    if (y > -0.105 && y < -0.085 && ax < 0.06 && Math.sin(dx * 200) > 0) return 0
    if (ax > 0.098 || y < -0.288 || y > -0.072) return 1
    return lit(dx, y, 0, -0.18, 0.12)
  }
  if (box(ax, y, 0.035, 0.07, -0.06, 0)) return 0.85
  return -1
}

/** A radar bot: a dish on a mast, waves off it, a row of lights. */
const radar: Sprite = (dx, y, cell) => {
  const thin = Math.max(0.006, cell * 0.55)
  if (disc(dx, y, 0.018, -0.358, 0.014)) return BRIGHT
  // The waves off the dish, to the upper right.
  const wave = Math.hypot(dx - 0.018, y + 0.358)
  const angle = Math.atan2(y + 0.358, dx - 0.018)
  if (
    angle > -1.3 &&
    angle < -0.3 &&
    (Math.abs(wave - 0.05) < thin || Math.abs(wave - 0.08) < thin)
  ) {
    return 0.6
  }
  // The dish: the part of a circle past a chord, its hollow to the upper right.
  const rim = Math.hypot(dx - 0.06, y + 0.4)
  const chord = (0.048 + 0.06) * (y + 0.388) - (-0.3 + 0.388) * (dx + 0.06)
  if (rim < 0.125 && chord > 0) return rim > 0.11 ? 1 : 0.55
  if (line(dx, y, -0.025, -0.315, 0.018, -0.358, 0.005, cell)) return 1
  if (box(dx, y, -thin, thin, -0.3, -0.2)) return 1
  if (box(dx, y, -0.08, 0.08, -0.2, -0.04)) {
    for (const [lx, on] of [
      [-0.04, true],
      [0, false],
      [0.04, true],
    ] as const) {
      if (disc(dx, y, lx, -0.16, 0.011)) return on ? BRIGHT : 0
    }
    return y < -0.19 ? 1 : lit(dx, y, 0, -0.12, 0.08)
  }
  if (box(dx, y, -0.1, 0.1, -0.04, 0)) {
    if (disc(Math.abs(dx), y, 0.06, -0.02, 0.011)) return 0
    return 1
  }
  return -1
}

/** A brute: a small head on wide shoulders, big fists. */
const brute: Sprite = (dx, y) => {
  const ax = Math.abs(dx)
  if (y >= -0.345 && y < -0.33 && ax < 0.03) return BRIGHT
  if (box(dx, y, -0.045, 0.045, -0.37, -0.3)) return 0.8
  if (box(ax, y, 0.11, 0.17, -0.1, -0.035)) return Math.abs(y + 0.07) < 0.005 ? 0 : 1
  if (box(ax, y, 0.12, 0.16, -0.28, -0.1)) return 0.85
  if (y >= -0.3 && y < -0.14 && ax < 0.13 - (y + 0.3) * 0.3) {
    if (y > -0.225 && y < -0.212) return 0
    return y < -0.29 ? 1 : lit(dx, y, 0, -0.22, 0.12)
  }
  if (box(ax, y, 0.01, 0.08, -0.025, 0)) return 1
  if (box(ax, y, 0.02, 0.07, -0.14, -0.025)) return 0.85
  return -1
}

/** An owl: ringed eyes, ear tufts, a chevroned belly. */
const owl: Sprite = (dx, y, cell) => {
  const ax = Math.abs(dx)
  const eye = Math.hypot(ax - 0.045, y + 0.19)
  if (eye < 0.04) {
    if (disc(ax, y, 0.045, -0.19, 0.014)) return BRIGHT
    return eye > 0.03 ? 1 : 0
  }
  if (y >= -0.17 && y < -0.13 && ax < (y + 0.17) * 0.5) return 1
  if (line(ax, y, 0.055, -0.25, 0.075, -0.29, 0.01, cell)) return 1
  if ((dx / 0.1) ** 2 + ((y + 0.14) / 0.13) ** 2 < 1) {
    if ((dx / 0.06) ** 2 + ((y + 0.08) / 0.06) ** 2 < 1) {
      return Math.sin((y + ax * 0.6) * 120) > 0.4 ? 0.25 : 0.65
    }
    return lit(dx, y, 0, -0.14, 0.1)
  }
  if (box(ax, y, 0.015, 0.055, -0.015, 0)) return 1
  return -1
}

/** A jellyfish drifting: a spotted bell, wavy tentacles lit at the tips. */
const jelly: Sprite = (dx, y, cell) => {
  const ax = Math.abs(dx)
  if (disc(ax, y, 0.035, -0.26, 0.012)) return BRIGHT
  if (y < -0.22 && Math.hypot(dx, y + 0.22) < 0.1) {
    if (disc(dx, y, -0.02, -0.3, 0.01)) return 0.1
    return lit(dx, y, 0, -0.27, 0.1)
  }
  if (y >= -0.225 && y < -0.205 && ax < 0.11) return 1
  if (y >= -0.205 && y < -0.02) {
    const thin = Math.max(0.007, cell * 0.55)
    for (let k = -2; k <= 2; k++) {
      const x = k * 0.04 + 0.015 * Math.sin(y * 40 + k)
      if (Math.abs(dx - x) < thin) return y > -0.045 ? BRIGHT : 0.85
    }
  }
  return -1
}

/** A knight: a plumed helm, a shield with a cross, a bright sword up. */
const knight: Sprite = (dx, y, cell) => {
  if (line(dx, y, 0.11, -0.28, 0.19, -0.42, 0.009, cell)) return BRIGHT
  if (line(dx, y, 0.085, -0.305, 0.135, -0.255, 0.008, cell)) return 1
  if (line(dx, y, 0.07, -0.23, 0.105, -0.275, 0.013, cell)) return 0.85
  if (line(dx, y, 0, -0.36, -0.05, -0.41, 0.012, cell)) return 0.85
  if (box(dx, y, -0.05, 0.05, -0.36, -0.27)) {
    if (y > -0.33 && y < -0.315 && Math.abs(dx) < 0.04)
      return Math.abs(dx - 0.015) < 0.012 ? BRIGHT : 0
    return lit(dx, y, 0, -0.31, 0.05)
  }
  const sx = dx + 0.11
  const shield =
    box(dx, y, -0.16, -0.06, -0.25, -0.14) ||
    (y >= -0.14 && y < -0.08 && Math.abs(sx) < 0.05 * ((-0.08 - y) / 0.06))
  if (shield) return Math.abs(sx) < 0.008 || Math.abs(y + 0.19) < 0.008 ? 0 : 0.9
  if (box(dx, y, -0.07, 0.07, -0.27, -0.12)) {
    if (y > -0.155 && y < -0.14) return 0
    return lit(dx, y, 0, -0.2, 0.07)
  }
  if (box(Math.abs(dx), y, 0.015, 0.055, -0.12, 0)) return y > -0.02 ? 1 : 0.85
  return -1
}

/** A PC tower: drive bays, a floppy slot, two lights for eyes, vents. */
const pc: Sprite = (dx, y, cell) => {
  const ax = Math.abs(dx)
  if (box(dx, y, -0.08, 0.08, -0.38, -0.05)) {
    if (ax > 0.068 || y < -0.368 || y > -0.062) return 1
    for (const top of [-0.345, -0.305]) {
      if (box(dx, y, -0.055, 0.055, top, top + 0.032)) {
        return Math.abs(y - top - 0.016) < Math.max(0.004, cell * 0.5) && ax < 0.035 ? 1 : 0.2
      }
    }
    if (y > -0.245 && y < -0.232 && ax < 0.04) return 0
    if (disc(ax, y, 0.03, -0.195, 0.011)) return BRIGHT
    if (y > -0.15 && y < -0.075 && ax < 0.05 && Math.sin(y * 250) > 0.3) return 0
    return lit(dx, y, 0, -0.2, 0.08)
  }
  if (line(ax, y, 0.08, -0.2, 0.125, -0.13, 0.009, cell)) return 0.85
  if (box(ax, y, 0.035, 0.07, -0.05, 0)) return 0.85
  return -1
}

/** A bird: a round body, a beak, a raised tail, an antenna on its head. */
const bird: Sprite = (dx, y, cell) => {
  if (disc(dx, y, 0.075, -0.2, 0.011)) return BRIGHT
  if (disc(dx, y, 0.03, -0.285, 0.011)) return BRIGHT
  if (line(dx, y, 0.05, -0.235, 0.032, -0.28, 0.005, cell)) return 1
  if (dx >= 0.098 && dx < 0.15 && Math.abs(y + 0.185) < (0.15 - dx) * 0.4) return 1
  if (disc(dx, y, 0.06, -0.19, 0.045)) return lit(dx, y, 0.06, -0.19, 0.045)
  const wing = ((dx + 0.01) / 0.055) ** 2 + ((y + 0.12) / 0.032) ** 2
  if (wing < 1) return wing > 0.6 ? 1 : 0.35
  if ((dx / 0.085) ** 2 + ((y + 0.12) / 0.07) ** 2 < 1) return lit(dx, y, 0, -0.12, 0.08)
  if (line(dx, y, -0.07, -0.13, -0.15, -0.19, 0.018, cell)) return 0.85
  for (const lx of [-0.02, 0.025]) {
    if (line(dx, y, lx, -0.055, lx, -0.01, 0.005, cell)) return 1
    if (box(dx, y, lx - 0.012, lx + 0.02, -0.01, 0)) return 1
  }
  return -1
}

/** A cat sitting: pointed ears, slit eyes, whiskers, a curled tail. */
const cat: Sprite = (dx, y, cell) => {
  const ax = Math.abs(dx)
  if (disc(ax, y, 0.03, -0.21, 0.013)) return BRIGHT
  if (disc(dx, y, 0, -0.183, 0.008)) return 0
  if (line(ax, y, 0.045, -0.18, 0.11, -0.19, 0.004, cell)) return 1
  if (line(ax, y, 0.045, -0.17, 0.11, -0.155, 0.004, cell)) return 1
  if (inTriangle(ax, y, 0.015, -0.25, 0.07, -0.23, 0.058, -0.31)) return 0.9
  if (disc(dx, y, 0, -0.2, 0.07)) return lit(dx, y, 0, -0.2, 0.07)
  if (box(ax, y, 0.02, 0.05, -0.02, 0)) return 1
  if ((dx / 0.09) ** 2 + ((y + 0.07) / 0.08) ** 2 < 1 && y < 0) return lit(dx, y, 0, -0.07, 0.09)
  const tail = Math.hypot(dx - 0.12, y + 0.07)
  if (tail > 0.042 && tail < 0.058 && (y < -0.07 || dx < 0.12)) return 0.85
  return -1
}

/** A floppy disk on legs: a bright shutter, a face on its label, one arm up. */
const floppy: Sprite = (dx, y, cell) => {
  if (box(dx, y, -0.1, 0.1, -0.33, -0.1) && !(dx > 0.07 && y < -0.33 + (dx - 0.07))) {
    if (box(dx, y, 0.02, 0.04, -0.32, -0.28)) return 0
    if (box(dx, y, -0.05, 0.06, -0.33, -0.265)) return BRIGHT
    if (box(dx, y, -0.07, 0.07, -0.215, -0.12)) {
      if (disc(Math.abs(dx), y, 0.03, -0.185, 0.011)) return BRIGHT
      const smile = Math.hypot(dx, y + 0.175)
      if (smile > 0.028 && smile < 0.038 && y > -0.155) return BRIGHT
      return 0.15
    }
    if (Math.abs(dx) > 0.088 || y > -0.112) return 1
    return lit(dx, y, 0, -0.22, 0.1)
  }
  if (disc(dx, y, 0.15, -0.28, 0.017)) return 1
  if (line(dx, y, 0.1, -0.2, 0.145, -0.27, 0.009, cell)) return 0.85
  if (line(dx, y, -0.1, -0.2, -0.14, -0.13, 0.009, cell)) return 0.85
  for (const s of [-1, 1]) {
    if (line(dx, y, s * 0.04, -0.1, s * 0.05, -0.015, 0.009, cell)) return 0.85
    if (box(dx, y, s * 0.05 - 0.02, s * 0.05 + 0.02, -0.015, 0)) return 1
  }
  return -1
}

/** An 8086 walking on its pins, its notch at the back, two eyes up front. */
const chipbug: Sprite = (dx, y, cell) => {
  // The eyes stand up off its front, antennae over them.
  if (disc(dx, y, 0.085, -0.178, 0.017) || disc(dx, y, 0.118, -0.172, 0.015)) return BRIGHT
  if (disc(dx, y, 0.085, -0.178, 0.026) || disc(dx, y, 0.118, -0.172, 0.023)) return 1
  if (disc(dx, y, 0.05, -0.265, 0.011) || disc(dx, y, 0.155, -0.255, 0.011)) return BRIGHT
  if (line(dx, y, 0.08, -0.2, 0.05, -0.255, 0.005, cell)) return 1
  if (line(dx, y, 0.12, -0.195, 0.152, -0.245, 0.005, cell)) return 1
  if (box(dx, y, -0.13, 0.13, -0.165, -0.085)) {
    if (disc(dx, y, -0.13, -0.125, 0.02)) return 0
    if (disc(dx, y, -0.1, -0.1, 0.008)) return 0.1
    if (y < -0.155) return 1
    if (y > -0.12 && y < -0.11 && Math.abs(dx + 0.01) < 0.06) return 0.2
    return lit(dx, y, 0, -0.125, 0.13)
  }
  for (let i = 0; i < 5; i++) {
    const px = -0.1 + i * 0.05
    const foot = px + (i % 2 === 0 ? -0.018 : 0.018)
    if (line(dx, y, px, -0.085, foot, -0.012, 0.008, cell)) return 1
    if (box(dx, y, foot - 0.013, foot + 0.013, -0.012, 0)) return 1
  }
  return -1
}

/** Every bot, by name. The podium's three come first. */
export const BOTS = {
  champion,
  dome,
  tank,
  spider,
  walker,
  drone,
  crab,
  tv,
  dog,
  worm,
  imp,
  rocket,
  unicycle,
  cyclops,
  radar,
  brute,
  owl,
  jelly,
  knight,
  pc,
  bird,
  cat,
  floppy,
  chipbug,
} as const satisfies Record<string, Sprite>

export type BotName = keyof typeof BOTS

export const BOT_NAMES = Object.keys(BOTS) as readonly BotName[]
