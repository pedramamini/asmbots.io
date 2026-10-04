/**
 * `POST /api/ai/chat`: the editor's AI mode (PRODUCT_SPEC §3). The signed-in user says what bot
 * they want; a model on Workers AI (`MODEL`, Qwen3) writes it in one `asm` code block, the Worker
 * assembles it and, while it has errors, sends them back for the whole bot again, and the model
 * reads the hill's best bots (the competitors block) to say what the bot will beat. A code block,
 * not a tool call: a small open model writes one more reliably. The answer streams as Server-Sent
 * Events, one `AiEvent` each; each turn's cost counts against a daily cap (`ai/spend.ts`).
 */
import { assemble, formatDiag, lint } from '@asmbots/asm'
import { AiChatRequest, type AiEvent, type AiTurn, type Hill, parse } from '@asmbots/protocol'
import { type Context, Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { competitorsBlock, listCompetitors } from '../ai/competitors'
import { SYSTEM_PROMPT } from '../ai/prompt'
import {
  addSpend,
  costOf,
  DEFAULT_DAILY_USD,
  DEFAULT_USER_DAILY_USD,
  dollars,
  MODEL,
  spentToday,
  type Usage,
} from '../ai/spend'
import { requireUser } from '../auth/session'
import { jsonBody, limitBody } from '../body'
import { getHillBySlug } from '../db/queries'
import type { AppEnv } from '../env'
import { errorResponse, log } from '../middleware'

/** The times a turn sends the assembler's errors back for the bot again. */
export const MAX_FIXES = 3

/** The most tokens one model call writes, its thinking with them. The context is 32,768. */
const MAX_TOKENS = 8192

/** The most problems of one assemble the model and the panel read. */
const MAX_PROBLEMS = 12

/** The most characters of the editor's source the model reads: past it, it writes a new bot. */
export const MAX_SOURCE_CHARS = 12_000

/** The most characters of the conversation before the user's last words: the oldest go first. */
export const MAX_HISTORY_CHARS = 12_000

/** A message as Workers AI's chat models take it. */
export interface ChatMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

/** What a chat model answers: an OpenAI-style completion. */
interface Completion {
  choices?: { message?: { content?: string | null } }[]
  usage?: Usage
}

/** The editor's source as the user's turn opens with it. */
export function sourceText(source: string): string {
  if (source.trim() === '') return 'The editor is empty.'
  if (source.length > MAX_SOURCE_CHARS) {
    return `The editor holds a bot of ${source.length} characters, too big to show: write a new one.`
  }
  return `The editor's source now:\n\`\`\`asm\n${source}\n\`\`\``
}

/**
 * The conversation as the model reads it: the system prompt and the competitors, turns of one
 * role in a row joined, a leading answer dropped, the oldest past `MAX_HISTORY_CHARS` dropped,
 * and the editor's source before the user's last words.
 */
export function toMessages(
  turns: readonly AiTurn[],
  source: string,
  competitors: string,
): ChatMessage[] {
  const joined: { role: AiTurn['role']; text: string }[] = []
  for (const turn of turns) {
    const last = joined.at(-1)
    if (last?.role === turn.role) last.text += `\n\n${turn.text}`
    else joined.push({ role: turn.role, text: turn.text })
  }
  const asked = joined.pop()
  let room = MAX_HISTORY_CHARS
  const kept: typeof joined = []
  for (const turn of joined.reverse()) {
    room -= turn.text.length
    if (room < 0) break
    kept.unshift(turn)
  }
  while (kept[0]?.role === 'assistant') kept.shift()
  return [
    { role: 'system', content: `${SYSTEM_PROMPT}\n\n${competitors}` },
    ...kept.map(({ role, text }) => ({ role, content: text })),
    { role: 'user', content: `${sourceText(source)}\n\n${asked?.text ?? ''}` },
  ]
}

/**
 * An answer split: its words for the panel, as plain text, and the bot in its last code block that
 * has a `%name`, or null. Qwen3's thinking, when it lands in the text, goes.
 */
export function splitAnswer(content: string): { words: string; source: string | null } {
  const text = content.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/^[\s\S]*<\/think>/, '')
  const blocks = [...text.matchAll(/```[a-z0-9]*[ \t]*\n([\s\S]*?)```/gi)]
  const code =
    blocks
      .map((m) => m[1] ?? '')
      .filter((block) => block.includes('%name'))
      .at(-1) ?? null
  // The panel shows plain text: no code, and no Markdown emphasis or heading marks.
  const words = text
    .replace(/```[\s\S]*?(```|$)/g, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/^#{1,6}[ \t]+/gm, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { words, source: code === null ? null : `${code.trimEnd()}\n` }
}

/**
 * A bot the model wrote, assembled: the event for the panel, and what to send back to the model
 * for a fix (null when the bot assembles and fits the hill).
 */
