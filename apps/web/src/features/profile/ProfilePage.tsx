import {
  type Bot,
  type ChampionshipResult,
  type HillBest,
  type UserDetail,
  weightClassOf,
} from '@asmbots/protocol'
import {
  Chip,
  cx,
  EmptyState,
  Identicon,
  Panel,
  PanelGrid,
  Segmented,
  Skeleton,
  Sparkline,
  Stat,
} from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { isNotFound } from '../../api/client'
import { useMe } from '../../api/queries'
import { useUser } from '../../api/user'
import { LoadFailure } from '../../app/LoadFailure'
import { useLinkAction } from '../../app/link-action'
import { Placeholder } from '../../app/Placeholder'
import { preconnectAvatars } from '../account/avatars'
import { ProfileBadges } from '../badges/ProfileBadges'
import { ago, BotLink, CELL_LINK, count, day, plural } from '../hills/links'
import {
  inWeight,
  WEIGHT_FILTERS,
  WEIGHT_SHORT,
  WeightChip,
  type WeightFilter,
} from '../hills/WeightChip'
import { metricText, SizeChart } from '../stats/charts'
import { compact, daysSince, runningTotal, sizeBins, uptime } from '../stats/series'
import { ActivityCalendar, ClassRing, Gauge, GrowthChart, RankStrip, RecordBar } from './charts'
import { type ActivityMetric, calendarWeeks, rate, userDays } from './series'

/** The days the growth chart shows at least, so a new user's chart is not one point. */
const LEAST_DAYS = 14

/** The calendar's weeks: 20, or back to the week they joined, up to a year. */
const LEAST_WEEKS = 20
const MOST_WEEKS = 53

const ACTIVITY = [
  { value: 'matches', label: 'matches' },
  { value: 'versions', label: 'saves' },
  { value: 'wins', label: 'wins' },
] as const satisfies readonly { value: ActivityMetric; label: string }[]

/** Today, UTC, as the API's days read it. */
const today = () => new Date().toISOString().slice(0, 10)

/** A rate as a whole percent, `–` when there is nothing to rate. */
const pct = (r: number | null) => (r === null ? '–' : `${Math.round(100 * r)}%`)

/** The size of each bot that has a version, as the size charts take them. */
const sizesOf = (bots: readonly Bot[]) =>
  bots.flatMap((b) => (b.size === undefined ? [] : [{ size: b.size, bots: 1 }]))

/**
 * `/u/$handle` (PRODUCT_SPEC §6): who they are and how long they have been here, then their
 * badges, their numbers as pictures: gauges for their rates, a calendar of their days, their bots and versions
 * over time, their bots by class and size, their place on each hill, their championships, and a
 * wall of their bots (the public ones, or all of them for the user themself). The avatars'
 * connection opens while the user loads.
 */
export function ProfilePage({ handle }: { handle: string }) {
  preconnectAvatars()
  const read = useUser(handle)
  const { data, error } = read
  if (isNotFound(error)) {
    return (
      <Placeholder title="profile" status={handle}>
        there is no user {handle}.
      </Placeholder>
    )
  }
  if (data === undefined) {
    return (
      <PanelGrid className="p-3">
        <Panel
          className="col-span-12"
          title="profile"
          status={error === null ? 'loading' : 'error'}
        >
          {error === null ? <Skeleton rows={4} /> : <LoadFailure read={read} />}
        </Panel>
      </PanelGrid>
    )
  }
  return (
    <PanelGrid className="p-3">
      <Hero data={data} />
      <ProfileBadges data={data} />
      <Record data={data} />
      <Activity data={data} />
      <Growth data={data} />
      <Arsenal data={data} />
      <Hills data={data} />
      <Championships data={data} />
      <BotWall data={data} />
    </PanelGrid>
  )
}

type Part = { data: UserDetail }

/**
 * Who they are: the avatar (their bots' pattern when there is none, or they are anonymous), the
 * GitHub name and login when they show them, the handle, how long they have been here, and the
 * headline numbers.
 */
