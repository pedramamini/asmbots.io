import {
  BADGE_GROUPS,
  BADGE_IDS,
  BADGES,
  type BadgeGroup,
  type BadgeId,
  type Leaderboard,
  type LeaderRow,
} from '@asmbots/protocol'
import { Chip, EmptyState, Panel, PanelGrid, Skeleton, Table, type TableColumn } from '@asmbots/ui'
import { useNavigate } from '@tanstack/react-router'
import { IntroArt } from '../../app/IntroArt'
import { LEADERBOARD_ABOUT } from '../../app/intros/leaderboard'
import { LoadFailure, readStatus } from '../../app/LoadFailure'
import { useLinkAction } from '../../app/link-action'
import { PageIntro } from '../../app/PageIntro'
import { BadgeGlyph, BadgeTile, heldValue } from '../badges/Badge'
import { count, plural, UserLink } from '../hills/links'
import { useLeaderboard } from './query'
import { StatsTabs } from './StatsTabs'

/** A row's rank for sorting: the house after everyone. */
const rankOf = (row: LeaderRow) => row.rank ?? Number.POSITIVE_INFINITY

/** Wins over decided and tied matches, a whole percent; `–` with none. */
const winRate = (row: LeaderRow) => (row.matches === 0 ? -1 : row.wins / row.matches)

/** The most badges a row's cell shows; the rest are a count. */
const SHOWN_BADGES = 6

const COLUMNS: TableColumn<LeaderRow>[] = [
  {
    id: 'rank',
    header: '#',
    cell: (row) =>
      row.rank === null ? <Chip>house</Chip> : <span className="text-bright">{row.rank}</span>,
    sortValue: rankOf,
    sortFirst: 'asc',
    align: 'right',
    className: 'w-16',
  },
  {
    id: 'user',
    header: 'builder',
    cell: (row) => <UserLink handle={row.user.handle} />,
    sortValue: (row) => row.user.handle,
    className: 'w-32',
  },
  {
    id: 'badges',
    header: 'badges',
    cell: (row) =>
      row.badges.length === 0 ? (
        <span className="text-muted">–</span>
      ) : (
        <span
          className="flex items-center gap-1"
          title={row.badges.map((b) => BADGES[b.id].name).join(', ')}
        >
          {row.badges.slice(0, SHOWN_BADGES).map((b) => (
            <BadgeGlyph key={b.id} id={b.id} size={16} />
          ))}
          <span className="pl-1 text-muted">{count(row.badges.length)}</span>
        </span>
      ),
    sortValue: (row) => row.badges.length,
    className: 'w-48',
  },
  {
    id: 'wins',
    header: 'wins',
    cell: (row) => count(row.wins),
    sortValue: (row) => row.wins,
    align: 'right',
  },
  {
    id: 'wtl',
    header: 'w / t / l',
    cell: (row) => `${count(row.wins)} / ${count(row.ties)} / ${count(row.losses)}`,
    align: 'right',
    className: 'hidden w-40 xl:table-cell',
  },
  {
    id: 'rate',
    header: 'win %',
    cell: (row) => (row.matches === 0 ? '–' : `${Math.round((100 * row.wins) / row.matches)}%`),
    sortValue: winRate,
    align: 'right',
    className: 'hidden md:table-cell',
  },
  {
    id: 'kills',
    header: 'kills',
    cell: (row) => count(row.kills),
    sortValue: (row) => row.kills,
    align: 'right',
    className: 'hidden md:table-cell',
  },
  {
    id: 'kings',
    header: 'kings',
    cell: (row) => count(row.kings),
    sortValue: (row) => row.kings,
    align: 'right',
  },
  {
    id: 'best',
    header: 'best rank',
    cell: (row) => (row.bestRank === null ? '–' : `#${row.bestRank}`),
    sortValue: (row) => row.bestRank ?? Number.POSITIVE_INFINITY,
    sortFirst: 'asc',
    align: 'right',
    className: 'hidden lg:table-cell',
  },
  {
    id: 'matches',
    header: 'matches',
    cell: (row) => count(row.matches),
    sortValue: (row) => row.matches,
    align: 'right',
    className: 'hidden md:table-cell',
  },
  {
    id: 'bots',
    header: 'bots',
    cell: (row) => count(row.bots),
    sortValue: (row) => row.bots,
    align: 'right',
    className: 'hidden lg:table-cell',
  },
  {
    id: 'titles',
    header: 'titles',
    cell: (row) => `${count(row.titles)} of ${count(row.championships)}`,
    sortValue: (row) => row.titles,
    align: 'right',
    className: 'hidden xl:table-cell',
  },
]