export function checkBot(
  source: string,
  summary: string,
  hill: Hill,
): { event: AiEvent & { type: 'source' }; fix: string | null } {
  const out = assemble(source)
  const errors = out.diagnostics.filter((d) => d.severity === 'error')
  const warnings = errors.length === 0 ? lint(source, out) : []
  const size = errors.length === 0 ? out.bytes.length : 0
  const floor = hill.config.minBotBytes ?? 1
  const cap = hill.config.maxBotBytes
  const outside =
    errors.length === 0 && (size < floor || size > cap)
      ? `it is ${size} bytes, outside the hill's band of ${floor} to ${cap}`
      : null
  const problems = [...errors, ...warnings].slice(0, MAX_PROBLEMS).map((d) => {
    const line = formatDiag(d)
    return d.fix ? `${line} (fix: ${d.fix})` : line
  })
  const fix =
    errors.length > 0
      ? `The assembler says the bot does not assemble:\n${problems.join('\n')}`
      : outside === null
        ? null
        : `The bot assembles, but ${outside}.`
  return {
    event: {
      type: 'source',
      source,
      summary,
      size,
      errors: errors.length > 0 ? problems : outside === null ? [] : [outside],
    },
    fix:
      fix === null
        ? null
        : `${fix}\nSend the whole bot again, fixed, in one \`\`\`asm block, and one line on what you changed.`,
  }
}

/** What one turn needs, and what it has spent so far, US dollars: a failure keeps the count. */
interface Turn {
  readonly request: AiChatRequest
  readonly hill: Hill
  readonly signal: AbortSignal
  spent: number
}

/** The turn: the model's answer, then a fix while the bot has errors, `MAX_FIXES` at most. */
async function converse(
  c: Context<AppEnv>,
  ai: Ai,
  send: (event: AiEvent) => Promise<void>,
  turn: Turn,
): Promise<void> {
  const { request, hill, signal } = turn
  const competitors = competitorsBlock(hill, await listCompetitors(c.env.DB, hill))
  const base = toMessages(request.turns, request.source, competitors)
  const call = async (messages: readonly ChatMessage[]) => {
    const out = (await ai.run(
      MODEL,
      { messages: [...messages], max_tokens: MAX_TOKENS },
      { signal },
    )) as Completion
    turn.spent += costOf(out.usage)
    return out.choices?.[0]?.message?.content ?? ''
  }
  await send({ type: 'status', text: 'writing the bot' })
  const first = splitAnswer(await call(base))
  if (first.source === null) {
    await send({ type: 'text', text: first.words || 'the model wrote no bot: say it another way.' })
    return
  }
  let source = first.source
  let checked = checkBot(source, 'the bot', hill)
  await send(checked.event)
  for (let n = 1; n <= MAX_FIXES && checked.fix !== null; n++) {
    await send({ type: 'status', text: `fixing (${n} of ${MAX_FIXES})` })
    // Each fix reads the first ask, its last bot, and the errors: the context stays small.
    const fixed = splitAnswer(
      await call([
        ...base,
        { role: 'assistant', content: `\`\`\`asm\n${source}\`\`\`` },
        { role: 'user', content: checked.fix },
      ]),
    )
    if (fixed.source === null) break
    source = fixed.source
    checked = checkBot(source, fixed.words.split('\n')[0]?.slice(0, 80) || `fix ${n}`, hill)
    await send(checked.event)
  }
  if (first.words !== '') await send({ type: 'text', text: first.words })
}

export const ai = new Hono<AppEnv>().post(
  '/chat',
  requireUser,
  limitBody(128 * 1024),
  async (c) => {
    const request = parse(AiChatRequest, await jsonBody(c), 'the request')
    const env = c.env
    const userId = c.get('session')?.userId ?? ''
    const model = env.AI
    if (model === undefined) {
      return errorResponse(c, 'unavailable', 'the AI mode is not set up on this server')
    }
    const spent = await spentToday(env.KV, userId)
    if (spent.site >= dollars(env.AI_DAILY_USD, DEFAULT_DAILY_USD)) {
      return errorResponse(
        c,
        'unavailable',
        'the AI mode is out of turns for today: back at 00:00 UTC',
      )
    }
    if (spent.user >= dollars(env.AI_USER_DAILY_USD, DEFAULT_USER_DAILY_USD)) {
      return errorResponse(
        c,
        'rate_limited',
        'you have used your AI turns for today: more at 00:00 UTC',
      )
    }
    const hill = await getHillBySlug(env.DB, request.hill)
    if (hill === null) return errorResponse(c, 'not_found', `no hill ${request.hill}`)

    return streamSSE(c, async (stream) => {
      const abort = new AbortController()
      stream.onAbort(() => abort.abort())
      const send = (event: AiEvent) => stream.writeSSE({ data: JSON.stringify(event) })
      const turn: Turn = { request, hill, signal: abort.signal, spent: 0 }
      try {
        await converse(c, model, send, turn)
      } catch (error) {
        if (!abort.signal.aborted) {
          log('warn', 'ai.failed', {
            requestId: c.get('requestId'),
            error: error instanceof Error ? error.message : String(error),
          })
          await send({ type: 'error', message: 'the model did not answer: try again.' })
        }
      }
      await addSpend(env.KV, userId, turn.spent)
      if (!abort.signal.aborted) await send({ type: 'done', costUsd: turn.spent })
    })
  },
)
