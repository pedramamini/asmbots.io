import { cx, Panel } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Bot } from 'lucide-react'
import type { DocSection } from '../docs'
import { sectionAnchor, sectionMeta } from '../docs/sections'

/** A link in a card or a row: the accent, underlined, a brighter line under the pointer. */
const TEXT_LINK = cx(
  'rounded-sm text-accent-fg underline decoration-accent-45 underline-offset-2 hover:decoration-accent',
  'focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent',
)

/** How many of a section's pages its card lists; `all N pages` opens the rest from the first. */
export const CARD_PAGES = 4

/**
 * The files an AI agent reads, which the build writes beside the site: the docs as an index, the
 * whole docs in one file, and the skill to install.
 */
const AGENT_FILES = [
  { href: '/llms.txt', label: 'llms.txt' },
  { href: '/llms-full.txt', label: 'llms-full.txt' },
  { href: '/skill/asm-bots.zip', label: 'the skill (zip)' },
] as const

/**
 * The sections whose card stands in the left column under the sidebar, not in the home's grid:
 * short ones a reader looks up rather than reads through.
 */
export const ASIDE_SECTIONS: ReadonlySet<string> = new Set(['changelog'])

/**
 * What stands under the sidebar on every docs page: the cards of `ASIDE_SECTIONS`, then the files
 * for AI agents. A card's name says `section`, so it never shares one with its section's page
 * (`changelog`) beside it.
 */
export function DocsAsideCards({ docs }: { docs: readonly DocSection[] }) {
  return (
    <>
      {docs
        .filter(({ title, pages }) => ASIDE_SECTIONS.has(title) && pages.length > 0)
        .map((section) => (
          <SectionCard key={section.title} section={section} label={`${section.title} section`} />
        ))}
      <AgentsPanel />
    </>
  )
}

/**
 * A section's card, at the section's anchor: its icon, name, and page count, its sentence, its
 * first pages, and `all N pages` when it has more. The cards of a row stand equal in height.
 */
export function SectionCard({
  section,
  label = section.title,
}: {
  section: DocSection
  label?: string
}) {
  const { icon: Icon, summary } = sectionMeta(section.title)
  const count = section.pages.length
  const first = section.pages[0]
  return (
    <Panel
      id={sectionAnchor(section.title)}
      aria-label={label}
      className="flex-1 scroll-mt-3"
      title={
        <span className="flex items-center gap-2">
          <Icon aria-hidden="true" className="size-3.5 shrink-0" />
          {section.title}
        </span>
      }
      status={`${count} ${count === 1 ? 'page' : 'pages'}`}
    >
      <div className="flex h-full flex-col gap-3">
        {summary !== '' && <p className="text-body text-muted">{summary}</p>}
        <ol className="flex flex-col gap-1 text-body">
          {section.pages.slice(0, CARD_PAGES).map((page, i) => (
            <li key={page.slug} className="flex gap-2">
              <span aria-hidden="true" className="w-5 shrink-0 text-data text-muted tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <Link to="/docs/$" params={{ _splat: page.slug }} className={TEXT_LINK}>
                {page.title}
              </Link>
            </li>
          ))}
        </ol>
        {count > CARD_PAGES && first !== undefined && (
          <Link
            to="/docs/$"
            params={{ _splat: first.slug }}
            className={cx('mt-auto flex items-center gap-1 self-start text-data', TEXT_LINK)}
          >
            all {count} pages
            <ArrowRight aria-hidden="true" className="size-3" />
          </Link>
        )}
      </div>
    </Panel>
  )
}

/** The files an AI agent reads, the skill, and the page that explains them, one to a line. */
function AgentsPanel() {
  return (
    <Panel
      aria-label="for AI agents"
      title={
        <span className="flex items-center gap-2">
          <Bot aria-hidden="true" className="size-3.5 shrink-0" />
          for AI agents
        </span>
      }
    >
      <ul className="flex flex-col gap-1 text-body">
        {AGENT_FILES.map((file) => (
          <li key={file.href}>
            <a href={file.href} className={TEXT_LINK}>
              {file.label}
            </a>
          </li>
        ))}
        <li>
          <Link to="/docs/$" params={{ _splat: 'tools/agents' }} className={TEXT_LINK}>
            how an agent plays
          </Link>
        </li>
      </ul>
    </Panel>
  )
}
