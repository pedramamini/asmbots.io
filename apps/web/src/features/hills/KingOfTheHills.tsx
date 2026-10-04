/**
 * The king of the hills (PRODUCT_SPEC §5): the player whose bots are king of the most hills, with
 * their avatar, a link to their profile, and the hills they hold, each with its king. Loaded after
 * the page (`HillsPage`'s `KingStandIn` holds its box): `/hills` has no budget left.
 */
import type { HillStanding, HillSummary } from '@asmbots/protocol'
import { Identicon, Panel } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { Crown } from 'lucide-react'
import { useMaybeUser } from '../../api/user'
import { AuthorLink, ownerAuthor } from '../../app/author'
import { Plate } from '../../art/Plate'
import { count } from './links'

type Held = HillSummary & { king: HillStanding }

/** A player and the hills their bots are king of. */
export interface CrownHolder {
  owner: string
  hills: Held[]
}

/**
 * The owners of the hills' kings, the most crowns first; among equals the longest reigns added
 * up, then by handle.
 */
export function crownHolders(hills: readonly HillSummary[]): CrownHolder[] {
  const held = new Map<string, Held[]>()
  for (const h of hills) {
    if (h.king === null) continue
    const owner = h.king.bot.owner
    held.set(owner, [...(held.get(owner) ?? []), { ...h, king: h.king }])
  }
  const reign = (c: CrownHolder) => c.hills.reduce((n, h) => n + (h.king.entry.reign ?? 0), 0)
  return [...held]
    .map(([owner, hills]) => ({ owner, hills }))
    .sort(
      (a, b) =>
        b.hills.length - a.hills.length || reign(b) - reign(a) || a.owner.localeCompare(b.owner),
    )
}

/** The panel; nothing when no hill has a king. */
export default function KingOfTheHills({ hills }: { hills: readonly HillSummary[] }) {
  const [top, ...others] = crownHolders(hills)
  const author = top === undefined ? null : ownerAuthor(top.owner)
  const avatar = useMaybeUser(author?.handle ?? null).data?.user.avatarUrl ?? null
  if (top === undefined || author === null) return null
  const crowns = top.hills.length
  return (
    <Panel
      className="col-span-12"
      title="king of the hills"
      status={crowns === hills.length ? 'every crown' : `${crowns} of ${hills.length} crowns`}
    >
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-y-2 right-0 hidden w-80 [mask-image:linear-gradient(to_left,black_35%,transparent)] md:block"
        >
          <Plate name="trophy" cell={2} />
        </div>
        <div className="relative size-24 shrink-0">
          {avatar !== null ? (
            <img
              src={avatar}
              alt=""
              className="size-24 rounded-md border-2 border-accent object-cover"
            />
          ) : (
            <Identicon value={top.owner} size={96} className="rounded-md" />
          )}
          <span className="absolute -top-2.5 -right-2.5 rounded-full border border-accent bg-panel p-1 text-accent">
            <Crown aria-hidden="true" size={16} />
          </span>
        </div>
        <div className="relative flex min-w-0 flex-col gap-2">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="truncate-ring text-modal-title">
              <AuthorLink author={author} />
            </span>
            <span className="text-data text-muted">
              king of <span className="text-accent-fg text-stat">{count(crowns)}</span> of{' '}
              {count(hills.length)} hills
            </span>
          </p>
          <ul aria-label="crowns held" className="flex flex-wrap gap-1.5">
            {top.hills.map((h) => (
              <li key={h.hill.id}>
                <Link
                  to="/hills/$slug"
                  params={{ slug: h.hill.slug }}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-panel-2 px-2 py-0.5 text-data transition-colors duration-120 ease-out hover:border-accent focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent"
                >
                  <span aria-hidden="true" className="text-accent">
                    ♛
                  </span>
                  <span className="text-bright">{h.hill.name}</span>
                  <span className="text-muted">{h.king.bot.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          {others.length > 0 && (
            <p className="text-data text-muted">
              also crowned:{' '}
              {others.map((o, i) => (
                <span key={o.owner}>
                  {i > 0 && ', '}
                  <AuthorLink author={ownerAuthor(o.owner)} /> {count(o.hills.length)}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </Panel>
  )
}
