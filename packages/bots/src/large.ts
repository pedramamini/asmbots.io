/**
 * The roster's bots past lightweight (over 512 bytes), loaded on demand. Their images and sources
 * are most of the roster's bytes, and a page that lists the roster has no budget for them: its
 * route loads them first (`loadLargeImages`, `loadLargeSources`), and `rosterImage` and
 * `rosterSource` read them from here once they have loaded. No static imports of the data, so a
 * route can take the loaders without it. `loadRoster` (the CLI, the API, the tests) takes them at
 * once (`addLargeRoster`).
 */
import type { RosterImageData } from './images.gen'

let images: Readonly<Record<string, RosterImageData>> | undefined
let sources: Readonly<Record<string, string>> | undefined

/** The images of the bots past lightweight, as a chunk of their own. */
export async function loadLargeImages(): Promise<void> {
  images ??= (await import('./images-large.gen')).LARGE_IMAGE_DATA
}

/** The sources of the bots past lightweight, as a chunk of their own. */
export async function loadLargeSources(): Promise<void> {
  sources ??= (await import('./sources-large')).LARGE_SOURCES
}

/** Takes the bots past lightweight at once, for a caller that imports them itself. */
export function addLargeRoster(
  large: Readonly<Record<string, RosterImageData>>,
  text: Readonly<Record<string, string>>,
): void {
  images ??= large
  sources ??= text
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
