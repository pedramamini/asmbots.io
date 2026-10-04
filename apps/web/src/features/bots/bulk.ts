/**
 * Changes to my account's bots, one or many at once (PRODUCT_SPEC §0, §2): who may see them, or
 * a delete. One request whatever their number (`PATCH /api/me/bots`, `POST /api/me/bots/delete`),
 * so a change to 200 bots stays under the write limit. The lists that show them are read again,
 * and a toast says what changed.
 */
import type { Visibility } from '@asmbots/protocol'
import { useToast } from '@asmbots/ui'
import { useQueryClient } from '@tanstack/react-query'
import { deleteBots, updateBots } from '../../api/writes'

/** `n bots`, or the one bot's name. */
export function botsNamed(names: readonly string[]): string {
  return names.length === 1 ? (names[0] ?? '1 bot') : `${names.length} bots`
}

const reason = (error: unknown) => (error instanceof Error ? error.message : 'the server refused')

export function useBotChanges() {
  const client = useQueryClient()
  const { toast } = useToast()
  // My bots, the arena's list of them, the public bots, and each bot's page.
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['me', 'bots'] }),
      client.invalidateQueries({ queryKey: ['bots'] }),
    ])

  /** Gives the bots `ids` (named `names`) `visibility`; whether the server took it. */
  const setVisibility = async (
    ids: readonly string[],
    names: readonly string[],
    visibility: Visibility,
  ): Promise<boolean> => {
    try {
      const { bots } = await updateBots({ ids: [...ids], visibility })
      await refresh()
      const what =
        bots.length === ids.length ? botsNamed(names) : `${bots.length} of ${ids.length} bots`
      toast(`${what} ${bots.length === 1 ? 'is' : 'are'} now ${visibility}.`, { variant: 'accent' })
      return true
    } catch (error) {
      toast(`could not change ${botsNamed(names)}: ${reason(error)}.`, { variant: 'danger' })
      return false
    }
  }

  /** Deletes the bots `ids` (named `names`) from my account; whether the server took it. */
  const remove = async (ids: readonly string[], names: readonly string[]): Promise<boolean> => {
    try {
      const { deleted } = await deleteBots(ids)
      await refresh()
      const what =
        deleted.length === ids.length ? botsNamed(names) : `${deleted.length} of ${ids.length} bots`
      toast(`deleted ${what} from my account.`)
      return true
    } catch (error) {
      toast(`could not delete ${botsNamed(names)}: ${reason(error)}.`, { variant: 'danger' })
      return false
    }
  }

  return { setVisibility, remove }
}