function Hero({ data }: Part) {
  const { user, stats, bots, hills } = data
  const { data: me } = useMe()
  const mine = me?.user.id === user.id
  const now = Date.now()
  const joined = user.createdAt.slice(0, 10)
  const days = userDays(stats.days, joined, today(), LEAST_DAYS)
  const botLine = runningTotal(days.map((d) => d.bots))
  const bytes = bots.reduce((n, b) => n + (b.size ?? 0), 0)
  const best = hills.reduce<HillBest | null>(
    (top, h) => (top === null || h.entry.rank < top.entry.rank ? h : top),
    null,
  )
  const activeDays = stats.days.filter(
    (d) => d.day >= joined && (d.versions > 0 || d.matches > 0),
  ).length
  const tile = 'min-w-0'
  return (
    <Panel
      className="col-span-12"
      title="profile"
      status={`joined ${day(user.createdAt)}`}
      actions={
        mine && (
          <Link to="/settings" className={cx(CELL_LINK, 'text-panel-status')}>
            {user.anonymous ? 'anonymous · change' : 'name shown · change'}
          </Link>
        )
      }
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
        <div className="flex min-w-0 items-center gap-4 xl:w-md xl:shrink-0">
          {user.avatarUrl !== null ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="size-20 shrink-0 rounded-md border border-border-strong"
            />
          ) : (
            <Identicon value={user.handle} size={80} className="rounded-md" />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate text-bright text-modal-title">{user.name ?? user.handle}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-data text-muted">
              {user.name !== undefined && <span>@{user.handle}</span>}
              {user.github !== undefined && (
                <a
                  href={`https://github.com/${user.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className={CELL_LINK}
                >
                  github.com/{user.github}
                </a>
              )}
              {user.anonymous === true && <Chip>anonymous</Chip>}
            </div>
            <p className="text-data text-muted">
              here <span className="text-bright">{uptime(user.createdAt, now)}</span>
              {stats.lastAt !== null && (
                <>
                  {' · '}last active <span className="text-bright">{ago(stats.lastAt, now)}</span>
                </>
              )}
              {' · '}active{' '}
              <span className="text-bright">
                {count(activeDays)} of {plural(daysSince(user.createdAt, now) + 1, 'day')}
              </span>
            </p>
          </div>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
          <Stat
            className={tile}
            label="bots"
            value={count(bots.length)}
            note={`${compact(bytes)} bytes`}
          >
            {botLine.length > 1 && (
              <Sparkline
                values={botLine}
                min={0}
                width={56}
                height={24}
                aria-label="bots over time"
              />
            )}
          </Stat>
          <Stat
            className={tile}
            label="versions"
            value={count(stats.versions)}
            note={
              bots.length === 0 ? 'none yet' : `${(stats.versions / bots.length).toFixed(1)} a bot`
            }
          />
          <Stat
            className={tile}
            label="matches"
            value={count(stats.matches)}
            note={`${count(stats.wins)} won`}
          >
            {stats.matches > 0 && (
              <Sparkline
                values={days.slice(-30).map((d) => d.matches)}
                bars
                width={56}
                height={24}
                aria-label="matches a day, last 30 days"
              />
            )}
          </Stat>
          <Stat
            className={tile}
            label="rounds"
            value={count(stats.rounds)}
            note={`${count(stats.survived)} survived`}
          />
          <Stat
            className={tile}
            label="cycles lived"
            value={compact(stats.cycles)}
            note={
              stats.rounds === 0
                ? 'no rounds yet'
                : `${compact(Math.round(stats.cycles / stats.rounds))} a round`
            }
          />
          <Stat
            className={tile}
            label="best rank"
            value={best === null ? '–' : `#${best.entry.rank}`}
            note={best === null ? 'on no hill yet' : `of ${best.entrants} on ${best.hill.name}`}
          />
        </div>
      </div>
    </Panel>
  )
}

/** The rates as gauges, then the matches' record split three ways. */
function Record({ data }: Part) {
  const { stats, hills, championships } = data
  const won = championships.filter((r) => r.champion).length
  const standing = hills.length === 0 ? null : Math.max(...hills.map(standingOf))
  return (
    <Panel
      className="col-span-12 xl:col-span-7"
      title="record"
      status={metricText('matches', stats.matches)}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Gauge
            label="win rate"
            value={rate(stats.wins, stats.matches)}
            reading={pct(rate(stats.wins, stats.matches))}
            note={`${count(stats.wins)} of ${count(stats.matches)}`}
          />
          <Gauge
            label="survival"
            value={rate(stats.survived, stats.rounds)}
            reading={pct(rate(stats.survived, stats.rounds))}
            note={`${count(stats.survived)} of ${plural(stats.rounds, 'round')}`}
          />
          <Gauge
            label="hill standing"
            value={standing}
            reading={pct(standing)}
            note={hills.length === 0 ? 'on no hill' : `best of ${plural(hills.length, 'hill')}`}
          />
          <Gauge
            label="championships"
            value={rate(won, championships.length)}
            reading={championships.length === 0 ? '–' : `${won}/${championships.length}`}
            note={championships.length === 0 ? 'none entered' : 'won of entered'}
          />
        </div>
        {stats.matches > 0 ? (
          <RecordBar wins={stats.wins} ties={stats.ties} losses={stats.losses} />
        ) : (
          <p className="text-muted">no server matches yet: enter a hill to get a record.</p>
        )}
      </div>
    </Panel>
  )
}

/** How far up a hill's field a rank is: 1 the king, 0 the last place. */
function standingOf(h: HillBest): number {
  return h.entrants <= 1 ? 1 : (h.entrants - h.entry.rank) / (h.entrants - 1)
}

/** The days as a calendar, one metric at a time. */
function Activity({ data }: Part) {
  const [metric, setMetric] = useState<ActivityMetric>('matches')
  const now = today()
  const joined = data.user.createdAt.slice(0, 10)
  const days = userDays(data.stats.days, joined, now)
  const since = Math.ceil(days.length / 7) + 1
  const weeks = calendarWeeks(days, now, Math.min(MOST_WEEKS, Math.max(LEAST_WEEKS, since)))
  return (
    <Panel
      className="col-span-12 xl:col-span-5"
      title="activity"
      status={`${weeks.length} weeks`}
      actions={
        <Segmented<ActivityMetric>
          label="activity metric"
          options={ACTIVITY}
          value={metric}
          onValueChange={setMetric}
        />
      }
    >
      <ActivityCalendar weeks={weeks} metric={metric} today={now} />
    </Panel>
  )
}

/** The bots and versions they have, day by day since they joined. */
function Growth({ data }: Part) {
  const days = userDays(data.stats.days, data.user.createdAt.slice(0, 10), today(), LEAST_DAYS)
  return (
    <Panel
      className="col-span-12 xl:col-span-7"
      title="bots over time"
      status={`${plural(data.bots.length, 'bot')} · ${plural(data.stats.versions, 'version')}`}
    >
      <GrowthChart days={days} joined={data.user.createdAt} />
    </Panel>
  )
}

/** Their bots by weight class, and by size in powers of two. */
function Arsenal({ data }: Part) {
  const link = useLinkAction()
  const sizes = sizesOf(data.bots)
  return (
    <Panel
      className="col-span-12 xl:col-span-5"
      title="arsenal"
      status={`${compact(data.bots.reduce((n, b) => n + (b.size ?? 0), 0))} bytes`}
    >
      {sizes.length === 0 ? (
        <EmptyState action={link('write a bot', '/editor')}>no bots with a version yet.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <ClassRing sizes={sizes} />
          <SizeChart bins={sizeBins(sizes)} />
        </div>
      )}
    </Panel>
  )
}

/** Their best place on each hill as a tile: the rank, where it sits in the field, the bot. */
function Hills({ data }: Part) {
  const link = useLinkAction()
  return (
    <Panel
      className="col-span-12 xl:col-span-6"
      title="hills"
      status={`on ${plural(data.hills.length, 'hill')}`}
    >
      {data.hills.length === 0 ? (
        <EmptyState action={link('see the hills', '/hills')}>on no hill yet.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.hills.map((h) => (
            <Tile key={h.hill.slug} accent={h.entry.rank === 1}>
              <div className="flex items-baseline justify-between gap-2">
                <Link to="/hills/$slug" params={{ slug: h.hill.slug }} className={CELL_LINK}>
                  {h.hill.name}
                </Link>
                {h.entry.rank === 1 && <Chip variant="accent">king</Chip>}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-bright text-stat tabular-nums">#{h.entry.rank}</span>
                <span className="text-data text-muted">of {count(h.entrants)}</span>
                <span className="ml-auto text-data text-muted tabular-nums">
                  {count(Math.round(h.entry.rating))} rating
                </span>
              </div>
              <RankStrip rank={h.entry.rank} entrants={h.entrants} />
              <div className="flex items-baseline justify-between gap-2 text-data text-muted">
                <BotLink bot={h.bot} />
                <span className="tabular-nums">
                  {h.entry.wins}/{h.entry.ties}/{h.entry.losses}
                </span>
              </div>
            </Tile>
          ))}
        </div>
      )}
    </Panel>
  )
}

/** Their championships as tiles: the bot, its record there, and whether it won. */
function Championships({ data }: Part) {
  const link = useLinkAction()
  const won = data.championships.filter((r) => r.champion).length
  return (
    <Panel
      className="col-span-12 xl:col-span-6"
      title="championships"
      status={`${won} won of ${data.championships.length}`}
    >
      {data.championships.length === 0 ? (
        <EmptyState action={link('see the tournaments', '/tournaments')}>
          no championships yet.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.championships.map((r: ChampionshipResult) => (
            <Tile key={`${r.tournament.id}:${r.bot.versionId}`} accent={r.champion}>
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  to="/tournaments/$id"
                  params={{ id: r.tournament.id }}
                  className={cx(CELL_LINK, 'truncate')}
                >
                  {r.tournament.name}
                </Link>
                {r.champion && <Chip variant="accent">champion</Chip>}
              </div>
              <div className="text-data text-muted">
                <BotLink bot={r.bot} />
              </div>
              <RecordBar wins={r.wins} ties={r.ties} losses={r.losses} />
            </Tile>
          ))}
        </div>
      )}
    </Panel>
  )
}

/** A tile of a panel's grid; `accent` gives it the accent's stripe (a king, a champion). */
function Tile({ accent = false, children }: { accent?: boolean; children: ReactNode }) {
  return (
    <div
      className={cx(
        'flex min-w-0 flex-col gap-2 rounded-md border border-border border-l-4 bg-panel-2 p-3',
        accent && 'border-l-accent',
      )}
    >
      {children}
    </div>
  )
}

/** Their bots as a wall of cards, each its pattern, name, size, and class; a class at a time. */
function BotWall({ data }: Part) {
  const link = useLinkAction()
  // The bots' weight filter, client-side: a profile's list is short.
  const [weight, setWeight] = useState<WeightFilter>('all')
  const bots = data.bots.filter((b) => inWeight(b.size, weight))
  return (
    <Panel
      className="col-span-12"
      title="bots"
      status={
        weight === 'all'
          ? plural(data.bots.length, 'bot')
          : `${bots.length} of ${plural(data.bots.length, 'bot')}`
      }
      actions={
        data.bots.length > 0 && (
          <Segmented<WeightFilter>
            label="weight class"
            options={WEIGHT_FILTERS}
            value={weight}
            onValueChange={setWeight}
          />
        )
      }
    >
      {bots.length === 0 ? (
        weight !== 'all' && data.bots.length > 0 ? (
          <EmptyState action={{ label: 'show every class', onClick: () => setWeight('all') }}>
            no {WEIGHT_SHORT[weight]} bots.
          </EmptyState>
        ) : (
          <EmptyState action={link('write a bot', '/editor')}>no public bots yet.</EmptyState>
        )
      ) : (
        <ul
          aria-label="bots"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        >
          {bots.map((b) => (
            <li key={b.id}>
              <BotCard bot={b} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** A bot's card: its pattern, its name (the link), its size, class, and last change. */
function BotCard({ bot }: { bot: Bot }) {
  const weight = bot.size === undefined ? null : weightClassOf(bot.size)
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-panel-2 p-2 transition-colors duration-120 hover:border-border-strong">
      <Identicon value={bot.id} size={32} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Link to="/bots/$id" params={{ id: bot.id }} className={cx(CELL_LINK, 'truncate')}>
          {bot.name}
        </Link>
        <span className="truncate text-muted text-panel-status tabular-nums">
          {bot.size === undefined ? 'no version' : `${count(bot.size)} B`} · {day(bot.updatedAt)}
          {bot.visibility !== 'public' && ` · ${bot.visibility}`}
        </span>
      </div>
      {weight !== null && <WeightChip weight={weight} />}
    </div>
  )
}
