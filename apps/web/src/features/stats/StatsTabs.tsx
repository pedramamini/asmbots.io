import { useLocation } from '@tanstack/react-router'
import { NavLink } from '../../app/Frame'

/** The stats pages: the site in numbers, and the leaderboard. The header's `stats` holds both. */
export function StatsTabs() {
  const pathname = useLocation({ select: (location) => location.pathname })
  return (
    <nav aria-label="stats pages" className="col-span-12 flex gap-2">
      <NavLink to="/stats" active={pathname === '/stats' || pathname === '/stats/'}>
        the site
      </NavLink>
      <NavLink to="/stats/leaderboard" active={pathname === '/stats/leaderboard'}>
        leaderboard
      </NavLink>
    </nav>
  )
}
