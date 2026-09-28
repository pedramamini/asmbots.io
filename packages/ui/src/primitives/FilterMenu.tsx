import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  useEffect,
  useRef,
  useState,
} from 'react'
import { filterCommands } from '../fuzzy'
import { cx } from '../style'
import { Input } from './Input'
import { Menu, type MenuItem, type MenuProps } from './Menu'

export interface FilterMenuProps extends Omit<MenuProps, 'items' | 'search'> {
  items: readonly MenuItem[]
  /** The search field's placeholder and name: `filter bots`. */
  filter: string
}

/**
 * A `Menu` with a search field over its items: typing ranks them by fuzzy match on their labels
 * (`filterCommands`). Opening focuses the field, empty. In the field, Down and Up go to the first
 * and last match (the menu's keys), Enter chooses the first, Escape closes; the other keys stay in
 * the field. On an item, Up from the first goes back to the field, and a letter or Backspace goes
 * on typing in it. The items scroll under the field past 320 px. Its own module, so the field and
 * the ranking load only with the pages that use it, not with every page's `Menu`.
 */
export function FilterMenu({
  items,
  filter,
  className,
  onKeyDown,
  onFocus,
  ...rest
}: FilterMenuProps) {
  const [query, setQuery] = useState('')
  /** Set as the menu opens: the focus the menu then gives its first item goes to the field. */
  const opening = useRef(false)
  const shown = filterCommands(items, query)

  const onFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget
        .closest('[role=menu]')
        ?.querySelector<HTMLElement>('[role=menuitem]:enabled')
        ?.click()
    }
    // The menu's keys (type-ahead, Home, End) would take these from the caret.
    if (!['ArrowDown', 'ArrowUp', 'Escape', 'Tab'].includes(event.key)) event.stopPropagation()
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    const field = event.currentTarget.querySelector('input')
    if (field === null || event.target === field) return
    const typed = event.key.length === 1 && event.key !== ' '
    const first = event.currentTarget.querySelector('[role=menuitem]:enabled')
    if (event.key === 'ArrowUp' && event.target === first) {
      event.preventDefault()
      field.focus()
    } else if (typed || event.key === 'Backspace') {
      event.preventDefault()
      field.focus()
      setQuery((text) => (typed ? text + event.key : text.slice(0, -1)))
    }
  }

  return (
    <Menu
      {...rest}
      items={shown}
      className={cx('max-h-80 overflow-y-auto', className)}
      onKeyDown={onMenuKeyDown}
      onFocus={(event: FocusEvent<HTMLDivElement>) => {
        onFocus?.(event)
        if (!opening.current) return
        opening.current = false
        event.currentTarget.querySelector('input')?.focus()
      }}
      search={
        // biome-ignore lint/a11y/useSemanticElements: a menu owns groups, not fieldsets
        <div role="group" aria-label={filter} className="sticky -top-1 -mt-1 bg-panel pt-1 pb-1">
          <SearchField opening={opening} onGone={() => setQuery('')}>
            <Input
              aria-label={filter}
              placeholder={filter}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onKeyDown={onFieldKeyDown}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setQuery(event.currentTarget.value)
              }
            />
          </SearchField>
          {shown.length === 0 && <p className="px-2 pt-1 text-text-dim">no match</p>}
        </div>
      }
    />
  )
}

/** The field: it marks the menu opening, and clears the search as it closes. */
function SearchField({
  opening,
  onGone,
  children,
}: {
  opening: { current: boolean }
  onGone: () => void
  children: ReactElement
}) {
  useEffect(() => {
    opening.current = true
    return onGone
  }, [])
  return children
}
