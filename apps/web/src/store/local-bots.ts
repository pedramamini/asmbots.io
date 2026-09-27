import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clear, createStore, del, get, set, type UseStore, values } from 'idb-keyval'
import { clearVersions, deleteVersions } from './bot-versions'

/** A bot that lives in this browser only: an anonymous user's, until they sign in (PRODUCT_SPEC §9). */
export interface LocalBot {
  id: string
  name: string
  /** The assembly source, as the user wrote it. */
  source: string
  /** Last save, ms since the epoch. */
  updatedAt: number
  /** The account bot it was imported to (PRODUCT_SPEC §9): synced. Unset for a local-only bot. */
  cloudId?: string | undefined
}

/** The IndexedDB database and object store of the local bots. */
export const LOCAL_BOTS_DB = 'asmbots'
export const LOCAL_BOTS_STORE = 'local-bots'

/** The query key of the local bot list. */
export const LOCAL_BOTS_KEY = ['local-bots'] as const

let store: UseStore | undefined
/** Opened on first use, so a page that never touches local bots never opens the database. */
function botStore(): UseStore {
  store ??= createStore(LOCAL_BOTS_DB, LOCAL_BOTS_STORE)
  return store
}

/** Every local bot, the latest save first. */
export async function listLocalBots(): Promise<LocalBot[]> {
  const bots = await values<LocalBot>(botStore())
  return bots.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name))
}

export function getLocalBot(id: string): Promise<LocalBot | undefined> {
  return get<LocalBot>(id, botStore())
}

/**
 * Creates a bot (no `id`) or overwrites one, stamped now. An overwrite keeps its `cloudId` unless
 * the bot names another.
 */
export async function saveLocalBot(bot: {
  id?: string | undefined
  name: string
  source: string
  cloudId?: string | undefined
}): Promise<LocalBot> {
  const cloudId =
    bot.cloudId ?? (bot.id === undefined ? undefined : (await getLocalBot(bot.id))?.cloudId)
  const saved: LocalBot = {
    id: bot.id ?? crypto.randomUUID(),
    name: bot.name,
    source: bot.source,
    updatedAt: Date.now(),
    ...(cloudId !== undefined && { cloudId }),
  }
  await set(saved.id, saved, botStore())
  return saved
}

/** Marks local bots synced: each local id to the account bot it was imported to. */
export async function markLocalBotsSynced(cloudIds: ReadonlyMap<string, string>): Promise<void> {
  for (const [id, cloudId] of cloudIds) {
    const bot = await getLocalBot(id)
    if (bot !== undefined) await set(id, { ...bot, cloudId }, botStore())
  }
}

/** Forgets every local bot's link to the account (a deleted account): each is local only again. */
export async function unlinkLocalBots(): Promise<void> {
  for (const bot of await listLocalBots()) {
    if (bot.cloudId === undefined) continue
    const { cloudId: _, ...local } = bot
    await set(bot.id, local, botStore())
  }
}

/** Deletes a bot and its saved versions. */
export async function deleteLocalBot(id: string): Promise<void> {
  await del(id, botStore())
  await deleteVersions(id)
}

/** Deletes every bot and every saved version. */
export async function clearLocalBots(): Promise<void> {
  await clear(botStore())
  await clearVersions()
}

/** The local bots, through the query cache. */
export function useLocalBots() {
  return useQuery({ queryKey: LOCAL_BOTS_KEY, queryFn: listLocalBots, staleTime: Infinity })
}

/** The mutations of the local bots; each refreshes `useLocalBots`. */
export function useLocalBotActions() {
  const client = useQueryClient()
  const onSuccess = () => client.invalidateQueries({ queryKey: LOCAL_BOTS_KEY })
  return {
    save: useMutation({ mutationFn: saveLocalBot, onSuccess }),
    remove: useMutation({ mutationFn: deleteLocalBot, onSuccess }),
    clear: useMutation({ mutationFn: clearLocalBots, onSuccess }),
  }
}
