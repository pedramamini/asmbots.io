/**
 * The editor's AI mode (`POST /api/ai/chat`): the user says what bot they want, and a model writes
 * it, assembles it on the server, and reads the hill's best bots to say what it must beat. Apart
 * from `api.ts`: Rollup places a module whole, and only the editor's AI panel reads this one.
 */
import * as z from 'zod/mini'

/** The most turns of the conversation a request carries: the oldest go first. */
export const MAX_AI_TURNS = 16

/** The most characters a turn carries. */
export const MAX_AI_TURN_CHARS = 8000

/** The most characters of the editor's source a request carries. */
export const MAX_AI_SOURCE_CHARS = 32 * 1024

/** A turn of the conversation, as the panel keeps it: what the user said, what the model said. */
export const AiTurn = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().check(z.minLength(1), z.maxLength(MAX_AI_TURN_CHARS)),
})
export type AiTurn = z.output<typeof AiTurn>

/**
 * `POST /api/ai/chat`: the conversation, the user's turn last; the editor's source as it stands,
 * which the model edits; and the hill whose best bots it studies.
 */
export const AiChatRequest = z.object({
  turns: z.array(AiTurn).check(
    z.minLength(1),
    z.maxLength(MAX_AI_TURNS),
    z.refine((turns) => turns.at(-1)?.role === 'user', 'the last turn is the user’s'),
  ),
  source: z.string().check(z.maxLength(MAX_AI_SOURCE_CHARS)),
  hill: z.string().check(z.regex(/^[a-z0-9-]{1,40}$/)),
})
export type AiChatRequest = z.output<typeof AiChatRequest>

/**
 * What the answer streams, one Server-Sent Event's `data` each:
 * - `text`: words of the model's answer, in order;
 * - `status`: what it is doing now (`reading imp`, `assembling`), for the panel's status line;
 * - `source`: a bot it wrote, assembled by the server: its size, and its errors (none: it runs);
 * - `done`: the turn is over, and what it cost;
 * - `error`: the turn stopped, and why.
 */
export type AiEvent =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'status'; readonly text: string }
  | {
      readonly type: 'source'
      readonly source: string
      /** One line: what changed. */
      readonly summary: string
      readonly size: number
      readonly errors: readonly string[]
    }
  | { readonly type: 'done'; readonly costUsd: number }
  | { readonly type: 'error'; readonly message: string }
