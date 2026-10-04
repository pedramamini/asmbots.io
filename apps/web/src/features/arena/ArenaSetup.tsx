import { HOUSE_HANDLE, type Me, weightClassOf } from '@asmbots/protocol'
import {
  Button,
  Chip,
  EmptyState,
  type EmptyStateAction,
  HueSwatch,
  IconButton,
  Identicon,
  Input,
  Panel,
  PanelGrid,
  Segmented,
  Slider,
  useToast,
} from '@asmbots/ui'
import { Dices, FileUp, Link, Plus, Save, Swords, Trophy, X } from 'lucide-react'
import {
  type ChangeEvent,
  type DragEvent,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useMe, usePublicBots } from '../../api/queries'
import { type Author, AuthorLink, ByAuthor, ownerAuthor, sourceAuthor } from '../../app/author'
import { ARENA_ABOUT, ArenaKinds } from '../../app/intros/arena'
import { ROUTE_SEARCH } from '../../app/keys'
import { useLinkAction } from '../../app/link-action'
import { PageIntro } from '../../app/PageIntro'
import { useRouteStat } from '../../app/slots'
import { type BotRecord, gamesOf, useBotRecords } from '../../store/bot-records'
import { type LocalBot, useLocalBotActions, useLocalBots } from '../../store/local-bots'
import { type ArenaConfig, useSettings } from '../../store/settings'
import {
  inWeight,
  WEIGHT_FILTERS,
  WEIGHT_SHORT,
  WeightChip,
  type WeightFilter,
} from '../hills/WeightChip'
import { SPEED_SLIDER, speedOf } from './battle/speed'
import { loadAssembly, useAssemble } from './setup/assembler'
import {
  type ArenaFight,
  arenaFight,
  BOT_SORTS,
  type BotSort,
  bestFill,
  type CatalogBot,
  carriesFiles,
  cloudMap,
  errorsOf,
  fightSeed,
  fightStatus,
  localCatalog,
  matchesQuery,
  maxSpacing,
  outsideWeight,
  ownerOf,
  ownersOf,
  randomFill,
  ranksOf,
  resolveSelection,
  rosterCatalog,
  type SetupBot,
  sharedSources,
  sizesOf,
  sortBots,
} from './setup/bots'
import { ConfigForm } from './setup/ConfigForm'
import {
  MAX_ARENA_BOTS,
  MIN_ARENA_BOTS,
  type PresetName,
  randomSeed,
  withConfig,
  withPreset,
} from './setup/config'
import type { Problems } from './setup/files'
import { type ArenaSetupSpec, type BotRef, formatRef } from './setup/url'
import { copyShareLink } from './share'
import { FightStep, RosterStep } from './tour'

/** The problem modal and the assembler's errors: a chunk loaded when a bot first fails to assemble. */
const ProblemsModal = lazy(() =>
  import('./setup/Problems').then((m) => ({ default: m.ProblemsModal })),
)

/** The paste box: its own chunk, loaded when `paste` is picked. */
const PasteBox = lazy(() => import('./setup/PasteBox').then((m) => ({ default: m.PasteBox })))

/**
 * The intro's banner, loaded after the page: the setup sits at the edge of its budget. Its box is
 * held by a placeholder of `IntroArt`'s size, so the intro's text does not reflow.
 */
const IntroArt = lazy(() => import('../../app/IntroArt').then((m) => ({ default: m.IntroArt })))

/** Where the picker's bots come from. */
type Source = 'roster' | 'mine' | 'paste'

const SOURCES = [
  { value: 'roster', label: 'roster' },
  { value: 'mine', label: 'my bots' },
  { value: 'paste', label: 'paste' },
] as const satisfies readonly { value: Source; label: string }[]

/** The most players the roster's player filter names: the ones with the most bots. */
const PLAYER_PILLS = 6

/** The pair a first visit can fight at once: a bomber and a replicator. */
const STARTERS: readonly BotRef[] = [
  { kind: 'roster', slug: 'dwarf' },
  { kind: 'roster', slug: 'paper' },
]

export interface ArenaSetupProps {
  /** The bots and the config: the URL's. */
  spec: ArenaSetupSpec
  /** Changes the setup; the update gets the latest spec. */
  onSpecChange: (update: (spec: ArenaSetupSpec) => ArenaSetupSpec) => void
  /** The sources a share link carries, by id. */
  shared: ReadonlyMap<string, string>
  /** The fight button: the bots, placed and ready, and the config. */
  onFight: (fight: ArenaFight) => void
  /** The first-visit tour, while it is on: its button puts it away (`tour.tsx`). */
  tour?: { readonly onDismiss: () => void } | undefined
}

