import { cx } from '@asmbots/ui'
import { Link, useLocation } from '@tanstack/react-router'
import { ChartColumn, ListOrdered, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * The stats pages: the site in numbers, and the leaderboard. The header's `stats` holds both. The
 * tabs sit in the page's intro, under its lead, as 36 px tabs in panel-title type: each page's
 * heading says which of the two it is.
 */
export function StatsTabs() {
  const pathname = useLocation({ select: (location) => location.pathname })
  return (
    <nav aria-label="stats pages" className="flex flex-wrap gap-2">
      <StatsTab
        to="/stats"
        icon={ChartColumn}
        active={pathname === '/stats' || pathname === '/stats/'}
      >
        the site
      </StatsTab>
      <StatsTab
        to="/stats/leaderboard"
        icon={ListOrdered}
        active={pathname === '/stats/leaderboard'}
      >
        leaderboard
      </StatsTab>
    </nav>
  )
}

interface StatsTabProps {
  to: '/stats' | '/stats/leaderboard'
  icon: LucideIcon
  active: boolean
  children: ReactNode
}

/** A tab: the nav button's look (idle hairline, accent when on) at 36 px. */
function StatsTab({ to, icon: Icon, active, children }: StatsTabProps) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'inline-flex h-9 items-center gap-2 rounded-sm border px-4 text-panel-title transition-colors duration-120 ease-out focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent',
        active
          ? 'border-accent bg-accent-10 text-accent-fg'
          : 'border-border-strong text-muted hover:border-accent hover:text-text',
      )}
    >
      <Icon
        aria-hidden="true"
        size={16}
        strokeWidth={1.75}
        className={cx('shrink-0', !active && 'text-accent-fg')}
      />
      {children}
    </Link>
  )
}