/**
 * `/stats/leaderboard` (PRODUCT_SPEC §12): every builder ranked, the house apart, with their
 * badges; then every badge, who holds it, and what it takes.
 */
export function LeaderboardPage() {
  const read = useLeaderboard()
  const { data, error } = read
  const navigate = useNavigate()
  const link = useLinkAction()
  const rows = data === undefined ? [] : [...data.users, ...(data.house ? [data.house] : [])]
  return (
    <PanelGrid className="p-3">
      <PageIntro about={LEADERBOARD_ABOUT} art={<IntroArt name="chart" />} more={<StatsTabs />} />
      <Panel
        className="col-span-12"
        title="leaderboard"
        status={readStatus(data, error, (d) => plural(d.users.length, 'builder'))}
      >
        {error !== null && data === undefined ? (
          <LoadFailure read={read} what="the leaderboard" />
        ) : (
          <Table
            aria-label="leaderboard"
            columns={COLUMNS}
            rows={rows}
            rowKey={(row) => row.user.id}
            defaultSort={{ column: 'rank', direction: 'asc' }}
            rowClassName={(row) => (row.rank === null ? 'text-muted' : undefined)}
            empty={
              data === undefined ? (
                <Skeleton rows={4} />
              ) : (
                <EmptyState action={link('write a bot', '/editor')}>
                  nobody has signed in yet.
                </EmptyState>
              )
            }
            onRowClick={(row) =>
              void navigate({ to: '/u/$handle', params: { handle: row.user.handle } })
            }
          />
        )}
      </Panel>
      <Badges data={data} />
    </PanelGrid>
  )
}

/** Who holds badge `id`: each builder, with a title's number. */
function holders(data: Leaderboard, id: BadgeId) {
  return data.users.flatMap((row) => {
    const held = row.badges.find((b) => b.id === id)
    return held === undefined ? [] : [{ handle: row.user.handle, value: held.value }]
  })
}

/** What a badge's tile says of its holders: the title's holder and number, or how many. */
function holderNote(data: Leaderboard, id: BadgeId) {
  const held = holders(data, id)
  if (held.length === 0) return <span className="text-muted">nobody yet</span>
  if (BADGES[id].kind === 'milestone') return plural(held.length, 'builder')
  const first = held[0] as (typeof held)[number]
  return (
    <>
      <UserLink handle={first.handle} />
      {held.length > 1 && ` and ${plural(held.length - 1, 'other')}`}
      {' · '}
      {heldValue(id, first.value)}
    </>
  )
}

const GROUP_TITLES: Readonly<Record<BadgeGroup, string>> = {
  builder: 'building',
  fighter: 'fighting',
  hills: 'the hills',
  championships: 'championships',
  time: 'time',
}

/** Every badge, group by group: what it takes, and who holds it. */
function Badges({ data }: { data: Leaderboard | undefined }) {
  const held = data === undefined ? [] : BADGE_IDS.filter((id) => holders(data, id).length > 0)
  return (
    <Panel
      id="badges"
      className="col-span-12 scroll-mt-3"
      title="badges"
      status={readStatus(
        data,
        null,
        () => `${count(held.length)} of ${count(BADGE_IDS.length)} held`,
      )}
    >
      {data === undefined ? (
        <Skeleton rows={6} />
      ) : (
        <div className="flex flex-col gap-4">
          {BADGE_GROUPS.map((group) => (
            <section key={group} aria-label={GROUP_TITLES[group]} className="flex flex-col gap-2">
              <h2 className="text-muted text-panel-status">{GROUP_TITLES[group]}</h2>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {BADGE_IDS.filter((id) => BADGES[id].group === group).map((id) => (
                  <BadgeTile
                    key={id}
                    id={id}
                    held={held.includes(id)}
                    note={holderNote(data, id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Panel>
  )
}
