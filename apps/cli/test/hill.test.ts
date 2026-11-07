/**
 * `asmbots hill submit` on a local hill file: the file keeps each entry's machine code, so the
 * second challenger fights the first one's real code (not a stub the engine refuses).
 */
import { afterEach, beforeEach, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fighter } from '@asmbots/bots'
import { toBase64 } from '@asmbots/protocol'

const MAIN = join(import.meta.dir, '../src/main.ts')
let dir = ''

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'asmbots-hill-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function submit(file: string, bot: string) {
  const run = Bun.spawnSync(['bun', MAIN, 'hill', 'submit', file, bot, '--no-color'])
  return { code: run.exitCode, out: run.stdout.toString(), err: run.stderr.toString() }
}

it('keeps each entry’s machine code, and fights it on the next submit', () => {
  const file = join(dir, 'hill.json')
  expect(submit(file, 'roster:dwarf')).toMatchObject({ code: 0, err: '' })
  const first = JSON.parse(readFileSync(file, 'utf8'))
  expect(first.entries).toHaveLength(1)
  expect(Object.values(first.bots)).toEqual([toBase64(fighter('dwarf').bytes)])

  const second = submit(file, 'roster:imp')
  expect(second).toMatchObject({ code: 0, err: '' })
  const hill = JSON.parse(readFileSync(file, 'utf8'))
  expect(hill.entries).toHaveLength(2)
  expect(hill.matches).toHaveLength(1)
  expect(Object.keys(hill.bots).sort()).toEqual(
    hill.entries.map((e: { id: string }) => e.id).sort(),
  )
})

it('says so when the hill file has no machine code for an entry', () => {
  const file = join(dir, 'hill.json')
  expect(submit(file, 'roster:dwarf').code).toBe(0)
  const hill = JSON.parse(readFileSync(file, 'utf8'))
  delete hill.bots
  Bun.write(file, JSON.stringify(hill))
  const run = submit(file, 'roster:imp')
  expect(run.code).toBe(3)
  expect(run.err).toContain('has no machine code for entry')
})
