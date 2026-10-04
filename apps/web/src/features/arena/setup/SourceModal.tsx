/**
 * A bot's source, from the picker (PRODUCT_SPEC §2): the docs' code block (`Asm`) in a modal, with
 * its colors, `copy`, and `open in editor`. A local or shared bot's text is in hand; a roster bot's
 * is read from the roster's sources, and a public bot's (or one of mine) from the server, at the
 * version listed. Its own chunk, loaded when a bot's source is first asked for.
 */
import { Modal, Skeleton } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CELL_LINK } from '../../../app/author'
import { Asm } from '../../../docs/Asm'
import { type CatalogBot, listingOf } from './bots'

/** `bot`'s source; empty when it cannot be read. */
export async function botSource(bot: CatalogBot): Promise<string> {
  if (bot.source !== null) return bot.source
  if (bot.ref.kind === 'roster') {
    const { loadLargeSources, rosterSource } = await import('./roster-source')
    await loadLargeSources()
    return rosterSource(bot.ref.slug)
  }
  const listing = listingOf(bot)
  if (listing === undefined) return ''
  const { cloudSource } = await import('./cloud-source')
  return cloudSource(listing.bot.botId, listing.bot.version)
}

export function SourceModal({ bot, onClose }: { bot: CatalogBot; onClose: () => void }) {
  // Undefined while it loads.
  const [source, setSource] = useState<string | undefined>(bot.source ?? undefined)
  useEffect(() => {
    let live = true
    botSource(bot).then(
      (text) => live && setSource(text),
      () => live && setSource(''),
    )
    return () => {
      live = false
    }
  }, [bot])
  const listing = listingOf(bot)
  return (
    <Modal open onClose={onClose} title={`${bot.name} · source`} size="xl">
      {source === undefined ? (
        <Skeleton rows={8} />
      ) : source === '' ? (
        <p className="text-data text-muted">its source is not public.</p>
      ) : (
        <Asm>{source}</Asm>
      )}
      {listing !== undefined && (
        <p className="text-data text-muted">
          its versions and hill places are on{' '}
          <Link to="/bots/$id" params={{ id: listing.bot.botId }} className={CELL_LINK}>
            its bot page
          </Link>
          .
        </p>
      )}
    </Modal>
  )
}
