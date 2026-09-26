import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type AssembleOptions, assemble } from '../src/assemble'
import type { Diag } from '../src/diag'
import { lint } from '../src/lint'
import { asmFiles, expectFixture } from './fixture'

/*
 * Fixtures: `fixtures/lint/<name>.asm` assembles without errors and lints to the warnings in
 * `<name>.json`. After a deliberate change, regenerate with `UPDATE_FIXTURES=1 bun test
 * packages/asm` and review the diff.
 */
const LINT = join(import.meta.dir, 'fixtures', 'lint')

/** The warnings for `source`, assembled with the same options. */
const warnings = (source: string, opts?: AssembleOptions) =>
  lint(source, assemble(source, opts), opts)

/** Warnings as `line:col+len code`, the way an editor would place them. */
const where = (d: Diag) => `${d.line}:${d.col}+${d.len} ${d.code}`

/** A bot around `code`: named, with a strategy, so only the rule under test speaks. */
const bot = (code: string) => `%name "t"\n%strategy "s"\n${code}`

/** The warnings for `bot(code)`, placed; line 3 is the first line of `code`. */
const places = (code: string, opts?: AssembleOptions) => warnings(bot(code), opts).map(where)

describe('lint: fixtures', () => {
  for (const name of asmFiles(LINT)) {
    it(`lints ${name} to ${name.replace('.asm', '.json')}`, () => {
      const source = readFileSync(join(LINT, name), 'utf8')
      const assembled = assemble(source)
      expect(assembled.diagnostics).toEqual([])
      expectFixture(join(LINT, name.replace('.asm', '.json')), lint(source, assembled))
    })
  }

  it('gives every warning a fix, in source order', () => {
    const all = asmFiles(LINT).flatMap((name) => {
      const source = readFileSync(join(LINT, name), 'utf8')
      const found = lint(source, assemble(source))
      const order = found.map((d) => d.line * 10_000 + d.col)
      expect(order).toEqual([...order].sort((a, b) => a - b))
      return found
    })
    expect(new Set(all.map((d) => d.code))).toEqual(
      new Set([
        'absolute-address',
        'unreachable',
        'dat-in-code',
        'size-near-cap',
        'no-strategy',
        'hlt-in-code',
        'uninitialized-di',
      ]),
    )
    for (const d of all) {
      expect(d.severity).toBe('warning')
      expect(d.fix?.length ?? 0).toBeGreaterThan(10)
    }
  })

  it('sorts the warnings of all rules by line and column', () => {
    expect(places('nop\ndat\nx: mov ax, [x]\nhlt')).toEqual([
      '4:1+3 dat-in-code',
      '5:12+3 absolute-address',
      '6:1+3 hlt-in-code',
    ])
  })

  it('finds nothing in the ISA §6 dwarf', () => {
    const dwarf = readFileSync(join(import.meta.dir, 'fixtures', 'parse', 'dwarf.asm'), 'utf8')
    expect(warnings(dwarf)).toEqual([])
  })
})

describe('lint: absolute-address', () => {
  it('suggests the address with bx in front', () => {
    const fixes = warnings(bot('mov ax, [bomb]\nmov ax, [word -2]\njmp $\nbomb: dat')).map(
      (d) => d.fix,
    )
    expect(fixes).toEqual([
      expect.stringContaining('`[bx+bomb]`'),
      expect.stringContaining('`[bx-2]`'),
    ])
  })

  it('points at a macro that holds the address, and names no address in the fix', () => {
    const found = warnings(bot('%define PTR [bomb]\nmov ax, PTR\njmp $\nbomb: dat'))
    expect(found.map(where)).toEqual(['4:9+3 absolute-address'])
    expect(found[0]?.fix).toContain('`[bx+label]`')
  })
})

describe('lint: control flow', () => {
  it('warns on a hlt that is the first instruction', () => {
    expect(places('hlt')).toEqual(['3:1+3 hlt-in-code'])
    expect(places('x: db 1\nhlt')).toEqual([])
  })

  it('counts times as the instruction it repeats, unless it repeats nothing', () => {
    expect(places('start: nop\ntimes 2 jmp start\nnop')).toEqual(['5:1+3 unreachable'])
    expect(places('start: nop\ntimes 0 jmp start\nnop\njmp start')).toEqual([])
    expect(places('start: nop\ntimes 0 dat\njmp start')).toEqual([])
  })

  it('does not take an equ name for a label that code can jump to', () => {
    expect(places('start: jmp start\nk equ 4\nnop')).toEqual(['5:1+3 unreachable'])
  })

  it('does not say that dead code falls into DAT or hlt', () => {
    expect(places('start: jmp start\nnop\nx: dat\ny: hlt')).toEqual(['4:1+3 unreachable'])
  })

  it('reads a bot with errors, without its listing', () => {
    // No listing: `align` is taken to emit nothing, and the size is not known.
    expect(places('mov ax, nowhere\nmov ax, [bomb]\nnop\nalign 4\ndat\nbomb: dat')).toEqual([
      '4:9+6 absolute-address',
      '7:1+3 dat-in-code',
    ])
  })
})

