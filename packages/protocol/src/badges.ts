/**
 * Badges (PRODUCT_SPEC §12): what a user has done, as the leaderboard and their profile show it.
 * Two kinds. A `title` has one holder at a time, the user with the site's best of one number (the
 * most bots, the biggest bot, the fastest kill); users level at the best share it. A `milestone`
 * is a line any user may cross (a first bot, 100 wins, a crown). The server awards them from each
 * user's `PlayerFacts` (`awardBadges`); the house's bots (the roster) earn none.
 */
import { BADGE_IDS, type BadgeId } from './badge-ids'

/** A user's numbers, as the badges read them. Bot numbers count public bots; the rest, every bot. */
export interface PlayerFacts {
  readonly bots: number
  readonly versions: number
  /** Their bots' latest sizes, bytes: the largest and the smallest; null with no bot. */
  readonly biggest: number | null
  readonly smallest: number | null
  /** The weight classes their bots' latest sizes fall in, of four. */
  readonly classes: number
  /** The versions of their most-saved bot. */
  readonly mostVersions: number
  readonly matches: number
  readonly wins: number
  /** Duel rounds their bot won by outliving the other. */
  readonly kills: number
  /** The fewest cycles a bot they killed in a duel lived; null with no kill. */
  readonly fastestKill: number | null
  readonly rounds: number
  readonly survived: number
  /** The engine cycles their bots lived through, every round. */
  readonly cycles: number
  /** Matches of 5 rounds or more they won without the other bot scoring. */
  readonly flawless: number
  /** Duels won against a bot at least twice their bot's size. */
  readonly giantKills: number
  /** Melee rounds their bot ended as the only one alive. */
  readonly lastStanding: number
  /** Finished hill submissions. */
  readonly challenges: number
  /** Their entries on the hills now, and the ones at rank 1. */
  readonly entries: number
  readonly kings: number
  /** The longest reign of their kings now, in challenges; null with no king. */
  readonly reign: number | null
  /** Challenges that took a hill's rank 1. */
  readonly crowns: number
  /** Finished tournaments their bots were in, of them championships, and championships won. */
  readonly tournaments: number
  readonly championships: number
  readonly titles: number
  /** When they signed up, when the site began, and when these facts were read. */
  readonly joinedAt: string
  readonly since: string
  readonly at: string
}

/** How a badge's group heads the catalog. */
export type BadgeGroup = 'builder' | 'fighter' | 'hills' | 'championships' | 'time'

interface BadgeBase {
  readonly name: string
  readonly group: BadgeGroup
  /** What it takes, a sentence without its period. */
  readonly says: string
}

/** One holder: the user with the best of `metric`, if it is anything. */
export interface TitleBadge extends BadgeBase {
  readonly kind: 'title'
  readonly metric: (f: PlayerFacts) => number | null
  /** Whether the least wins (the smallest bot, the fastest kill). */
  readonly least?: true
  /** What the number counts: `bytes`, one or many. */
  readonly unit: readonly [one: string, many: string]
}

/** Any user past a line. */
export interface MilestoneBadge extends BadgeBase {
  readonly kind: 'milestone'
  readonly earned: (f: PlayerFacts) => boolean
}

export type Badge = TitleBadge | MilestoneBadge

const DAY_MS = 86_400_000
const ONE_LINER_BYTES = 16
const SUPER_HEAVY_MIN = 2049
const EARLY_DAYS = 30

const title = (
  name: string,
  group: BadgeGroup,
  says: string,
  unit: TitleBadge['unit'],
  metric: TitleBadge['metric'],
  least?: true,
): TitleBadge => ({ kind: 'title', name, group, says, unit, metric, ...(least ? { least } : {}) })

const milestone = (
  name: string,
  group: BadgeGroup,
  says: string,
  earned: MilestoneBadge['earned'],
): MilestoneBadge => ({ kind: 'milestone', name, group, says, earned })

const BOTS = ['bot', 'bots'] as const
const BYTES = ['byte', 'bytes'] as const
const CYCLES = ['cycle', 'cycles'] as const

