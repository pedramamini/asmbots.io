import { MAX_BOT_BYTES } from '@asmbots/asm'
import { weightClassOf } from '@asmbots/protocol'
import {
  Button,
  Chip,
  type ChipVariant,
  cx,
  FilterMenu,
  IconButton,
  Input,
  Kbd,
  Menu,
  Toggle,
  Tooltip,
} from '@asmbots/ui'
import {
  AlignLeft,
  Binary,
  Eye,
  EyeOff,
  GitFork,
  Hammer,
  History,
  LayoutDashboard,
  LayoutTemplate,
  Link,
  type LucideIcon,
  PanelLeft,
  Save,
  Swords,
} from 'lucide-react'
import type { ChangeEvent, MouseEvent } from 'react'
import { EDITOR_ABOUT } from '../../app/intros/editor'
import { useRouteAbout } from '../../app/slots'
import { type CatalogBot, rosterCatalog } from '../arena/setup/bots'
import type { SharedBot } from '../arena/setup/url'
import { count } from '../hills/links'
import { WEIGHT_SHORT, weightBounds } from '../hills/weight-names'
import type { AsmResult } from './asm/protocol'
import {
  FIXED_PANELS,
  PANEL_IDS,
  PANEL_LABELS,
  type PanelId,
  PRESET_LABELS,
  PRESETS,
  type PresetId,
} from './layout/tree'
import { TEMPLATES, type TemplateId } from './templates'
import { type Tally, TEST_ROUNDS } from './test-vs'

/** Where `test vs` stands: nothing yet, a match running, or its record. */
export type TestState =
  | { readonly status: 'idle' }
  | { readonly status: 'running'; readonly opponent: CatalogBot }
  | {
      readonly status: 'done'
      readonly opponent: CatalogBot
      readonly tally: Tally
      readonly seed: number
      /** The text that was tested, under the id the arena knows it by. */
      readonly tested: SharedBot
    }

/** A document's save state: never saved, as saved, changed since, or a roster bot. */
export type SaveState = 'new' | 'saved' | 'dirty' | 'read-only'

export interface EditorToolbarProps {
  /** The file name, as typed. */
  name: string
  /** What the empty name field shows: the bot's `%name`. */
  namePlaceholder: string
  onNameChange: (name: string) => void
  saveState: SaveState
  result: AsmResult | null
  pending: boolean
  library: boolean
  onLibrary: () => void
  /** The panels the layout hides. */
  hiddenPanels: readonly PanelId[]
  onPanelHidden: (id: PanelId, hide: boolean) => void
  onPreset: (preset: PresetId) => void
  listing: boolean
  onListing: () => void
  lint: boolean
  onLint: (lint: boolean) => void
  saving: boolean
  onAssemble: () => void
  onFormat: () => void
  onSave: () => void
  onFork: () => void
  onVersions: () => void
  /** Whether the bot has saves to list. */
  canVersions: boolean
  onShare: () => void
  test: TestState
  /** The text changed since the test ran. */
  testStale: boolean
  onTest: (opponent: CatalogBot) => void
  /** The arena, set up as the test was: the link, and what a click does. */
  watchHref: string | undefined
  onWatch: () => void
  onTemplate: (id: TemplateId) => void
  onBaseIdiom: () => void
}

/** The key the platform names Mod by. */
function modKey(): string {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? '⌘'
    : 'ctrl'
}

/**
 * The editor's toolbar (PRODUCT_SPEC §3): the library switch, the file name and its save state,
 * the `%name` badge, the size against the cap, then assemble, format, lint, save (or fork, for a
 * roster bot), versions, share, `test vs ▾` and its record, and at the right the templates and
 * the listing switch.
 */
