/**
 * The editor's AI mode (PRODUCT_SPEC §3): a chat beside the source. The user says what bot they
 * want in plain words; the model writes it into the editor, the server assembles each version and
 * hands the errors back, and the model reads the chosen hill's best bots to say what the bot beats
 * and what it may lose to. Each clean version goes in as it comes, an edit undo takes back. Signed
 * out, the panel asks the user to sign in; a roster bot is read-only, so it asks for a fork.
 * Its own chunk, with everything it does to the editor: the editor's route is at its budget
 * (`guide/budgets.md`).
 */
import { type AiEvent, type AiTurn, weightClassOf } from '@asmbots/protocol'
import { Button, cx, Select, useToast } from '@asmbots/ui'
import { isolateHistory, undo } from '@codemirror/commands'
import type { EditorView } from '@codemirror/view'
import { CornerDownLeft, LogIn, Square } from 'lucide-react'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { ApiRequestError } from '../../../api/client'
import { TileFrame } from '../layout/TileFrame'
import { streamChat, turnsOf } from './chat'

export interface AiPanelProps {
  signedIn: boolean
  /** A roster bot: nothing goes into the editor. */
  readOnly: boolean
  /** The editor: the source the model reads, and where each bot it writes goes. */
  view: EditorView | null
  /** The bot's size at the last assemble, for the hill it fights on; null before one. */
  size: number | null
  onSignIn: () => void
}

/** Puts `text` in `view` as one edit, which undo takes back (as a template goes in). */
function write(view: EditorView, text: string) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    selection: { anchor: 0 },
    scrollIntoView: true,
    userEvent: 'input.replace',
    annotations: isolateHistory.of('full'),
  })
}

/** The hills a bot can be written for, by slug, as the select says them. */
export const AI_HILLS: readonly (readonly [string, string])[] = [
  ['main', 'main · light'],
  ['tiny', 'tiny'],
  ['melee', 'melee'],
  ['middleweight', 'middleweight'],
  ['heavyweight', 'heavyweight'],
  ['super-heavy', 'super-heavy'],
  ['open-weight', 'open weight'],
]

/** The hill of a bot of `size` bytes: its weight class's duel hill, `main` for a lightweight. */
export function hillOfSize(size: number | null): string {
  const slug = size === null || size === 0 ? null : weightClassOf(size)?.slug
  return slug === undefined || slug === null || slug === 'lightweight' ? 'main' : slug
}

/** Ways to start, for the empty chat. */
export const AI_STARTERS = [
  'a fast dwarf that bombs every 4 bytes, with a decoy in front',
  'a scanner that finds the enemy and carpet-bombs around it',
  'paper that copies itself across the core faster than a stone can bomb it',
] as const

/** A message of the chat. */
interface Entry {
  readonly id: number
  readonly role: AiTurn['role']
  readonly text: string
  /** The bots the model wrote in this answer, in order. */
  readonly writes: readonly Write[]
  readonly error: string | null
}

type Write = Extract<AiEvent, { type: 'source' }>

/** What an answer says to the next turn: its words, or what it wrote. */
function turnText(entry: Entry): string {
  if (entry.role === 'user' || entry.text.trim() !== '') return entry.text
  return entry.writes.map((w) => `(wrote the bot: ${w.summary || 'a version'})`).join('\n')
}

