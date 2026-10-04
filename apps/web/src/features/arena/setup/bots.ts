/**
 * The bots the arena setup offers and fights (PRODUCT_SPEC §2): the roster, the players' public
 * bots, the local bots, the bots a share link carries, and dropped `.asm` files. The roster comes
 * prebuilt (`rosterImage`), and the public bots with their bytes (`GET /api/bots`); the others are assembled on the main thread by `assembleCached`, whose chunk
 * (`assembly.ts`, with the assembler) a setup of roster bots never loads. The selection is a list
 * of refs; `resolveSelection` turns it into bots, and `arenaBots` into what the Worker loads.
 */
import type { Assembled, Diag } from '@asmbots/asm'
import {
  hasRosterImage,
  largeImagesLoaded,
  type RosterEntry,
  rosterEntries,
  rosterImage,
} from '@asmbots/bots'
import { type BattleConfigInput, CORE_SIZE, Pcg32, PlacementError, place } from '@asmbots/engine'
import {
  fromBase64,
  type OwnBot,
  type PublicBot,
  type PublicBotList,
  type Visibility,
  weightClassOf,
} from '@asmbots/protocol'
import { roundOrder, roundSeed } from '@asmbots/tourney'
import { type BotRecord, rankScore } from '../../../store/bot-records'
import type { LocalBot } from '../../../store/local-bots'
import type { ArenaConfig } from '../../../store/settings'
import type { ArenaBot } from '../worker/protocol'
import { battleConfig, MIN_ARENA_BOTS, randomSeed, SPACING } from './config'
import { type ArenaSetupSpec, type BotRef, formatRef, type SharedBot } from './url'

/** Where a bot comes from: the roster, a player's public bots, this browser's store, or a link. */
export type BotOrigin = 'roster' | 'cloud' | 'local' | 'shared'

/**
 * What the setup reads of a bot's assembly: its image, its metadata, and its errors. A local or
 * shared bot's is its whole `Assembled`; a roster bot's is prebuilt (`rosterImage`) and has no
 * listing, so what needs one assembles the roster's source (`loadRoster`).
 */
export type AssembledBot = Pick<
  Assembled,
  'name' | 'author' | 'strategy' | 'version' | 'bytes' | 'diagnostics'
>

/** Assembles a source: `assembleCached`, once its chunk has loaded (`assembler.ts`). */
export type Assemble = (source: string) => Assembled

/** A bot the setup can show and fight. */
export interface CatalogBot {
  readonly ref: BotRef
  readonly origin: BotOrigin
  /** The `%name`, or the stored name of a local bot whose source does not assemble. */
  readonly name: string
  readonly author: string
  /**
   * Its source; null for a roster bot, whose text `rosterSource` reads when a replay needs it,
   * and for a public bot, whose text the server has (`replaySources`).
   */
  readonly source: string | null
  readonly assembled: AssembledBot
  /** A roster bot's entry: its tier, family, and blurb. */
  readonly roster?: RosterEntry | undefined
  /**
   * A server bot's listing: its owner, its version, and its best hill place; and who may see it,
   * for one of my own (`OwnBot`).
   */
  readonly cloud?: PublicBot | OwnBot | undefined
  /** A local bot's account bot (`LocalBot.cloudId`), when it is kept in my account. */
  readonly account?: OwnBot | undefined
}

/** A bot's server listing: a server bot's own, or the account bot a local bot is kept as. */
export function listingOf(bot: CatalogBot): PublicBot | OwnBot | undefined {
  return bot.cloud ?? bot.account
}

/**
 * Who may see a bot (PRODUCT_SPEC §0): a server bot's visibility, mine or a player's, or `local`
 * for one kept in this browser only. Null for the roster's and a link's.
 */
export function visibilityOf(bot: CatalogBot): Visibility | 'local' | null {
  const listing = listingOf(bot)
  if (listing !== undefined) return listing.visibility
  return bot.origin === 'local' ? 'local' : null
}

/** The errors of a bot's assembly: a bot with any makes no bytes (ISA §6.5). */
export function errorsOf(bot: CatalogBot): readonly Diag[] {
  return bot.assembled.diagnostics.filter((d) => d.severity === 'error')
}

let roster: readonly CatalogBot[] | undefined
/** Whether `roster` has the bots past lightweight. */
let rosterWhole = false