/** Every badge, by id: the titles, then the milestones, each group in order. */
export const BADGES = {
  fleet: title('fleet admiral', 'builder', 'the most bots', BOTS, (f) => f.bots),
  'heavy-metal': title('heavy metal', 'builder', 'the biggest bot', BYTES, (f) => f.biggest),
  atom: title('the atom', 'builder', 'the smallest bot', BYTES, (f) => f.smallest, true),
  tinkerer: title(
    'tinkerer',
    'builder',
    'the most versions saved',
    ['version', 'versions'],
    (f) => f.versions,
  ),
  workhorse: title(
    'workhorse',
    'fighter',
    'the most server matches',
    ['match', 'matches'],
    (f) => f.matches,
  ),
  'top-gun': title('top gun', 'fighter', 'the most match wins', ['win', 'wins'], (f) => f.wins),
  reaper: title(
    'reaper',
    'fighter',
    'the most kills: duel rounds won by outliving the other bot',
    ['kill', 'kills'],
    (f) => f.kills,
  ),
  quickdraw: title('quickdraw', 'fighter', 'the fastest kill', CYCLES, (f) => f.fastestKill, true),
  cockroach: title(
    'cockroach',
    'fighter',
    'the most rounds survived',
    ['round', 'rounds'],
    (f) => f.survived,
  ),
  warlord: title(
    'warlord',
    'hills',
    'king of the most hills now',
    ['hill', 'hills'],
    (f) => f.kings,
  ),
  'long-live': title(
    'long live the king',
    'hills',
    'the longest reign of a king now on a hill',
    ['challenge', 'challenges'],
    (f) => f.reign,
  ),
  contender: title(
    'contender',
    'championships',
    'the most competitions entered: hill challenges and tournaments',
    ['entry', 'entries'],
    (f) => f.challenges + f.tournaments,
  ),

  'hello-world': milestone('hello, world', 'builder', 'saved a first bot', (f) => f.bots >= 1),
  armory: milestone('armory', 'builder', 'saved 10 bots', (f) => f.bots >= 10),
  arsenal: milestone('arsenal', 'builder', 'saved 25 bots', (f) => f.bots >= 25),
  'full-card': milestone(
    'full card',
    'builder',
    'a bot in every weight class',
    (f) => f.classes >= 4,
  ),
  'big-iron': milestone(
    'big iron',
    'builder',
    'a super-heavy bot, over 2 KB',
    (f) => (f.biggest ?? 0) >= SUPER_HEAVY_MIN,
  ),
  'one-liner': milestone(
    'one-liner',
    'builder',
    `a bot of ${ONE_LINER_BYTES} bytes or fewer`,
    (f) => f.smallest !== null && f.smallest <= ONE_LINER_BYTES,
  ),
  revisionist: milestone(
    'revisionist',
    'builder',
    'one bot saved in 10 versions',
    (f) => f.mostVersions >= 10,
  ),
  'first-blood': milestone('first blood', 'fighter', 'won a server match', (f) => f.wins >= 1),
  centurion: milestone('centurion', 'fighter', 'won 100 matches', (f) => f.wins >= 100),
  grinder: milestone('grinder', 'fighter', 'played 1,000 matches', (f) => f.matches >= 1000),
  survivor: milestone('survivor', 'fighter', 'survived 1,000 rounds', (f) => f.survived >= 1000),
  'long-haul': milestone(
    'long haul',
    'fighter',
    'bots that lived 100 million cycles',
    (f) => f.cycles >= 100_000_000,
  ),
  flawless: milestone(
    'flawless',
    'fighter',
    'won every round of a match of 5 rounds or more',
    (f) => f.flawless >= 1,
  ),
  'giant-killer': milestone(
    'giant killer',
    'fighter',
    'won a duel against a bot twice the size',
    (f) => f.giantKills >= 1,
  ),
  'last-standing': milestone(
    'last one standing',
    'fighter',
    'the only bot alive at the end of a melee round',
    (f) => f.lastStanding >= 1,
  ),
  challenger: milestone(
    'challenger',
    'hills',
    'submitted a bot to a hill',
    (f) => f.challenges >= 1,
  ),
  'on-the-board': milestone('on the board', 'hills', 'a bot on a hill now', (f) => f.entries >= 1),
  usurper: milestone(
    'usurper',
    'hills',
    "took a hill's crown with a challenge",
    (f) => f.crowns >= 1,
  ),
  king: milestone('king of the hill', 'hills', 'a bot at rank 1 now', (f) => f.kings >= 1),
  dynasty: milestone('dynasty', 'hills', 'king of 3 hills at once', (f) => f.kings >= 3),
  'in-the-ring': milestone(
    'in the ring',
    'championships',
    'entered a championship',
    (f) => f.championships >= 1,
  ),
  champion: milestone('champion', 'championships', 'won a championship', (f) => f.titles >= 1),
  'triple-crown': milestone(
    'triple crown',
    'championships',
    'won 3 championships',
    (f) => f.titles >= 3,
  ),
  'day-one': milestone(
    'day one',
    'time',
    `signed up in the site's first ${EARLY_DAYS} days`,
    (f) => Date.parse(f.joinedAt) - Date.parse(f.since) < EARLY_DAYS * DAY_MS,
  ),
  veteran: milestone(
    'veteran',
    'time',
    'here a year',
    (f) => Date.parse(f.at) - Date.parse(f.joinedAt) >= 365 * DAY_MS,
  ),
} as const satisfies Readonly<Record<BadgeId, Badge>>

export { BADGE_IDS, type BadgeId }

/** The groups, the catalog's order. */
export const BADGE_GROUPS: readonly BadgeGroup[] = [
  'builder',
  'fighter',
  'hills',
  'championships',
  'time',
]

/** A badge a user holds: its id, and for a title the number that won it. */
export interface Earned {
  readonly id: BadgeId
  readonly value: number | null
}

/**
 * The badges each of `players` holds, in the catalog's order, `players`' order. A title goes to
 * every player level at the best, when the best is a number (and, for a most, more than 0).
 */
export function awardBadges(players: readonly PlayerFacts[]): Earned[][] {
  const earned: Earned[][] = players.map(() => [])
  for (const id of BADGE_IDS) {
    const badge: Badge = BADGES[id]
    if (badge.kind === 'milestone') {
      players.forEach((p, i) => {
        if (badge.earned(p)) earned[i]?.push({ id, value: null })
      })
      continue
    }
    const values = players.map((p) => badge.metric(p))
    const known = values.filter((v): v is number => v !== null && (badge.least || v > 0))
    if (known.length === 0) continue
    const best = badge.least ? Math.min(...known) : Math.max(...known)
    values.forEach((v, i) => {
      if (v === best) earned[i]?.push({ id, value: v })
    })
  }
  return earned
}

/** `4,096 bytes`, `1 kill`: a title's number in its unit. */
export function badgeValue(badge: TitleBadge, value: number): string {
  const [one, many] = badge.unit
  return `${value.toLocaleString('en-US')} ${value === 1 ? one : many}`
}
