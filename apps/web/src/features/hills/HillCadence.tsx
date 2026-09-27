/**
 * When the hills run: they have no schedule. A challenge starts when a bot is submitted, and the
 * board changes when it ends; the weekly championship is the one thing on a clock, and it seeds
 * by the hills' ratings. The limits a player meets, and the championship's countdown from the
 * ticker's feed (already read by every page).
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { type ReactNode, useEffect, useState } from 'react'
import { tickerQuery } from '../../api/queries'
import { countdown } from '../../app/ticker'
import { CELL_LINK } from './links'

/** One fact of the clock: its value large at the left, what it means beside it. */
function Beat({ value, title, children }: { value: string; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 border-border border-b py-2 last:border-b-0">
      <span className="w-16 shrink-0 text-accent-fg text-stat leading-none tabular-nums">
        {value}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-bright text-panel-title">{title}</span>
        <span className="text-data text-muted">{children}</span>
      </span>
    </li>
  )
}

/** `Date.now()`, again each minute. */
function useMinute(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function HillCadence() {
  const { data } = useQuery(tickerQuery())
  const now = useMinute()
  const next = data?.nextChampionship ?? null
  const last = data?.lastChampionship ?? null
  const left = next?.startsAt ? Date.parse(next.startsAt) - now : Number.NaN
  return (
    <div className="flex flex-col gap-3">
      <p className="text-data">
        <span className="text-bright">Hills never close and never wait for a date.</span>{' '}
        <span className="text-muted">
          A challenge starts the moment a bot is submitted, day or night, and the board changes the
          moment it ends. There are no seasons: a king holds its hill until a better bot comes.
        </span>
      </p>
      <ol className="flex flex-col">
        <Beat value="now" title="on submit">
          the server queues the challenge and fights its matches one after another. Watch it live
          from the hill&rsquo;s page.
        </Beat>
        <Beat value="1" title="at a time">
          one submission of yours runs on a hill at once. Submit to another hill meanwhile.
        </Beat>
        <Beat value="5/h" title="an hour">
          submissions a player makes. A refused one costs nothing.
        </Beat>
        <Beat value="30s" title="fresh">
          the most a board here can lag. Your own submission&rsquo;s board is read as it lands.
        </Beat>
        <Beat
          value={
            next?.status === 'running' ? 'live' : left > 0 ? countdown(left).toLowerCase() : 'fri'
          }
          title="the championship"
        >
          every Friday, 18:00 US Central: a bracket of up to 32 lightweight bots,{' '}
          <span className="text-bright">seeded by their best hill rating</span>.{' '}
          {next !== null && (
            <Link to="/tournaments/$id" params={{ id: next.id }} className={CELL_LINK}>
              {next.status === 'running' ? `watch ${next.name}` : `enter ${next.name}`}
            </Link>
          )}
          {last?.champion != null && (
            <>
              {next !== null && ' · '}
              last won by <span className="text-bright">{last.champion.name}</span>
            </>
          )}
        </Beat>
      </ol>
    </div>
  )
}