/**
 * The roster, showcase bots first, then the solid ones, then the test bots, each tier in roster
 * order. Prebuilt: nothing is assembled, and no source is loaded. The bots past lightweight are in
 * it once their images have loaded: each route that lists the roster loads them first
 * (`loadLargeImages`), so before that a page has the lightweight bots only.
 */
export function rosterCatalog(): readonly CatalogBot[] {
  if (roster !== undefined && rosterWhole === largeImagesLoaded()) return roster
  rosterWhole = largeImagesLoaded()
  roster = [...rosterEntries()]
    .filter((entry) => hasRosterImage(entry.slug))
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
    .map(
      (entry): CatalogBot => ({
        ref: { kind: 'roster', slug: entry.slug },
        origin: 'roster',
        name: entry.name,
        author: entry.author,
        source: null,
        assembled: { ...rosterImage(entry.slug), diagnostics: [] },
        roster: entry,
      }),
    )
  return roster
}

const TIER_ORDER = ['showcase', 'solid', 'test'] as const

/** A player's public bot: prebuilt, as the server lists it with its bytes. */
export function cloudCatalog(bot: PublicBot | OwnBot): CatalogBot {
  const { botId, name, owner, author } = bot.bot
  return {
    ref: { kind: 'cloud', id: botId },
    origin: 'cloud',
    name,
    author: author ?? owner,
    source: null,
    assembled: {
      name,
      author: author ?? '',
      strategy: bot.strategy ?? '',
      version: '',
      bytes: fromBase64(bot.bytes),
      diagnostics: [],
    },
    cloud: bot,
  }
}

/**
 * The public bots by id, as `BotSources` takes them: null while the list loads, and none when it
 * cannot be read, so their refs are missing rather than loading for good.
 */
export function cloudMap(
  list: PublicBotList | undefined,
  failed: boolean,
): ReadonlyMap<string, CatalogBot> | null {
  if (failed) return new Map()
  return list === undefined ? null : new Map(list.bots.map((b) => [b.bot.botId, cloudCatalog(b)]))
}

/** A local bot, assembled. */
export function localCatalog(bot: LocalBot, assemble: Assemble): CatalogBot {
  return sourceBot({ kind: 'local', id: bot.id }, 'local', bot.source, bot.name, assemble)
}

/**
 * My bots (PRODUCT_SPEC §2): this browser's, each with the account bot it is kept as, and then my
 * account's bots that no local bot holds, prebuilt as the server lists them. A bot is listed once:
 * the local copy wins, since it holds what I last wrote.
 */
export function mineCatalog(
  local: readonly CatalogBot[],
  links: ReadonlyMap<string, string>,
  own: readonly OwnBot[],
): CatalogBot[] {
  const byId = new Map(own.map((bot) => [bot.bot.botId, bot]))
  const held = new Set<string>()
  const mine = local.map((bot): CatalogBot => {
    const cloudId = bot.ref.kind === 'local' ? links.get(bot.ref.id) : undefined
    const account = cloudId === undefined ? undefined : byId.get(cloudId)
    if (account === undefined) return bot
    held.add(account.bot.botId)
    return { ...bot, account }
  })
  return [...mine, ...own.filter((bot) => !held.has(bot.bot.botId)).map(cloudCatalog)]
}

/**
 * The server bots `BotSources` resolves `cloud:` refs from: the public ones and my own (a private
 * one too). Null while either list loads.
 */
export function withOwn(
  cloud: ReadonlyMap<string, CatalogBot> | null,
  own: readonly OwnBot[] | null,
): ReadonlyMap<string, CatalogBot> | null {
  if (cloud === null || own === null) return null
  if (own.length === 0) return cloud
  return new Map([...cloud, ...own.map((bot) => [bot.bot.botId, cloudCatalog(bot)] as const)])
}

/** A bot a share link carries, assembled. */
export function sharedCatalog(id: string, source: string, assemble: Assemble): CatalogBot {
  return sourceBot({ kind: 'local', id }, 'shared', source, 'shared bot', assemble)
}

function sourceBot(
  ref: BotRef,
  origin: BotOrigin,
  source: string,
  fallback: string,
  assemble: Assemble,
): CatalogBot {
  const assembled = assemble(source)
  return {
    ref,
    origin,
    name: assembled.name === '' ? fallback : assembled.name,
    author: assembled.author,
    source,
    assembled,
  }
}

/**
 * Whether `bot` matches a search: every word is in its name, author, roster entry, or a public
 * bot's owner, strategy, or hill.
 */
