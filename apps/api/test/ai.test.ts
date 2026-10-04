/**
 * The editor's AI mode (`POST /api/ai/chat`), with Workers AI faked: the test hands the Worker an
 * `AI` binding whose answers it scripts. A turn writes a bot, assembles it and sends the errors back
 * until it is clean, reads the hill's best bots, and counts its cost against the day's caps.
 */
import { env } from 'cloudflare:workers'
import type { AiEvent } from '@asmbots/protocol'
import { beforeAll, describe, expect, it } from 'vitest'
import { SYSTEM_PROMPT } from '../src/ai/prompt'
import { costOf, MODEL, spentToday } from '../src/ai/spend'
import { applySeed, buildSeed, type SeedHill } from '../src/db/seed'
import type { Env } from '../src/env'
import {
  type ChatMessage,
  checkBot,
  MAX_FIXES,
  MAX_SOURCE_CHARS,
  sourceText,
  splitAnswer,
  toMessages,
} from '../src/routes/ai'
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

const USAGE = { prompt_tokens: 10_000, completion_tokens: 3_000 }

/**
 * A Workers AI binding that answers with `replies` in order (a string is the answer's content, an
 * Error is thrown); what each call asked, in `calls`.
 */
function fakeAi(...replies: (string | Error)[]) {
  const calls: { model: string; messages: ChatMessage[]; max_tokens: number }[] = []
  const binding = {
    run: async (model: string, inputs: { messages: ChatMessage[]; max_tokens: number }) => {
      calls.push({ model, ...inputs })
      const reply = replies[calls.length - 1]
      if (reply === undefined) throw new Error('the model was called once too often')
      if (reply instanceof Error) throw reply
      return { choices: [{ message: { role: 'assistant', content: reply } }], usage: USAGE }
    },
  }
  return { vars: { ...FAKE, AI: binding as unknown as Ai } satisfies Env, calls }
}

const asm = (source: string) => `\`\`\`asm\n${source}\`\`\``

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

const chat = (jar: Jar, body: object, vars: Env) =>
  send(jar, '/api/ai/chat', { method: 'POST', body, vars })

const ASK = {
  turns: [{ role: 'user', text: 'a dwarf that bombs every 4 bytes' }],
  source: '',
  hill: 'ai-hill',
}

const sources = (events: AiEvent[]) => events.flatMap((e) => (e.type === 'source' ? [e] : []))

describe('POST /api/ai/chat', () => {
  it('needs a signed-in user', async () => {
    const res = await chat(new Jar(), ASK, fakeAi().vars)
    expect(res.status).toBe(401)
  })

  it('answers 503 when the server has no Workers AI', async () => {
    const { AI: _, ...none } = FAKE
    const res = await chat(await user('ai-nobinding'), ASK, none)
    expect(res.status).toBe(503)
    expect((await errorOf(res)).message).toMatch(/not set up/)
  })

  it('refuses a conversation that does not end with the user', async () => {
    const res = await chat(
      await user('ai-shape'),
      { ...ASK, turns: [...ASK.turns, { role: 'assistant', text: 'done' }] },
      fakeAi().vars,
    )
    expect(res.status).toBe(400)
  })

  it('answers 404 for a hill that does not exist', async () => {
    const res = await chat(await user('ai-nohill'), { ...ASK, hill: 'nowhere' }, fakeAi().vars)
    expect(res.status).toBe(404)
  })

  it('writes a bot, assembles it, and says what it beats', async () => {
    const ai = fakeAi(
      `<think>a dwarf, stride 4</think>A dwarf, then.\n\n${asm(DWARF)}\n\nIt should beat Spin: Spin sits still.`,
    )
    const jar = await user('ai-writer')
    const events = await eventsOf(await chat(jar, { ...ASK, source: SPIN }, ai.vars))

    expect(sources(events)).toEqual([
      expect.objectContaining({ source: DWARF, summary: 'the bot', errors: [] }),
    ])
    expect(sources(events)[0]?.size).toBeGreaterThan(0)
    const text = events.flatMap((e) => (e.type === 'text' ? [e.text] : [])).join('')
    expect(text).toBe('A dwarf, then.\n\nIt should beat Spin: Spin sits still.')
    expect(events).toContainEqual({ type: 'status', text: 'writing the bot' })

    // One call: Qwen3, the system prompt with the hill's best bots and their source, and the
    // editor's source before the user's words.
    expect(ai.calls).toHaveLength(1)
    const [call] = ai.calls
    expect(call?.model).toBe(MODEL)
    const [system, asked] = call?.messages ?? []
    expect(system?.role).toBe('system')
    expect(system?.content).toContain('x16c cheat sheet')
    expect(system?.content).toContain('The hill: AI hill')
    expect(system?.content).toContain('mov word [di], 0')
    expect(asked?.content).toContain("The editor's source now")
    expect(asked?.content).toContain('jmp $')
    expect(asked?.content).toMatch(/a dwarf that bombs every 4 bytes$/)

    const done = events.at(-1)
    expect(done).toEqual({ type: 'done', costUsd: costOf(USAGE) })
    const userId = (await (await send(jar, '/api/me')).json<{ user: { id: string } }>()).user.id
    expect((await spentToday(env.KV, userId)).user).toBeCloseTo(costOf(USAGE), 9)
  })

  it('sends the assembler errors back until the bot is clean', async () => {
    const ai = fakeAi(
      `Here it is.\n${asm(BROKEN)}`,
      `Used bx, which addresses memory.\n${asm(DWARF)}`,
    )
    const events = await eventsOf(await chat(await user('ai-fixer'), ASK, ai.vars))
    const [broken, fixed] = sources(events)
    expect(broken?.size).toBe(0)
    expect(broken?.errors.length).toBeGreaterThan(0)
    expect(fixed).toMatchObject({
      source: DWARF,
      summary: 'Used bx, which addresses memory.',
      errors: [],
    })
    expect(events).toContainEqual({ type: 'status', text: `fixing (1 of ${MAX_FIXES})` })
    // The fix reads the first ask, the broken bot, and the errors.
    const fix = ai.calls[1]?.messages ?? []
    expect(fix.at(-2)).toEqual({ role: 'assistant', content: asm(BROKEN) })
    expect(fix.at(-1)?.content).toMatch(/does not assemble[\s\S]*Send the whole bot again/)
    expect(events.find((e) => e.type === 'text')).toEqual({ type: 'text', text: 'Here it is.' })
  })

  it(`stops after ${MAX_FIXES} fixes`, async () => {
    const ai = fakeAi(...Array.from({ length: MAX_FIXES + 1 }, () => asm(BROKEN)))
    const events = await eventsOf(await chat(await user('ai-stuck'), ASK, ai.vars))
    expect(ai.calls).toHaveLength(MAX_FIXES + 1)
    expect(sources(events)).toHaveLength(MAX_FIXES + 1)
    expect(events.at(-1)?.type).toBe('done')
  })

  it('says so when the model writes no bot', async () => {
    const events = await eventsOf(
      await chat(await user('ai-nobot'), ASK, fakeAi('What size should it be?').vars),
    )
    expect(sources(events)).toEqual([])
    expect(events).toContainEqual({ type: 'text', text: 'What size should it be?' })
  })

  it('says so when the model fails', async () => {
    const events = await eventsOf(
      await chat(await user('ai-down'), ASK, fakeAi(new Error('3040: out of capacity')).vars),
    )
    expect(events.find((e) => e.type === 'error')).toMatchObject({ message: /try again/ })
    expect(events.at(-1)).toEqual({ type: 'done', costUsd: 0 })
  })

  it('stops a user at their daily cap', async () => {
    const res = await chat(await user('ai-capped'), ASK, {
      ...fakeAi().vars,
      AI_USER_DAILY_USD: '0',
    })
    expect(res.status).toBe(429)
  })

  it('stops everyone at the site cap', async () => {
    const res = await chat(await user('ai-site'), ASK, { ...fakeAi().vars, AI_DAILY_USD: '0' })
    expect(res.status).toBe(503)
  })
})

