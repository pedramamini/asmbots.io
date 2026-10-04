/**
 * The editor's AI panel: it asks the user to sign in, or to fork a roster bot; signed in, it sends
 * the conversation, the editor's source, and the hill, streams the answer in, puts each bot that
 * assembles into the editor, and says what went wrong when the API refuses.
 */
import { describe, expect, it } from 'bun:test'
import type { AiEvent } from '@asmbots/protocol'
import { ToastProvider } from '@asmbots/ui'
import { history } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { useDom, window } from '../../../packages/ui/test/dom'
import { AiPanel, type AiPanelProps, hillOfSize } from '../src/features/editor/ai/AiPanel'
import { eventOf, turnsOf } from '../src/features/editor/ai/chat'
import { useApiServer } from './api-server'

useDom()
window.HTMLElement.prototype.scrollTo ??= () => {}

const server = useApiServer()

/** `POST /api/ai/chat` answers with `events` as Server-Sent Events; each request body goes in `seen`. */
function answerChat(events: readonly AiEvent[], seen: unknown[] = []) {
  server.use(
    http.post('*/api/ai/chat', async ({ request }) => {
      seen.push(await request.json())
      const body = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder()
          for (const event of events) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          }
          controller.close()
        },
      })
      return new HttpResponse(body, { headers: { 'Content-Type': 'text/event-stream' } })
    }),
  )
  return seen
}

const MINE = '%name "Mine"\nstart: jmp start\n'

/** The panel over an editor holding `MINE`; each text the panel put in it, in `wrote`. */
function panel(props: Partial<AiPanelProps> = {}) {
  const view = new EditorView({ state: EditorState.create({ doc: MINE, extensions: history() }) })
  const wrote: string[] = []
  const dispatch = view.dispatch.bind(view)
  view.dispatch = ((...specs: Parameters<EditorView['dispatch']>) => {
    dispatch(...specs)
    wrote.push(view.state.doc.toString())
  }) as EditorView['dispatch']
  render(
    <ToastProvider>
      <AiPanel signedIn readOnly={false} view={view} size={4} onSignIn={() => {}} {...props} />
    </ToastProvider>,
  )
  return { wrote, view }
}

const ask = (text: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'describe your bot' }), {
    target: { value: text },
  })
  fireEvent.click(screen.getByRole('button', { name: 'SEND' }))
}

describe('the AI panel', () => {
  it('asks a signed-out user to sign in', () => {
    let asked = 0
    panel({ signedIn: false, onSignIn: () => asked++ })
    expect(screen.queryByRole('textbox', { name: 'describe your bot' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'SIGN IN' }))
    expect(asked).toBe(1)
  })

  it('asks for a fork on a roster bot', () => {
    panel({ readOnly: true })
    expect(screen.getByText(/fork it to write it with the ai/)).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'describe your bot' })).toBeNull()
  })

  it('streams the answer in and puts the bot it wrote in the editor', async () => {
    const DWARF = '%name "Dwarf"\nstart: jmp start\n'
    const seen = answerChat([
      { type: 'status', text: 'writing the bot' },
      {
        type: 'source',
        source: '%name "Broken"\n',
        summary: 'first try',
        size: 0,
        errors: ['1:1: error'],
      },
      { type: 'source', source: DWARF, summary: 'a dwarf', size: 12, errors: [] },
      { type: 'text', text: 'It beats ' },
      { type: 'text', text: 'Spin.' },
      { type: 'done', costUsd: 0.02 },
    ])
    const { wrote, view } = panel()
    ask('a dwarf')
    // Only the version that assembles went in, and the toast's undo takes it back.
    expect(await screen.findByText('the ai put its bot in the editor.')).toBeTruthy()
    expect(wrote).toEqual([DWARF])
    expect(seen).toEqual([
      { turns: [{ role: 'user', text: 'a dwarf' }], source: MINE, hill: 'main' },
    ])
    fireEvent.click(screen.getByRole('button', { name: 'undo' }))
    expect(view.state.doc.toString()).toBe(MINE)
    const log = within(screen.getByRole('log', { name: 'ai chat' }))
    expect(log.getByText('It beats Spin.')).toBeTruthy()
    expect(log.getByText('wrote a dwarf · 12 B')).toBeTruthy()
    expect(log.getByText('first try: 1 to fix')).toBeTruthy()
    // The next turn carries the answer before it.
    answerChat(
      [
        { type: 'text', text: 'ok' },
        { type: 'done', costUsd: 0 },
      ],
      seen,
    )
    ask('faster')
    await waitFor(() => expect(seen).toHaveLength(2))
    expect((seen[1] as { turns: unknown }).turns).toEqual([
      { role: 'user', text: 'a dwarf' },
      { role: 'assistant', text: 'It beats Spin.' },
      { role: 'user', text: 'faster' },
    ])
  })

  it('says why when the API refuses', async () => {
    server.use(
      http.post('*/api/ai/chat', () =>
        HttpResponse.json(
          { error: { code: 'rate_limited', message: 'you have used your AI turns for today' } },
          { status: 429 },
        ),
      ),
    )
    const { wrote } = panel()
    ask('a dwarf')
    expect(await screen.findByText('you have used your AI turns for today')).toBeTruthy()
    expect(wrote).toEqual([])
  })

  it('picks the hill of the bot’s weight class, and the user’s pick over it', () => {
    expect(hillOfSize(null)).toBe('main')
    expect(hillOfSize(300)).toBe('main')
    expect(hillOfSize(900)).toBe('middleweight')
    expect(hillOfSize(3000)).toBe('super-heavy')
    panel({ size: 1500 })
    const select = screen.getByRole('combobox', { name: 'the hill to win' }) as HTMLSelectElement
    expect(select.value).toBe('heavyweight')
  })
})

describe('the AI client', () => {
  it('reads an event from its data lines, and nothing from the rest', () => {
    expect(eventOf('data: {"type":"text","text":"hi"}')).toEqual({ type: 'text', text: 'hi' })
    expect(eventOf(': a comment')).toBeNull()
    expect(eventOf('data: not json')).toBeNull()
  })

  it('sends the newest turns that say something', () => {
    const turns = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      text: i === 1 ? ' ' : `t${i}`,
    }))
    const sent = turnsOf(turns)
    expect(sent).toHaveLength(16)
    expect(sent.at(-1)?.text).toBe('t19')
    expect(sent.some((t) => t.text.trim() === '')).toBe(false)
  })
})