export function matchesQuery(bot: CatalogBot, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const entry = bot.roster
  const text = [
    bot.name,
    bot.author,
    entry?.slug,
    entry?.family,
    entry?.tier,
    entry?.blurb,
    listingOf(bot)?.bot.owner,
    listingOf(bot)?.strategy,
    listingOf(bot)?.best?.hill.name,
    visibilityOf(bot),
  ]
    .join(' ')
    .toLowerCase()
  return words.every((word) => text.includes(word))
}

/**
 * `room` random picks from `bots`, to fill the selection: each bot that assembles once, the ones
 * not yet in `picked` first, then repeats while room is left. Empty when no bot assembles.
 */
export function randomFill(
  bots: readonly CatalogBot[],
  picked: readonly BotRef[],
  room: number,
  random: () => number = Math.random,
): BotRef[] {
  const pool = bots.filter((bot) => errorsOf(bot).length === 0).map((bot) => bot.ref)
  if (pool.length === 0 || room <= 0) return []
  const shuffle = (refs: BotRef[]) => {
    for (let i = refs.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[refs[i], refs[j]] = [refs[j] as BotRef, refs[i] as BotRef]
    }
    return refs
  }
  const taken = new Set(picked.map(formatRef))
  const fresh = pool.filter((ref) => !taken.has(formatRef(ref)))
  const refs = [...shuffle(fresh), ...shuffle(pool.filter((ref) => taken.has(formatRef(ref))))]
  while (refs.length < room) refs.push(...shuffle([...pool]))
  return refs.slice(0, room)
}

/**
 * `bots` by their rank in this browser's records (`rankScore`), the best first. The sort is
 * stable: bots of equal score, as the ones with no record, keep their order.
 */
export function byRank(
  bots: readonly CatalogBot[],
  records: Readonly<Record<string, BotRecord>>,
): CatalogBot[] {
  const score = (bot: CatalogBot) => rankScore(records[formatRef(bot.ref)])
  return [...bots].sort((a, b) => score(b) - score(a))
}

/** How the picker orders its bots. */
export type BotSort = 'rank' | 'hill' | 'new' | 'name' | 'size'

export const BOT_SORTS = [
  { value: 'rank', label: 'rank' },
  { value: 'hill', label: 'hill' },
  { value: 'new', label: 'new' },
  { value: 'name', label: 'a-z' },
  { value: 'size', label: 'size' },
] as const satisfies readonly { value: BotSort; label: string }[]

/** A server bot's best hill place before another's: the better rank, then the higher rating. */
function byHill(a: CatalogBot, b: CatalogBot): number {
  const x = listingOf(a)?.best ?? null
  const y = listingOf(b)?.best ?? null
  if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1
  return x.rank - y.rank || y.rating - x.rating
}

/**
 * `bots` in `sort`'s order, a stable sort. `rank`: by this browser's records (`rankScore`), then by
 * hill place; `hill`: the bots with a hill place first; `new`: the latest changed public bot
 * first, the others after; `name`: a to z; `size`: the smallest image first.
 */
export function sortBots(
  bots: readonly CatalogBot[],
  sort: BotSort,
  records: Readonly<Record<string, BotRecord>>,
): CatalogBot[] {
  const score = (bot: CatalogBot) => rankScore(records[formatRef(bot.ref)])
  const changed = (bot: CatalogBot) => listingOf(bot)?.updatedAt ?? ''
  const compare: Record<BotSort, (a: CatalogBot, b: CatalogBot) => number> = {
    rank: (a, b) => score(b) - score(a) || byHill(a, b),
    hill: byHill,
    new: (a, b) => changed(b).localeCompare(changed(a)),
    name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    size: (a, b) => a.assembled.bytes.length - b.assembled.bytes.length,
  }
  return [...bots].sort(compare[sort])
}

/**
 * Each ranked bot of `bots`'s place, 1 the best, by ref: the bots with a record, in `byRank`
 * order. A bot with none has no place.
 */
export function ranksOf(
  bots: readonly CatalogBot[],
  records: Readonly<Record<string, BotRecord>>,
): Map<string, number> {
  const ranked = byRank(bots, records).filter((bot) => records[formatRef(bot.ref)] !== undefined)
  return new Map(ranked.map((bot, i) => [formatRef(bot.ref), i + 1]))
}

