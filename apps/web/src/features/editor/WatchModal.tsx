/**
 * `watch` (PRODUCT_SPEC §3): the tested match played in a modal over the editor, with the embed's
 * player: the same two bots, seed, and rounds the test fought, the bots and their authors, play
 * and pause, restart, and who won. Escape or `close` goes back to the source; `open in arena` goes
 * to the arena set up as tested. Its own chunk: the player loads on the first `watch`.
 */
import { Chip, Modal, RadarLoader } from '@asmbots/ui'
import { type MouseEvent, useMemo } from 'react'
import { useAssemble } from '../arena/setup/assembler'
import type { ArenaSetupSpec, SharedBot } from '../arena/setup/url'
import { searchFromSetup, sharedFragment } from '../arena/setup/url'
import type { ArenaClient } from '../arena/worker/client'
import { EmbedBattle, embedFight } from '../embed/EmbedArena'

export interface WatchModalProps {
  /** The test's arena setup (`watchSetup`). */
  setup: { spec: ArenaSetupSpec; shared: SharedBot[] }
  /** The arena link of the setup, for `open in arena` (a new tab with a modifier key). */
  arenaHref: string
  onArena: () => void
  onClose: () => void
  /** Makes the player's client: a fresh `ArenaClient` for each. */
  createClient: () => ArenaClient
}

export function WatchModal({ setup, arenaHref, onArena, onClose, createClient }: WatchModalProps) {
  const assemble = useAssemble(true)
  const read = useMemo(
    () => embedFight(searchFromSetup(setup.spec), sharedFragment(setup.shared), assemble),
    [setup, assemble],
  )
  // The two bots, `untitled vs Imp`, as the arena names them.
  const title = 'fight' in read ? read.fight.bots.map((bot) => bot.name).join(' vs ') : 'watch'
  return (
    <Modal open onClose={onClose} title={title} size="full" className="max-w-240">
      <div className="grid size-full min-h-80 place-items-stretch">
        {'fight' in read ? (
          <EmbedBattle
            fight={read.fight}
            createClient={createClient}
            inline
            link={
              <a
                href={arenaHref}
                onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
                  event.preventDefault()
                  onClose()
                  onArena()
                }}
                className="rounded-sm focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <Chip variant="accent">open in arena</Chip>
              </a>
            }
          />
        ) : (
          <div className="grid place-items-center text-body text-muted">
            {'problem' in read ? read.problem : <RadarLoader label="loading the bots" />}
          </div>
        )}
      </div>
    </Modal>
  )
}
