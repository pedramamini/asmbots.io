/**
 * The editor's AI mode (`POST /api/ai/chat`), with the Anthropic API stubbed out: the Worker runs
 * in this isolate, so a spy on `fetch` answers its calls with a scripted stream. A turn streams the
 * model's words, assembles each bot it writes and hands the errors back, reads the hill's best
 * bots, and counts its cost against the day's caps.
 */
import { env } from 'cloudflare:workers'
import type { AiEvent } from '@asmbots/protocol'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SYSTEM_PROMPT } from '../src/ai/prompt'
import { costOf, MODEL_PRICES, spentToday } from '../src/ai/spend'
import { applySeed, buildSeed, type SeedHill } from '../src/db/seed'
import type { Env } from '../src/env'
import { toMessages, writeBot } from '../src/routes/ai'
import { errorOf, FAKE, send, signIn } from './fake-auth'
import { Jar } from './jar'

const DWARF = `%name "Dwarf"
%author "ASM Bots"
%strategy "a bomb every 4 bytes"
SIZE equ end - start
start:  call .here
.here:  pop bx
        sub bx, .here
lap:    mov di, bx
        mov cx, (0x10000 - SIZE) / 4
.bomb:  sub di, 4
        mov word [di], 0
        loop .bomb
        jmp lap
end:
`
const SPIN = '%name "Spin"\n%author "ASM Bots"\nstart: jmp $\n'
const BROKEN = '%name "Broken"\nstart: mov ax, [cx]\n'

const HILL: SeedHill = {
  slug: 'ai-hill',
  name: 'AI hill',
  description: 'duels for the AI tests.',
  size: 5,
  rounds: 3,
  config: {
    coreSize: 0x10000,
    maxCycles: 20_000,
    maxProcesses: 64,
    minSpacing: 1024,
    maxBotBytes: 512,
  },
  scoring: 'duel',
}

const ON: Env = { ...FAKE, ANTHROPIC_API_KEY: 'test-key' }

beforeAll(async () => {
  await applySeed(
    env,
    await buildSeed(
      [
        { slug: 'dwarf', source: DWARF, melee: false },
        { slug: 'spin', source: SPIN, melee: false },
      ],
      { hills: [HILL] },
    ),
  )
})

afterEach(() => vi.restoreAllMocks())

/** A scripted model call: its blocks, in order, and why it stopped. */
interface Reply {
  readonly blocks: readonly ({ text: string } | { tool: string; input: object })[]
  readonly stop: 'end_turn' | 'tool_use' | 'refusal'
}

