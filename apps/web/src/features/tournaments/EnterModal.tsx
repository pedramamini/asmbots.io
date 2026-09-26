/**
 * `enter` on an open server tournament (PRODUCT_SPEC §1, §4): pick one of my account's bots and a
 * version of it until the tournament's deadline. One entry a user: entering again swaps my entry
 * for the version picked. A signed-out reader gets `sign in to enter`.
 */
import type { BotLabel, Tournament } from '@asmbots/protocol'
import { Button } from '@asmbots/ui'
import { LogIn } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useMe } from '../../api/queries'
import { SignInButton } from '../account/AccountSlot'
import { takesEntries } from './entry'

export interface EnterModalProps {
  open: boolean
  tournament: Tournament
  /** My entry, when I have one: entering replaces it. */
  mine: BotLabel | null
  onClose: () => void
}

/** The dialog: its own chunk, loaded on the first `enter`. */
const EnterDialog = lazy(() => import('./EnterDialog').then((m) => ({ default: m.EnterDialog })))

/** The dialog, while it is open. */
export function EnterModal(props: EnterModalProps) {
  return props.open ? (
    <Suspense fallback={null}>
      <EnterDialog {...props} />
    </Suspense>
  ) : null
}

export interface EnterButtonProps {
  /** Undefined while it loads. */
  tournament: Tournament | undefined
  /** The tournament's entrants: mine among them, when I entered. */
  entrants?: readonly BotLabel[] | undefined
  className?: string | undefined
}

/**
 * `enter`, while the tournament takes entries (`enter again` once I have); `sign in to enter` for
 * a signed-out reader; disabled, and saying why, once entries have closed.
 */
export function EnterButton({ tournament: t, entrants = [], className }: EnterButtonProps) {
  const me = useMe()
  const [open, setOpen] = useState(false)
  const handle = me.data?.user.handle
  const mine = entrants.find((e) => e.owner === handle) ?? null
  if (t !== undefined && !takesEntries(t)) {
    return (
      <Button className={className} icon={LogIn} disabled title="entries have closed">
        enter
      </Button>
    )
  }
  if (me.data === null) return <SignInButton>sign in to enter</SignInButton>
  return (
    <>
      <Button
        className={className}
        variant="primary"
        icon={LogIn}
        disabled={t === undefined || me.data === undefined}
        onClick={() => setOpen(true)}
      >
        {mine === null ? 'enter' : 'enter again'}
      </Button>
      {t !== undefined && (
        <EnterModal open={open} tournament={t} mine={mine} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
