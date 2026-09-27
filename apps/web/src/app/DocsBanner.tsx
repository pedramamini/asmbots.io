import { Button, Kbd, Panel } from '@asmbots/ui'
import { Search } from 'lucide-react'
import { Plate } from '../art/Plate'
import { type DocSection, docEntries } from '../docs'
import { focusRouteSearch } from './keys'

/**
 * The docs home's banner, over the sidebar and the page both (`DocsFrame` draws it on `/docs`
 * only): the manual's line, its size, and the search.
 */
export function DocsBanner({ docs }: { docs: readonly DocSection[] }) {
  const pages = docEntries(docs).length
  const sections = docs.filter(({ pages }) => pages.length > 0).length
  return (
    <Panel className="col-span-12">
      <div className="flex items-center gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3 py-1">
          <h1 className="text-modal-title text-bright">
            Learn the machine. Write a bot. Take the hill.
          </h1>
          <p className="text-body text-muted">
            {pages} pages in {sections} sections. Every code block runs in the editor or the arena.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={Search} onClick={() => focusRouteSearch()}>
              search the docs
            </Button>
            <span className="flex items-center gap-1.5 text-data text-muted">
              or press <Kbd>/</Kbd> on any docs page
            </span>
          </div>
        </div>
        {/* Art: the manual, open. Its box holds the space while it loads. */}
        <div className="hidden h-36 w-56 shrink-0 lg:block">
          <Plate name="manual" cell={2} />
        </div>
      </div>
    </Panel>
  )
}
