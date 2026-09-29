import { Button } from '@asmbots/ui'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

/** How many items a long list shows at first, and how many more each click shows. */
export const PAGE_SIZE = 25

/** The first `shown` of `items`, and a `more` that shows `PAGE_SIZE` more. */
export function useShowMore<T>(items: readonly T[], page = PAGE_SIZE) {
  const [shown, setShown] = useState(page)
  return {
    visible: items.slice(0, shown),
    hidden: Math.max(0, items.length - shown),
    more: () => setShown((n) => n + page),
  }
}

/** The button under a long list that shows the next page: `show 25 more · 40 left`. */
export function ShowMore({
  hidden,
  onMore,
  page = PAGE_SIZE,
}: {
  hidden: number
  onMore: () => void
  page?: number
}) {
  if (hidden === 0) return null
  return (
    <div className="flex justify-center pt-1">
      <Button icon={ChevronDown} onClick={onMore}>
        show {Math.min(page, hidden)} more · {hidden} left
      </Button>
    </div>
  )
}
