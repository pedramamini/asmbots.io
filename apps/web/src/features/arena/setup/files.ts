/**
 * Dropped or picked `.asm` files, into the setup (PRODUCT_SPEC §2): read and assembled, saved to my
 * bots, and picked as far as the class and the room allow. A chunk of its own, loaded at the first
 * drop with the assembler: the setup sits at the edge of its budget.
 */
import type { Diag } from '@asmbots/asm'
import type { ToastApi } from '@asmbots/ui'
import { loadAssembly } from './assembler'
import type { BotFile } from './assembly'
import { MAX_ARENA_BOTS } from './config'
import type { BotRef } from './url'

/** A file or a bot that did not assemble, as the problem modal lists it. */
export interface Problem {
  readonly name: string
  readonly source: string
  /** Why it was not read at all, instead of diagnostics. */
  readonly reason: string | null
  readonly diagnostics: readonly Diag[]
}

/** What the problem modal shows: its title, and each file or bot. */
export interface Problems {
  readonly title: string
  readonly list: readonly Problem[]
}

/** What the setup lends a drop. */
export interface FileActions {
  /** Saves each source as a local bot, the same source once; the refs, in order. */
  readonly save: (list: readonly { name: string; source: string }[]) => Promise<BotRef[]>
  /** The items the arena's class takes; it says how many it refused, and `then`. */
  readonly inClass: <T>(list: readonly T[], sizeOf: (item: T) => number, then?: string) => T[]
  /** Picks refs as far as there is room; how many did not fit. */
  readonly add: (refs: readonly BotRef[]) => number
  readonly toast: ToastApi['toast']
}

/**
 * Adds `files`: each that assembles is saved to my bots, and picked when the class takes it and
 * there is room. Returns the files that did not assemble, as the problem modal lists them, or null.
 */
export async function addBotFiles(
  files: readonly File[],
  { save, inClass, add, toast }: FileActions,
): Promise<Problems | null> {
  const { fileAssembles, readBotFiles } = await loadAssembly()
  const read = await readBotFiles(files)
  const good = read.filter(fileAssembles)
  const bad = read.filter((file) => !fileAssembles(file))
  try {
    const saved = await save(
      good.map((file) => ({
        name: file.assembled.name || file.file.replace(/\.asm$/i, ''),
        source: file.source,
      })),
    )
    const kept = inClass(
      good.map(({ assembled }, i) => ({ ref: saved[i] as BotRef, assembled })),
      (bot) => bot.assembled.bytes.length,
      'saved to my bots, not added',
    )
    const left = add(kept.map((bot) => bot.ref))
    const added = kept.length - left
    if (left > 0) {
      toast(`${MAX_ARENA_BOTS} bots at most: ${left} saved to my bots, not added.`, {
        variant: 'warn',
      })
    } else if (added > 0) {
      const name = added === 1 ? kept[0]?.assembled.name : undefined
      toast(`added ${name ?? `${added} bots`}.`, { variant: 'accent' })
    }
  } catch {
    toast('could not save the bots in this browser.', { variant: 'danger' })
  }
  if (bad.length === 0) return null
  return {
    title: `${bad.length === 1 ? (bad[0]?.file ?? 'a file') : `${bad.length} files`} did not assemble`,
    list: bad.map(fileProblem),
  }
}

function fileProblem(file: BotFile): Problem {
  const diagnostics = file.assembled?.diagnostics.filter((d) => d.severity === 'error') ?? []
  return { name: file.file, source: file.source, reason: file.problem, diagnostics }
}
