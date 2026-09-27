import { cx, useMediaQuery, WIDE } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { ArrowRight, BookText, Cpu, type LucideIcon, Rocket, Swords } from 'lucide-react'
import { DOCS, type DocSection } from '../docs'
import { ASIDE_SECTIONS, DocsAsideCards, SectionCard } from './DocsCards'

const FOCUS = 'focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** A way in for a reader who knows what they want, not where it is. */
interface Path {
  icon: LucideIcon
  title: string
  text: string
  slug: string
}

const PATHS: readonly Path[] = [
  {
    icon: Rocket,
    title: 'new here',
    text: 'The 60-second tour, then a first bot you can run.',
    slug: 'start-here',
  },
  {
    icon: Cpu,
    title: 'learn the machine',
    text: 'One 64 KB core: how a bot runs, and how it dies.',
    slug: 'machine/memory',
  },
  {
    icon: BookText,
    title: 'look up an instruction',
    text: 'Every opcode, its encoding, its flags, an example.',
    slug: 'reference/data',
  },
  {
    icon: Swords,
    title: 'win more fights',
    text: 'The families of bots, and what beats each.',
    slug: 'strategy/imps',
  },
]

/**
 * `/docs`: the docs home. Under the banner (`DocsBanner`, which `DocsFrame` spans over the sidebar
 * too), four ways in, then a card for each section (its sentence, its first pages, and a link to
 * read it all). The changelog's card and the files for AI agents stand under the sidebar on every
 * docs page (`DocsAsideCards`), so the grid's rows stay full; under `md`, where the sidebar stacks
 * over the page, they close this page.
 * The sidebar lists every page; this page only points the way.
 */
export function DocsHome({ docs = DOCS }: { docs?: readonly DocSection[] }) {
  const grid = docs.filter(({ pages, title }) => pages.length > 0 && !ASIDE_SECTIONS.has(title))
  const wide = useMediaQuery(WIDE)
  return (
    <section aria-label="docs home" className="flex flex-col gap-3">
      <section aria-labelledby="where-to-start">
        <h2 id="where-to-start" className="sr-only">
          where to start
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PATHS.map((path) => (
            <li key={path.title} className="flex">
              <PathCard path={path} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sections">
        <h2 id="sections" className="sr-only">
          sections
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {grid.map((section) => (
            <li key={section.title} className="flex">
              <SectionCard section={section} />
            </li>
          ))}
        </ul>
      </section>

      {!wide && <DocsAsideCards docs={docs} />}
    </section>
  )
}

function PathCard({ path }: { path: Path }) {
  const { icon: Icon, title, text, slug } = path
  return (
    <Link
      to="/docs/$"
      params={{ _splat: slug }}
      className={cx(
        'group flex flex-1 flex-col gap-1 rounded-md border border-border bg-panel px-3 py-2',
        'transition-colors duration-120 ease-out hover:border-accent-45 hover:bg-panel-2',
        FOCUS,
      )}
    >
      <span className="flex items-center gap-2 text-panel-title text-accent-fg">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        {title}
        <ArrowRight
          aria-hidden="true"
          className="ml-auto size-3.5 text-muted group-hover:text-accent-fg"
        />
      </span>
      <span className="text-data text-muted">{text}</span>
    </Link>
  )
}
