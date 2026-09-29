/**
 * The arena's sound (DESIGN_SYSTEM §7): tiny cues synthesized with WebAudio, no samples. A tick, a
 * click for a burst of writes, a thud for a process's death, a falling tone for a bot's, a phrase
 * for a victory, and a click for the transport, each in the voice of the pack the settings name
 * (`packs.ts`). Sound is opt-in (`m`, the
 * arena's sound button, the settings page), and even when it is on, nothing sounds and no
 * AudioContext exists until the page's first user gesture, so the browser never blocks one.
 *
 * The budget: at most `MAX_CUES_PER_SECOND` cues in any second, and a cue over it is dropped, never
 * queued. The frequent cues (tick, write, death) come at most every 125 ms and fill at most 8 of
 * the second's cues, clicks at most 10: a bot's death and the victory always find room. Writes
 * coalesce into one click every `WRITE_WINDOW_MS`, as loud as the writes it stands for.
 */
import {
  DEFAULT_SETTINGS,
  type SoundCue,
  type SoundPack,
  type SoundSettings,
  useSettings,
} from '../../store/settings'
import { PACKS, Voices } from './packs'

export { botPitch } from './packs'

/** The most cues in any second (DESIGN_SYSTEM §7). */
export const MAX_CUES_PER_SECOND = 12

/** How cues share the budget: the frequent ones, the transport's clicks, the battle's story. */
export type CueClass = 'ambient' | 'ui' | 'story'

const CLASS_OF: Readonly<Record<SoundCue, CueClass>> = {
  tick: 'ambient',
  write: 'ambient',
  death: 'ambient',
  click: 'ui',
  botDeath: 'story',
  victory: 'story',
}

/**
 * Per class: the most cues the last second may hold for one of its cues to play (the rest stay
 * free for the classes above it), and the least time after the class's last cue, ms.
 */
export const CUE_LIMITS: Readonly<Record<CueClass, { ceiling: number; gap: number }>> = {
  ambient: { ceiling: 8, gap: 125 },
  ui: { ceiling: 10, gap: 60 },
  story: { ceiling: MAX_CUES_PER_SECOND, gap: 0 },
}

/** A write click comes at most this often, ms: the writes in between add to the next one. */
export const WRITE_WINDOW_MS = 250

/** The master gain at `volume` (0..1): squared, so the slider's middle sounds like the middle. */
export function masterLevel(volume: number): number {
  return volume * volume
}

/** How much louder `weight` events (writes, deaths) make a cue than one: 0..1, on a log scale. */
export function weightLevel(weight: number): number {
  return Math.min(1, Math.log2(1 + Math.max(0, weight)) / 10)
}

/** The events that give the page a user activation (HTML §6.4.3): after one, audio may start. */
const GESTURES = ['keydown', 'mousedown', 'pointerup', 'touchend'] as const

const LISTEN: AddEventListenerOptions = { capture: true, passive: true }

/** Whether `event` activates the page: not `esc`; a mouse at `mousedown`, not at `pointerup`. */
function activates(event: Event): boolean {
  if (event.type === 'keydown') return (event as KeyboardEvent).key !== 'Escape'
  if (event.type === 'pointerup') return (event as PointerEvent).pointerType !== 'mouse'
  return true
}

function hasBeenActive(): boolean {
  return typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive === true
}

function newContext(): AudioContext | null {
  return typeof AudioContext === 'function'
    ? new AudioContext({ latencyHint: 'interactive' })
    : null
}

export interface SoundEngineOptions {
  /** Makes the AudioContext, or null where there is no WebAudio. Default: a new `AudioContext`. */
  readonly createContext?: (() => AudioContext | null) | undefined
  /** The budget's clock, ms. Default: `performance.now`. */
  readonly now?: (() => number) | undefined
  /** Where the user's gestures come from. Default: `window`, or none without a DOM. */
  readonly gestures?: EventTarget | null | undefined
  /** Whether the page has had a gesture already. Default: `navigator.userActivation`'s word. */
  readonly activated?: (() => boolean) | undefined
}

export interface CueOptions {
  /** How many events the cue stands for (a frame's writes, its deaths): more is louder. */
  readonly weight?: number | undefined
  /** A bot's death: the bot, from 0. Its tone falls from the bot's own pitch. */
  readonly bot?: number | undefined
}

/**
 * The synth. `configure` gives it the user's settings; `play` sounds a cue when the settings, the
 * page's gesture, and the budget allow it. `appSound()` is the app's, and follows the settings.
 */
export class SoundEngine {
  private settings: SoundSettings = DEFAULT_SETTINGS.sound
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private voices: Voices | null = null
  /** No WebAudio here: none, or making a context failed. */
  private unavailable = false
  private active: boolean
  /** When each cue of the last second played, ms, the oldest first. */
  private readonly played: number[] = []
  /** When each class's last cue played, ms. */
  private readonly lastOf: Record<CueClass, number> = {
    ambient: Number.NEGATIVE_INFINITY,
    ui: Number.NEGATIVE_INFINITY,
    story: Number.NEGATIVE_INFINITY,
  }
  private lastWrite = Number.NEGATIVE_INFINITY
  /** The writes since the last write click. */
  private writes = 0
  private readonly createContext: () => AudioContext | null
  private readonly now: () => number
  private readonly gestures: EventTarget | null