/**
 * The arena before a battle (PRODUCT_SPEC §2). On the left, the picker: the roster, the local
 * bots, or a paste box, with a search. Dropped `.asm` files (anywhere on the setup, or through
 * `open files`) are assembled and saved as local bots; one that does not assemble opens its
 * diagnostics in a modal. On the right: the bots picked, in hue order, the config, and the fight
 * button, which says what is missing until the setup can fight.
 */
export function ArenaSetup({ spec, onSpecChange, shared, onFight, tour }: ArenaSetupProps) {
  const { toast } = useToast()
  const link = useLinkAction()
  const setLastArenaConfig = useSettings((state) => state.setLastArenaConfig)
  const arenaSpeed = useSettings((state) => state.arenaSpeed)
  const setArenaSpeed = useSettings((state) => state.setArenaSpeed)
  const localBots = useLocalBots()
  const { data: me } = useMe()
  const records = useBotRecords((state) => state.records)
  const { save } = useLocalBotActions()
  const [source, setSource] = useState<Source>('roster')
  const [query, setQuery] = useState('')
  const [weight, setWeight] = useState<WeightFilter>('all')
  /** The roster's player filter: a handle, the house's for the roster's own bots, or `all`. */
  const [owner, setOwner] = useState('all')
  const [sort, setSort] = useState<BotSort>('rank')
  const [problems, setProblems] = useState<Problems | null>(null)
  const [dragDepth, setDragDepth] = useState(0)
  const picker = useRef<HTMLInputElement>(null)
  // The setup as it stands, for the steps that finish after an await.
  const latest = useRef(spec)
  latest.current = spec

  const local = useMemo(() => {
    // A store that cannot be read (storage off) holds nothing, rather than loading forever.
    if (localBots.isError) return new Map<string, LocalBot>()
    return localBots.data === undefined ? null : new Map(localBots.data.map((b) => [b.id, b]))
  }, [localBots.data, localBots.isError])
  // The roster comes prebuilt: the assembler loads for my bots, the paste box, and a local or
  // shared bot picked.
  const assemble = useAssemble(source !== 'roster' || spec.bots.some((ref) => ref.kind === 'local'))
  // The players' public bots come prebuilt too: listed in the roster, and a `cloud:` ref's bot.
  const publicBots = usePublicBots(
    source === 'roster' || spec.bots.some((ref) => ref.kind === 'cloud'),
  )
  const cloud = useMemo(
    () => cloudMap(publicBots.data, publicBots.isError),
    [publicBots.data, publicBots.isError],
  )
  const selection = useMemo(
    () => resolveSelection(spec.bots, { local, shared, assemble, cloud }),
    [spec.bots, local, shared, assemble, cloud],
  )
  // The spacing slider ends where the bots stop surely fitting; a spacing past it comes down.
  const spacingCap = maxSpacing(sizesOf(selection))
  useEffect(() => {
    if (spec.config.minSpacing <= spacingCap) return
    onSpecChange((s) => ({ ...s, config: withConfig(s.config, { minSpacing: spacingCap }) }))
  }, [spacingCap, spec.config.minSpacing, onSpecChange])
  // My bots, assembled: null until the store is read and the assembler has loaded.
  const mine = useMemo(
    () =>
      assemble === null || localBots.data === undefined
        ? null
        : localBots.data.map((bot) => localCatalog(bot, assemble)),
    [localBots.data, assemble],
  )
  // The arena's class, when it has one, holds the picker's weight filter to it.
  const locked = spec.config.weight !== 'all'
  const filter: WeightFilter = locked ? spec.config.weight : weight
  // The bots the picker lists, in the sort's order: the search's, of the player, in the weight
  // class. The fills draw from them, `best fill` best ranked first. A bot's rank is its place among
  // the source's bots with a record. The roster is the house's bots and the players' public ones.
  const catalog =
    source === 'roster'
      ? [...rosterCatalog(), ...(cloud?.values() ?? [])]
      : source === 'mine'
        ? (mine ?? [])
        : []
  const ranks = ranksOf(catalog, records)
  // The players with the most bots, as pills, when there is more than one: the others are a search
  // away (it reads owners too). Each pill counts the player's bots that match the search in the
  // weight class, so the count is what the pill lists.
  const owners = source === 'roster' ? ownersOf(catalog).slice(0, PLAYER_PILLS) : []
  const player = owners.some((o) => o.owner === owner) ? owner : 'all'
  const shown = catalog.filter(
    (bot) => matchesQuery(bot, query) && inWeight(bot.assembled.bytes.length, filter),
  )
  const count = (n: number) => <span className="text-muted">{n}</span>
  const playerFilters = [
    { value: 'all', label: <>all {count(shown.length)}</> },
    ...owners.map((o) => ({
      value: o.owner,
      label: (
        <>
          {ownerAuthor(o.owner).name} {count(shown.filter((bot) => ownerOf(bot) === o.owner).length)}
        </>
      ),
    })),
  ]
  const searched = sortBots(catalog, sort, records).filter(
    (bot) => matchesQuery(bot, query) && (player === 'all' || ownerOf(bot) === player),
  )
  const listed = searched.filter((bot) => inWeight(bot.assembled.bytes.length, filter))
  // Each filter pill counts the search's bots in its class, and the other pills lock with a class.
  const weightFilters = WEIGHT_FILTERS.map(({ value, label }) => ({
    value,
    label: (
      <>
        {label}{' '}
        <span className="text-muted">
          {searched.filter((bot) => inWeight(bot.assembled.bytes.length, value)).length}
        </span>
      </>
    ),
    disabled: locked && value !== filter,
  }))
  const status = fightStatus(selection, spec)
  const full = spec.bots.length >= MAX_ARENA_BOTS
  // The tour's step: the roster until two bots are in, then the fight button.
  const tourStep =
    tour === undefined ? null : selection.length >= MIN_ARENA_BOTS ? 'fight' : 'roster'
  const clearSearch = {
    label:
      (locked || weight === 'all') && player === 'all' ? 'clear the search' : 'clear the filters',
    onClick: () => {
      setQuery('')
      setWeight('all')
      setOwner('all')
    },
  }
  // What an empty list names: `heavy roster bot matches "x"`, for the class and the search in force.
  const kind = filter === 'all' ? '' : `${WEIGHT_SHORT[filter]} `
  const matching = `${player === 'all' ? '' : ` of ${ownerAuthor(player).name}`}${
    query === '' ? '' : ` matches "${query}"`
  }`
  // The roster's count, and how the players' bots are doing while they are not in it yet.
  const rosterStatus = `${catalog.length} bots${
    publicBots.isError ? ' · players offline' : cloud === null ? ' · loading players' : ''
  }`
  // Bots of more than one class fight as open weight: said, so a 4 KB bot against a 15 B imp is no
  // surprise. An arena held to a class says what it refuses instead.
  const mixed =
    !locked &&
    new Set(sizesOf(selection).flatMap((size) => weightClassOf(size)?.slug ?? [])).size > 1

  useRouteStat(
    `${selection.length} ${selection.length === 1 ? 'bot' : 'bots'} · ${
      spec.config.preset ?? 'custom'
    } · seed ${spec.config.seed ?? 'random'}`,
  )

  /** Appends `refs` as far as there is room. Returns how many did not fit. */
  const add = (refs: readonly BotRef[]): number => {
    const room = Math.max(0, MAX_ARENA_BOTS - latest.current.bots.length)
    if (room > 0 && refs.length > 0) {
      onSpecChange((s) => ({ ...s, bots: [...s.bots, ...refs.slice(0, room)] }))
    }
    return Math.max(0, refs.length - room)
  }

  /**
   * The bots of `list` the arena's class takes, by their sizes. A warn toast says how many it
   * refused, and `then`, what became of them.
   */
  const inClass = <T,>(list: readonly T[], sizeOf: (item: T) => number, then = 'not added') => {
    const { weight } = latest.current.config
    const kept = list.filter((item) => inWeight(sizeOf(item), weight))
    const refused = list.length - kept.length
    if (refused > 0) {
      toast(`${refused} ${refused === 1 ? 'bot is' : 'bots are'} not ${weight}: ${then}.`, {
        variant: 'warn',
      })
    }
    return kept
  }

  /** Adds catalog bots the arena's class takes. */
  const addBot = (bot: CatalogBot) =>
    add(inClass([bot], (b) => b.assembled.bytes.length).map((b) => b.ref))

  /** Fills the selection to its cap from the bots listed: random picks, or the best ranked. */
  const fill = (best: boolean) => {
    const room = MAX_ARENA_BOTS - latest.current.bots.length
    const refs = best
      ? bestFill(sortBots(listed, 'rank', records), latest.current.bots, room)
      : randomFill(listed, latest.current.bots, room)
    add(refs)
    toast(
      `added ${refs.length} ${best ? 'best' : 'random'} ${refs.length === 1 ? 'bot' : 'bots'}.`,
      {
        variant: 'accent',
      },
    )
  }
  const fillable = !full && listed.some((bot) => errorsOf(bot).length === 0)

  const remove = (index: number) =>
    onSpecChange((s) => ({ ...s, bots: s.bots.filter((_, i) => i !== index) }))

  /** Empties the selection; the toast's `undo` puts it back. */
  const clear = () => {
    const { bots } = latest.current
    onSpecChange((s) => ({ ...s, bots: [] }))
    toast(`cleared ${bots.length} ${bots.length === 1 ? 'bot' : 'bots'}.`, {
      action: { label: 'undo', onClick: () => onSpecChange((s) => ({ ...s, bots })) },
    })
  }

  /** Changes the config. A class takes out the picked bots of the others, and says so. */
  const configure = (change: Partial<ArenaConfig>) => {
    const { weight = 'all' } = change
    const out = new Set(outsideWeight(selection, weight).map((s) => s.index))
    onSpecChange((s) => ({
      config: withConfig(s.config, change),
      bots: s.bots.filter((_, i) => !out.has(i)),
    }))
    if (out.size > 0) {
      toast(`removed ${out.size} ${out.size === 1 ? 'bot' : 'bots'} outside ${weight}.`, {
        variant: 'warn',
      })
    }
  }

  /** A roster bot's size, for the starters' class. */
  const rosterSize = (ref: BotRef) =>
    rosterCatalog().find((bot) => formatRef(bot.ref) === formatRef(ref))?.assembled.bytes.length ??
    0

  /** Saves each new source as a local bot, the same source once. Returns the refs, in order. */
  const saveSources = async (list: readonly { name: string; source: string }[]) => {
    const known = new Map((localBots.data ?? []).map((b) => [b.source, b.id]))
    const refs: BotRef[] = []
    for (const { name, source } of list) {
      let id = known.get(source)
      if (id === undefined) {
        id = (await save.mutateAsync({ name, source })).id
        known.set(source, id)
      }
      refs.push({ kind: 'local', id })
    }
    return refs
  }

  /** Dropped or picked files: `setup/files.ts`, a chunk loaded with the assembler at the first. */
  const addFiles = async (files: readonly File[]) => {
    if (files.length === 0) return
    let drop: typeof import('./setup/files')
    try {
      ;[drop] = await Promise.all([import('./setup/files'), loadAssembly()])
    } catch {
      toast('could not load the assembler: check the network and drop them again.', {
        variant: 'danger',
      })
      return
    }
    const found = await drop.addBotFiles(files, { save: saveSources, inClass, add, toast })
    if (found !== null) setProblems(found)
  }

  const showErrors = (bot: CatalogBot) =>
    setProblems({
      title: `${bot.name} does not assemble`,
      list: [
        { name: bot.name, source: bot.source ?? '', reason: null, diagnostics: errorsOf(bot) },
      ],
    })

  const fight = () => {
    const { minSpacing, seed: fixed, rounds } = spec.config
    const seed = fightSeed(sizesOf(selection), minSpacing, fixed, randomSeed, rounds)
    if (seed === null) {
      toast('the bots do not fit in the core: lower the spacing.', { variant: 'danger' })
      return
    }
    setLastArenaConfig(spec.config)
    onFight(arenaFight(selection, spec, seed))
  }

  const share = () => copyShareLink(spec, sharedSources(selection), toast)

  const saveShared = async (index: number) => {
    const bot = selection[index]?.bot
    if (bot?.origin !== 'shared' || bot.ref.kind !== 'local' || bot.source === null) return
    await save.mutateAsync({ id: bot.ref.id, name: bot.name, source: bot.source })
    toast(`saved ${bot.name} to my bots.`, { variant: 'accent' })
  }

  // Files dragged over the setup: the overlay says where they go. A counter, since each child the
  // drag crosses sends its own enter and leave.
  const dragging = dragDepth > 0
  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!carriesFiles(event)) return
    event.preventDefault()
    setDragDepth((depth) => depth + 1)
  }
  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!carriesFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (carriesFiles(event)) setDragDepth((depth) => Math.max(0, depth - 1))
  }
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!carriesFiles(event)) return
    event.preventDefault()
    setDragDepth(0)
    void addFiles(Array.from(event.dataTransfer.files))
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a drop target; `open files` is the keyboard's way in.
    <div
      className="relative p-3"
      data-dragging={dragging || undefined}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <PanelGrid>
        <PageIntro
          about={ARENA_ABOUT}
          more={<ArenaKinds />}
          art={
            <Suspense
              fallback={<div className="-my-2 hidden w-80 shrink-0 self-stretch md:block" />}
            >
              <IntroArt name="arena" />
            </Suspense>
          }
        />
        <Panel
          className="col-span-12 lg:col-span-8"
          data-tour="arena-roster"
          title={SOURCES.find((s) => s.value === source)?.label}
          status={source === 'roster' ? rosterStatus : undefined}
          actions={
            <>
              {source !== 'paste' && (
                <Input
                  {...{ [ROUTE_SEARCH]: '' }}
                  aria-label="search bots"
                  placeholder="search bots"
                  className="w-44"
                  value={query}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setQuery(event.currentTarget.value)
                  }
                />
              )}
              {source !== 'paste' && (
                <>
                  <Button
                    icon={Trophy}
                    size="sm"
                    title={`fill to ${MAX_ARENA_BOTS} bots with the best ranked of this list`}
                    disabled={!fillable}
                    onClick={() => fill(true)}
                  >
                    best fill
                  </Button>
                  <Button
                    icon={Dices}
                    size="sm"
                    title={`fill to ${MAX_ARENA_BOTS} bots with random picks from this list`}
                    disabled={!fillable}
                    onClick={() => fill(false)}
                  >
                    random fill
                  </Button>
                </>
              )}
              <Segmented<Source>
                label="bot source"
                options={SOURCES}
                value={source}
                onValueChange={setSource}
              />
            </>
          }
        >
          <div className="flex flex-col gap-3">
            {source !== 'paste' && (
              <div className="flex flex-wrap items-center gap-2">
                <span aria-hidden className="text-panel-status text-muted">
                  weight class
                </span>
                <Segmented<WeightFilter>
                  label="weight class"
                  options={weightFilters}
                  value={filter}
                  onValueChange={setWeight}
                  className="flex-wrap"
                />
              </div>
            )}
            {source !== 'paste' && (
              <div className="flex flex-wrap items-center gap-2">
                {owners.length > 1 && (
                  <>
                    <span aria-hidden className="text-panel-status text-muted">
                      player
                    </span>
                    <Segmented<string>
                      label="player"
                      options={playerFilters}
                      value={player}
                      onValueChange={setOwner}
                      className="flex-wrap"
                    />
                  </>
                )}
                <span aria-hidden className="text-panel-status text-muted">
                  sort
                </span>
                <Segmented<BotSort>
                  label="sort bots"
                  options={BOT_SORTS}
                  value={sort}
                  onValueChange={setSort}
                  className="flex-wrap"
                />
              </div>
            )}
            {source === 'roster' && (
              <BotGrid
                bots={listed}
                records={records}
                ranks={ranks}
                me={me}
                picked={spec.bots}
                full={full}
                onAdd={addBot}
                onErrors={showErrors}
                empty={
                  <EmptyState action={clearSearch}>
                    no {kind}roster bot{matching}.
                  </EmptyState>
                }
                coach={
                  tour !== undefined &&
                  tourStep === 'roster' && <RosterStep onDismiss={tour.onDismiss} />
                }
              />
            )}
            {source === 'mine' && (
              <MineGrid
                bots={localBots.data}
                catalog={mine}
                listed={listed}
                empty={`none of my ${kind}bots${matching}.`}
                records={records}
                ranks={ranks}
                me={me}
                picked={spec.bots}
                full={full}
                onAdd={addBot}
                onErrors={showErrors}
                write={link('write a bot', '/editor')}
                clearSearch={clearSearch}
              />
            )}
            {source === 'paste' && (
              <Suspense fallback={null}>
                <PasteBox
                  full={full}
                  me={me}
                  assemble={assemble}
                  onAdd={async (assembledName, text, size) => {
                    // A bot outside the class is not saved either: the text stays to change.
                    if (inClass([size], (n) => n).length === 0) return false
                    const refs = await saveSources([{ name: assembledName, source: text }])
                    add(refs)
                    toast(`added ${assembledName}.`, { variant: 'accent' })
                    return true
                  }}
                />
              </Suspense>
            )}
            <div className="flex items-center justify-between gap-3 rounded-sm border border-dashed border-border px-3 py-2 text-data text-muted">
              <span>drop .asm files anywhere here: each is assembled and saved to my bots.</span>
              <Button icon={FileUp} size="sm" onClick={() => picker.current?.click()}>
                open files
              </Button>
              <input
                ref={picker}
                type="file"
                accept=".asm"
                multiple
                aria-label="open .asm files"
                className="hidden"
                onChange={(event) => {
                  void addFiles(Array.from(event.currentTarget.files ?? []))
                  event.currentTarget.value = ''
                }}
              />
            </div>
          </div>
        </Panel>
        <div
          className="col-span-12 flex min-w-0 flex-col gap-3 lg:col-span-4"
          data-tour="arena-config"
        >
          <Panel
            title="bots"
            status={`${selection.length} / ${MAX_ARENA_BOTS}`}
            actions={
              <Button
                size="sm"
                title="remove every bot picked"
                disabled={selection.length === 0}
                onClick={clear}
              >
                clear
              </Button>
            }
          >
            <Selection
              selection={selection}
              me={me}
              onRemove={remove}
              onSave={(index) => void saveShared(index)}
              onErrors={showErrors}
              onStart={() => add(inClass(STARTERS, rosterSize))}
            />
            {mixed && <p className="mt-2 text-data text-muted">open weight: sizes mix</p>}
          </Panel>
          <Panel title="config" status={spec.config.preset ?? 'custom'}>
            <ConfigForm
              config={spec.config}
              onChange={configure}
              onPreset={(preset: PresetName) =>
                onSpecChange((s) => ({ ...s, config: withPreset(s.config, preset) }))
              }
              maxSpacing={spacingCap}
              bots={selection.length}
              weight
              speed={(id) => (
                <Slider
                  id={id}
                  {...SPEED_SLIDER}
                  className="flex-1"
                  value={arenaSpeed}
                  onValueChange={(value) => setArenaSpeed(speedOf(value))}
                  showValue
                />
              )}
            />
          </Panel>
          <div className="relative flex items-center gap-2" data-tour="arena-fight">
            {tour !== undefined && tourStep === 'fight' && <FightStep onDismiss={tour.onDismiss} />}
            <Button
              name="fight"
              variant="primary"
              size="lg"
              icon={Swords}
              className="flex-1"
              disabled={!status.ready}
              loading={status.busy}
              onClick={fight}
            >
              {status.label}
            </Button>
            <IconButton
              icon={Link}
              label="copy a share link"
              size="lg"
              tooltip="top"
              disabled={selection.length === 0}
              onClick={() => void share()}
            />
          </div>
        </div>
      </PanelGrid>
      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-10 grid place-items-center rounded-md border border-dashed border-accent bg-accent-10">
          <p className="text-nav text-accent-fg">drop .asm files to add them</p>
        </div>
      )}
      {problems !== null && (
        <Suspense fallback={null}>
          <ProblemsModal problems={problems} onClose={() => setProblems(null)} />
        </Suspense>
      )}
    </div>
  )
}

