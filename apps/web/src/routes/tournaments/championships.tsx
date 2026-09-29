import { createFileRoute } from '@tanstack/react-router'
import { PageHeading } from '../../app/PageHeading'
import { titleHead } from '../../app/title'
import { ChampionshipsPage } from '../../features/tournaments/ChampionshipsPage'

export const Route = createFileRoute('/tournaments/championships')({
  head: () => titleHead('tournaments', 'championships'),
  component: ChampionshipsRoute,
})

function ChampionshipsRoute() {
  return (
    <>
      <PageHeading>championships</PageHeading>
      <ChampionshipsPage />
    </>
  )
}
