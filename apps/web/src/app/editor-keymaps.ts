/**
 * The editor page's keys as data, beside the site's in `keymaps.ts`: outside the source, the
 * debugger's, and the source editor's own. A module of its own, so no other page loads them.
 */
import type { KeyBinding } from '@asmbots/ui'

/** A set of bindings by name, for a hook to pick from. */
type Bindings = Readonly<Record<string, KeyBinding>>

/** The editor page's keys outside the source. */
export const EDITOR_KEYS = {
  listing: { keys: ['l'], description: 'show or hide the listing', group: 'editor' },
  library: { keys: ['b'], description: 'show or hide the bot library', group: 'editor' },
} as const satisfies Bindings

/** A debugger command a function key runs. */
export type DebugFunction = 'run' | 'pause' | 'toggleBreakpoint' | 'stepOver' | 'step' | 'stepOut'

/**
 * The debugger's function keys: the key, whether Shift is down, the command, and its words. They
 * work wherever the focus is, the source included, so a window listener runs them, not the keymap.
 */
export const DEBUG_FUNCTION_KEYS: readonly {
  readonly key: string
  readonly shift: boolean
  readonly command: DebugFunction
  readonly description: string
}[] = [
  { key: 'F5', shift: false, command: 'run', description: 'run' },
  { key: 'F6', shift: false, command: 'pause', description: 'pause' },
  {
    key: 'F9',
    shift: false,
    command: 'toggleBreakpoint',
    description: "breakpoint on the cursor's line",
  },
  { key: 'F10', shift: false, command: 'stepOver', description: 'step over' },
  { key: 'F11', shift: false, command: 'step', description: 'step' },
  { key: 'F11', shift: true, command: 'stepOut', description: 'step out' },
]

/** A function key as the key help shows it: `F11`, `shift+F11`. */
export function functionKey({ key, shift, description }: (typeof DEBUG_FUNCTION_KEYS)[number]) {
  return { keys: [shift ? `shift+${key}` : key], description, group: 'debugger' }
}

/** The debugger's other keys, while a session is open. */
export const DEBUG_KEYS = {
  run: { keys: ['space'], description: 'run or pause', group: 'debugger' },
  step: { keys: ['.'], description: 'step', group: 'debugger' },
  back: { keys: [','], description: 'step back', group: 'debugger' },
  slower: { keys: ['['], description: 'slower runs', group: 'debugger' },
  faster: { keys: [']'], description: 'faster runs', group: 'debugger' },
  zoom: { keys: ['0'], description: "the strip's whole core", group: 'debugger' },
} as const satisfies Bindings

/** A key of the source editor: its CodeMirror name, and how the key help writes it. */
export interface SourceKey extends KeyBinding {
  /** CodeMirror's name for it: `Mod-Enter`. `Mod` is Cmd on macOS and Ctrl elsewhere. */
  readonly cm: string
}

/** The source editor's own keys, while it has the focus. The page's `mod+s` works anywhere. */
export const SOURCE_KEYS = {
  assemble: {
    cm: 'Mod-Enter',
    keys: ['mod+enter'],
    description: 'assemble now',
    group: 'source',
  },
  format: { cm: 'Shift-Alt-f', keys: ['shift+alt+f'], description: 'format', group: 'source' },
  problem: { cm: 'F8', keys: ['F8'], description: 'next problem', group: 'source' },
  tab: { cm: 'Tab', keys: ['tab'], description: 'to the next column, 8 apart', group: 'source' },
  untab: { cm: 'Shift-Tab', keys: ['shift+tab'], description: 'indent less', group: 'source' },
  leave: { cm: 'Escape', keys: ['esc'], description: 'leave the source', group: 'source' },
  save: { cm: 'Mod-s', keys: ['mod+s'], description: 'save', group: 'source' },
} as const satisfies Readonly<Record<string, SourceKey>>
