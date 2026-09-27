import { afterAll, describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LARGE_SOURCES } from '../packages/bots/src/sources-large'
import { IMAGE_FILES, imageSlugs, imagesModule, literal, rosterImages } from './roster-images'

const DIR = mkdtempSync(join(tmpdir(), 'asmbots-roster-images-'))
afterAll(() => rmSync(DIR, { recursive: true, force: true }))

describe('roster-images: the file', () => {
  it('is what the generator writes: run `bun run roster-images` after changing a roster bot', () => {
    expect(readFileSync(IMAGE_FILES.light, 'utf8')).toBe(imagesModule('light'))
    expect(readFileSync(IMAGE_FILES.large, 'utf8')).toBe(imagesModule('large'))
  })

  it('says so from the command line with --check', () => {
    const run = Bun.spawnSync(['bun', 'scripts/roster-images.ts', '--check'], {
      cwd: `${import.meta.dir}/..`,
    })
    expect(run.stdout.toString()).toBe(
      'packages/bots/src/images.gen.ts is up to date\n' +
        'packages/bots/src/images-large.gen.ts is up to date\n',
    )
    expect(run.exitCode).toBe(0)
  })

  it('puts the bots past lightweight in a module of their own', () => {
    expect(imageSlugs('large').sort()).toEqual(Object.keys(LARGE_SOURCES).sort())
    expect(imageSlugs('large')).toContain('bastion')
    expect(imageSlugs('light')).toContain('imp')
    expect(imageSlugs('light')).not.toContain('bastion')
  })
})

describe('roster-images: check and write', () => {
  it('finds a stale file, names the fix, and leaves it', () => {
    const files = { light: join(DIR, 'stale.ts'), large: join(DIR, 'stale-large.ts') }
    writeFileSync(files.light, 'export const ROSTER_IMAGE_DATA = {}\n')
    writeFileSync(files.large, imagesModule('large'))
    const lines: string[] = []
    expect(rosterImages(true, (line) => lines.push(line), files)).toBe(1)
    expect(lines).toEqual([
      expect.stringContaining('stale.ts is stale: run `bun run roster-images`'),
      expect.stringContaining('stale-large.ts is up to date'),
    ])
    expect(readFileSync(files.light, 'utf8')).toBe('export const ROSTER_IMAGE_DATA = {}\n')
  })

  it('writes the modules, which a check then passes', () => {
    const files = { light: join(DIR, 'fresh.ts'), large: join(DIR, 'fresh-large.ts') }
    const lines: string[] = []
    expect(rosterImages(false, (line) => lines.push(line), files)).toBe(0)
    expect(lines).toEqual([
      expect.stringMatching(/fresh\.ts: 22 bots$/),
      expect.stringMatching(/fresh-large\.ts: 30 bots$/),
    ])
    expect(readFileSync(files.light, 'utf8')).toBe(imagesModule('light'))
    expect(readFileSync(files.large, 'utf8')).toBe(imagesModule('large'))
    expect(rosterImages(true, () => {}, files)).toBe(0)
  })

  it('rejects any other argument', () => {
    const run = Bun.spawnSync(['bun', 'scripts/roster-images.ts', '--update'], {
      cwd: `${import.meta.dir}/..`,
    })
    expect(run.stderr.toString()).toContain('usage: bun run roster-images [--check]')
    expect(run.exitCode).toBe(2)
  })
})

describe('roster-images: literals', () => {
  it('quotes as Biome does: single quotes, unless the text holds more of them', () => {
    expect(literal('Imp')).toBe("'Imp'")
    expect(literal("the dwarf's bombs")).toBe(`"the dwarf's bombs"`)
    expect(literal(`say "hi" and 'bye'`)).toBe(`'say "hi" and \\'bye\\''`)
    expect(literal('a\\b')).toBe("'a\\\\b'")
  })

  it('reads back as the text it quotes, in a module as the generated one is', async () => {
    const texts = ['Imp', "it's", `"quoted" 'both'`, 'back\\slash', '6AAAW4Pr+/==']
    const file = join(DIR, 'literals.ts')
    writeFileSync(file, `export default [${texts.map(literal).join(', ')}]\n`)
    expect((await import(file)).default).toEqual(texts)
  })
})
