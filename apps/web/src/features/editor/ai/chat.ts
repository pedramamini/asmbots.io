/**
 * The AI mode's client: `POST /api/ai/chat`, its answer read as Server-Sent Events, one `AiEvent`
 * each, handed over as they arrive. A refused request throws an `ApiRequestError`, as the API
 * client's do.
 */
import {
  type AiChatRequest,
  type AiEvent,
  type AiTurn,
  ApiError,
  MAX_AI_TURN_CHARS,
  MAX_AI_TURNS,
} from '@asmbots/protocol'
import { ApiRequestError, apiUrl } from '../../../api/client'

/** The event of one SSE message (its `data:` lines), or null for one that is not an `AiEvent`. */
export function eventOf(message: string): AiEvent | null {
  const data = message
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n')
  if (data === '') return null
  try {
    const value: unknown = JSON.parse(data)
    return typeof value === 'object' && value !== null && 'type' in value
      ? (value as AiEvent)
      : null
  } catch {
    return null
  }
}

/** Sends `request`; calls `onEvent` with each event of the answer, in order, until it ends. */
export async function streamChat(
  request: AiChatRequest,
  onEvent: (event: AiEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  let res: Response
  try {
    res = await fetch(apiUrl('/ai/chat'), {
      method: 'POST',
      headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new ApiRequestError(0, 'network', 'the server did not answer.')
  }
  if (!res.ok || res.body === null) {
    const shaped = ApiError.safeParse(await res.json().catch(() => undefined))
    throw shaped.success
      ? new ApiRequestError(res.status, shaped.data.error.code, shaped.data.error.message)
      : new ApiRequestError(res.status, 'internal', `the server answered ${res.status}.`)
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += value.replaceAll('\r\n', '\n')
    for (let end = buffer.indexOf('\n\n'); end >= 0; end = buffer.indexOf('\n\n')) {
      const event = eventOf(buffer.slice(0, end))
      buffer = buffer.slice(end + 2)
      if (event !== null) onEvent(event)
    }
  }
}

/**
 * The conversation as the API takes it: the newest `MAX_AI_TURNS` turns that say something, each
 * cut to `MAX_AI_TURN_CHARS`.
 */
export function turnsOf(turns: readonly AiTurn[]): AiTurn[] {
  return turns
    .filter((turn) => turn.text.trim() !== '')
    .map((turn) => ({ role: turn.role, text: turn.text.slice(0, MAX_AI_TURN_CHARS) }))
    .slice(-MAX_AI_TURNS)
}
