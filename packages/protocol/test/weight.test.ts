/**
 * `weight.ts`: the weight classes, and which class a bot's size or a band of sizes falls in.
 */
import { describe, expect, it } from 'bun:test'
import {
  classOfRange,
  MAX_BOT_BYTES_ALL,
  MELEE_MAX_BOT_BYTES,
  OPEN_WEIGHT,
  WEIGHT_CLASSES,
  weightClassOf,
} from '../src/index'

describe('weightClassOf', () => {
  it.each([
    [0, null],
    [1, 'lightweight'],
    [512, 'lightweight'],
    [513, 'middleweight'],
    [1024, 'middleweight'],
    [1025, 'heavyweight'],
    [2048, 'heavyweight'],
    [2049, 'super-heavy'],
    [4096, 'super-heavy'],
    [4097, null],
  ] as const)('puts a %i-byte bot in %p', (size, slug) => {
    expect(weightClassOf(size)?.slug ?? null).toBe(slug)
  })
})

describe('WEIGHT_CLASSES', () => {
  it('runs lightest first, with bands that touch and end at the absolute cap', () => {
    expect(WEIGHT_CLASSES[0].min).toBe(1)
    for (let i = 1; i < WEIGHT_CLASSES.length; i++) {
      expect(WEIGHT_CLASSES[i].min).toBe(WEIGHT_CLASSES[i - 1].max + 1)
    }
    expect(WEIGHT_CLASSES.at(-1)?.max).toBe(MAX_BOT_BYTES_ALL)
  })

  it('lets only the two lightest classes melee', () => {
    expect(WEIGHT_CLASSES.filter((c) => c.melee).map((c) => c.slug)).toEqual([
      'lightweight',
      'middleweight',
    ])
    expect(OPEN_WEIGHT.melee).toBe(false)
    const tops = WEIGHT_CLASSES.filter((c) => c.melee).map((c) => c.max)
    expect(MELEE_MAX_BOT_BYTES).toBe(Math.max(...tops))
  })
})

describe('classOfRange', () => {
  it.each(WEIGHT_CLASSES.map((c) => [c.slug, c] as const))('names %s by its bounds', (_, c) => {
    expect(classOfRange(c.min, c.max)).toBe(c)
  })

  it('names the whole range open weight', () => {
    expect(classOfRange(1, 4096)).toBe(OPEN_WEIGHT)
  })

  it('names no class for any other band', () => {
    expect(classOfRange(1, 256)).toBeNull()
    expect(classOfRange(1, 1024)).toBeNull()
    expect(classOfRange(513, 2048)).toBeNull()
  })
})
