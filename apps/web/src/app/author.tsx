/**
 * Who wrote a bot, wherever the site names one (PRODUCT_SPEC §6): a name, and a link to that
 * user's profile when the site knows whose the bot is. A server bot's owner is known; a bot that
 * lives only in a browser has its `%author`, which links when it is the house's or the reader's.
 */
import { DELETED_HANDLE, HOUSE_AUTHOR, HOUSE_HANDLE, type Me } from '@asmbots/protocol'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

/**
 * A link inside running text or a table cell: underlined, quietly, so it never leans on its color
 * alone (`by system` in muted text); the pointer brings the accent.
 */
export const CELL_LINK =
  'rounded-sm text-bright underline decoration-border-strong underline-offset-2 hover:text-accent-fg hover:decoration-current focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent'

/** A bot's author as the site shows it: the name, and the handle whose profile it links to. */
export interface Author {
  readonly name: string
  /** Null when no profile is known: a pasted `%author`, a deleted account. */
  readonly handle: string | null
}

/**
 * The author of a server bot: its owner, whose profile the link opens. The house reads as
 * `ASM Bots`; a deleted account's bots have no profile.
 */
export function ownerAuthor(owner: string): Author {
  if (owner === HOUSE_HANDLE) return { name: HOUSE_AUTHOR, handle: HOUSE_HANDLE }
  return { name: owner, handle: owner === DELETED_HANDLE ? null : owner }
}

/**
 * The author of a bot known by its source only: its `%author`, linked to the house for a roster
 * bot's and to the reader for their own (their handle, GitHub login, or name), else unlinked. No
 * `%author` reads as the reader's own bot when `mine`, else as `anonymous`.
 */
export function sourceAuthor(author: string, me: Me | null | undefined, mine = false): Author {
  const name = author.trim()
  if (name === HOUSE_AUTHOR) return { name, handle: HOUSE_HANDLE }
  const user = me?.user
  if (user !== undefined) {
    if (name === '' && mine) return { name: user.handle, handle: user.handle }
    const own = [user.handle, user.github, user.name].some(
      (v) => v !== undefined && v.toLowerCase() === name.toLowerCase(),
    )
    if (own) return { name, handle: user.handle }
  }
  return { name: name === '' ? 'anonymous' : name, handle: null }
}

/** `Dwarf by alice`: a name and its author, for a title where a link has no room. */
export function byline(name: string, author: Author | null | undefined): string {
  return author == null ? name : `${name} by ${author.name}`
}

/**
 * The author's name, a link to their profile when there is one. `className` is layout only
 * (`truncate`, `min-w-0`): the link keeps `CELL_LINK`'s color and underline, the plain name the
 * text around it.
 */
export function AuthorLink({
  author,
  className,
  title,
  newTab,
  untabbed,
  children,
}: {
  author: Author
  className?: string
  /** The tooltip, when not `<name>'s profile` (a plain name has none). */
  title?: string | undefined
  /** Opens the profile in a new tab: from an embed, which sits on another site. */
  newTab?: boolean | undefined
  /**
   * Leaves the link out of the Tab order, where a grid repeats it on every item (the arena's
   * roster): a pointer and a screen reader still reach it.
   */
  untabbed?: boolean | undefined
  /** What the link reads, when not the name alone. */
  children?: ReactNode
}) {
  const text = children ?? author.name
  if (author.handle === null) {
    return (
      <span className={className} title={title}>
        {text}
      </span>
    )
  }
  return (
    <Link
      to="/u/$handle"
      params={{ handle: author.handle }}
      className={className === undefined ? CELL_LINK : `${className} ${CELL_LINK}`}
      title={title ?? `${author.name}'s profile`}
      {...(newTab === true && { target: '_blank', rel: 'noopener' })}
      {...(untabbed === true && { tabIndex: -1 })}
    >
      {text}
    </Link>
  )
}

/**
 * ` by <author>` in muted text, the name a link to the profile (`AuthorLink`); nothing when the
 * author is not known. Its leading space parts it from the name before it in running text, and
 * drops away in a flex row, whose gap parts it. `className` sets layout and size (`shrink-0`,
 * `text-data`), not color.
 */
export function ByAuthor({
  author,
  className,
  newTab,
}: {
  author: Author | null | undefined
  className?: string
  /** Opens the profile in a new tab (`AuthorLink`'s). */
  newTab?: boolean | undefined
}) {
  if (author == null) return null
  return (
    <span className={className === undefined ? 'text-muted' : `${className} text-muted`}>
      {' '}
      by <AuthorLink author={author} newTab={newTab} />
    </span>
  )
}
