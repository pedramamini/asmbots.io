/**
 * How a challenge runs, in four steps on a small hill of six: the challenger comes in, fights each
 * entry once, the field ranks, and the lowest is pushed off. It plays by itself, a step at a time
 * (motion as information, DESIGN_SYSTEM §1), until the reader picks a step or pauses it; with
 * reduced motion it waits on the first step and moves only when asked.
 */
import { Button, cx, Identicon, Segmented, useReducedMotion } from '@asmbots/ui'
import { Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'

/** The example hill: six places, its entries king first, and what each gives the challenger. */
const ENTRIES = [
  { name: 'Paper', score: 412, gives: 12 },
  { name: 'Twinlet', score: 380, gives: 40 },
  { name: 'Dwarf', score: 341, gives: 58 },
  { name: 'Imp Gate', score: 297, gives: 66 },
  { name: 'Scanner', score: 260, gives: 84 },
  { name: 'Vampire', score: 214, gives: 96 },
] as const

const PLACES = ENTRIES.length
const CHALLENGER = 'your bot'
const CHALLENGER_SCORE = ENTRIES.reduce((sum, e) => sum + e.gives, 0)
/** Where the challenger ranks: after every entry that scores more. */
const CHALLENGER_RANK = ENTRIES.filter((e) => e.score > CHALLENGER_SCORE).length
const TOP = ENTRIES[0].score

export type ChallengeStep = 'submit' | 'fight' | 'rank' | 'trim'

export const STEPS = [
  {
    value: 'submit',
    label: '1 submit',
    title: 'You submit a saved version',
    text: 'The server takes the bytes it assembled when you saved, never bytes on trust, and queues a job for the hill.',
  },
  {
    value: 'fight',
    label: '2 fight',
    title: 'It fights every entry, once',
    text: 'One match against each entry, under the hill’s rounds and cycles. The entries’ old matches with each other are kept, so a challenge plays one match per entry.',
  },
  {
    value: 'rank',
    label: '3 rank',
    title: 'The whole field ranks by score',
    text: 'A bot’s score is its match points against every other bot on the hill. Level scores rank the older bot higher, so a tie with the lowest is not enough.',
  },
  {
    value: 'trim',
    label: '4 push off',
    title: 'Over size, the lowest goes',
    text: 'The lowest bot is pushed off and its matches leave every score. Each bot that stays ages by one; the bot on top is the king.',
  },
] as const satisfies readonly { value: ChallengeStep; label: string; title: string; text: string }[]

/** How long each step shows while it plays, ms; the fight moves on a bout at a time. */
const HOLD_MS = 6000
const BOUT_MS = 1200

const ROW = 30

interface Row {
  key: string
  name: string
  score: number | null
  /** Its place on the board, 0 at the top; the challenger waits under the board. */
  place: number
  challenger: boolean
  state: 'idle' | 'fighting' | 'fought' | 'out'
}

/** The rows as `step` and `bout` (the entry being fought) leave them. */
export function boardRows(step: ChallengeStep, bout: number): Row[] {
  const ranked = step === 'rank' || step === 'trim'
  const rows: Row[] = ENTRIES.map((e, i) => {
    const place = ranked && i >= CHALLENGER_RANK ? i + 1 : i
    const out = step === 'trim' && place === PLACES
    return {
      key: e.name,
      name: e.name,
      score: e.score,
      place,
      challenger: false,
      state: out
        ? 'out'
        : step === 'fight'
          ? i === bout
            ? 'fighting'
            : i < bout
              ? 'fought'
              : 'idle'
          : 'idle',
    }
  })
  const points = ENTRIES.slice(0, bout + 1).reduce((sum, e) => sum + e.gives, 0)
  rows.push({
    key: CHALLENGER,
    name: CHALLENGER,
    score: step === 'submit' ? null : step === 'fight' ? points : CHALLENGER_SCORE,
    place: ranked ? CHALLENGER_RANK : PLACES + 0.5,
    challenger: true,
    state: step === 'fight' ? 'fighting' : 'idle',
  })
  return rows
}

function BoardRow({ row, still }: { row: Row; still: boolean }) {
  const rank = Number.isInteger(row.place) ? row.place + 1 : null
  return (
    <div
      className={cx(
        'absolute right-16 left-0 flex h-[26px] items-center gap-2 rounded-sm border px-2 text-data',
        !still &&
          'transition-[top,opacity,transform,border-color,background-color] duration-500 ease-out',
        row.challenger
          ? 'border-accent border-dashed bg-accent-10'
          : row.state === 'fighting'
            ? 'border-accent bg-accent-25'
            : 'border-border bg-panel',
        row.state === 'out' && 'translate-x-6 border-danger opacity-40',
      )}
      style={{ top: row.place * ROW }}
    >
      <span className="w-6 shrink-0 text-muted tabular-nums">
        {row.challenger && rank === null ? '→' : rank === null ? '' : `#${rank}`}
      </span>
      <Identicon value={row.name} size={16} />
      <span
        className={cx(
          'w-20 shrink-0 truncate',
          row.challenger ? 'text-accent-fg' : row.state === 'out' ? 'text-danger' : 'text-bright',
        )}
      >
        {row.name}
      </span>
      <span className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-panel-2">
        <span
          className={cx(
            'absolute inset-y-0 left-0',
            !still && 'transition-[width] duration-300 ease-out',
            row.challenger ? 'bg-accent' : row.state === 'out' ? 'bg-danger' : 'bg-accent-45',
          )}
          style={{ width: `${row.score === null ? 0 : (100 * row.score) / TOP}%` }}
        />
      </span>
      <span className="w-10 shrink-0 text-right text-bright tabular-nums">{row.score ?? '–'}</span>
      <span className="w-14 shrink-0 text-right text-panel-status">
        {row.state === 'out' ? (
          <span className="text-danger">off</span>
        ) : row.state === 'fighting' && !row.challenger ? (
          <span className="text-accent-fg">vs</span>
        ) : row.state === 'fought' ? (
          <span className="text-muted">+{ENTRIES.find((e) => e.name === row.name)?.gives}</span>
        ) : null}
      </span>
    </div>
  )
}

export function ChallengeDiagram() {
  const reduced = useReducedMotion()
  const [step, setStep] = useState<ChallengeStep>('submit')
  const [bout, setBout] = useState(0)
  const [paused, setPaused] = useState(false)
  const playing = !paused && !reduced
  useEffect(() => {
    if (!playing) return
    const id = setTimeout(
      () => {
        if (step === 'fight' && bout < PLACES - 1) {
          setBout(bout + 1)
          return
        }
        const next = STEPS[(STEPS.findIndex((s) => s.value === step) + 1) % STEPS.length]
        setStep(next?.value ?? 'submit')
        setBout(0)
      },
      step === 'fight' ? BOUT_MS : HOLD_MS,
    )
    return () => clearTimeout(id)
  }, [playing, step, bout])
  const pick = (value: ChallengeStep) => {
    setPaused(true)
    setStep(value)
    setBout(value === 'fight' ? PLACES - 1 : 0)
  }
  const index = Math.max(
    0,
    STEPS.findIndex((s) => s.value === step),
  )
  const current = STEPS[index] ?? STEPS[0]
  const rows = boardRows(step, bout)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<ChallengeStep> label="step" options={STEPS} value={step} onValueChange={pick} />
        {!reduced && (
          <Button
            size="sm"
            icon={paused ? Play : Pause}
            onClick={() => setPaused(!paused)}
            className="ml-auto"
          >
            {paused ? 'play' : 'pause'}
          </Button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
        <div aria-hidden="true" className="relative" style={{ height: (PLACES + 1.5) * ROW }}>
          {/* The hill's size: under the line, a bot is off the hill. */}
          <div
            className="absolute inset-x-0 border-danger/60 border-t border-dashed"
            style={{ top: PLACES * ROW - 3 }}
          />
          <span
            className="absolute right-0 w-15 text-right text-danger text-panel-status"
            style={{ top: PLACES * ROW - 10 }}
          >
            size {PLACES}
          </span>
          {rows.map((row) => (
            <BoardRow key={row.key} row={row} still={reduced} />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-accent-fg text-panel-title">
            step {index + 1} of {STEPS.length}
          </p>
          <p className="text-bright text-modal-title">{current.title}</p>
          <p className="text-data text-muted">{current.text}</p>
          {step === 'fight' && (
            <p className="text-data text-muted">
              {CHALLENGER} has{' '}
              <span className="text-bright tabular-nums">{rows.at(-1)?.score ?? 0}</span> points
              after {bout + 1} of {PLACES} matches.
            </p>
          )}
          {step === 'trim' && (
            <p className="text-data text-muted">
              {CHALLENGER} holds <span className="text-bright">#{CHALLENGER_RANK + 1}</span>.{' '}
              {ENTRIES.at(-1)?.name} is pushed off.
            </p>
          )}
          {/* A dot a step: the reader jumps to one, and the play stops there. */}
          <div className="mt-2 flex justify-center gap-1">
            {STEPS.map((s, i) => (
              <button
                key={s.value}
                type="button"
                aria-label={`step ${i + 1}: ${s.title}`}
                aria-current={i === index ? 'step' : undefined}
                onClick={() => pick(s.value)}
                className="group flex h-6 w-6 items-center justify-center rounded-sm focus-visible:outline-1 focus-visible:outline-accent"
              >
                <span
                  className={cx(
                    'block h-2 rounded-full transition-[width,background-color] duration-120 ease-out',
                    i === index
                      ? 'w-5 bg-accent'
                      : 'w-2 bg-border-strong group-hover:bg-accent-45',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
