import { loadLargeImages } from '@asmbots/bots'
import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { PageHeading } from '../../app/PageHeading'
import { titleHead } from '../../app/title'
import { TournamentsPage } from '../../features/tournaments/TournamentsPage'

export const Route = createFileRoute('/tournaments/')({
  head: () => titleHead('tournaments'),
  // The roster bots past lightweight load first: the page lists the roster (`rosterCatalog`).
  // Offline, it lists the lightweight bots.
  loader: () => loadLargeImages().catch(() => {}),
  component: TournamentsRoute,
})

/** The form: its own chunk, loaded on the first `new tournament`. */
const NewTournament = lazy(() =>
  import('../../features/tournaments/NewTournament').then((m) => ({ default: m.NewTournament })),
)

function TournamentsRoute() {
  const [creating, setCreating] = useState(false)
  // Mounted from the first opening on, so the modal still closes as it opens.
  const [asked, setAsked] = useState(false)
  const create = () => {
    setAsked(true)
    setCreating(true)
  }
  return (
    <>
      <PageHeading>tournaments</PageHeading>
      <TournamentsPage onNew={create} />
      {asked && (
        <Suspense fallback={null}>
          <NewTournament open={creating} onClose={() => setCreating(false)} />
        </Suspense>
      )}
    </>
  )
}
