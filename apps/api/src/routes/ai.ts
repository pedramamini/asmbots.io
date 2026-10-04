/**
 * `POST /api/ai/chat`: the editor's AI mode (PRODUCT_SPEC §3). The signed-in user says what bot
 * they want; a model writes it with the `write_bot` tool, the Worker assembles each version and
 * answers with its errors until it is clean, and the model reads the hill's best bots (the
 * competitors block, `read_bot`) to say what the bot will beat. The answer streams as Server-Sent
 * Events, one `AiEvent` each. The model runs through the Anthropic API, or Cloudflare AI Gateway
 * when `AI_GATEWAY_URL` is set; each turn's cost counts against a daily cap (`ai/spend.ts`).
 */
import Anthropic from '@anthropic-ai/sdk'
import type {
  BetaContentBlockParam,
  BetaMessageParam,
  BetaRawMessageStreamEvent,
  BetaTextBlockParam,
  BetaTool,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { assemble, formatDiag, lint } from '@asmbots/asm'
import { AiChatRequest, type AiEvent, type AiTurn, type Hill, parse } from '@asmbots/protocol'
import { type Context, Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import {
  competitorAt,
  competitorLine,
  competitorSource,
  competitorsBlock,
  listCompetitors,
} from '../ai/competitors'
import { SYSTEM_PROMPT } from '../ai/prompt'
import {
  addSpend,
  costOf,
  DEFAULT_DAILY_USD,
  DEFAULT_MODEL,
  DEFAULT_USER_DAILY_USD,
  dollars,
  MODEL_PRICES,
  type Prices,
  spentToday,
} from '../ai/spend'
import { requireUser } from '../auth/session'
import { jsonBody, limitBody } from '../body'
import { getHillBySlug } from '../db/queries'
import type { AppEnv } from '../env'
import { errorResponse, log } from '../middleware'

/** The most model calls one turn makes: each write or read is one more. */
export const MAX_STEPS = 6

/** The most tokens one model call writes, thinking and the bot's source with it. */
const MAX_TOKENS = 16000

/** The most problems of one assemble the model and the panel read. */
const MAX_PROBLEMS = 12

/**
 * The models that refuse in categories (Claude Sonnet 5.5 and the Opus line): a refusal reruns on
 * the model the API picks for that category, in the same call (`fallbacks: "default"`).
 */
const FALLBACK_MODELS: ReadonlySet<string> = new Set(['claude-sonnet-5-5', 'claude-opus-5-5'])
const FALLBACK_BETA = 'server-side-fallback-2026-07-01'

const TOOLS: BetaTool[] = [
  {
    name: 'write_bot',
    description:
      'Put a whole bot in the editor: the complete x16c source, never a fragment. The server ' +
      'assembles it and answers with its size and every error and warning.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'The whole bot, with %name and %strategy.' },
        summary: { type: 'string', description: 'One short line: what this version changes.' },
      },
      required: ['source', 'summary'],
      additionalProperties: false,
    },
  },
  {
    name: 'read_bot',
    description:
      "Read a bot on the hill by its rank: its record, its %strategy, and its source when it's public.",
    strict: true,
    input_schema: {
      type: 'object',
      properties: { rank: { type: 'integer', description: 'The rank: 1 is the king.' } },
      required: ['rank'],
      additionalProperties: false,
    },
  },
]

/** The editor's source as the user's turn opens with it. */
export function sourceText(source: string): string {
  return source.trim() === ''
    ? 'The editor is empty.'
    : `The editor's source now:\n\`\`\`asm\n${source}\n\`\`\``
}

/**
 * The conversation as the model reads it: turns of one role in a row joined, a leading answer
 * dropped, and the editor's source before the user's last words.
 */
export function toMessages(turns: readonly AiTurn[], source: string): BetaMessageParam[] {
  const joined: { role: AiTurn['role']; text: string }[] = []
  for (const turn of turns) {
    const last = joined.at(-1)
    if (last === undefined && turn.role === 'assistant') continue
    if (last?.role === turn.role) last.text += `\n\n${turn.text}`
    else joined.push({ role: turn.role, text: turn.text })
  }
  return joined.map(({ role, text }, i) =>
    i === joined.length - 1
      ? {
          role,
          content: [
            { type: 'text', text: sourceText(source) },
            { type: 'text', text },
          ],
        }
      : { role, content: text },
  )
}

/** What one `write_bot` did: the event for the panel, and the answer for the model. */
export function writeBot(
  source: string,
  summary: string,
  hill: Hill,
): { event: AiEvent & { type: 'source' }; answer: string } {
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
  const answer =
    errors.length > 0
      ? `It does not assemble. ${errors.length} ${errors.length === 1 ? 'error' : 'errors'}:\n${problems.join('\n')}`
      : [
          `It assembles: ${size} bytes.`,
          outside && `But ${outside}: fit it.`,
          warnings.length > 0 && `Warnings:\n${problems.join('\n')}`,
        ]
          .filter(Boolean)
          .join('\n')
  return {
    event: {
      type: 'source',
      source,
      summary,
      size,
      errors: errors.length > 0 ? problems : outside === null ? [] : [outside],
    },
    answer,
  }
}

/** A tool input field, checked: a strict tool's input still arrives as the model wrote it. */
function field<T>(input: unknown, key: string, is: (v: unknown) => v is T): T | null {
  if (typeof input !== 'object' || input === null) return null
  const value = (input as Record<string, unknown>)[key]
  return is(value) ? value : null
}
const isString = (v: unknown): v is string => typeof v === 'string'
const isRank = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1

