import type { HillPulse, HillSummary } from '@asmbots/protocol'
import { EmptyState, Panel, PanelGrid, Skeleton, Stat } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { Mountain } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { useHills, useMe } from '../../api/queries'
import { useMaybeUser } from '../../api/user'
import { IntroArt } from '../../app/IntroArt'
import { HILLS_ABOUT } from '../../app/intros/hills'
import { LoadFailure, readStatus } from '../../app/LoadFailure'
import { useLinkAction } from '../../app/link-action'
import { PageIntro } from '../../app/PageIntro'
import { HillCard } from './HillCard'
import { count, plural } from './links'
import { useHillOverview } from './overview'
import { hillOrder } from './rules'

/** The hills in their list order (`hillOrder`), the server's order within a class. */
const byClass = (hills: readonly HillSummary[]) =>
  [...hills].sort((a, b) => hillOrder(a.hill) - hillOrder(b.hill))

/** The hills in numbers: places taken, matches, challenges, crowns, the longest reign. */
function Numbers({
  hills,
  pulse,
}: {
  hills: readonly HillSummary[] | undefined
  pulse: readonly HillPulse[] | undefined
}) {
  const sum = (f: (p: HillPulse) => number) => pulse?.reduce((n, p) => n + f(p), 0) ?? 0
  const taken = hills?.reduce((n, h) => n + h.entrants, 0) ?? 0
  const places = hills?.reduce((n, h) => n + h.hill.size, 0) ?? 0
  const reigning = hills
    ?.filter((h) => h.king !== null)
    .reduce<HillSummary | undefined>(
      (best, h) => ((h.king?.entry.reign ?? 0) > (best?.king?.entry.reign ?? -1) ? h : best),
      undefined,
    )
  const tile = 'min-w-36 flex-1'
  return (
    <div className="flex flex-wrap gap-2">
      <Stat
        className={tile}
        loading={hills === undefined}
        label="hills"
        value={hills && count(hills.length)}
        note="always open"
      />
      <Stat
        className={tile}
        loading={hills === undefined}
        label="places taken"
        value={hills && `${count(taken)} / ${count(places)}`}
        note={hills && places > 0 && `${Math.round((100 * taken) / places)}% full`}
      />
      <Stat
        className={tile}
        loading={pulse === undefined}
        label="hill matches"
        value={pulse && count(sum((p) => p.matches))}
        note="each one a replay"
      />
      <Stat
        className={tile}
        loading={pulse === undefined}
        label="challenges"
        value={pulse && count(sum((p) => p.challenges))}
        note={
          pulse &&
          plural(
            sum((p) => p.crowns),
            'crown',
          )
        }
      />
      <Stat
        className={tile}
        loading={hills === undefined}
        label="longest reign"
        value={
          hills &&
          (reigning?.king ? plural(reigning.king.entry.reign ?? 0, 'challenge') : 'none yet')
        }
        note={reigning?.king && `${reigning.king.bot.name} on ${reigning.hill.name}`}
      />
    </div>
  )
}

/** The tile after the hills: where a bot for them starts. */
function YourBotTile() {
  return (
    <Link
      to="/editor"
      className="flex h-full min-h-44 flex-col items-center justify-center gap-2 rounded-md border border-border-strong border-dashed p-3 text-center transition-colors duration-120 ease-out hover:border-accent focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-accent"
    >
      <Mountain aria-hidden="true" size={28} className="text-accent" />
      <span className="text-bright text-panel-title">your bot here</span>
      <span className="text-data text-muted">
        write a bot in the editor, save it, and submit it from any hill&rsquo;s page.
      </span>
    </Link>
  )
}

/** The lower panels' stand-in while their chunk loads: their boxes, so nothing below shifts. */
function LowerStandIn() {
  return (
    <>
      <Panel className="col-span-12 lg:col-span-8" title="how a challenge runs">
        <Skeleton className="h-64" />
      </Panel>
      <Panel className="col-span-12 lg:col-span-4" title="when hills run">
        <Skeleton className="h-64" />
      </Panel>
    </>
  )
}

/** The king of the hills' box while the hills or its chunk load, so nothing below shifts. */
function KingStandIn() {
  return (
    <Panel className="col-span-12" title="king of the hills" status="loading">
      <Skeleton className="h-24" />
    </Panel>
  )
}

/** Over the cards; loaded after the page (`KingOfTheHills.tsx`). */
const KingOfTheHills = lazy(() => import('./KingOfTheHills'))

/** Under the cards; loaded after the page (`HillsLower.tsx`). */
const HillsLower = lazy(() => import('./HillsLower'))

/**
 * `/hills` (PRODUCT_SPEC §5): what a hill is and when it runs, the king of the hills (the player
 * who holds the most), the hills in numbers, each hill as
 * a card (its standings as a mountain, its king, how busy it is), how a challenge runs, the hills
 * on one ruler of sizes, the newest board changes on every hill, and the hills side by side with,
 * signed in, the reader's best place on each.
 */
export function HillsPage() {
  const read = useHills()
  const { data, error } = read
  const overview = useHillOverview()
  const link = useLinkAction()
  const handle = useMe().data?.user.handle ?? null
  const profile = useMaybeUser(handle)
  const best = profile.data ? new Map(profile.data.hills.map((b) => [b.hill.slug, b])) : null
  const pulse = new Map((overview.data?.hills ?? []).map((p) => [p.slug, p]))
  const hills = data === undefined ? undefined : byClass(data.hills)
  const emptyAction = link('see how hills work', '/docs/tournaments/hills')
  return (
    <PanelGrid className="p-3">
      <PageIntro about={HILLS_ABOUT} art={<IntroArt name="summit" />} />
      {error === null &&
        (hills === undefined ? (
          <KingStandIn />
        ) : (
          <Suspense fallback={<KingStandIn />}>
            <KingOfTheHills hills={hills} />
          </Suspense>
        ))}
      <Panel
        className="col-span-12"
        title="hills"
        data-tour="hills-list"
        status={readStatus(data, error, (d) => `${d.hills.length} hills`)}
      >
        {error !== null && data === undefined ? (
          <LoadFailure read={read} />
        ) : (
          <div className="flex flex-col gap-3">
            <Numbers hills={hills} pulse={overview.data?.hills} />
            {hills === undefined ? (
              <Skeleton rows={4} />
            ) : hills.length === 0 ? (
              <EmptyState action={emptyAction}>no hill is open yet.</EmptyState>
            ) : (
              <ul aria-label="the hills" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {hills.map((summary) => (
                  <li key={summary.hill.id} className="min-w-0">
                    <HillCard
                      summary={summary}
                      pulse={pulse.get(summary.hill.slug)}
                      best={best?.get(summary.hill.slug)}
                    />
                  </li>
                ))}
                <li className="min-w-0">
                  <YourBotTile />
                </li>
              </ul>
            )}
          </div>
        )}
      </Panel>
      <Suspense fallback={<LowerStandIn />}>
        <HillsLower
          hills={hills}
          overview={overview}
          handle={handle}
          best={best}
          emptyAction={emptyAction}
        />
      </Suspense>
    </PanelGrid>
  )
}
