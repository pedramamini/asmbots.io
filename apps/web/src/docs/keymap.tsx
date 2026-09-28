/**
 * The docs' keyboard map (`/docs/tools/keys`): every key the app binds, drawn by the key help's
 * own table from the same list (`app/all-keys.ts`), so the page cannot drift from the keys.
 */
import { KeyHelp } from '@asmbots/ui'
import { allBindings } from '../app/all-keys'

/** `<KeyMap />`: every key of the app, a table per place its keys work. */
export function KeyMap() {
  return <KeyHelp bindings={allBindings()} className="my-4" />
}
