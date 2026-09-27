import { describe, expect, it } from 'bun:test'
import {
  awardBadges,
  BADGE_GROUPS,
  BADGE_IDS,
  BADGES,
  type BadgeId,
  badgeValue,
  type PlayerFacts,
} from '../src/badges'

const NOBODY: PlayerFacts = {
  bots: 0,
  versions: 0,
  biggest: null,
  smallest: null,
  classes: 0,
  mostVersions: 0,
  matches: 0,
  wins: 0,
  kills: 0,
  fastestKill: null,
  rounds: 0,
  survived: 0,
  cycles: 0,
  flawless: 0,
  giantKills: 0,
  lastStanding: 0,
  challenges: 0,
  entries: 0,
  kings: 0,
  reign: null,
  crowns: 0,
  tournaments: 0,
  championships: 0,
  titles: 0,
  joinedAt: '2027-06-01T00:00:00.000Z',
  since: '2026-09-24T00:00:00.000Z',
  at: '2027-06-02T00:00:00.000Z',
}

const player = (change: Partial<PlayerFacts>): PlayerFacts => ({ ...NOBODY, ...change })
const ids = (earned: { id: BadgeId }[] | undefined) => (earned ?? []).map((e) => e.id)

describe('the badges', () => {
  it('each has a name, a group, and what it takes', () => {
    expect(BADGE_IDS.length).toBeGreaterThanOrEqual(30)
    for (const id of BADGE_IDS) {
      const badge = BADGES[id]
      expect(badge.name.length, id).toBeGreaterThan(0)
      expect(BADGE_GROUPS).toContain(badge.group)
      expect(badge.says.endsWith('.'), id).toBe(false)
    }
  })

  it('gives nothing to someone who has done nothing', () => {
    expect(awardBadges([NOBODY])).toEqual([[]])
  })

  it('gives each title to the best, both when level, and none when nobody has any', () => {
    const [a, b, c] = awardBadges([
      player({ bots: 3, biggest: 4096, smallest: 2, wins: 5 }),
      player({ bots: 3, biggest: 100, smallest: 40, wins: 7 }),
      player({ bots: 1, biggest: 12, smallest: 12 }),
    ])
    expect(ids(a)).toContain('fleet')
    expect(ids(b)).toContain('fleet')
    expect(ids(c)).not.toContain('fleet')
    expect(a?.find((e) => e.id === 'heavy-metal')).toEqual({ id: 'heavy-metal', value: 4096 })
    expect(a?.find((e) => e.id === 'atom')).toEqual({ id: 'atom', value: 2 })
    expect(ids(b)).toContain('top-gun')
    expect(ids(a)).not.toContain('top-gun')
    // Nobody has a kill: no quickdraw, no reaper.
    expect([a, b, c].flatMap(ids)).not.toContain('quickdraw')
    expect([a, b, c].flatMap(ids)).not.toContain('reaper')
  })

  it('gives the milestones at their lines', () => {
    const [earned] = awardBadges([
      player({
        bots: 10,
        classes: 4,
        biggest: 2049,
        smallest: 16,
        mostVersions: 10,
        wins: 100,
        matches: 1000,
        survived: 1000,
        cycles: 100_000_000,
        flawless: 1,
        giantKills: 1,
        lastStanding: 1,
        challenges: 1,
        entries: 1,
        crowns: 1,
        kings: 3,
        championships: 1,
        titles: 3,
        joinedAt: '2026-10-01T00:00:00.000Z',
        at: '2027-10-01T00:00:00.000Z',
      }),
    ])
    const milestones = BADGE_IDS.filter((id) => BADGES[id].kind === 'milestone')
    // Every milestone but arsenal (25 bots).
    expect(ids(earned).filter((id) => BADGES[id].kind === 'milestone')).toEqual(
      milestones.filter((id) => id !== 'arsenal'),
    )
  })

  it('stops each milestone one short of its line', () => {
    const [earned] = awardBadges([
      player({ bots: 9, biggest: 2048, smallest: 17, mostVersions: 9, wins: 99, kings: 2 }),
    ])
    for (const id of ['armory', 'big-iron', 'one-liner', 'revisionist', 'centurion', 'dynasty']) {
      expect(ids(earned)).not.toContain(id)
    }
    expect(ids(earned)).toContain('hello-world')
    expect(ids(earned)).toContain('king')
  })

  it('says a title in its unit', () => {
    expect(badgeValue(BADGES['heavy-metal'], 4096)).toBe('4,096 bytes')
    expect(badgeValue(BADGES.reaper, 1)).toBe('1 kill')
  })
})