/** What a model error says to the user. */
function failure(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) return 'the model is busy: try again in a minute.'
  if (error instanceof Anthropic.APIError && (error.status ?? 0) >= 500) {
    return 'the model is down for a moment: try again.'
  }
  return 'the model did not answer: try again.'
}

/** What one turn needs, and what it has spent so far, US dollars: a failure keeps the count. */
interface Turn {
  readonly request: AiChatRequest
  readonly hill: Hill
  readonly model: string
  readonly prices: Prices
  readonly signal: AbortSignal
  spent: number
}

/** The turn: the model's calls, its tools, and the events, until it is done or out of steps. */
async function converse(
  c: Context<AppEnv>,
  send: (event: AiEvent) => Promise<void>,
  turn: Turn,
): Promise<void> {
  const { request, hill, model, prices, signal } = turn
  const env = c.env
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    ...(env.AI_GATEWAY_URL ? { baseURL: env.AI_GATEWAY_URL } : {}),
    maxRetries: 1,
  })
  const competitors = await listCompetitors(env.DB, hill)
  const system: BetaTextBlockParam[] = [
    { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    {
      type: 'text',
      text: competitorsBlock(hill, competitors),
      cache_control: { type: 'ephemeral' },
    },
  ]
  const messages = toMessages(request.turns, request.source)
  const haiku = model.startsWith('claude-haiku')
  let said = false
  for (let step = 0; step < MAX_STEPS; step++) {
    const last = step === MAX_STEPS - 1
    const run = client.beta.messages.stream(
      {
        model,
        max_tokens: MAX_TOKENS,
        system,
        tools: TOOLS,
        // The last call answers in words: no tool runs after it.
        ...(last ? { tool_choice: { type: 'none' as const } } : {}),
        messages,
        ...(haiku ? {} : { output_config: { effort: 'medium' as const } }),
        ...(FALLBACK_MODELS.has(model) ? { betas: [FALLBACK_BETA], fallbacks: 'default' } : {}),
      },
      { signal },
    )
    const writes: Promise<void>[] = []
    run.on('streamEvent', (event: BetaRawMessageStreamEvent) => {
      if (event.type === 'content_block_start') {
        const block = event.content_block
        if (block.type === 'text' && said) writes.push(send({ type: 'text', text: '\n\n' }))
        if (block.type === 'tool_use') {
          const text = block.name === 'write_bot' ? 'writing the bot' : 'reading the hill'
          writes.push(send({ type: 'status', text }))
        }
      } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        said = true
        writes.push(send({ type: 'text', text: event.delta.text }))
      }
    })
    const message = await run.finalMessage()
    await Promise.all(writes)
    turn.spent += costOf(message.usage, prices)
    if (message.stop_reason === 'refusal') {
      await send({ type: 'error', message: 'the model would not answer that: say it another way.' })
      break
    }
    const uses = message.content.filter((b): b is BetaToolUseBlock => b.type === 'tool_use')
    // A tool input cut off at `max_tokens` is not the bot the model meant: run no tool of it.
    if (message.stop_reason !== 'tool_use' || uses.length === 0) break
    messages.push({ role: 'assistant', content: message.content as BetaContentBlockParam[] })
    const results: BetaToolResultBlockParam[] = []
    for (const use of uses) {
      results.push({ type: 'tool_result', tool_use_id: use.id, ...(await runTool(use)) })
    }
    messages.push({ role: 'user', content: results })
  }

  async function runTool(use: BetaToolUseBlock): Promise<{ content: string; is_error?: boolean }> {
    if (use.name === 'write_bot') {
      const source = field(use.input, 'source', isString)
      if (source === null) return { content: 'write_bot needs `source`.', is_error: true }
      const summary = field(use.input, 'summary', isString) ?? ''
      await send({ type: 'status', text: 'assembling' })
      const { event, answer } = writeBot(source, summary, hill)
      await send(event)
      return { content: answer }
    }
    if (use.name === 'read_bot') {
      const rank = field(use.input, 'rank', isRank)
      if (rank === null) return { content: 'read_bot needs a `rank` of 1 or more.', is_error: true }
      const bot = await competitorAt(env.DB, hill, rank)
      if (bot === null) return { content: `The hill has no entry at rank ${rank}.` }
      await send({ type: 'status', text: `reading ${bot.name}` })
      return { content: `${competitorLine(bot)}\n${competitorSource(bot)}` }
    }
    return { content: `no tool ${use.name}`, is_error: true }
  }
}

export const ai = new Hono<AppEnv>().post(
  '/chat',
  requireUser,
  limitBody(128 * 1024),
  async (c) => {
    const request = parse(AiChatRequest, await jsonBody(c), 'the request')
    const env = c.env
    const userId = c.get('session')?.userId ?? ''
    if (!env.ANTHROPIC_API_KEY) {
      return errorResponse(c, 'unavailable', 'the AI mode is not set up on this server')
    }
    const model = env.AI_MODEL || DEFAULT_MODEL
    const prices = MODEL_PRICES[model]
    if (prices === undefined) {
      return errorResponse(c, 'unavailable', `the AI mode does not know the model ${model}`)
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
      const turn: Turn = { request, hill, model, prices, signal: abort.signal, spent: 0 }
      try {
        await converse(c, send, turn)
      } catch (error) {
        if (!abort.signal.aborted) {
          log('warn', 'ai.failed', {
            requestId: c.get('requestId'),
            error: error instanceof Error ? error.message : String(error),
          })
          await send({ type: 'error', message: failure(error) })
        }
      }
      await addSpend(env.KV, userId, turn.spent)
      if (!abort.signal.aborted) await send({ type: 'done', costUsd: turn.spent })
    })
  },
)