describe('the AI mode', () => {
  it('prompts with the skill’s cheat sheet and strategy families', () => {
    expect(SYSTEM_PROMPT).toContain('## x16c cheat sheet')
    expect(SYSTEM_PROMPT).toContain('## Strategy families')
    expect(SYSTEM_PROMPT).not.toContain('## Examples')
  })

  it('joins turns of one role, drops the oldest past the room, and asks last', () => {
    const messages = toMessages(
      [
        { role: 'assistant', text: 'hello' },
        { role: 'user', text: 'a' },
        { role: 'user', text: 'b' },
        { role: 'assistant', text: 'c' },
        { role: 'user', text: 'd' },
      ],
      '',
      'COMPETITORS',
    )
    expect(messages.slice(1)).toEqual([
      { role: 'user', content: 'a\n\nb' },
      { role: 'assistant', content: 'c' },
      { role: 'user', content: 'The editor is empty.\n\nd' },
    ])
    expect(messages[0]?.content).toMatch(/COMPETITORS$/)
    const long = 'x'.repeat(8000)
    const cut = toMessages(
      [
        { role: 'user', text: long },
        { role: 'assistant', text: long },
        { role: 'user', text: 'next' },
      ],
      '',
      '',
    )
    // The two old turns do not fit together, and an answer never leads.
    expect(cut.map((m) => m.role)).toEqual(['system', 'user'])
  })

  it('shows a source too big to read as a size, not text', () => {
    expect(sourceText('x'.repeat(MAX_SOURCE_CHARS + 1))).toMatch(/too big to show/)
  })

  it('splits an answer into its words and the last bot', () => {
    expect(splitAnswer(`<think>hm</think>One.\n${asm(SPIN)}\nTwo.\n${asm(DWARF)}`)).toEqual({
      words: 'One.\n\nTwo.',
      source: DWARF,
    })
    expect(splitAnswer('## Plan\n**Beats:** imps.  \nLoses to __paper__.')).toEqual({
      words: 'Plan\nBeats: imps.\nLoses to paper.',
      source: null,
    })
    // Thinking whose opening tag the model left out; a block with no bot in it.
    expect(splitAnswer('plan</think>Just words.\n```\nmov ax, 1\n```')).toEqual({
      words: 'Just words.',
      source: null,
    })
  })

  it('asks for a fix when a bot is outside the hill’s band', () => {
    const hill = { config: { maxBotBytes: 4, minBotBytes: 1 } } as Parameters<typeof checkBot>[2]
    const { event, fix } = checkBot(DWARF, '', hill)
    expect(fix).toMatch(/outside the hill's band of 1 to 4/)
    expect(event.errors[0]).toMatch(/outside/)
  })
})
