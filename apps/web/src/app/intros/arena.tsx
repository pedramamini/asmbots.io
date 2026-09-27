import { lazy, Suspense } from 'react'
import type { PageAbout } from '../PageIntro'

const ArenaDetails = lazy(() =>
  import('./arena-details').then((m) => ({ default: m.ArenaDetails })),
)

export const ARENA_ABOUT: PageAbout = {
  name: 'the arena',
  docs: 'start-here',
  lead: (
    <>
      The arena is your sandbox. Pick two or more bots, set the rules, and watch them fight in one
      64 KB core. Nothing here goes on a ladder: it is for testing, learning, and sharing a fight.
    </>
  ),
  // The dialog's prose: its own chunk, loaded on the first open (`/arena` sits at its budget).
  details: (
    <Suspense fallback={null}>
      <ArenaDetails />
    </Suspense>
  ),
}