describe('lint: uninitialized-di', () => {
  it('stops at the first line that writes di, in any form', () => {
    for (const set of [
      'mov di, 0',
      'lea di, [bx]',
      'pop di',
      'xchg di, ax',
      'inc di',
      'sal di, 1',
    ]) {
      expect({ set, found: places(`${set}\nstosb`) }).toEqual({ set, found: [] })
    }
    for (const read of ['cmp di, 0', 'test di, di', 'push di', 'mov ax, di', 'mov [di], ax']) {
      expect({ read, found: places(`${read}\nstosb`) }).toEqual({
        read,
        found: ['4:1+5 uninitialized-di'],
      })
    }
  })
})

describe('lint: size-near-cap', () => {
  const size = (n: number) => `times ${n - 2} nop\njmp $`

  it('warns from 90% of the limit up to the limit, at the line that gets there', () => {
    const cap = { maxBytes: 512 }
    expect(places(size(460), cap)).toEqual([])
    expect(places(size(461), cap)).toEqual(['4:1+5 size-near-cap'])
    expect(places(size(512), cap)).toEqual(['3:1+13 size-near-cap'])
    expect(places(size(513), cap)).toEqual([])
    expect(warnings(bot(size(461)), cap)[0]?.message).toBe(
      'the bot is 461 bytes, 90% of the limit of 512 (51 left); it reaches 90% on this line',
    )
  })

  it('with no limit given, warns within 10% under the top of each weight class', () => {
    for (const top of [512, 1024, 2048, 4096]) {
      const from = Math.ceil((top * 9) / 10)
      expect(places(size(from - 1))).toEqual([])
      expect(places(size(from))).toEqual(['4:1+5 size-near-cap'])
      expect(places(size(top))).toEqual([`3:1+${`times ${top - 2} nop`.length} size-near-cap`])
    }
    expect(places(size(513))).toEqual([])
    expect(places(size(1025))).toEqual([])
    const light = warnings(bot(size(470)))[0]
    expect(light?.message).toBe(
      'the bot is 470 bytes, 42 under the lightweight limit of 512; it reaches 90% on this line',
    )
    expect(light?.fix).toEndWith('; past 512 bytes it is a middleweight')
    expect(warnings(bot(size(2000)))[0]?.message).toBe(
      'the bot is 2000 bytes, 48 under the heavyweight limit of 2048; it reaches 90% on this line',
    )
    const heaviest = warnings(bot(size(4096)))[0]
    expect(heaviest?.message).toBe(
      'the bot is 4096 bytes, 0 under the super-heavy limit of 4096; it reaches 90% on this line',
    )
    expect(heaviest?.fix).toEndWith('less data')
  })

  it('reads the limit from the options', () => {
    expect(places('times 90 nop', { maxBytes: 100 })).toEqual(['3:1+12 size-near-cap'])
    expect(places('times 89 nop', { maxBytes: 100 })).toEqual([])
    expect(places('', { maxBytes: 0 })).toEqual([])
    // Assembled under a larger limit than the lint's: over it, which is not "near" it.
    const big = bot('times 600 nop')
    expect(lint(big, assemble(big, { maxBytes: 1000 }), { maxBytes: 512 })).toEqual([])
    expect(() => lint('nop', assemble('nop'), { maxBytes: 1.5 })).toThrow(RangeError)
  })
})

describe('lint: no-strategy', () => {
  it('warns at an empty %strategy, and not at one the parser rejected', () => {
    expect(warnings('%name "t"\n%strategy "  "').map(where)).toEqual(['2:11+4 no-strategy'])
    expect(warnings('%name "t"\n%strategy t').map(where)).toEqual([])
  })

  it('warns at line 1 when there is no %name either', () => {
    expect(warnings('nop').map(where)).toEqual(['1:1+0 no-strategy'])
  })
})
