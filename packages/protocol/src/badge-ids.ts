/**
 * The badges' ids, the catalog's order (`badges.ts`). Apart from the catalog: the API's schemas
 * (`EarnedBadge`) read them, and every page takes those, but only the stats pages and a profile
 * take the catalog.
 */
export const BADGE_IDS = [
  'fleet',
  'heavy-metal',
  'atom',
  'tinkerer',
  'workhorse',
  'top-gun',
  'reaper',
  'quickdraw',
  'cockroach',
  'warlord',
  'long-live',
  'contender',
  'hello-world',
  'armory',
  'arsenal',
  'full-card',
  'big-iron',
  'one-liner',
  'revisionist',
  'first-blood',
  'centurion',
  'grinder',
  'survivor',
  'long-haul',
  'flawless',
  'giant-killer',
  'last-standing',
  'challenger',
  'on-the-board',
  'usurper',
  'king',
  'dynasty',
  'in-the-ring',
  'champion',
  'triple-crown',
  'day-one',
  'veteran',
] as const

export type BadgeId = (typeof BADGE_IDS)[number]
