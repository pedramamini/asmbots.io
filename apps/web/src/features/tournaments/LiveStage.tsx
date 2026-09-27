/**
 * A running server tournament's live stage (PRODUCT_SPEC §4): a full-width band in the accent's
 * glow at the top of its page. Its strip says `LIVE`, the match count and a bar of it, the
 * spectators, and has `tune in live`; under it, the match being fought (its bots in their hues)
 * and the scoreboard, the room's standings with the bots in the ring marked. Tuned in, the match
 * runs in the arena in the ring's place (`LiveArena`), beside the scoreboard.
 */
import type { Standing, TournamentDetail } from '@asmbots/protocol'
import { entrantNames } from '@asmbots/protocol'
import { Button, cx, HueSwatch, Identicon } from '@asmbots/ui'
import { Play, Radio, X } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { useMotionReduced } from '../../store/settings'
import type { ArenaClient } from '../arena/worker/client'
import { count } from '../hills/links'
import { LiveChip, SpectatorCount } from '../live/LiveChip'
import { LIVE_DWELL_MS, ROUND_REST_MS } from '../live/LivePanel'
import { currentMatch, type LiveRoomState, roomBusy } from '../live/room'
import type { Tournament } from './store'
import { identiconValue } from './TournamentsPage'

const LiveArena = lazy(() => import('../live/LiveArena').then((m) => ({ default: m.LiveArena })))

export interface LiveStageProps {
  live: LiveRoomState
  detail: TournamentDetail
  tournament: Tournament
  /** The arena is on the stage. */
  tuned: boolean
  onTune: (tuned: boolean) => void
  createClient?: (() => ArenaClient) | undefined
}

export function LiveStage({
  live,
  detail,
  tournament: t,
  tuned,
  onTune,
  createClient,
}: LiveStageProps) {
  const reduced = useMotionReduced()
  const current = currentMatch(live)
  const progress = live.jobs.get(`tournament:${detail.tournament.id}`)
  const done = progress?.done ?? detail.matches.filter((m) => m.finishedAt !== null).length
  const of = progress?.of ?? 0
  const fighting = new Set(current?.match.participants ?? [])
  const busy = roomBusy(live)
  return (
    <section
      aria-label="live now"
      data-live-stage={tuned ? 'tuned' : 'strip'}
      className="col-span-12 flex min-w-0 flex-col gap-3 rounded-md border border-accent bg-panel p-3 shadow-[0_0_24px_var(--accent-25)]"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex items-center gap-2 rounded-sm bg-accent-25 px-2 py-1 text-nav text-bright">
          <span
            aria-hidden="true"
            className={cx(
              'size-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]',
              busy && !reduced && 'animate-skeleton',
            )}
          />
          live now
        </span>
        <p className="min-w-0 truncate text-data">
          {current === null ? (
            <span className="text-muted">between matches: the next one starts here.</span>
          ) : (
            <>
              <span className="text-muted">fighting · </span>
              <span className="text-bright">
                {current.match.bots.map((bot) => bot.name).join(' v ')}
              </span>
            </>
          )}
        </p>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-data text-muted tabular-nums">
            {of > 0 ? `match ${count(Math.min(done + 1, of))} of ${count(of)}` : ''}
          </span>
          <LiveChip status={live.status} busy={busy} />
          <SpectatorCount count={live.spectators} />
          {tuned ? (
            <Button size="sm" icon={X} onClick={() => onTune(false)}>
              leave the arena
            </Button>
          ) : (
            <Button variant="primary" icon={Radio} onClick={() => onTune(true)}>
              tune in live
            </Button>
          )}
        </span>
      </div>
      {of > 0 && (
        <div
          role="progressbar"
          aria-label="matches played"
          aria-valuemin={0}
          aria-valuemax={of}
          aria-valuenow={done}
          className="h-1 overflow-hidden rounded-full bg-accent-10"
        >
          <div className="h-full bg-accent" style={{ width: `${(100 * done) / of}%` }} />
        </div>
      )}
      <div className="grid min-w-0 grid-cols-12 gap-3">
        <div className="col-span-12 min-w-0 lg:col-span-8">
          {tuned ? (
            <section aria-label="live arena" className="min-w-0">
              <Suspense fallback={<Ring live={live} />}>
                <LiveArena
                  live={live}
                  current={current}
                  createClient={createClient}
                  dwell={LIVE_DWELL_MS}
                  rest={ROUND_REST_MS}
                  fallback={<Ring live={live} />}
                  stageClassName="mx-auto max-w-[min(100%,70vh)]"
                />
              </Suspense>
            </section>
          ) : (
            <Ring live={live} onWatch={() => onTune(true)} />
          )}
        </div>
        <Scoreboard
          className="col-span-12 lg:col-span-4"
          standings={live.standings}
          detail={detail}
          tournament={t}
          fighting={fighting}
        />
      </div>
    </section>
  )
}

