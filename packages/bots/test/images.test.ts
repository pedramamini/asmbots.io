import { describe, expect, it } from 'bun:test'
import { ROSTER_IMAGE_DATA } from '../src/images.gen'
import { LARGE_IMAGE_DATA } from '../src/images-large.gen'
import {
  hasRosterImage,
  largeImagesLoaded,
  loadLargeImages,
  loadLargeSources,
  loadRoster,
  ROSTER,
  rosterImage,
  rosterSource,
} from '../src/index'
import { SOURCES_LIGHT } from '../src/sources'
import { LARGE_SOURCES } from '../src/sources-large'

/** The roster bot of `slug`, assembled from its source. */
function assembled(slug: string) {
  const bot = loadRoster().get(slug)
  if (bot === undefined) throw new Error(`loadRoster has no bot '${slug}'`)
  return bot
}

describe('roster images', () => {
  it('hold every roster bot and no other', () => {
    expect(Object.keys({ ...ROSTER_IMAGE_DATA, ...LARGE_IMAGE_DATA }).sort()).toEqual(
      ROSTER.map((e) => e.slug).sort(),
    )
  })

  it('keep the bots past lightweight apart, and so do the sources', () => {
    for (const { slug } of ROSTER) {
      const large = assembled(slug).assembled.bytes.length > 512
      expect({ slug, image: slug in LARGE_IMAGE_DATA }).toEqual({ slug, image: large })
      expect({ slug, source: slug in LARGE_SOURCES }).toEqual({ slug, source: large })
      expect({ slug, source: slug in SOURCES_LIGHT }).toEqual({ slug, source: !large })
    }
  })

  it('have every bot once loadRoster has run, and the loaders resolve', async () => {
    await Promise.all([loadLargeImages(), loadLargeSources()])
    expect(largeImagesLoaded()).toBe(true)
    expect(hasRosterImage('citadel')).toBe(true)
    expect(hasRosterImage('nobody')).toBe(false)
    expect(rosterImage('citadel').bytes.length).toBeGreaterThan(2048)
    expect(rosterSource('citadel')).toBe(LARGE_SOURCES.citadel as string)
  })

  for (const { slug } of ROSTER) {
    it(`${slug}: is what its source assembles to (else run \`bun run roster-images\`)`, () => {
      const { name, author, strategy, version, bytes } = assembled(slug).assembled
      const image = rosterImage(slug)
      expect({ ...image, bytes: [...image.bytes] }).toEqual({
        name,
        author,
        strategy,
        version,
        bytes: [...bytes],
      })
    })
  }

  it('decodes a bot once and shares it', () => {
    expect(rosterImage('dwarf')).toBe(rosterImage('dwarf'))
    expect(rosterImage('dwarf').bytes).toBeInstanceOf(Uint8Array)
  })

  it('throws for a slug the roster does not have', () => {
    expect(() => rosterImage('nobody')).toThrow(
      "the roster has no bot 'nobody' (one past 512 B needs loadLargeImages)",
    )
  })
})

describe('roster sources', () => {
  it('are the texts loadRoster assembles', () => {
    for (const { slug } of ROSTER) expect(rosterSource(slug)).toBe(assembled(slug).source)
  })

  it('throw for a slug the roster does not have', () => {
    expect(() => rosterSource('nobody')).toThrow(
      "the roster has no bot 'nobody' (one past 512 B needs loadLargeSources)",
    )
  })
})
