import { lazy, Suspense } from 'react'
import type { PageAbout } from '../PageIntro'

const ArenaKindsList = lazy(() => import('./arena-kinds').then((m) => ({ default: m.ArenaKinds })))

/** The battle kinds' box, which the placeholder holds while their chunk loads: wide screens only. */
export const ARENA_KINDS_BOX = 'hidden min-h-18.5 xl:grid'

/**
 * The battle kinds under the arena's lead (`PageIntro`'s `more`): their own chunk, like the
 * dialog's prose, behind a placeholder of the same box.
 */
export function ArenaKinds() {
  return (
    <Suspense fallback={<div className={ARENA_KINDS_BOX} />}>
      <ArenaKindsList box={ARENA_KINDS_BOX} />
    </Suspense>
  )
}

const ArenaDetails = lazy(() =>
  import('./arena-details').then((m) => ({ default: m.ArenaDetails })),
)

export const ARENA_ABOUT: PageAbout = {
  name: 'the arena',
  title: 'Pick the bots. Set the rules. Watch them fight.',
  docs: 'start-here',
  lead: (
    <>
      Your sandbox: any bots, any rules, one 64 KB core. Nothing here goes on a ladder.
    </>
  ),
  // The dialog's prose: its own chunk, loaded on the first open (`/arena` sits at its budget).
  details: (
    <Suspense fallback={null}>
      <ArenaDetails />
    </Suspense>
  ),
}
