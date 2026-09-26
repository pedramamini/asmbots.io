/**
 * `enter`'s dialog, apart from the button: the home page shows the button, and the dialog brings
 * the version picker and the weight classes, which the home page has no budget for.
 */
import { Button, EmptyState, Modal, Skeleton, useToast } from '@asmbots/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LogIn } from 'lucide-react'
import { enterTournament } from '../../api/writes'
import { LoadFailure } from '../../app/LoadFailure'
import { useLinkAction } from '../../app/link-action'
import { bandOf, fits, useVersionPick, VersionFields } from '../account/VersionPicker'
import type { EnterModalProps } from './EnterModal'
import { utcTime } from './entry'

/** The dialog. Its reads mount with it, so each opening reads my bots again. */
export function EnterDialog({ open, tournament: t, mine, onClose }: EnterModalProps) {
  const { toast } = useToast()
  const link = useLinkAction()
  const client = useQueryClient()
  const pick = useVersionPick()
  const { mine: bots, picked, version } = pick
  const band = bandOf(t.config.battle)
  const outside = version !== undefined && !fits(version.size, band)
  const enter = useMutation({
    mutationFn: (versionId: string) => enterTournament(t.id, versionId),
    onSuccess: ({ replaced }) => {
      const what = `${picked?.bot.name} v${version?.version}`
      toast(replaced === null ? `entered ${what} in ${t.name}.` : `${what} is your entry now.`, {
        variant: 'accent',
      })
      void client.invalidateQueries({ queryKey: ['tournaments'] })
      onClose()
    },
  })
  const close = () => {
    enter.reset()
    onClose()
  }
  const ready = version !== undefined && !outside && !enter.isPending
  return (
    <Modal
      open={open}
      onClose={close}
      title={`enter ${t.name}`}
      actions={
        <>
          <Button variant="ghost" onClick={close}>
            cancel
          </Button>
          <Button
            variant="primary"
            icon={LogIn}
            disabled={!ready}
            onClick={() => version && enter.mutate(version.id)}
          >
            {enter.isPending ? 'entering…' : 'enter'}
          </Button>
        </>
      }
    >
      {bots.isPending ? (
        <Skeleton rows={3} />
      ) : bots.error !== null ? (
        <LoadFailure read={bots} what="your bots" />
      ) : picked === undefined ? (
        <EmptyState action={link('open the editor', '/editor')}>
          no bots in your account yet: the editor&rsquo;s save, signed in, keeps one there.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3 text-data">
          <VersionFields
            pick={{ ...pick, picked }}
            band={band}
            taker="this tournament"
            onChange={() => enter.reset()}
          />
          <p className="text-muted">
            {mine === null
              ? 'one entry each: enter again before the deadline to swap it.'
              : `your entry is ${mine.name} v${mine.version}: this one takes its place.`}{' '}
            entries close {utcTime(t.entryClosesAt ?? '')}.
          </p>
          {enter.error !== null && (
            <p role="alert" className="text-danger">
              {enter.error.message}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
