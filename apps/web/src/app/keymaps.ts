/**
 * The app's keys as data (PRODUCT_SPEC §2, §3): the keys, the words, and the group of each
 * command that a route registers on the keymap (`keys.ts`); the editor's are in `editor-keymaps.ts`.
 * Each hook pairs an entry here with its command, so the key help (`?`), the settings
 * page, and the docs' keyboard map (`/docs/tools/keys`) all read the same words. The module holds
 * no code, so the docs can import it without the arena or the editor.
 */
import type { KeyBinding } from '@asmbots/ui'

/** A set of bindings by name, for a hook to pick from. */
type Bindings = Readonly<Record<string, KeyBinding>>

/** Every page's keys, from the frame. The `g` chords come from the nav (`goKey`). */
export const GLOBAL_KEYS = {
  help: { keys: ['?'], description: 'show the keys', group: 'global' },
  commands: { keys: ['mod+k'], description: 'commands and themes', group: 'global' },
  search: { keys: ['/'], description: 'search this page', group: 'global' },
} as const satisfies Bindings

/** The `g` chord to a route of the header: `g a` goes to the arena. */
export function goKey(key: string, label: string): KeyBinding {
  return { keys: ['g', key], description: `go to ${label}`, group: 'go' }
}

/** The header's routes in their order, wrapping at each end: `alt+]` from docs goes home. */
export const CYCLE_KEYS = {
  previous: { keys: ['alt+['], description: 'go to the previous route', group: 'go' },
  next: { keys: ['alt+]'], description: 'go to the next route', group: 'go' },
} as const satisfies Bindings

/** The arena's keys while a battle shows. `1`..`9` come from `isolateKey`. */
export const ARENA_KEYS = {
  play: { keys: ['space'], description: 'play or pause', group: 'arena' },
  step: { keys: ['.'], description: 'step one cycle', group: 'arena' },
  back: { keys: [','], description: 'step back one cycle', group: 'arena' },
  slower: { keys: ['-'], description: 'slower', group: 'arena' },
  faster: { keys: ['+'], description: 'faster', group: 'arena' },
  zoom: { keys: ['0'], description: 'reset the zoom', group: 'arena' },
  fullscreen: { keys: ['f'], description: 'fullscreen', group: 'arena' },
  screenshot: { keys: ['s'], description: 'screenshot', group: 'arena' },
  record: { keys: ['v'], description: 'record a video, or stop and save it', group: 'arena' },
  mute: { keys: ['m'], description: 'sound on or off', group: 'arena' },
} as const satisfies Bindings

/** The most bots the digit keys reach. */
export const DIGIT_BOTS = 9

/** The digit key that isolates bot `bot` (from 0) in the arena. */
export function isolateKey(bot: number): KeyBinding {
  return { keys: [String(bot + 1)], description: `isolate bot ${bot + 1}`, group: 'arena' }
}
