import { cx, Modal } from '@asmbots/ui'
import { Link, useLocation } from '@tanstack/react-router'
import { ExternalLink, type LucideIcon, Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { NAV, navActive } from './Frame'
import { GitHubIcon } from './github-icon'
import { SOURCE_URL } from './site'

export interface NavSheetProps {
  onClose: () => void
}

/** Each route's line under its name: what a phone's visitor finds there. */
const BLURBS: Readonly<Record<(typeof NAV)[number]['to'], string>> = {
  '/': 'the front page: the hill, the last fight, how it works',
  '/arena': 'pick bots, set the rules, and watch them fight',
  '/editor': 'write a bot and step it in the debugger',
  '/tournaments': 'round robins, brackets, and the weekly championship',
  '/hills': 'king-of-the-hill ladders the server keeps',
  '/stats': 'the site in numbers, the leaderboard, the badges',
  '/docs': 'the machine, the language, and the strategy guide',
}

/** A row's box: 48 px at least, a thumb's target, in the nav button's idle and active looks. */
const ROW =
  'flex min-h-12 items-center gap-3 rounded-sm border px-3 py-2 transition-colors duration-120 ease-out focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent'
const IDLE = 'border-border hover:border-border-strong'
const ON = 'border-accent bg-accent-10'

/**
 * The header's nav on a phone (under `md`): the whole screen, one tall row per route with its
 * icon, its name, and a line on what it holds; the current route in the active nav look. Under
 * them, settings and the source. A row closes the sheet as it navigates.
 */
export function NavSheet({ onClose }: NavSheetProps) {
  const pathname = useLocation({ select: (location) => location.pathname })
  return (
    <Modal open onClose={onClose} title="pages" size="full">
      <ul className="flex flex-col gap-2">
        {NAV.map(({ to, label, icon }) => {
          const active = navActive(to, pathname)
          return (
            <li key={to}>
              <Link
                to={to}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={cx(ROW, active ? ON : IDLE)}
              >
                <Row icon={icon} label={label} blurb={BLURBS[to]} />
              </Link>
            </li>
          )
        })}
      </ul>
      <ul className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
        <li>
          <Link
            to="/settings"
            onClick={onClose}
            aria-current={pathname === '/settings' ? 'page' : undefined}
            className={cx(ROW, pathname === '/settings' ? ON : IDLE)}
          >
            <Row icon={Settings} label="settings" />
          </Link>
        </li>
        <li>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className={cx(ROW, IDLE)}>
            <Row icon={GitHubIcon} label="source" trailing={ExternalLink} />
          </a>
        </li>
      </ul>
    </Modal>
  )
}

/** A row's content: the 16 px accent icon, the UPPER name, and the muted line under it. */
function Row({
  icon: Icon,
  label,
  blurb,
  trailing: Trailing,
}: {
  icon: LucideIcon
  label: string
  blurb?: string
  trailing?: LucideIcon
}): ReactNode {
  return (
    <>
      <Icon size={16} strokeWidth={1.75} className="shrink-0 text-accent-fg" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-nav text-bright">{label}</span>
        {blurb !== undefined && <span className="text-body text-muted">{blurb}</span>}
      </span>
      {Trailing !== undefined && (
        <Trailing size={12} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
      )}
    </>
  )
}
