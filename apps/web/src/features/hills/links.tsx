/** Links from a table cell to a bot and to a user, and the words the server's records read as. */
import type { BotLabel } from '@asmbots/protocol'
import { Link } from '@tanstack/react-router'
import { AuthorLink, CELL_LINK, ownerAuthor } from '../../app/author'

export { CELL_LINK }

/** The bot's name, a link to its page; with `by`, its author after it: `Dwarf by alice`. */
export function BotLink({ bot, by = false }: { bot: BotLabel; by?: boolean }) {
  const link = (
    <Link to="/bots/$id" params={{ id: bot.botId }} className={CELL_LINK}>
      {bot.name}
    </Link>
  )
  if (!by) return link
  return (
    <>
      {link}
      <span className="text-muted">
        {' '}
        by <BotAuthor bot={bot} />
      </span>
    </>
  )
}

/**
 * Who wrote a server bot: its owner, linked to their profile (`ownerAuthor`). A `%author` that
 * names someone else (`Alice Smith` for `alice`) is in the tooltip.
 */
export function BotAuthor({ bot }: { bot: BotLabel }) {
  const author = ownerAuthor(bot.owner)
  const signed = bot.author?.trim() ?? ''
  const profile = author.handle === null ? '' : `${author.name}'s profile · `
  return (
    <AuthorLink
      author={author}
      title={signed === '' || signed === author.name ? undefined : `${profile}%author ${signed}`}
    />
  )
}

export function UserLink({ handle }: { handle: string }) {
  return (
    <Link to="/u/$handle" params={{ handle }} className={CELL_LINK}>
      {handle}
    </Link>
  )
}

export const count = (n: number) => n.toLocaleString('en-US')

/** `1 bot`, `3 bots`. */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** `100k`, `50k`, `1,500`. */
export function short(n: number): string {
  return n >= 10_000 && n % 1000 === 0 ? `${n / 1000}k` : count(n)
}

/** The day of an ISO time: `2026-09-24`. */
export const day = (iso: string) => iso.slice(0, 10)

const DAY_MS = 86_400_000

/**
 * How long ago the ISO time `iso` was, in the largest whole unit: `today`, `1 day ago`,
 * `3 months ago` (from 60 days), `2 years ago` (from 2 years). What a first-seen date's age reads.
 */
export function longAgo(iso: string, now = Date.now()): string {
  const days = Math.max(0, Math.floor((now - Date.parse(iso)) / DAY_MS))
  const years = Math.floor(days / 365.25)
  if (years >= 2) return `${plural(years, 'year')} ago`
  if (days >= 60) return `${plural(Math.floor(days / 30.4375), 'month')} ago`
  return days < 1 ? 'today' : `${plural(days, 'day')} ago`
}

/** How long before `now` the ISO time `iso` was: `now`, `5m ago`, `3h ago`, else its day. */
export function ago(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000))
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`
  return day(iso)
}
