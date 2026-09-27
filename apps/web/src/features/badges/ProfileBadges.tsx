import { BADGE_IDS, BADGES, type UserDetail } from '@asmbots/protocol'
import { EmptyState, Panel } from '@asmbots/ui'
import { Link } from '@tanstack/react-router'
import { useLinkAction } from '../../app/link-action'
import { CELL_LINK, count } from '../hills/links'
import { BadgeTile, heldValue } from './Badge'

/**
 * A profile's badges (PRODUCT_SPEC §12): the titles they hold, then their milestones, each with
 * what it takes and a title's number; and a link to every badge on the leaderboard.
 */
export function ProfileBadges({ data }: { data: UserDetail }) {
  const link = useLinkAction()
  const held = [...data.badges].sort(
    (a, b) => Number(BADGES[b.id].kind === 'title') - Number(BADGES[a.id].kind === 'title'),
  )
  return (
    <Panel
      className="col-span-12"
      title="badges"
      status={`${count(held.length)} of ${count(BADGE_IDS.length)}`}
      actions={
        <Link to="/stats/leaderboard" hash="badges" className={`${CELL_LINK} text-data`}>
          every badge
        </Link>
      }
    >
      {held.length === 0 ? (
        <EmptyState action={link('see what earns one', '/stats/leaderboard')}>
          no badges yet.
        </EmptyState>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {held.map((b) => (
            <BadgeTile key={b.id} id={b.id} note={heldValue(b.id, b.value)} />
          ))}
        </ul>
      )}
    </Panel>
  )
}
