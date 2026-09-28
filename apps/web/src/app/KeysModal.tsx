/**
 * The key help (`?`): every key of the app, a section for each place its keys work. Its own
 * chunk, so the editor's key tables load on the first `?`, not with every page.
 */
import { KeyHelp, Modal } from '@asmbots/ui'
import { everyBinding } from './all-keys'
import { useKeyBindings } from './keys'

export function KeysModal({ onClose }: { onClose: () => void }) {
  const live = useKeyBindings()
  return (
    <Modal open onClose={onClose} title="keys" size="xl">
      <KeyHelp bindings={everyBinding(live)} />
    </Modal>
  )
}