/**
 * The match in the ring, big: each bot's hue, name, and a `v` between them, and `watch it here`,
 * which tunes in. Tuned in, it holds the arena's place until the next match starts.
 */
function Ring({ live, onWatch }: { live: LiveRoomState; onWatch?: (() => void) | undefined }) {
  const current = currentMatch(live)
  if (current === null) {
    return (
      <div className="grid h-full min-h-32 place-items-center rounded-md border border-dashed border-border text-data text-muted">
        {live.status === 'connecting' ? 'joining the live room…' : 'the ring is empty for now.'}
      </div>
    )
  }
  const { bots, rounds } = current.match
  return (
    <div className="flex h-full min-h-32 flex-col items-center justify-center gap-4 rounded-md border border-border bg-panel-2 p-6 text-center">
      <p className="text-panel-status text-muted">in the ring</p>
      <ol
        aria-label="in the ring"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
      >
        {bots.map((bot, i) => (
          <li key={`${i}-${bot.name}`} className="flex min-w-0 items-center gap-2">
            {i > 0 && bots.length <= 4 && (
              <span aria-hidden="true" className="text-panel-status text-muted">
                v
              </span>
            )}
            <HueSwatch hue={i} size={14} />
            <span className="truncate text-stat text-bright">{bot.name}</span>
          </li>
        ))}
      </ol>
      <p className="text-data text-muted">
        {rounds} {rounds === 1 ? 'round' : 'rounds'} · seed {current.match.seed}
      </p>
      {onWatch !== undefined && (
        <Button variant="primary" icon={Play} onClick={onWatch}>
          watch it here
        </Button>
      )}
    </div>
  )
}

/**
 * The room's standings as a scoreboard: place, bot, W-T-L, and points, the leader in the accent;
 * a bot in the ring has a glowing dot. Before the room has standings, the entrants, unranked.
 */
function Scoreboard({
  standings,
  detail,
  tournament: t,
  fighting,
  className,
}: {
  standings: readonly Standing[] | null
  detail: TournamentDetail
  tournament: Tournament
  fighting: ReadonlySet<string>
  className?: string
}) {
  const names = entrantNames(detail.entrants)
  const entrantOf = new Map(detail.entrants.map((label, e) => [label.versionId, e]))
  const rows =
    standings ??
    detail.entrants.map((label) => ({
      botVersionId: label.versionId,
      rank: 0,
      score: 0,
      wins: 0,
      ties: 0,
      losses: 0,
    }))
  return (
    <div className={cx('flex min-w-0 flex-col gap-1', className)}>
      <p className="text-panel-status text-muted">
        scoreboard{standings === null ? ' · no match scored yet' : ''}
      </p>
      <ol aria-label="scoreboard" className="flex flex-col">
        {rows.map((row) => {
          const e = entrantOf.get(row.botVersionId)
          const entrant = e === undefined ? undefined : t.entrants[e]
          const leader = standings !== null && row.rank === 1
          const inRing = fighting.has(row.botVersionId)
          return (
            <li
              key={row.botVersionId}
              aria-label={e === undefined ? 'a deleted bot' : names[e]}
              data-fighting={inRing || undefined}
              className={cx(
                'flex min-w-0 items-center gap-2 border-b border-border py-1 text-data last:border-b-0',
                inRing && 'bg-accent-10',
              )}
            >
              <span className="w-6 shrink-0 text-right text-muted tabular-nums">
                {row.rank > 0 ? row.rank : '·'}
              </span>
              {entrant !== undefined && <Identicon value={identiconValue(entrant)} size={12} />}
              <span
                className={cx('min-w-0 flex-1 truncate', leader ? 'text-accent-fg' : 'text-bright')}
              >
                {e === undefined ? 'a deleted bot' : names[e]}
              </span>
              {inRing && (
                <span className="flex shrink-0 items-center" title="in the ring now">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent)]"
                  />
                  <span className="sr-only">in the ring</span>
                </span>
              )}
              <span className="shrink-0 text-muted tabular-nums" title="wins-ties-losses">
                {row.wins}-{row.ties}-{row.losses}
              </span>
              <span className="w-12 shrink-0 text-right text-bright tabular-nums" title="points">
                {count(row.score)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
