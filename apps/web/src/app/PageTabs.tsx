import { cx } from '@asmbots/ui'
import { Link, type LinkProps, useLocation } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

export interface PageTab {
  readonly to: NonNullable<LinkProps['to']>
  readonly icon: LucideIcon
  readonly label: string
}

/**
 * The pages one header item holds (`stats`: the site and the leaderboard), as tabs in the page's
 * intro, under its lead: 36 px tabs in panel-title type. Each page's heading says which it is.
 */
export function PageTabs({ label, tabs }: { label: string; tabs: readonly PageTab[] }) {
  const pathname = useLocation({ select: (location) => location.pathname.replace(/\/+$/, '') })
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Tab key={tab.to} {...tab} active={pathname === tab.to} />
      ))}
    </nav>
  )
}

/** A tab: the nav button's look (idle hairline, accent when on) at 36 px. */
function Tab({ to, icon: Icon, label, active }: PageTab & { active: boolean }) {
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
      {label}
    </Link>
  )
}
