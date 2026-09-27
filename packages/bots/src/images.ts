/**
 * The roster, prebuilt: each bot's machine code and metadata as `bun run roster-images` wrote them
 * from its assembly (`images.gen.ts`, and `images-large.gen.ts` for the bots past lightweight,
 * which load on demand: `large.ts`). A page that fights the roster reads these, and loads neither
 * the assembler nor the sources; `test/images.test.ts` keeps them what `loadRoster` assembles.
 */
import { ROSTER_IMAGE_DATA } from './images.gen'
import { largeImage } from './large'

/** What a roster bot assembles to: its `%name`, `%author`, `%strategy`, `%version`, and bytes. */
export interface RosterImage {
  readonly name: string
  readonly author: string
  readonly strategy: string
  readonly version: string
  readonly bytes: Uint8Array
}

const decoded = new Map<string, RosterImage>()

/**
 * Roster bot `slug`'s image, decoded on the first call and shared after it, so do not change what
 * it holds. Throws for a slug the roster does not have, and for a bot past lightweight before
 * `loadLargeImages`.
 */
export function rosterImage(slug: string): RosterImage {
  let image = decoded.get(slug)
  if (image === undefined) {
    const data = ROSTER_IMAGE_DATA[slug] ?? largeImage(slug)
    if (data === undefined) {
      throw new Error(`the roster has no bot '${slug}' (one past 512 B needs loadLargeImages)`)
    }
    image = { ...data, bytes: Uint8Array.from(atob(data.bytes), (c) => c.charCodeAt(0)) }
    decoded.set(slug, image)
  }
  return image
}

/** Whether roster bot `slug`'s image is here: a bot past lightweight's is after `loadLargeImages`. */
export function hasRosterImage(slug: string): boolean {
  return ROSTER_IMAGE_DATA[slug] !== undefined || largeImage(slug) !== undefined
}
