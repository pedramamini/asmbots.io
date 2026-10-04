/**
 * The picker's table view (PRODUCT_SPEC §2): every bot listed as one 24 px row, for reading and
 * changing many at once. Rows sort from their headers (the list's own order, the best first, until
 * then) and draw only the ones in view past 200. Checkboxes pick rows, `select all` the list as the
 * filters leave it, and the bar over the table acts on what is picked: add them to the fight, and
 * for my bots, change who may see them, keep this browser's in my account, or delete them. Its own
 * chunk, loaded when the view is first picked.
 */
import type { Visibility } from '@asmbots/protocol'
import { weightClassOf } from '@asmbots/protocol'
import {
  Button,
  IconButton,
  Identicon,
  Modal,
  Table,
  type TableColumn,
  useToast,
} from '@asmbots/ui'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { type MouseEvent, type ReactNode, useMemo, useState } from 'react'
import { type Author, AuthorLink } from '../../../app/author'
import { type BotRecord, gamesOf } from '../../../store/bot-records'
import { deleteLocalBot, LOCAL_BOTS_KEY, type LocalBot } from '../../../store/local-bots'
import { importLocalBots } from '../../account/FirstSignIn'
import { botsNamed, useBotChanges } from '../../bots/bulk'
import { VISIBILITIES, VISIBILITY, VisibilityChip } from '../../bots/visibility'
import { WeightChip } from '../../hills/WeightChip'
import { type CatalogBot, errorsOf, listingOf, visibilityOf } from './bots'
import { formatRef } from './url'

export interface BotTableProps {
  /** The bots listed, in the list's order: the search's, of the player, in the weight class. */
  bots: readonly CatalogBot[]
  records: Readonly<Record<string, BotRecord>>
  ranks: ReadonlyMap<string, number>
  authorOf: (bot: CatalogBot) => Author
  /** How many more bots the fight takes. */
  room: number
  /** Adds bots to the fight. */
  onAdd: (bots: readonly CatalogBot[]) => void
  /** My bots: the visibility column, and the account's actions. */
  mine: boolean
  /** Whether the account's actions can run. */
  signedIn: boolean
  /** This browser's bots, by id: what `keep in my account` imports. */
  local: readonly LocalBot[]
  /** What shows when no bot is listed. */
  empty: ReactNode
}

/** Unranked, unplaced, or unknown: after every number when a column sorts. */
const LAST = Number.MAX_SAFE_INTEGER

const key = (bot: CatalogBot) => formatRef(bot.ref)

/** A bot's account id, when it is one of my account bots. */
function accountId(bot: CatalogBot): string | null {
  const listing = listingOf(bot)
  return listing !== undefined && 'visibility' in listing ? listing.bot.botId : null
}

/** A bot's id in this browser's store, when it is a local bot. */
function localId(bot: CatalogBot): string | null {
  return bot.origin === 'local' && bot.ref.kind === 'local' ? bot.ref.id : null
}

