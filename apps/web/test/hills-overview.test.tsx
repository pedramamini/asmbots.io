/**
 * The `/hills` page's drawings: a hill's standings as a mountain, what a challenge costs, and the
 * board of the challenge diagram at each step.
 */
import { describe, expect, it } from 'bun:test'
import { boardRows } from '../src/features/hills/ChallengeDiagram'
import { mountainOrder } from '../src/features/hills/HillCard'
import { challengeCost, cycles } from '../src/features/hills/HillsLower'
import { HILLS } from './fixtures/api'

describe('mountainOrder', () => {
  it('puts the king in the middle, then the ranks outward, the empty places at the edges', () => {
    expect(mountainOrder([9, 8, 7, 6], 7)).toEqual([null, 6, 8, 9, 7, null, null])
    expect(mountainOrder([], 3)).toEqual([null, null, null])
  })

  it('gives a hill over its size a column for each entry', () => {
    expect(mountainOrder([3, 2, 1], 2)).toEqual([2, 3, 1])
  })
})

describe('challengeCost', () => {
  it('counts a match per entry and the cycles they may take', () => {
    const [main, tiny] = HILLS.hills
    if (main === undefined || tiny === undefined) throw new Error('fixture')
    expect(challengeCost(main)).toBe('3 matches · ≤ 3M cycles')
    expect(challengeCost(tiny)).toBe('no entries yet')
    expect(challengeCost({ ...main, hill: { ...main.hill, scoring: 'melee' } })).toBe(
      'no submissions',
    )
    expect(cycles(16_800_000)).toBe('16.8M')
    expect(cycles(800_000)).toBe('800k')
  })
})

describe('the challenge diagram', () => {
  const place = (step: Parameters<typeof boardRows>[0]) =>
    Object.fromEntries(boardRows(step, 0).map((r) => [r.name, [r.place, r.state]]))

  it('waits the challenger under the board, then ranks it third and pushes the lowest off', () => {
    expect(place('submit')['your bot']?.[0]).toBeGreaterThan(6)
    expect(place('rank')['your bot']).toEqual([2, 'idle'])
    expect(place('rank').Dwarf).toEqual([3, 'idle'])
    expect(place('trim').Vampire).toEqual([6, 'out'])
    expect(place('trim').Paper).toEqual([0, 'idle'])
  })

  it('fights the entries one at a time, adding up the challenger’s points', () => {
    const rows = boardRows('fight', 2)
    expect(rows.map((r) => r.state).slice(0, 4)).toEqual(['fought', 'fought', 'fighting', 'idle'])
    expect(rows.at(-1)?.score).toBe(12 + 40 + 58)
  })
})