/**
 * `room` picks from `bots`, in their order (the ranking's: the best first), to fill the selection:
 * each bot that assembles once, the ones not yet in `picked` first, then the best again while room
 * is left. Empty when no bot assembles.
 */
export function bestFill(
  bots: readonly CatalogBot[],
  picked: readonly BotRef[],
  room: number,
): BotRef[] {
  const pool = bots.filter((bot) => errorsOf(bot).length === 0).map((bot) => bot.ref)
  if (pool.length === 0 || room <= 0) return []
  const taken = new Set(picked.map(formatRef))
  const refs = pool.filter((ref) => !taken.has(formatRef(ref)))
  while (refs.length < room) refs.push(...pool)
  return refs.slice(0, room)
}

/** A place in the selection, and the bot it holds, as far as the setup knows it. */
export interface SetupBot {
  /** Its place in the selection: its bot index in the battle, and so its hue. */
  readonly index: number
  readonly ref: BotRef
  /**
   * `ready` to fight; `broken` when its source does not assemble; `missing` when nothing in this
   * browser has it; `loading` while the local store is read, or the assembler loads.
   */
  readonly state: 'ready' | 'broken' | 'missing' | 'loading'
  readonly bot: CatalogBot | null
  /** The name the battle gives it: its own, with ` 2`, ` 3` … on a name already taken. */
  readonly name: string
}

/** Where `resolveSelection` looks a local ref up, and what assembles it. */
export interface BotSources {
  /** The local bots by id, or null while the store is read. */
  readonly local: ReadonlyMap<string, LocalBot> | null
  /** The sources a share link carries, by id. */
  readonly shared: ReadonlyMap<string, string>
  /**
   * The players' public bots by id: null while they load; none where the page does not list them,
   * so a `cloud:` ref is missing there.
   */
  readonly cloud?: ReadonlyMap<string, CatalogBot> | null | undefined
  /** Assembles a local or shared bot; null while the assembler loads. The roster needs none. */
  readonly assemble: Assemble | null
}

/**
 * The bots of `refs`, in order. A local ref is the store's bot when it has one, else the share
 * link's. Names repeat as `Dwarf`, `Dwarf 2`, so each bot of a battle has its own.
 */
export function resolveSelection(refs: readonly BotRef[], sources: BotSources): SetupBot[] {
  const rosterBots = new Map(rosterCatalog().map((bot) => [formatRef(bot.ref), bot]))
  const taken = new Map<string, number>()
  return refs.map((ref, index) => {
    const found = lookUp(ref, sources, rosterBots)
    const bot = found === 'loading' ? undefined : found
    const state =
      found === 'loading'
        ? 'loading'
        : bot === undefined
          ? ref.kind === 'local' && sources.local === null
            ? 'loading'
            : 'missing'
          : errorsOf(bot).length > 0
            ? 'broken'
            : 'ready'
    const own = bot?.name ?? (ref.kind === 'roster' ? ref.slug : 'local bot')
    const seen = (taken.get(own) ?? 0) + 1
    taken.set(own, seen)
    return { index, ref, state, bot: bot ?? null, name: seen === 1 ? own : `${own} ${seen}` }
  })
}

/**
 * A ref's bot; `loading` for a local or shared one while the assembler loads, and for a public one
 * while the list loads.
 */
function lookUp(
  ref: BotRef,
  sources: BotSources,
  rosterBots: ReadonlyMap<string, CatalogBot>,
): CatalogBot | 'loading' | undefined {
  if (ref.kind === 'roster') return rosterBots.get(formatRef(ref))
  if (ref.kind === 'cloud') return sources.cloud === null ? 'loading' : sources.cloud?.get(ref.id)
  const local = sources.local?.get(ref.id)
  const shared = sources.shared.get(ref.id)
  if (local === undefined && shared === undefined) return undefined
  const { assemble } = sources
  if (assemble === null) return 'loading'
  if (local !== undefined) return localCatalog(local, assemble)
  return shared === undefined ? undefined : sharedCatalog(ref.id, shared, assemble)
}

/** The local and shared bots of a selection, once each: what a share link must carry. */
export function sharedSources(selection: readonly SetupBot[]): SharedBot[] {
  const bots = new Map<string, SharedBot>()
  for (const { ref, bot } of selection) {
    if (ref.kind === 'local' && bot !== null && bot.source !== null) {
      bots.set(ref.id, { id: ref.id, source: bot.source })
    }
  }
  return [...bots.values()]
}

