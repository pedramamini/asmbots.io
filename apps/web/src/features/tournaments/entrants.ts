/**
 * What a tournament's pages share of the list's: its status chip, and its entrants' identicons and
 * authors. A module of its own, so a tournament's page does not load the list page (Rollup puts a
 * module in one chunk, whole).
 */

import { HOUSE_AUTHOR, type Me } from '@asmbots/protocol'
import type { ChipVariant } from '@asmbots/ui'
import { useMemo } from 'react'
import { useMe } from '../../api/queries'
import { type Author, ownerAuthor, sourceAuthor } from '../../app/author'
import { assembleCached } from '../arena/setup/assembly'
import { rosterCatalog } from '../arena/setup/bots'
import type { Tournament, TournamentEntrant, TournamentStatus } from './store'

export const STATUS_VARIANT: Readonly<Record<TournamentStatus, ChipVariant>> = {
  scheduled: 'info',
  running: 'accent',
  paused: 'warn',
  finished: 'neutral',
  cancelled: 'neutral',
  failed: 'danger',
}

/** What a card's status chip says: `running · 12 / 66` while it runs. */
export function statusLabel(t: Pick<Tournament, 'status' | 'progress'>): string {
  const { done, of } = t.progress
  return t.status === 'running' || t.status === 'paused'
    ? `${t.status} · ${done} / ${of}`
    : t.status
}

/** The bytes an entrant's identicon draws: its machine code, or its name when it has none. */
export function identiconValue(entrant: TournamentEntrant): Uint8Array | string {
  if (entrant.code === undefined && entrant.bytes !== undefined && entrant.bytes.length > 0) {
    return entrant.bytes
  }
  const assembled =
    entrant.source === 'roster'
      ? rosterCatalog().find((b) => b.ref.kind === 'roster' && b.ref.slug === entrant.ref)
          ?.assembled
      : entrant.code === undefined
        ? undefined
        : assembleCached(entrant.code)
  return assembled !== undefined && assembled.bytes.length > 0 ? assembled.bytes : entrant.name
}

/**
 * Who wrote an entrant: a server bot's owner; a roster bot's `%author` (the house's); a local
 * bot's, which reads as the signed-in reader's own when it has its `code` (a bot of this browser,
 * not a link's). An entrant made before authors has its `%author` read from the roster or `code`.
 * Null for a server bot whose owner the record lacks.
 */
export function entrantAuthor(
  entrant: TournamentEntrant,
  me: Me | null | undefined,
): Author | null {
  if (entrant.source === 'server') {
    return entrant.owner === undefined ? null : ownerAuthor(entrant.owner)
  }
  const author =
    entrant.author ??
    (entrant.source === 'roster'
      ? (rosterCatalog().find((b) => b.ref.kind === 'roster' && b.ref.slug === entrant.ref)
          ?.author ?? HOUSE_AUTHOR)
      : entrant.code === undefined
        ? ''
        : assembleCached(entrant.code).author)
  return sourceAuthor(author, me, entrant.source === 'local' && entrant.code !== undefined)
}

/** Each of `entrants`' authors (`entrantAuthor`), as the signed-in reader reads them. */
export function useEntrantAuthors(entrants: readonly TournamentEntrant[]): (Author | null)[] {
  const me = useMe().data
  return useMemo(() => entrants.map((e) => entrantAuthor(e, me)), [entrants, me])
}