/** How many times each bot is picked, by ref. */
function pickCounts(picked: readonly BotRef[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const ref of picked) counts.set(formatRef(ref), (counts.get(formatRef(ref)) ?? 0) + 1)
  return counts
}

interface GridProps {
  /** This browser's bot records, and each ranked bot's place, by ref. */
  records: Readonly<Record<string, BotRecord>>
  ranks: ReadonlyMap<string, number>
  /** The signed-in user, whose own bots' authors link to them. */
  me: Me | null | undefined
  picked: readonly BotRef[]
  /** The selection is at its cap: no `+`. */
  full: boolean
  onAdd: (bot: CatalogBot) => void
  onErrors: (bot: CatalogBot) => void
}

/** Bot cards, three across on a wide screen. */
function BotGrid({
  bots,
  records,
  ranks,
  me,
  picked,
  full,
  onAdd,
  onErrors,
  empty,
  coach,
}: GridProps & {
  bots: readonly CatalogBot[]
  /** What shows when no bot matches: an EmptyState. */
  empty: ReactNode
  /** A coach mark to pin to the first card's `+`: the tour's first step. */
  coach?: ReactNode
}) {
  const counts = pickCounts(picked)
  if (bots.length === 0) return empty
  return (
    <ul aria-label="bots to add" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {bots.map((bot, index) => (
        <BotCard
          key={formatRef(bot.ref)}
          bot={bot}
          record={records[formatRef(bot.ref)]}
          rank={ranks.get(formatRef(bot.ref))}
          author={catalogAuthor(bot, me)}
          count={counts.get(formatRef(bot.ref)) ?? 0}
          full={full}
          onAdd={() => onAdd(bot)}
          onErrors={() => onErrors(bot)}
          coach={index === 0 ? coach : undefined}
        />
      ))}
    </ul>
  )
}

