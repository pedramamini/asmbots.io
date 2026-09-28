import { type ChangeEvent, useState } from 'react'
import { filterCommands } from '../fuzzy'
import { Input } from './Input'
import { Menu, type MenuItem, type MenuProps } from './Menu'

export interface FilterMenuProps extends Omit<MenuProps, 'items' | 'search' | 'onOpen'> {
  items: readonly MenuItem[]
  /** The search field's placeholder and name: `filter bots`. */
  filter: string
}

/**
 * A `Menu` with a search field over its items: typing ranks them by fuzzy match on their labels
 * (`filterCommands`); the field starts empty each time the menu opens. Its own module, so the
 * field and the ranking load only with the pages that use it, not with every page's `Menu`.
 */
export function FilterMenu({ items, filter, ...rest }: FilterMenuProps) {
  const [query, setQuery] = useState('')
  return (
    <Menu
      {...rest}
      items={filterCommands(items, query)}
      onOpen={() => setQuery('')}
      search={
        <Input
          aria-label={filter}
          placeholder={filter}
          autoComplete="off"
          spellCheck={false}
          className="mb-1"
          value={query}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.currentTarget.value)}
        />
      }
    />
  )
}