  constructor(options: SoundEngineOptions = {}) {
    this.createContext = options.createContext ?? newContext
    this.now = options.now ?? (() => performance.now())
    this.gestures =
      options.gestures !== undefined
        ? options.gestures
        : typeof window === 'undefined'
          ? null
          : window
    this.active = (options.activated ?? hasBeenActive)()
    for (const type of GESTURES) this.gestures?.addEventListener(type, this.onGesture, LISTEN)
  }

  /** Whether the page has had a user gesture: until then, nothing sounds. */
  get unlocked(): boolean {
    return this.active
  }

  /** The user's settings: on or off, the master volume, each cue's switch. */
  configure(settings: SoundSettings): void {
    this.settings = settings
    const context = this.context
    if (context !== null && this.master !== null) {
      this.master.gain.setTargetAtTime(masterLevel(settings.volume), context.currentTime, 0.015)
    }
    if (settings.on) this.wake()
    else if (context?.state === 'running') void context.suspend().catch(() => {})
  }

  /**
   * Sounds `cue` now when sound is on, the cue too, the page has had a gesture, and the budget has
   * room. Returns whether it did.
   */
  play(cue: SoundCue, options: CueOptions = {}): boolean {
    return this.settings.cues[cue] && this.sound(cue, options, false)
  }

  /**
   * Sounds `cue` for the settings page, whatever its own switch: a cue turned on, the volume
   * moved. Sound must be on, and a context that is still starting plays it once it runs.
   */
  preview(cue: SoundCue): boolean {
    return this.sound(cue, {}, true)
  }

  /** Stops listening, and closes the context. */
  dispose(): void {
    for (const type of GESTURES) this.gestures?.removeEventListener(type, this.onGesture, LISTEN)
    void this.context?.close().catch(() => {})
    this.context = null
    this.master = null
    this.voices = null
  }

  private readonly onGesture = (event: Event): void => {
    if (!activates(event)) return
    this.active = true
    if (this.settings.on) this.wake()
  }

  private sound(cue: SoundCue, { weight = 1, bot = 0 }: CueOptions, wait: boolean): boolean {
    if (!this.settings.on || !this.active) return false
    const context = this.open()
    if (context === null) return false
    const now = this.now()
    if (cue === 'write') {
      this.writes += weight
      if (now - this.lastWrite < WRITE_WINDOW_MS) return false
    }
    const running = context.state === 'running'
    if (!running && !wait) {
      this.resume(context)
      return false
    }
    if (!this.admit(cue, now)) return false
    const level = cue === 'write' ? weightLevel(this.writes) : weightLevel(weight)
    if (cue === 'write') {
      this.writes = 0
      this.lastWrite = now
    }
    const voices = this.voices as Voices
    if (running) this.synth(voices, cue, level, bot)
    else
      void context.resume().then(
        () => this.synth(voices, cue, level, bot),
        () => {},
      )
    return true
  }

  /** Whether the budget takes `cue` at `now`; if so, it counts it. */
  private admit(cue: SoundCue, now: number): boolean {
    const { played } = this
    while (played.length > 0 && (played[0] as number) <= now - 1000) played.shift()
    const kind = CLASS_OF[cue]
    const { ceiling, gap } = CUE_LIMITS[kind]
    if (played.length >= ceiling || now - this.lastOf[kind] < gap) return false
    played.push(now)
    this.lastOf[kind] = now
    return true
  }

  /** The context, made the first time after a gesture: the master gain into a limiter. */
  private open(): AudioContext | null {
    if (this.context !== null || this.unavailable || !this.active) return this.context
    let context: AudioContext | null = null
    try {
      context = this.createContext()
    } catch {
      context = null
    }
    if (context === null) {
      this.unavailable = true
      return null
    }
    const master = context.createGain()
    master.gain.value = masterLevel(this.settings.volume)
    // Cues that land together must not clip.
    const limiter = context.createDynamicsCompressor()
    limiter.threshold.value = -10
    limiter.ratio.value = 12
    master.connect(limiter).connect(context.destination)
    this.context = context
    this.master = master
    this.voices = new Voices(context, master)
    return context
  }

  /** Sound is on: the context, running. */
  private wake(): void {
    const context = this.open()
    if (context !== null && context.state !== 'running') this.resume(context)
  }

  private resume(context: AudioContext): void {
    if (context.state !== 'closed') void context.resume().catch(() => {})
  }

  /** The pack's voice of `cue`, from a moment on. */
  private synth(voices: Voices, cue: SoundCue, level: number, bot: number): void {
    PACKS[this.settings.pack].cues[cue](voices, voices.context.currentTime + 0.005, level, bot)
  }
}

let app: SoundEngine | null = null

/** The app's engine, made at the first call: from then on it follows the settings store. */
export function appSound(): SoundEngine {
  if (app === null) {
    const engine = new SoundEngine()
    engine.configure(useSettings.getState().sound)
    useSettings.subscribe((state, previous) => {
      if (state.sound !== previous.sound) engine.configure(state.sound)
    })
    app = engine
  }
  return app
}

/** Sound on or off: `m`, and the arena's sound button. Turned on, it clicks at the volume set. */
export function toggleSound(): void {
  const { sound, setSound } = useSettings.getState()
  setSound({ on: !sound.on })
  if (!sound.on) appSound().preview('click')
}

/** Sound in `pack`'s voice from now on: the settings' picker, the command menu. It plays its victory. */
export function chooseSoundPack(pack: SoundPack): void {
  useSettings.getState().setSound({ pack })
  appSound().preview('victory')
}
