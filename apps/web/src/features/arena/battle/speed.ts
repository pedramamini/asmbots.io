/**
 * The arena's speed (PRODUCT_SPEC §2): cycles per frame from 0.01 to 10,000 on a log slider, then
 * `max`. `[` and `]` step along a 1-2-5 ladder. Below 1 a frame runs a share of a cycle, to watch
 * one instruction at a time.
 */
import { MAX_CYCLES_PER_FRAME, MIN_CYCLES_PER_FRAME, type Speed } from '../worker/protocol'

/** The speeds `[` and `]` step through, slowest first. */
export const SPEED_STEPS: readonly Speed[] = [
  MIN_CYCLES_PER_FRAME,
  0.02,
  0.05,
  0.1,
  0.2,
  0.5,
  1,
  2,
  5,
  10,
  20,
  50,
  100,
  200,
  500,
  1000,
  2000,
  5000,
  MAX_CYCLES_PER_FRAME,
  'max',
]

/** A speed as the ladder ranks it: `max` past every count. */
function rank(speed: Speed): number {
  return speed === 'max' ? Number.POSITIVE_INFINITY : speed
}

/** The next speed up the ladder: `]`. `max` stays `max`. */
export function faster(speed: Speed): Speed {
  return SPEED_STEPS.find((step) => rank(step) > rank(speed)) ?? 'max'
}

/** The next speed down the ladder: `[`. The slowest stays the slowest. */
export function slower(speed: Speed): Speed {
  return [...SPEED_STEPS].reverse().find((step) => rank(step) < rank(speed)) ?? MIN_CYCLES_PER_FRAME
}

/**
 * A speed slider's value as a speed the Worker takes: whole from 1 up, hundredths below. The
 * slider's own grain is the hundredth, so a count past 1 comes out as 137.42.
 */
export function speedOf(value: number): number {
  return value < 1 ? value : Math.round(value)
}

/** A speed as the HUD shows it: `240/f`, `0.05/f`, or `max`. */
export function speedLabel(speed: Speed): string {
  return speed === 'max' ? 'max' : `${speed.toLocaleString('en-US')}/f`
}

/** The speed slider's range and readout: the transport's, and the config's starting speed. */
export const SPEED_SLIDER = {
  min: MIN_CYCLES_PER_FRAME,
  max: MAX_CYCLES_PER_FRAME,
  step: MIN_CYCLES_PER_FRAME,
  scale: 'log',
  format: (value: number) => speedLabel(speedOf(value)),
} as const