/**
 * The bots of `selection` the arena's class keeps out: the ready ones of another class. A bot not
 * ready has no size yet.
 */
export function outsideWeight(
  selection: readonly SetupBot[],
  weight: ArenaConfig['weight'],
): SetupBot[] {
  return selection.filter(
    (s) =>
      s.state === 'ready' &&
      weight !== 'all' &&
      weightClassOf(s.bot?.assembled.bytes.length ?? 0)?.slug !== weight,
  )
}

/** What the fight button says, and whether it fights. */
export interface FightStatus {
  readonly label: string
  readonly ready: boolean
  /** The local store is still being read: the button waits. */
  readonly busy: boolean
}

/**
 * The fight button's words (PRODUCT_SPEC §2): what is missing, "add 1 more bot", until the
 * selection can fight, then what it fights, "fight · 4 bots · 1 round".
 */
export function fightStatus(selection: readonly SetupBot[], spec: ArenaSetupSpec): FightStatus {
  const count = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`
  const fight = `fight · ${count(selection.length, 'bot')} · ${count(spec.config.rounds, 'round')}`
  const missing = selection.filter((s) => s.state === 'missing').length
  const broken = selection.filter((s) => s.state === 'broken').length
  const not = (label: string): FightStatus => ({ label, ready: false, busy: false })
  if (selection.length < MIN_ARENA_BOTS) {
    const need = MIN_ARENA_BOTS - selection.length
    return not(`add ${selection.length === 0 ? count(need, 'bot') : count(need, 'more bot')}`)
  }
  if (missing > 0) return not(`remove ${count(missing, 'missing bot')}`)
  if (broken > 0) return not(`remove ${count(broken, 'broken bot')}`)
  const outside = outsideWeight(selection, spec.config.weight).length
  if (outside > 0) return not(`remove ${count(outside, 'bot')} outside ${spec.config.weight}`)
  if (selection.some((s) => s.state === 'loading'))
    return { label: fight, ready: false, busy: true }
  const { seed, minSpacing, rounds } = spec.config
  if (seed !== null && !fits(sizesOf(selection), minSpacing, seed, rounds)) {
    return not('bots do not fit · lower the spacing')
  }
  return { label: fight, ready: true, busy: false }
}

/** The image sizes of a selection, in order. */
export function sizesOf(selection: readonly SetupBot[]): number[] {
  return selection.map((s) => s.bot?.assembled.bytes.length ?? 0)
}

/**
 * Whether images of `sizes` place `minSpacing` apart in each of `rounds` rounds of a match from
 * `seed` (ISA §5.5): round i places them in its rotated order with seed + i.
 */
export function fits(
  sizes: readonly number[],
  minSpacing: number,
  seed: number,
  rounds = 1,
): boolean {
  try {
    for (let round = 0; round < rounds; round++) {
      const order = roundOrder(sizes.length, round).map((k) => sizes[k] as number)
      place(order, minSpacing, new Pcg32(roundSeed(seed, round)))
    }
    return true
  } catch (error) {
    if (error instanceof PlacementError) return false
    throw error
  }
}

/**
 * The free bases the last bot to place keeps, at the least, at `maxSpacing`: 1,000 draws all miss
 * 1,024 of 65,536 bases about once in 7 million.
 */
const CLEAR_BASES = 1024

/**
 * The widest spacing images of `sizes` surely place with, from any seed and in any round order: the
 * spacing slider's end, on its grain. A placed image of size s' keeps a bot of size s off
 * s + s' + 2m - 1 bases, so the largest bot, placed last, keeps `CLEAR_BASES` free when the others
 * block no more than the rest of the core, even with no two blocks overlapping.
 */
export function maxSpacing(sizes: readonly number[]): number {
  const others = sizes.length - 1
  if (others < 1) return SPACING.max
  const total = sizes.reduce((sum, size) => sum + size, 0)
  const largest = Math.max(...sizes)
  const room = CORE_SIZE - CLEAR_BASES - (total - largest) - others * (largest - 1)
  const m = Math.floor(room / (2 * others) / SPACING.step) * SPACING.step
  return Math.min(SPACING.max, Math.max(SPACING.min, m))
}

/** Random seeds a fight tries before it says the bots do not fit. */
const SEED_TRIES = 32

/**
 * The seed to fight a match of `rounds` rounds with: `seed` when the bots place with it in every
 * round, else a random seed they place with. Null when they do not place: the fixed seed fails,
 * or `SEED_TRIES` random ones do.
 */
export function fightSeed(
  sizes: readonly number[],
  minSpacing: number,
  seed: number | null,
  random: () => number = randomSeed,
  rounds = 1,
): number | null {
  if (seed !== null) return fits(sizes, minSpacing, seed, rounds) ? seed : null
  for (let i = 0; i < SEED_TRIES; i++) {
    const drawn = random()
    if (fits(sizes, minSpacing, drawn, rounds)) return drawn
  }
  return null
}

/** What the fight button starts: the bots as the Worker loads them, and the config. */
export interface ArenaFight {
  readonly bots: readonly ArenaBot[]
  /** The engine's config for the first round: its seed is drawn when the setup's is random. */
  readonly config: BattleConfigInput
  /** Rounds in the match. */
  readonly rounds: number
  /** The setup it came from. */
  readonly spec: ArenaSetupSpec
  /**
   * Each bot's source, in order: what a replay file carries. Null for a roster bot and a public
   * one: `replaySources` reads the roster's text, and the server's.
   */
  readonly sources: readonly (string | null)[]
  /** Each public bot's version as it fought, by bot id: the source `replaySources` asks for. */
  readonly versions: ReadonlyMap<string, number>
  /** The local bots among them, once each: what a share link carries. */
  readonly shared: readonly SharedBot[]
}

/** The Worker's bots for a selection that is ready: battle names, machine code, and metadata. */
export function arenaBots(selection: readonly SetupBot[]): ArenaBot[] {
  return selection.map(({ name, bot }) => {
    if (bot === null) throw new Error(`bot '${name}' is not loaded`)
    const { author, strategy, version, bytes } = bot.assembled
    return { name, bytes, meta: { author, strategy, version } }
  })
}

/** The fight of a ready `selection` under `spec`, its first round placed with `seed`. */
export function arenaFight(
  selection: readonly SetupBot[],
  spec: ArenaSetupSpec,
  seed: number,
): ArenaFight {
  return {
    bots: arenaBots(selection),
    config: battleConfig(spec.config, seed),
    rounds: spec.config.rounds,
    spec,
    sources: selection.map((s) => (s.bot === null ? '' : s.bot.source)),
    versions: new Map(
      selection.flatMap(({ bot }) =>
        bot?.cloud === undefined ? [] : [[bot.cloud.bot.botId, bot.cloud.bot.version] as const],
      ),
    ),
    shared: sharedSources(selection),
  }
}

/**
 * Each bot's source for a replay file, in order. A roster bot's is read from the roster's
 * sources, a chunk of their own (`roster-source.ts`) that loads here, not with the arena, and the
 * sources of the bots past lightweight, another (`loadLargeSources`). A public bot's is the
 * server's, of the version that fought; empty when the server does not give it.
 */
export async function replaySources(fight: ArenaFight): Promise<string[]> {
  const { sources, spec, versions } = fight
  if (sources.every((source): source is string => source !== null)) return [...sources]
  const roster = spec.bots.some((ref) => ref.kind === 'roster')
    ? await import('./roster-source').then(async (m) => {
        await m.loadLargeSources()
        return m.rosterSource
      })
    : null
  return Promise.all(
    sources.map(async (source, i) => {
      if (source !== null) return source
      const ref = spec.bots[i]
      if (ref?.kind === 'roster') return roster?.(ref.slug) ?? ''
      const version = ref?.kind === 'cloud' ? versions.get(ref.id) : undefined
      if (ref === undefined || version === undefined) return ''
      const { cloudSource } = await import('./cloud-source')
      return cloudSource(ref.id, version)
    }),
  )
}

/**
 * `bot`'s source, for the picker's source view: a local or shared bot's text, a roster bot's from
 * the roster's sources, a server bot's from the server at the version listed (empty when the
 * server does not give it).
 */
export async function botSource(bot: CatalogBot): Promise<string> {
  if (bot.source !== null) return bot.source
  if (bot.ref.kind === 'roster') {
    const { loadLargeSources, rosterSource } = await import('./roster-source')
    await loadLargeSources()
    return rosterSource(bot.ref.slug)
  }
  const listing = listingOf(bot)
  if (listing === undefined) return ''
  const { cloudSource } = await import('./cloud-source')
  return cloudSource(listing.bot.botId, listing.bot.version)
}

/** Whether a drag carries files: what a drop zone takes. */
export function carriesFiles(event: { dataTransfer: DataTransfer | null }): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}
