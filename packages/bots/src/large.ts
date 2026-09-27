/**
 * The roster's bots past lightweight (over 512 bytes), loaded on demand. Their images, entries, and
 * sources are most of the roster's bytes, and a page that lists the roster has no budget for them:
 * its route loads them first (`loadLargeImages`, `loadLargeSources`), and `rosterImage`,
 * `rosterEntries`, and `rosterSource` read them from here once they have loaded. No static imports of the data, so a
 * route can take the loaders without it. `loadRoster` (the CLI, the API, the tests) takes them at
 * once (`addLargeRoster`).
 */
import { ROSTER_LIGHT, type RosterEntry } from './entries'
import type { RosterImageData } from './images.gen'

let images: Readonly<Record<string, RosterImageData>> | undefined
let sources: Readonly<Record<string, string>> | undefined
let entries: readonly RosterEntry[] | undefined

/** The images and the entries of the bots past lightweight, as chunks of their own. */
export async function loadLargeImages(): Promise<void> {
  if (images !== undefined) return
  const [data, rows] = await Promise.all([import('./images-large.gen'), import('./entries-large')])
  // The entries first: a bot with an image has its entry.
  entries ??= rows.ROSTER_LARGE
  images ??= data.LARGE_IMAGE_DATA
}

/** The sources of the bots past lightweight, as a chunk of their own. */
export async function loadLargeSources(): Promise<void> {
  sources ??= (await import('./sources-large')).LARGE_SOURCES
}

/** Takes the bots past lightweight at once, for a caller that imports them itself. */
export function addLargeRoster(
  large: Readonly<Record<string, RosterImageData>>,
  text: Readonly<Record<string, string>>,
  rows: readonly RosterEntry[],
): void {
  entries ??= rows
  images ??= large
  sources ??= text
}

/** The roster's entries: the lightweight bots and the test bots, and the others once loaded. */
export function rosterEntries(): readonly RosterEntry[] {
  return entries === undefined ? ROSTER_LIGHT : [...ROSTER_LIGHT, ...entries]
}

/** Whether the images of the bots past lightweight have loaded. */
export function largeImagesLoaded(): boolean {
  return images !== undefined
}

/** A bot's image past lightweight, once loaded. */
export function largeImage(slug: string): RosterImageData | undefined {
  return images?.[slug]
}

/** A bot's source past lightweight, once loaded. */
export function largeSource(slug: string): string | undefined {
  return sources?.[slug]
}
