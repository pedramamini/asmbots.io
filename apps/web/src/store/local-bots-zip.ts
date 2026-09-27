/**
 * The local bots as a zip: the settings page's export and import. Apart from `local-bots.ts`, so
 * the arena and the editor, which save bots but never zip them, do not load fflate's zip code
 * (Rollup places a module whole, with every export any page uses).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { LOCAL_BOTS_KEY, type LocalBot, saveLocalBot } from './local-bots'

/** The earliest time a zip entry can carry (DOS dates start in 1980); fflate throws before it. */
const ZIP_EPOCH = Date.UTC(1980, 0, 2)

/** A zip of the bots: one `<name>.asm` each, names made file-safe and unique. */
export function botsToZip(bots: readonly LocalBot[]): Uint8Array {
  const taken = new Set<string>()
  const files: Record<string, [Uint8Array, { mtime: Date }]> = {}
  for (const bot of bots) {
    const stem = fileStem(bot.name)
    let file = `${stem}.asm`
    for (let n = 2; taken.has(file); n++) file = `${stem}-${n}.asm`
    taken.add(file)
    files[file] = [strToU8(bot.source), { mtime: new Date(Math.max(bot.updatedAt, ZIP_EPOCH)) }]
  }
  return zipSync(files, { level: 6 })
}

/** The `.asm` files of a zip, at any depth, as new bots named after their files. */
export function botsFromZip(zip: Uint8Array): { name: string; source: string }[] {
  const files = unzipSync(zip, { filter: (file) => /\.asm$/i.test(file.name) })
  return Object.entries(files)
    .filter(([path]) => !path.split('/').some((part) => part.startsWith('.')))
    .map(([path, bytes]) => ({
      name: (path.split('/').pop() ?? path).replace(/\.asm$/i, ''),
      source: strFromU8(bytes),
    }))
}

/** Saves each `.asm` of a zip as a new local bot. */
export async function importLocalBots(zip: Uint8Array): Promise<LocalBot[]> {
  const saved: LocalBot[] = []
  for (const bot of botsFromZip(zip)) saved.push(await saveLocalBot(bot))
  return saved
}

/** A bot name as a file name: lowercase, `[a-z0-9._-]`, `bot` when nothing is left. */
function fileStem(name: string): string {
  const stem = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|-+$/g, '')
  return stem === '' ? 'bot' : stem
}

/** Imports a zip's bots as local bots; refreshes `useLocalBots`. */
export function useImportZip() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: importLocalBots,
    onSuccess: () => client.invalidateQueries({ queryKey: LOCAL_BOTS_KEY }),
  })
}
