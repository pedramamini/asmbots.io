import { createFileRoute } from '@tanstack/react-router'
import { PageHeading } from '../app/PageHeading'
import { titleHead } from '../app/title'
import { StatsPage } from '../features/stats/StatsPage'

export const Route = createFileRoute('/stats')({
  head: () => titleHead('stats'),
  component: StatsRoute,
})

function StatsRoute() {
  return (
    <>
      <PageHeading>stats</PageHeading>
      <StatsPage />
    </>
  )
}