/**
 * Who wrote a bot the setup lists: the house, for a roster bot; its owner, for a public bot; else
 * its `%author`, linked when it is the reader's, and read as theirs when a local bot has none.
 */
function catalogAuthor(bot: CatalogBot, me: Me | null | undefined): Author {
  if (bot.origin === 'roster') return ownerAuthor(HOUSE_HANDLE)
  if (bot.cloud !== undefined) return ownerAuthor(bot.cloud.bot.owner)
  return sourceAuthor(bot.author, me, bot.origin === 'local')
}

/** What a bot's origin chip says: a public bot is a player's. */
const ORIGIN_LABEL: Record<CatalogBot['origin'], string> = {
  roster: 'roster',
  cloud: 'player',
  local: 'local',
  shared: 'shared',
}

/**
 * A bot in the picker: its identicon, name, author (a link to their profile when the site knows
 * it), size and weight class, and tier (a roster bot) or `local`, and `+`. A bot already picked
 * shows how often; a bot that does not assemble shows `errors`. A bot with a record shows its rank
 * and its wins, losses, and draws: `#3 · 12-4-1 · 71%`.
 */
function BotCard({
  bot,
  record,
  rank,
  author,
  count,
  full,
  onAdd,
  onErrors,
  coach,
}: {
  bot: CatalogBot
  record: BotRecord | undefined
  rank: number | undefined
  author: Author
  count: number
  full: boolean
  onAdd: () => void
  onErrors: () => void
  coach?: ReactNode
}) {
  const { bytes } = bot.assembled
  const broken = errorsOf(bot).length > 0
  const weight = broken ? null : weightClassOf(bytes.length)
  const blurb = bot.roster?.blurb ?? bot.assembled.strategy
  const hill = bot.cloud?.best ?? null
  return (
    <li
      aria-label={bot.name}
      className="flex min-w-0 items-start gap-3 rounded-md border border-border bg-panel-2 p-2 transition-colors duration-120 ease-out hover:border-border-strong"
    >
      <Identicon value={bytes.length > 0 ? bytes : (bot.source ?? '')} size={32} />
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate text-bright">{bot.name}</span>
          {count > 0 && <Chip variant="accent">×{count}</Chip>}
        </p>
        {hill !== null && (
          <p
            className="truncate text-data text-muted"
            title={`best place on a hill · rating · ${hill.wins}-${hill.ties}-${hill.losses} there`}
          >
            <span className="text-accent-fg">{hill.rank === 1 ? 'king' : `#${hill.rank}`}</span>
            {` · ${hill.hill.name} · ${Math.round(hill.rating)}`}
          </p>
        )}
        {record !== undefined && rank !== undefined && (
          <p
            className="truncate text-data text-muted"
            title="rank · wins-losses-draws · win rate, in this browser's arena"
          >
            <span className="text-accent-fg">#{rank}</span> · {record.wins}-{record.losses}-
            {record.draws} · {Math.round((100 * record.wins) / gamesOf(record))}%
          </p>
        )}
        <p className="flex min-w-0 items-center gap-2 text-data text-muted">
          {/* The author gives way first: the size stays whole beside the class chip. */}
          <span className="flex min-w-0">
            {/* Out of the Tab order: every card has one, and `+` is the card's stop. */}
            <AuthorLink author={author} className="truncate" untabbed />
            <span className="shrink-0 whitespace-pre">
              {' · '}
              {broken ? '—' : `${bytes.length} B`}
            </span>
          </span>
          {weight !== null && <WeightChip weight={weight} />}
        </p>
        {blurb !== '' && (
          // Two lines: a card is wide enough for most blurbs whole, and the hover holds the rest.
          <p className="line-clamp-2 text-data text-muted" title={blurb}>
            {blurb}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {broken ? (
          <button
            type="button"
            className="rounded-sm focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent"
            onClick={onErrors}
          >
            <Chip variant="danger">errors</Chip>
          </button>
        ) : (
          <span className="relative flex">
            <IconButton
              icon={Plus}
              label={`add ${bot.name}`}
              size="sm"
              tooltip="left"
              disabled={full}
              onClick={onAdd}
            />
            {coach}
          </span>
        )}
        <Chip variant={bot.roster?.tier === 'showcase' ? 'accent' : 'neutral'}>
          {bot.roster?.tier ?? ORIGIN_LABEL[bot.origin]}
        </Chip>
      </div>
    </li>
  )
}

/** The local bots as cards, or the one sentence that says there are none. */
function MineGrid({
  bots,
  catalog,
  listed,
  empty,
  write,
  clearSearch,
  ...grid
}: GridProps & {
  bots: readonly LocalBot[] | undefined
  /** The bots, assembled: null while the assembler loads. */
  catalog: readonly CatalogBot[] | null
  /** The ones that match the search and the weight class. */
  listed: readonly CatalogBot[]
  /** What shows when none does. */
  empty: string
  /** The empty store's way on: the editor. */
  write: EmptyStateAction
  clearSearch: EmptyStateAction
}) {
  if (bots === undefined || (catalog === null && bots.length > 0))
    return <p className="px-1 py-6 text-center text-muted">reading my bots…</p>
  if (bots.length === 0) {
    return <EmptyState action={write}>no bots in this browser yet.</EmptyState>
  }
  return (
    <BotGrid
      {...grid}
      bots={listed}
      empty={<EmptyState action={clearSearch}>{empty}</EmptyState>}
    />
  )
}

/**
 * The bots picked, in the order they load: each with its hue swatch, its battle name and author,
 * where it comes from, its size and weight class, and `remove`. A shared bot can be saved to my
 * bots.
 */
function Selection({
  selection,
  me,
  onRemove,
  onSave,
  onErrors,
  onStart,
}: {
  selection: readonly SetupBot[]
  me: Me | null | undefined
  onRemove: (index: number) => void
  onSave: (index: number) => void
  onErrors: (bot: CatalogBot) => void
  onStart: () => void
}) {
  if (selection.length === 0) {
    return (
      <EmptyState action={{ label: 'try dwarf vs paper', onClick: onStart }}>
        no bots yet: add some from the roster, or
      </EmptyState>
    )
  }
  return (
    <ol aria-label="bots picked" className="flex flex-col">
      {selection.map((entry) => {
        const { index, name, state, bot } = entry
        return (
          <li
            key={`${index}:${formatRef(entry.ref)}`}
            aria-label={name}
            className="flex min-w-0 items-center gap-2 border-b border-border py-1 last:border-b-0"
          >
            <HueSwatch hue={index} />
            <span className="w-5 shrink-0 text-right text-data text-muted">{index + 1}</span>
            {/* The author gives way first. */}
            <span className="min-w-0 flex-1 truncate text-bright">
              {name}
              {bot !== null && <ByAuthor author={catalogAuthor(bot, me)} className="text-data" />}
            </span>
            <SelectionState entry={entry} onErrors={onErrors} />
            {state === 'ready' && bot !== null && <SizeOf bytes={bot.assembled.bytes.length} />}
            {bot?.origin === 'shared' && (
              <IconButton
                icon={Save}
                label={`save ${name} to my bots`}
                size="sm"
                tooltip="left"
                onClick={() => onSave(index)}
              />
            )}
            <IconButton
              icon={X}
              label={`remove ${name}`}
              size="sm"
              tooltip="left"
              onClick={() => onRemove(index)}
            />
          </li>
        )
      })}
    </ol>
  )
}

/** A picked bot's size and its class chip. */
function SizeOf({ bytes }: { bytes: number }) {
  const weight = weightClassOf(bytes)
  return (
    <>
      <span className="text-data text-muted">{bytes} B</span>
      {weight !== null && <WeightChip weight={weight} />}
    </>
  )
}

function SelectionState({
  entry: { state, bot, ref },
  onErrors,
}: {
  entry: SetupBot
  onErrors: (bot: CatalogBot) => void
}) {
  switch (state) {
    case 'loading':
      return <Chip>loading</Chip>
    case 'missing':
      return (
        <Chip
          variant="danger"
          title={
            ref.kind === 'local'
              ? 'not in this browser: ask for a share link with its source'
              : ref.kind === 'cloud'
                ? 'not public, or gone from the server'
                : 'not in the roster'
          }
        >
          missing
        </Chip>
      )
    case 'broken':
      return (
        <button
          type="button"
          className="rounded-sm focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent"
          onClick={() => bot !== null && onErrors(bot)}
        >
          <Chip variant="danger">errors</Chip>
        </button>
      )
    case 'ready':
      return <Chip>{bot === null ? 'roster' : ORIGIN_LABEL[bot.origin]}</Chip>
  }
}
