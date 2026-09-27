/**
 * The newest board changes on every hill, from the overview: one line per submission, as a hill's
 * own feed has them (`HillFeed`), each headed by its hill.
 */
import type { TickerHillEvent } from '@asmbots/protocol'
import { EmptyState, type EmptyStateAction } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { eventText, feedItems } from './HillFeed'
import { ago, CELL_LINK, day } from './links'

export interface BoardFeedProps {
  events: readonly TickerHillEvent[]
  emptyAction: EmptyStateAction
  /** The clock `ago` reads; tests fix it. */
  now?: number | undefined
}

export function BoardFeed({ events, emptyAction, now }: BoardFeedProps) {
  const items = feedItems(events)
  if (items.length === 0) {
    return (
      <EmptyState action={emptyAction}>
        no submissions yet: every hill is as it was seeded.
      </EmptyState>
    )
  }
  return (
    <ol aria-label="board changes" className="flex flex-col gap-2 text-data">
      {items.map((item) => {
        const first = item.events[0]
        const at = first?.event.at ?? ''
        const crowned = first?.event.kind === 'entered' && first.event.rank === 1
        return (
          <li
            key={item.key}
            className="flex min-w-0 gap-2 border-border border-l-2 pl-2 data-[crowned=true]:border-l-accent"
            data-crowned={crowned}
          >
            <time dateTime={at} title={day(at)} className="w-14 shrink-0 text-muted">
              {ago(at, now)}
            </time>
            <span className="min-w-0">
              {first !== undefined && (
                <Link
                  to="/hills/$slug"
                  params={{ slug: first.hill.slug }}
                  className={`${CELL_LINK} text-panel-status`}
                >
                  {first.hill.name}
                </Link>
              )}{' '}
              {crowned && (
                <span aria-hidden="true" className="text-bright">
                  ♛{' '}
                </span>
              )}
              {item.events.map((e, i) => (
                <span key={e.event.id}>
                  {i > 0 && <span className="text-muted"> · </span>}
                  {eventText(e)}
                </span>
              ))}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
