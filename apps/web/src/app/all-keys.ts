/**
 * Every key the app binds, from every page, in one list (the key help's and the docs' keyboard
 * map), built from the same data the routes register (`keymaps.ts`, `editor-keymaps.ts`). Each
 * group is titled by where its keys work: `arena · in a battle`, `editor · debugger open`.
 */
import type { KeyBinding } from '@asmbots/ui'
import {
  DEBUG_FUNCTION_KEYS,
  DEBUG_KEYS,
  EDITOR_KEYS,
  functionKey,
  SOURCE_KEYS,
} from './editor-keymaps'
import { NAV } from './Frame'
import { ARENA_KEYS, CYCLE_KEYS, DIGIT_BOTS, GLOBAL_KEYS, goKey } from './keymaps'

/** A registered group's title, which says where its keys work. */
const WHERE: Readonly<Record<string, string>> = {
  global: 'everywhere',
  go: 'go to a page',
  arena: 'arena · in a battle',
  core: 'arena · the core focused',
  editor: 'editor',
  source: 'editor · in the source',
  debugger: 'editor · debugger open',
}

/** `binding` under its group's title, with nothing but the three fields. */
export function titled({ keys, description, group }: KeyBinding): KeyBinding {
  return { keys, description, group: WHERE[group ?? ''] ?? group }
}

/** The core's own keys, while the arena has the focus (`ArenaCanvas`). */
const CORE_KEYS: readonly KeyBinding[] = [
  { keys: ['↑ ↓ ← →'], description: 'pan', group: 'core' },
  { keys: ['+'], description: 'zoom in', group: 'core' },
  { keys: ['-'], description: 'zoom out', group: 'core' },
]

/** Every binding of the app, a group each place its keys work, titled. */
export function allBindings(): KeyBinding[] {
  const { fullscreen, screenshot, record, ...arena } = ARENA_KEYS
  return [
    ...Object.values(GLOBAL_KEYS),
    ...NAV.map(({ key, label }) => goKey(key, label)),
    ...Object.values(CYCLE_KEYS),
    ...Object.values(arena),
    { keys: [`1..${DIGIT_BOTS}`], description: 'isolate bot n', group: 'arena' },
    fullscreen,
    screenshot,
    record,
    ...CORE_KEYS,
    ...Object.values(EDITOR_KEYS),
    ...Object.values(SOURCE_KEYS),
    ...DEBUG_FUNCTION_KEYS.map(functionKey),
    ...Object.values(DEBUG_KEYS),
  ].map(titled)
}

/**
 * `allBindings()`, and after them any key a page registers that the list lacks (a new page's),
 * so the key help never hides a live key.
 */
export function everyBinding(live: readonly KeyBinding[]): KeyBinding[] {
  const all = allBindings()
  const known = new Set(all.map(({ keys, group }) => `${group}:${keys.join(' ')}`))
  const extra = live
    .map(titled)
    .filter(({ keys, group }) => !known.has(`${group}:${keys.join(' ')}`))
  return [...all, ...extra]
}
