/**
 * A bot's source, from the picker (PRODUCT_SPEC §2): the docs' code block (`Asm`) in a modal, with
 * its colors, `copy`, and `open in editor`. Its own chunk, loaded when a bot's source is first asked
 * for. It imports no arena module: the setup passes in how to read the text (`botSource`) and the
 * link to the bot's page, since a module shared with the route would pull the route's code apart.
 */
import { Modal, Skeleton } from '@asmbots/ui'
import { type ReactNode, useEffect, useState } from 'react'
import { Asm } from '../../../docs/Asm'

export interface SourceModalProps {
  name: string
  /** Reads the source; empty when it cannot be read. */
  load: () => Promise<string>
  /** Who may see the bot, when its source is not the reader's to read: `private`, `unlisted`. */
  hidden: string
  /** The link to the bot's page, when it has one the reader may open. */
  page: ReactNode
  onClose: () => void
}

export function SourceModal({ name, load, hidden, page, onClose }: SourceModalProps) {
  // Undefined while it loads.
  const [source, setSource] = useState<string | undefined>(undefined)
  useEffect(() => {
    let live = true
    load().then(
      (text) => live && setSource(text),
      () => live && setSource(''),
    )
    return () => {
      live = false
    }
  }, [load])
  return (
    <Modal open onClose={onClose} title={`${name} · source`} size="xl">
      {source === undefined ? (
        <Skeleton rows={8} />
      ) : source === '' ? (
        <p className="text-data text-muted">
          its source is {hidden}: it fights in the arena, but its owner keeps the text.
        </p>
      ) : (
        <Asm>{source}</Asm>
      )}
      {page !== null && (
        <p className="text-data text-muted">its versions and hill places are on {page}.</p>
      )}
    </Modal>
  )
}
