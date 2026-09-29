/** A public bot's source, for `replaySources`: its own chunk, loaded when a replay needs one. */
import { BotVersionDetail, parse } from '@asmbots/protocol'
import { apiGet } from '../../../api/client'

/** Bot `id`'s source at `version`; empty when the server does not give it. */
export function cloudSource(id: string, version: number): Promise<string> {
  const path = `/bots/${encodeURIComponent(id)}/versions/${version}`
  return apiGet(path, (v) => parse(BotVersionDetail, v, 'the bot version'))
    .then(({ version }) => version.source ?? '')
    .catch(() => '')
}