export function AiPanel({ signedIn, readOnly, view, size, onSignIn }: AiPanelProps) {
  const { toast } = useToast()
  const [entries, setEntries] = useState<Entry[]>([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const hill = picked ?? hillOfSize(size)
  const abort = useRef<AbortController | null>(null)
  const nextId = useRef(0)
  const log = useRef<HTMLDivElement>(null)
  const running = status !== null

  // The newest words stay in view as they stream.
  useEffect(() => {
    const box = log.current
    if (box !== null) box.scrollTop = box.scrollHeight
  }, [entries])
  // Leaving the page stops the turn.
  useEffect(() => () => abort.current?.abort(), [])

  const patch = (id: number, change: (entry: Entry) => Entry) =>
    setEntries((all) => all.map((entry) => (entry.id === id ? change(entry) : entry)))

  const ask = async (words: string) => {
    const text = words.trim()
    if (text === '' || running || readOnly || !signedIn || view === null) return
    const asked: Entry = { id: nextId.current++, role: 'user', text, writes: [], error: null }
    const reply: Entry = {
      id: nextId.current++,
      role: 'assistant',
      text: '',
      writes: [],
      error: null,
    }
    const turns = turnsOf(
      [...entries, asked].map((entry) => ({ role: entry.role, text: turnText(entry) })),
    )
    setEntries((all) => [...all, asked, reply])
    setDraft('')
    setStatus('thinking')
    const controller = new AbortController()
    abort.current = controller
    // What went in this turn: the closure below counts it.
    const wrote: { applied: number; last: Write | null } = { applied: 0, last: null }
    try {
      await streamChat(
        { turns, source: view.state.doc.toString(), hill },
        (event) => {
          switch (event.type) {
            case 'text':
              patch(reply.id, (e) => ({ ...e, text: e.text + event.text }))
              break
            case 'status':
              setStatus(event.text)
              break
            case 'source':
              wrote.last = event
              patch(reply.id, (e) => ({ ...e, writes: [...e.writes, event] }))
              // A version that assembles goes in now; one with errors waits for the fix.
              if (event.size > 0) {
                write(view, event.source)
                wrote.applied++
              }
              break
            case 'error':
              patch(reply.id, (e) => ({ ...e, error: event.message }))
              break
            case 'done':
              break
          }
        },
        controller.signal,
      )
      // The model never got a version to assemble: the last one goes in, errors and all.
      if (wrote.applied === 0 && wrote.last !== null) {
        write(view, wrote.last.source)
        wrote.applied++
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const message =
          error instanceof ApiRequestError
            ? error.message
            : 'the AI mode did not answer: try again.'
        patch(reply.id, (e) => ({ ...e, error: message }))
      }
    } finally {
      abort.current = null
      setStatus(null)
      // The toast's undo takes back every bot of the turn.
      const count = wrote.applied
      if (count > 0) {
        toast('the ai put its bot in the editor.', {
          variant: 'accent',
          action: {
            label: 'undo',
            onClick: () => {
              for (let i = 0; i < count; i++) undo(view)
            },
          },
        })
      }
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    void ask(draft)
  }

  const hillSelect = (
    <Select
      aria-label="the hill to win"
      value={hill}
      onChange={(event) => setPicked(event.currentTarget.value)}
      disabled={running}
      className="w-32"
    >
      {AI_HILLS.map(([slug, label]) => (
        <option key={slug} value={slug}>
          {label}
        </option>
      ))}
    </Select>
  )

  return (
    <TileFrame
      label="ai"
      title="ai"
      status={running ? `${status}…` : undefined}
      actions={
        <>
          {entries.length > 0 && !running && (
            <Button variant="ghost" size="sm" onClick={() => setEntries([])}>
              new chat
            </Button>
          )}
          {hillSelect}
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div
          ref={log}
          role="log"
          aria-label="ai chat"
          aria-busy={running || undefined}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2"
        >
          {entries.length === 0 ? (
            <Intro onPick={signedIn && !readOnly ? (s) => void ask(s) : undefined} />
          ) : (
            entries.map((entry) => <Message key={entry.id} entry={entry} />)
          )}
        </div>
        {!signedIn ? (
          <div className="flex items-center gap-3 border-t border-border p-2">
            <p className="flex-1 text-data text-muted">sign in to write bots with the ai.</p>
            <Button variant="primary" icon={LogIn} onClick={onSignIn}>
              SIGN IN
            </Button>
          </div>
        ) : readOnly ? (
          <p className="border-t border-border p-2 text-data text-muted">
            a roster bot is read-only: fork it to write it with the ai.
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void ask(draft)
            }}
            className="flex items-end gap-2 border-t border-border p-2"
          >
            <textarea
              aria-label="describe your bot"
              placeholder="describe your bot's strategy…"
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onKeyDown={onKeyDown}
              className="min-h-0 flex-1 resize-none rounded-sm border border-border bg-panel-2 px-2 py-1 text-data text-text outline-hidden transition-colors duration-120 ease-out placeholder:text-muted hover:border-border-strong focus:border-accent"
            />
            {running ? (
              <Button icon={Square} onClick={() => abort.current?.abort()}>
                STOP
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                icon={CornerDownLeft}
                disabled={draft.trim() === ''}
              >
                SEND
              </Button>
            )}
          </form>
        )}
      </div>
    </TileFrame>
  )
}

function Intro({ onPick }: { onPick: ((starter: string) => void) | undefined }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-data text-muted">
        describe your bot's strategy in plain words. the ai writes it into the editor, assembles it,
        and reads the hill's best bots to tell you what it beats and what beats it.
      </p>
      {onPick !== undefined && (
        <ul aria-label="ways to start" className="flex flex-col items-start gap-1">
          {AI_STARTERS.map((starter) => (
            <li key={starter}>
              <Button variant="ghost" size="sm" onClick={() => onPick(starter)}>
                {starter}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Message({ entry }: { entry: Entry }) {
  if (entry.role === 'user') {
    return (
      <p className="max-w-[85%] self-end rounded-sm bg-panel-2 px-2 py-1 text-data whitespace-pre-wrap text-text">
        {entry.text}
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      {entry.writes.map((write, i) => (
        <p key={i} className={cx('text-data', write.size > 0 ? 'text-accent-fg' : 'text-warn')}>
          {write.size > 0
            ? `wrote ${write.summary || 'the bot'} · ${write.size} B`
            : `${write.summary || 'a version'}: ${write.errors.length} to fix`}
          {write.size > 0 && write.errors[0] !== undefined && (
            <span className="text-warn"> · {write.errors[0]}</span>
          )}
        </p>
      ))}
      {entry.text !== '' && <p className="text-data whitespace-pre-wrap text-text">{entry.text}</p>}
      {entry.error !== null && <p className="text-data text-danger">{entry.error}</p>}
    </div>
  )
}