export function EditorToolbar(props: EditorToolbarProps) {
  const { result, saveState, test } = props
  useRouteAbout(EDITOR_ABOUT)
  const readOnly = saveState === 'read-only'
  const mod = modKey()
  const opponents = rosterCatalog()
    .filter((bot) => bot.roster?.tier !== 'test')
    .map((bot) => ({
      label: bot.roster?.slug ?? bot.name.toLowerCase(),
      onSelect: () => props.onTest(bot),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const botName = result?.assembled.name ?? ''
  return (
    <>
      <IconButton
        icon={PanelLeft}
        label="bot library"
        shortcut="b"
        pressed={props.library}
        onClick={props.onLibrary}
      />
      <Input
        aria-label="file name"
        className="w-36"
        value={props.name}
        placeholder={props.namePlaceholder}
        disabled={readOnly}
        spellCheck={false}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          props.onNameChange(event.currentTarget.value)
        }
      />
      <SaveChip state={saveState} />
      <Chip
        variant={result !== null && botName === '' ? 'danger' : 'neutral'}
        title="the bot's %name"
      >
        {result === null ? '%name …' : botName === '' ? 'no %name' : botName}
      </Chip>
      <SizeChip result={result} pending={props.pending} />
      <Divider />
      <ActionButton
        icon={Hammer}
        label="assemble"
        shortcut={`${mod} enter`}
        onClick={props.onAssemble}
      />
      <ActionButton
        icon={AlignLeft}
        label="format"
        shortcut="shift alt f"
        disabled={readOnly}
        onClick={props.onFormat}
      />
      <Toggle pressed={props.lint} onPressedChange={props.onLint} title="show lint warnings">
        lint
      </Toggle>
      {readOnly ? (
        <Button icon={GitFork} onClick={props.onFork}>
          fork
        </Button>
      ) : (
        <ActionButton
          icon={Save}
          label="save"
          shortcut={`${mod} s`}
          disabled={props.saving}
          onClick={props.onSave}
        />
      )}
      <ActionButton
        icon={History}
        label="versions"
        disabled={!props.canVersions}
        onClick={props.onVersions}
      />
      <ActionButton icon={Link} label="share" onClick={props.onShare} />
      <Divider />
      <FilterMenu
        trigger={
          <Button icon={Swords} loading={test.status === 'running'}>
            test vs ▾
          </Button>
        }
        items={opponents}
        filter="filter bots"
      />
      <TestRecord {...props} />
      <div className="ml-auto flex items-center gap-2">
        <Menu
          placement="bottom-end"
          trigger={<Button icon={LayoutTemplate}>templates ▾</Button>}
          items={[
            ...TEMPLATES.map((template) => ({
              label: template.label,
              onSelect: () => props.onTemplate(template.id),
            })),
            'separator',
            { label: 'base idiom', disabled: readOnly, onSelect: props.onBaseIdiom },
          ]}
        />
        <LayoutMenu {...props} />
        <IconButton
          icon={Binary}
          label="listing"
          shortcut="l"
          pressed={props.listing}
          onClick={props.onListing}
        />
      </div>
    </>
  )
}

/** The layout menu: each panel shown or hidden, and the preset layouts. */
function LayoutMenu({ hiddenPanels, onPanelHidden, onPreset }: EditorToolbarProps) {
  const toggles = PANEL_IDS.filter((id) => !FIXED_PANELS.has(id)).map((id) => {
    const hidden = hiddenPanels.includes(id)
    return {
      label: `${hidden ? 'show' : 'hide'} ${PANEL_LABELS[id]}`,
      icon: hidden ? EyeOff : Eye,
      onSelect: () => onPanelHidden(id, !hidden),
    }
  })
  const presets = (Object.keys(PRESETS) as PresetId[]).map((preset) => ({
    label: `${PRESET_LABELS[preset]} layout`,
    icon: LayoutDashboard,
    onSelect: () => onPreset(preset),
  }))
  return (
    <Menu
      placement="bottom-end"
      trigger={<Button icon={LayoutDashboard}>layout ▾</Button>}
      items={[...toggles, 'separator', ...presets]}
    />
  )
}

/**
 * An action with its label beside the icon, like `fork`, from 1680 px wide (the room the labels and
 * a `test vs` record need); narrower, the label hides and it is an `IconButton`'s square. The
 * tooltip names it and its shortcut.
 */
function ActionButton({
  icon,
  label,
  shortcut,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  shortcut?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip
      content={
        <>
          {label}
          {shortcut !== undefined && <Kbd>{shortcut}</Kbd>}
        </>
      }
      placement="bottom"
      describe={false}
    >
      <Button
        icon={icon}
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className="max-[1680px]:w-6 max-[1680px]:px-0 max-[1680px]:text-text max-[1680px]:[&_svg]:size-4"
      >
        <span className="max-[1680px]:hidden">{label}</span>
      </Button>
    </Tooltip>
  )
}

function Divider() {
  return <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
}

function SaveChip({ state }: { state: SaveState }) {
  switch (state) {
    case 'new':
      return <Chip title="not saved yet">new</Chip>
    case 'dirty':
      return (
        <Chip variant="warn" title="changed since the last save">
          unsaved
        </Chip>
      )
    case 'read-only':
      return (
        <Chip variant="info" title="a roster bot: fork it to edit">
          read-only
        </Chip>
      )
    case 'saved':
      return null
  }
}

/**
 * The size and its weight class: `142 B · light`. Warn within 10% under the class's upper bound
 * (the next byte moves it up a class), danger only past the absolute cap.
 */
export function sizeReading(result: Pick<AsmResult, 'size'> | null): {
  variant: ChipVariant
  text: string
  title: string
} {
  const cap = MAX_BOT_BYTES
  const size = result?.size ?? null
  const weight = size === null ? null : weightClassOf(size)
  const variant: ChipVariant =
    size === null
      ? 'neutral'
      : size > cap
        ? 'danger'
        : weight !== null && size * 10 >= weight.max * 9
          ? 'warn'
          : 'neutral'
  const text =
    result === null
      ? '… B'
      : size === null
        ? '— B'
        : weight === null
          ? `${count(size)} B${size > cap ? ' · over' : ''}`
          : `${count(size)} B · ${WEIGHT_SHORT[weight.slug]}`
  const title =
    result === null
      ? 'assembling'
      : size === null
        ? 'the size shows once the errors are fixed'
        : size > cap
          ? `${count(size - cap)} bytes over the ${count(cap)}-byte cap: trim it`
          : weight === null
            ? 'an empty bot'
            : variant === 'warn'
              ? `${count(weight.max - size)} bytes under the ${weight.name} limit; past ${count(weight.max)} it is ${nextClass(weight.max)}`
              : weightBounds(weight)
  return { variant, text, title }
}

function SizeChip({ result, pending }: { result: AsmResult | null; pending: boolean }) {
  const { variant, text, title } = sizeReading(result)
  return (
    <Chip
      variant={variant}
      title={title}
      aria-label={`size ${text}`}
      className={cx('tabular-nums', pending && 'opacity-60')}
    >
      {text}
    </Chip>
  )
}

/** What a bot one byte past `max` is: `a middleweight`, or `too big for any hill`. */
function nextClass(max: number): string {
  const next = weightClassOf(max + 1)
  return next === null ? 'too big for any hill' : `a ${next.name}`
}

/** The test's record, `W 7 · T 2 · L 1`, and `watch`; dimmed once the text has changed. */
function TestRecord({ test, testStale, watchHref, onWatch }: EditorToolbarProps) {
  if (test.status !== 'done') return null
  const { wins, ties, losses } = test.tally
  const variant: ChipVariant = wins > losses ? 'accent' : losses > wins ? 'danger' : 'neutral'
  const against = test.opponent.name
  return (
    <span className={cx('flex items-center gap-2', testStale && 'opacity-60')}>
      <Chip
        variant={variant}
        role="status"
        aria-label={`vs ${against}: ${wins} won, ${ties} tied, ${losses} lost`}
        title={`${TEST_ROUNDS} rounds vs ${against}, seed ${test.seed}${
          testStale ? '; the source changed since' : ''
        }`}
      >
        W {wins} · T {ties} · L {losses} vs {test.opponent.roster?.slug ?? against}
      </Chip>
      <a
        href={watchHref}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
          event.preventDefault()
          onWatch()
        }}
        className="rounded-sm text-data text-accent-fg underline-offset-2 hover:underline focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        watch
      </a>
    </span>
  )
}