/** The Messages API's stream of `reply`. */
function sse(reply: Reply): string {
  const events: object[] = [
    {
      type: 'message_start',
      message: {
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-5-5',
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 1000, output_tokens: 1, cache_read_input_tokens: 5000 },
      },
    },
  ]
  reply.blocks.forEach((block, index) => {
    if ('text' in block) {
      events.push({ type: 'content_block_start', index, content_block: { type: 'text', text: '' } })
      events.push({
        type: 'content_block_delta',
        index,
        delta: { type: 'text_delta', text: block.text },
      })
    } else {
      events.push({
        type: 'content_block_start',
        index,
        content_block: { type: 'tool_use', id: `toolu_${index}`, name: block.tool, input: {} },
      })
      events.push({
        type: 'content_block_delta',
        index,
        delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) },
      })
    }
    events.push({ type: 'content_block_stop', index })
  })
  events.push({
    type: 'message_delta',
    delta: { stop_reason: reply.stop, stop_sequence: null },
    usage: { output_tokens: 2000 },
  })
  events.push({ type: 'message_stop' })
  return events
    .map((e) => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`)
    .join('')
}

/** Answers the Worker's calls to the Messages API with `replies`, in order; the bodies it sent. */
function stubModel(...replies: Reply[]): { bodies: Record<string, unknown>[]; urls: string[] } {
  const bodies: Record<string, unknown>[] = []
  const urls: string[] = []
  const real = globalThis.fetch
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input)
    if (!url.includes('/v1/messages')) return real(input, init)
    urls.push(url)
    bodies.push(JSON.parse(String(init?.body)))
    const reply = replies[bodies.length - 1]
    if (reply === undefined) throw new Error('the model was called once too often')
    return new Response(sse(reply), { headers: { 'Content-Type': 'text/event-stream' } })
  })
  return { bodies, urls }
}

/** The events of a streamed answer. */
async function eventsOf(res: Response): Promise<AiEvent[]> {
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toMatch(/text\/event-stream/)
  const text = await res.text()
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice('data: '.length)) as AiEvent)
}

async function user(as: string): Promise<Jar> {
  const jar = new Jar()
  await signIn(jar, as)
  return jar
}

const chat = (jar: Jar, body: object, vars: Env = ON) =>
  send(jar, '/api/ai/chat', { method: 'POST', body, vars })

const ASK = {
  turns: [{ role: 'user', text: 'a dwarf that bombs every 4 bytes' }],
  source: '',
  hill: 'ai-hill',
}

describe('POST /api/ai/chat', () => {
  it('needs a signed-in user', async () => {
    const res = await chat(new Jar(), ASK)
    expect(res.status).toBe(401)
  })

  it('answers 503 when the server has no key', async () => {
    const res = await chat(await user('ai-nokey'), ASK, FAKE)
    expect(res.status).toBe(503)
    expect((await errorOf(res)).message).toMatch(/not set up/)
  })

  it('refuses a conversation that does not end with the user', async () => {
    const res = await chat(await user('ai-shape'), {
      ...ASK,
      turns: [...ASK.turns, { role: 'assistant', text: 'done' }],
    })
    expect(res.status).toBe(400)
  })

  it('answers 404 for a hill that does not exist', async () => {
    const res = await chat(await user('ai-nohill'), { ...ASK, hill: 'nowhere' })
    expect(res.status).toBe(404)
  })

  it('writes a bot, assembles it, and says what it beats', async () => {
    const model = stubModel(
      {
        blocks: [
          { text: 'A dwarf, then.' },
          { tool: 'write_bot', input: { source: DWARF, summary: 'a stride-4 dwarf' } },
        ],
        stop: 'tool_use',
      },
      { blocks: [{ text: 'It should beat Spin: Spin sits still.' }], stop: 'end_turn' },
    )
    const jar = await user('ai-writer')
    const events = await eventsOf(await chat(jar, { ...ASK, source: SPIN }))

    const source = events.find((e) => e.type === 'source')
    expect(source).toMatchObject({
      type: 'source',
      source: DWARF,
      summary: 'a stride-4 dwarf',
      errors: [],
    })
    expect(source?.type === 'source' && source.size).toBeGreaterThan(0)
    const text = events.flatMap((e) => (e.type === 'text' ? [e.text] : [])).join('')
    expect(text).toBe('A dwarf, then.\n\nIt should beat Spin: Spin sits still.')
    expect(events).toContainEqual({ type: 'status', text: 'writing the bot' })
    const done = events.at(-1)
    expect(done?.type).toBe('done')

    // The first call: the model, the cached system with the hill's best bots and their source, and
    // the editor's source before the user's words.
    const [first, second] = model.bodies
    expect(first?.model).toBe('claude-sonnet-5-5')
    expect(first?.fallbacks).toBe('default')
    const system = JSON.stringify(first?.system)
    expect(system).toContain('x16c cheat sheet')
    expect(system).toContain('The hill: AI hill')
    expect(system).toContain('mov word [di], 0')
    const asked = JSON.stringify(first?.messages)
    expect(asked).toContain("The editor's source now")
    expect(asked).toContain('jmp $')
    expect(model.urls[0]).toMatch(/beta=true/)
    // The second call carries the assembler's answer.
    expect(JSON.stringify(second?.messages)).toContain('It assembles')

    // Two calls at 1,000 input, 5,000 cached, 2,000 output tokens each.
    const call = costOf(
      { input_tokens: 1000, output_tokens: 2000, cache_read_input_tokens: 5000 },
      MODEL_PRICES['claude-sonnet-5-5'] as NonNullable<(typeof MODEL_PRICES)[string]>,
    )
    expect(done?.type === 'done' && done.costUsd).toBeCloseTo(2 * call, 6)
    const userId = (await (await send(jar, '/api/me')).json<{ user: { id: string } }>()).user.id
    expect((await spentToday(env.KV, userId)).user).toBeCloseTo(2 * call, 6)
  })

  it('hands the assembler errors back until the bot is clean', async () => {
    const model = stubModel(
      {
        blocks: [{ tool: 'write_bot', input: { source: BROKEN, summary: 'first try' } }],
        stop: 'tool_use',
      },
      {
        blocks: [{ tool: 'write_bot', input: { source: DWARF, summary: 'fixed' } }],
        stop: 'tool_use',
      },
      { blocks: [{ text: 'Fixed.' }], stop: 'end_turn' },
    )
    const events = await eventsOf(await chat(await user('ai-fixer'), ASK))
    const sources = events.filter((e) => e.type === 'source')
    expect(sources).toHaveLength(2)
    expect(sources[0]?.type === 'source' && sources[0].errors.length).toBeGreaterThan(0)
    expect(sources[1]).toMatchObject({ errors: [] })
    expect(JSON.stringify(model.bodies[1]?.messages)).toContain('does not assemble')
  })

  it('reads a competitor by rank', async () => {
    const model = stubModel(
      { blocks: [{ tool: 'read_bot', input: { rank: 2 } }], stop: 'tool_use' },
      { blocks: [{ text: 'Read it.' }], stop: 'end_turn' },
    )
    const events = await eventsOf(await chat(await user('ai-reader'), ASK))
    expect(events.some((e) => e.type === 'status' && e.text.startsWith('reading '))).toBe(true)
    const answer = JSON.stringify(model.bodies[1]?.messages)
    expect(answer).toMatch(/#2 (Dwarf|Spin) by system/)
  })

  it('says so when the model refuses', async () => {
    stubModel({ blocks: [], stop: 'refusal' })
    const events = await eventsOf(await chat(await user('ai-refused'), ASK))
    expect(events.find((e) => e.type === 'error')).toMatchObject({ message: /another way/ })
  })

  it('stops a user at their daily cap', async () => {
    const res = await chat(await user('ai-capped'), ASK, { ...ON, AI_USER_DAILY_USD: '0' })
    expect(res.status).toBe(429)
  })

  it('stops everyone at the site cap', async () => {
    const res = await chat(await user('ai-site'), ASK, { ...ON, AI_DAILY_USD: '0' })
    expect(res.status).toBe(503)
  })
})

describe('the AI mode', () => {
  it('prompts with the skill’s cheat sheet and strategy families', () => {
    expect(SYSTEM_PROMPT).toContain('## x16c cheat sheet')
    expect(SYSTEM_PROMPT).toContain('## Strategy families')
    expect(SYSTEM_PROMPT).not.toContain('## Examples')
  })

  it('joins turns of one role and puts the source before the last words', () => {
    const messages = toMessages(
      [
        { role: 'assistant', text: 'hello' },
        { role: 'user', text: 'a' },
        { role: 'user', text: 'b' },
        { role: 'assistant', text: 'c' },
        { role: 'user', text: 'd' },
      ],
      '',
    )
    expect(messages).toEqual([
      { role: 'user', content: 'a\n\nb' },
      { role: 'assistant', content: 'c' },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'The editor is empty.' },
          { type: 'text', text: 'd' },
        ],
      },
    ])
  })

  it('tells the model when a bot is outside the hill’s band', () => {
    const hill = { config: { maxBotBytes: 4, minBotBytes: 1 } } as Parameters<typeof writeBot>[2]
    const { event, answer } = writeBot(DWARF, '', hill)
    expect(answer).toMatch(/outside the hill's band of 1 to 4/)
    expect(event.errors[0]).toMatch(/outside/)
  })
})
