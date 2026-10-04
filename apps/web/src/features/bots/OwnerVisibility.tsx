/**
 * The owner's visibility control on a bot's page (PRODUCT_SPEC §6): its own chunk, which the page
 * loads only for the bot's owner, so a reader's page carries none of it.
 */
import type { Bot } from '@asmbots/protocol'
import { useState } from 'react'
import { useBotChanges } from './bulk'
import { VisibilityPicker } from './visibility'

export function OwnerVisibility({ bot }: { bot: Pick<Bot, 'id' | 'name' | 'visibility'> }) {
  const { setVisibility } = useBotChanges()
  const [busy, setBusy] = useState(false)
  return (
    <VisibilityPicker
      value={bot.visibility}
      busy={busy}
      onChange={async (visibility) => {
        setBusy(true)
        await setVisibility([bot.id], [bot.name], visibility)
        setBusy(false)
      }}
    />
  )
}
