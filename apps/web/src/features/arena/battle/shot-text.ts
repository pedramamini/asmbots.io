/**
 * The words a screenshot or a video frame writes on the arena, apart from the painter
 * (`screenshot.ts`), which loads on the first screenshot or video: the battle builds the words on
 * each frame, and the arena's cold chunks do not take the painter.
 */

/** What the screenshot writes on the arena. */
export interface ScreenshotText {
  /** Top left, one chip each: `cycle 3,527 / 100,000`, `100/f`. */
  readonly chips: readonly string[]
  /** Top right: `ASM BOTS · seed 1 · round 1/3`. */
  readonly title: string
  /** Under the arena: the bots' names, each beside its hue. */
  readonly bots: readonly string[]
  /** The footer stamp, left: the bots, the seed, and the cycle (`footerStamp`). */
  readonly stamp: FooterStamp
  /** The footer stamp, right: the site, `asmbots.io`. */
  readonly site: string
}

/** The footer stamp's words: the bots by name, and by count for when the names do not fit. */
export interface FooterStamp {
  readonly full: string
  readonly short: string
}

const count = (n: number) => n.toLocaleString('en-US')

/** `dwarf vs imp · seed 1 · cycle 3,527`, and `2 bots · seed 1 · cycle 3,527`. */
export function footerStamp(bots: readonly string[], seed: number, cycle: number): FooterStamp {
  const rest = `seed ${seed} · cycle ${count(cycle)}`
  return {
    full: `${bots.join(' vs ')} · ${rest}`,
    short: `${bots.length} ${bots.length === 1 ? 'bot' : 'bots'} · ${rest}`,
  }
}
