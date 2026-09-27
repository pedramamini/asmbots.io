import { createFileRoute } from '@tanstack/react-router'
import { PageHeading } from '../../app/PageHeading'
import { titleHead } from '../../app/title'
import { LeaderboardPage } from '../../features/stats/LeaderboardPage'

export const Route = createFileRoute('/stats/leaderboard')({
  head: () => titleHead('stats', 'leaderboard'),
  component: LeaderboardRoute,
})

function LeaderboardRoute() {
  return (
    <>
      <PageHeading>leaderboard</PageHeading>
      <LeaderboardPage />
    </>
  )
}
