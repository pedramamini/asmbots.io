import { ChartColumn, ListOrdered } from 'lucide-react'
import { PageTabs } from '../../app/PageTabs'

/** The stats pages: the site in numbers, and the leaderboard. The header's `stats` holds both. */
export function StatsTabs() {
  return (
    <PageTabs
      label="stats pages"
      tabs={[
        { to: '/stats', icon: ChartColumn, label: 'the site' },
        { to: '/stats/leaderboard', icon: ListOrdered, label: 'leaderboard' },
      ]}
    />
  )
}