export function BotTable({
  bots,
  records,
  ranks,
  authorOf,
  room,
  onAdd,
  mine,
  signedIn,
  local,
  empty,
}: BotTableProps) {
  const client = useQueryClient()
  const { toast } = useToast()
  const { setVisibility, remove } = useBotChanges()
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // The picked rows the list still holds: a filter hides a row, and it is no longer picked.
  const picked = useMemo(() => bots.filter((bot) => chosen.has(key(bot))), [bots, chosen])
  const all = picked.length === bots.length && bots.length > 0
  const toggle = (bot: CatalogBot) =>
    setChosen((now) => {
      const next = new Set(now)
      if (!next.delete(key(bot))) next.add(key(bot))
      return next
    })
  const pickAll = () => setChosen(all ? new Set() : new Set(bots.map(key)))

  const accounts = picked.flatMap((bot) => accountId(bot) ?? [])
  const unsynced = local.filter((b) =>
    picked.some((bot) => localId(bot) === b.id && accountId(bot) === null),
  )
  const locals = picked.flatMap((bot) => localId(bot) ?? [])
  const names = picked.map((bot) => bot.name)

  /** Runs a change with the bar held, then lets the rows go. */
  const run = async (change: () => Promise<boolean>) => {
    setBusy(true)
    if (await change()) setChosen(new Set())
    setBusy(false)
  }

  const visibility = (to: Visibility) =>
    run(() =>
      setVisibility(
        accounts,
        picked.filter((bot) => accountId(bot) !== null).map((bot) => bot.name),
        to,
      ),
    )

  const keep = () =>
    run(async () => {
      try {
        const { imported, refused } = await importLocalBots(unsynced)
        await Promise.all([
          client.invalidateQueries({ queryKey: LOCAL_BOTS_KEY }),
          client.invalidateQueries({ queryKey: ['me', 'bots'] }),
        ])
        toast(
          `kept ${imported} ${imported === 1 ? 'bot' : 'bots'} in my account${
            refused.length > 0 ? `; ${refused.length} did not assemble` : ''
          }.`,
          { variant: refused.length > 0 ? 'warn' : 'accent' },
        )
        return true
      } catch {
        toast('could not keep them in my account.', { variant: 'danger' })
        return false
      }
    })

  const deleteAll = () =>
    run(async () => {
      setConfirming(false)
      const ok = accounts.length === 0 || (await remove(accounts, names))
      for (const id of locals) await deleteLocalBot(id)
      if (locals.length > 0) await client.invalidateQueries({ queryKey: LOCAL_BOTS_KEY })
      if (accounts.length === 0) toast(`deleted ${botsNamed(names)} from this browser.`)
      return ok
    })

  const columns = useMemo<TableColumn<CatalogBot>[]>(() => {
    const list: TableColumn<CatalogBot>[] = [
      {
        id: 'pick',
        header: (
          <input
            type="checkbox"
            aria-label={`select all ${bots.length}`}
            checked={all}
            onChange={pickAll}
            className="size-3 accent-(--accent)"
          />
        ),
        cell: (bot) => (
          <input
            type="checkbox"
            aria-label={`select ${bot.name}`}
            checked={chosen.has(key(bot))}
            onChange={() => toggle(bot)}
            className="size-3 accent-(--accent)"
          />
        ),
        className: 'w-6',
      },
      {
        id: 'bot',
        header: 'bot',
        cell: (bot) => (
          <span className="flex min-w-0 items-center gap-2">
            <Identicon
              value={bot.assembled.bytes.length > 0 ? bot.assembled.bytes : (bot.source ?? '')}
              size={16}
            />
            <span className="truncate text-bright">{bot.name}</span>
          </span>
        ),
        sortValue: (bot) => bot.name.toLowerCase(),
      },
      {
        id: 'author',
        header: 'author',
        cell: (bot) => <AuthorLink author={authorOf(bot)} className="truncate" untabbed />,
        sortValue: (bot) => authorOf(bot).name.toLowerCase(),
        className: 'w-32',
      },
      {
        id: 'hill',
        header: 'hill',
        cell: (bot) => {
          const best = listingOf(bot)?.best
          if (!best) return <span className="text-muted">–</span>
          return (
            <span title={`${best.wins}-${best.ties}-${best.losses} there`}>
              <span className="text-accent-fg">{best.rank === 1 ? 'king' : `#${best.rank}`}</span>
              <span className="text-muted"> · {best.hill.name}</span>
            </span>
          )
        },
        sortValue: (bot) => listingOf(bot)?.best?.rank ?? LAST,
        sortFirst: 'asc',
        className: 'w-32',
      },
      {
        id: 'rating',
        header: 'rating',
        cell: (bot) => {
          const best = listingOf(bot)?.best
          return best ? Math.round(best.rating) : <span className="text-muted">–</span>
        },
        align: 'right',
        sortValue: (bot) => listingOf(bot)?.best?.rating ?? -LAST,
        className: 'w-16',
      },
      {
        id: 'arena',
        header: 'arena',
        cell: (bot) => {
          const record = records[key(bot)]
          const rank = ranks.get(key(bot))
          if (record === undefined || rank === undefined)
            return <span className="text-muted">–</span>
          return (
            <span title="rank · wins-losses-draws · win rate, in this browser's arena">
              <span className="text-accent-fg">#{rank}</span>
              <span className="text-muted">
                {' '}
                · {record.wins}-{record.losses}-{record.draws} ·{' '}
                {Math.round((100 * record.wins) / gamesOf(record))}%
              </span>
            </span>
          )
        },
        sortValue: (bot) => ranks.get(key(bot)) ?? LAST,
        sortFirst: 'asc',
        className: 'w-36',
      },
      {
        id: 'size',
        header: 'size',
        cell: (bot) => {
          const size = bot.assembled.bytes.length
          const weight = errorsOf(bot).length > 0 ? null : weightClassOf(size)
          return (
            <span className="flex items-center justify-end gap-2">
              {errorsOf(bot).length > 0 ? 'errors' : `${size} B`}
              {weight !== null && <WeightChip weight={weight} />}
            </span>
          )
        },
        align: 'right',
        sortValue: (bot) => bot.assembled.bytes.length,
        sortFirst: 'asc',
        className: 'w-32',
      },
    ]
    if (mine) {
      list.push({
        id: 'visibility',
        header: 'visibility',
        cell: (bot) => {
          const seen = visibilityOf(bot)
          return seen === null ? null : <VisibilityChip visibility={seen} />
        },
        sortValue: (bot) => visibilityOf(bot) ?? '',
        className: 'w-28',
      })
    }
    list.push({
      id: 'add',
      header: <span className="sr-only">add</span>,
      cell: (bot) =>
        errorsOf(bot).length > 0 ? null : (
          <IconButton
            icon={Plus}
            label={`add ${bot.name}`}
            size="sm"
            tooltip="left"
            disabled={room <= 0}
            onClick={() => onAdd([bot])}
          />
        ),
      align: 'right',
      className: 'w-8',
    })
    return list
  }, [bots, chosen, all, records, ranks, authorOf, mine, room, onAdd])

  if (bots.length === 0) return empty
  const fightable = picked.filter((bot) => errorsOf(bot).length === 0)
  return (
    <div className="flex flex-col gap-2">
      <div
        role="toolbar"
        aria-label="picked bots"
        className="flex min-h-8 flex-wrap items-center gap-2 text-data text-muted"
      >
        <span className="text-panel-status">
          {picked.length > 0 ? `${picked.length} of ${bots.length} picked` : `${bots.length} bots`}
        </span>
        {picked.length > 0 && (
          <>
            <Button
              size="sm"
              icon={Plus}
              disabled={busy || room <= 0 || fightable.length === 0}
              title={room <= 0 ? 'the fight is full' : `add up to ${room} to the fight`}
              onClick={() => onAdd(fightable)}
            >
              add {Math.min(room, fightable.length)} to the fight
            </Button>
            {mine &&
              accounts.length > 0 &&
              VISIBILITIES.map((v) => (
                <Button
                  key={v}
                  size="sm"
                  icon={VISIBILITY[v].icon}
                  title={VISIBILITY[v].about}
                  disabled={busy}
                  onClick={() => void visibility(v)}
                >
                  make {v}
                </Button>
              ))}
            {mine && signedIn && unsynced.length > 0 && (
              <Button size="sm" disabled={busy} onClick={() => void keep()}>
                keep {unsynced.length} in my account
              </Button>
            )}
            {mine && (
              <Button
                size="sm"
                icon={Trash2}
                variant="danger"
                disabled={busy}
                onClick={() => setConfirming(true)}
              >
                delete {picked.length}
              </Button>
            )}
            <Button size="sm" disabled={busy} onClick={() => setChosen(new Set())}>
              clear
            </Button>
          </>
        )}
      </div>
      <Table
        aria-label="bots to add"
        className="max-h-[36rem]"
        columns={columns}
        rows={bots}
        rowKey={key}
        rowSelected={(bot) => chosen.has(key(bot))}
        onRowClick={(bot, event: MouseEvent<HTMLTableRowElement>) => {
          // A click on a control in the row is the control's.
          if ((event.target as Element).closest('button, a, input')) return
          toggle(bot)
        }}
      />
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`delete ${botsNamed(names)}?`}
        size="sm"
        actions={
          <>
            <Button onClick={() => setConfirming(false)}>cancel</Button>
            <Button variant="danger" icon={Trash2} autoFocus onClick={() => void deleteAll()}>
              delete
            </Button>
          </>
        }
      >
        <p className="text-body">
          {[
            accounts.length > 0 && `${accounts.length} from my account`,
            locals.length > 0 && `${locals.length} from this browser`,
          ]
            .filter(Boolean)
            .join(', ')}
          . Their hill records stay. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
