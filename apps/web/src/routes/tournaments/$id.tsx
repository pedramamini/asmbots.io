import { loadLargeImages } from '@asmbots/bots'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeading } from '../../app/PageHeading'
import { titleHead } from '../../app/title'
import { TournamentPage } from '../../features/tournaments/TournamentPage'

export const Route = createFileRoute('/tournaments/$id')({
  head: ({ params }) => titleHead('tournaments', params.id),
  // The roster bots past lightweight load first: the page lists the roster (`rosterCatalog`).
  // Offline, it lists the lightweight bots.
  loader: () => loadLargeImages().catch(() => {}),
  component: TournamentsDetail,
})

function TournamentsDetail() {
  const { id } = Route.useParams()
  return (
    <>
      <PageHeading>tournament</PageHeading>
      <TournamentPage id={id} />
    </>
  )
}
