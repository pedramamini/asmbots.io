import { Crown, Trophy } from 'lucide-react'
import { PageTabs } from '../../app/PageTabs'

/** The tournaments pages: every tournament, and the weekly championships. */
export function TournamentsTabs() {
  return (
    <PageTabs
      label="tournament pages"
      tabs={[
        { to: '/tournaments', icon: Trophy, label: 'tournaments' },
        { to: '/tournaments/championships', icon: Crown, label: 'championships' },
      ]}
    />
  )
}
