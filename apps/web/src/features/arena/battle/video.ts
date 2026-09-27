/**
 * The arena's video (`v`, and `share ▾`'s `export video`): each display frame of the arena, in its
 * theme, with the screenshot's words on it (the HUD's chips, the bots' legend, and the footer
 * stamp, the cycle counting up), recorded by the browser's `MediaRecorder` to an MP4, or a WebM
 * where the browser makes no MP4. The video runs in real time, at the speed the arena plays.
 */
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import type { ArenaCanvasHandle } from '../ArenaCanvas'
import type { ArenaClient } from '../worker/client'
import { downloadBlob } from './files'
import type { recordArena } from './record'
import type { ScreenshotText } from './shot-text'

/** A container and codec the browser can record to. */
export interface VideoFormat {
  /** What `MediaRecorder` records: `video/mp4;codecs=avc1.640033`. */
  readonly mime: string
  /** The file's type: `video/mp4`. */
  readonly type: string
  readonly extension: 'mp4' | 'webm'
}

/** Best first: an MP4 (H.264) plays wherever a video is shared; WebM where there is none. */
const FORMATS: readonly VideoFormat[] = [
  // High profile, level 5.1: a frame to 4096 x 2304, past what `MAX_WIDTH` lets through.
  { mime: 'video/mp4;codecs=avc1.640033', type: 'video/mp4', extension: 'mp4' },
  { mime: 'video/mp4', type: 'video/mp4', extension: 'mp4' },
  { mime: 'video/webm;codecs=vp9', type: 'video/webm', extension: 'webm' },
  { mime: 'video/webm;codecs=vp8', type: 'video/webm', extension: 'webm' },
  { mime: 'video/webm', type: 'video/webm', extension: 'webm' },
]

/** The widest video, px: past it, the arena is scaled down. */
export const MAX_WIDTH = 1920
/** How long a recording runs on after the end, ms: the end stays on screen a moment. */
export const TAIL_MS = 1200

/** The format to record in: the first of `FORMATS` that `supported` takes. Null: none. */
export function videoFormat(supported?: (mime: string) => boolean): VideoFormat | null {
  const test =
    supported ??
    (typeof MediaRecorder === 'function'
      ? (mime: string) => MediaRecorder.isTypeSupported(mime)
      : null)
  if (test === null) return null
  return FORMATS.find((format) => test(format.mime)) ?? null
}

/** Whether this browser can record the arena: a `MediaRecorder`, and canvases that stream. */
export function canRecordVideo(): boolean {
  return (
    typeof HTMLCanvasElement === 'function' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    videoFormat() !== null
  )
}

/** A recording under way. */
export interface ArenaRecording {
  readonly format: VideoFormat
  /** Stops it. Resolves with the video, or null where it recorded nothing. */
  stop(): Promise<Blob | null>
}

export interface ArenaVideoOptions {
  client: Pick<ArenaClient, 'store' | 'pause' | 'play' | 'seek'>
  canvas: RefObject<ArenaCanvasHandle | null>
  /** The words on the frame now: the screenshot's. */
  text: () => ScreenshotText
  /** The video's file name, by its extension. */
  fileName: (extension: string) => string
  /** Says what went wrong: the browser cannot record, or recorded nothing. */
  onFail: (message: string) => void
}

/** The arena's video, for the HUD, the keys, and `share ▾`. */
export interface ArenaVideo {
  /** When the recording started (`performance.now()`), or null when none is under way. */
  readonly since: number | null
  /** Starts recording what the arena shows, or stops and saves the video: `v`. */
  toggle(): void
  /** Records the round from cycle 0 to its end, and saves it: `export video`. */
  exportRound(): void
}

/** The recorder (`record.ts`), a chunk of its own: once loaded, and while it loads. */
let recorder: typeof import('./record') | undefined
let loading: Promise<typeof import('./record')> | undefined

/** Loads the recorder, once; a load that fails is tried again on the next call. */
function loadRecorder(): Promise<typeof import('./record')> {
  loading ??= import('./record').then(
    (module) => {
      recorder = module
      return module
    },
    (error: unknown) => {
      loading = undefined
      throw error
    },
  )
  return loading
}

/**
 * The arena's video recorder. A recording stops and saves a moment (`TAIL_MS`) after the match
 * ends, or the round, for `exportRound`; `toggle` stops it sooner. Leaving the battle saves what
 * was recorded. The recorder loads as the battle mounts; a start before it has loaded waits for it.
 */
export function useArenaVideo(options: ArenaVideoOptions): ArenaVideo {
  const latest = useRef(options)
  latest.current = options
  const { client } = options
  const [since, setSince] = useState<number | null>(null)
  const live = useRef<{ recording: ArenaRecording; round: boolean } | null>(null)
  const tail = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const stop = useCallback(async () => {
    clearTimeout(tail.current)
    const current = live.current
    if (current === null) return
    live.current = null
    setSince(null)
    const blob = await current.recording.stop()
    const { fileName, onFail } = latest.current
    if (blob === null) onFail('the video came out empty: nothing was recorded.')
    else downloadBlob(blob, fileName(current.recording.format.extension))
  }, [])

  useEffect(() => {
    loadRecorder().catch(() => {})
  }, [])

  /** Runs `then` with the recorder: at once when it has loaded, else once it does. */
  const withRecorder = useCallback((then: (record: typeof recordArena) => void) => {
    if (recorder !== undefined) {
      then(recorder.recordArena)
      return
    }
    loadRecorder().then(
      (module) => then(module.recordArena),
      () => latest.current.onFail('the recorder did not load: check the connection and try again.'),
    )
  }, [])

  const start = useCallback((round: boolean, record: typeof recordArena): boolean => {
    if (live.current !== null) return true
    const { canvas, text, onFail } = latest.current
    const handle = canvas.current
    const recording = handle === null ? null : record(handle, text)
    if (recording === null) {
      onFail('this browser cannot record the arena.')
      return false
    }
    live.current = { recording, round }
    setSince(performance.now())
    return true
  }, [])

  const toggle = useCallback(() => {
    if (live.current === null) withRecorder((record) => start(false, record))
    else void stop()
  }, [start, stop, withRecorder])

  const exportRound = useCallback(() => {
    if (live.current !== null) return
    const { client } = latest.current
    const { status } = client.store.getState()
    if (status !== 'paused' && status !== 'playing' && status !== 'ended') return
    withRecorder((record) => {
      client.pause()
      client.seek(0)
      void atStart(client.store).then(() => {
        if (start(true, record)) client.play()
      })
    })
  }, [start, withRecorder])

  // The end, as the battle reaches it: of the round for an export, of the match for any.
  useEffect(
    () =>
      client.store.subscribe((state, last) => {
        const current = live.current
        if (current === null || state.status !== 'ended' || last.status === 'ended') return
        const over = state.match !== null && state.match.rounds.length >= state.match.of
        if (!current.round && !over) return
        clearTimeout(tail.current)
        tail.current = setTimeout(() => void stop(), TAIL_MS)
      }),
    [client, stop],
  )

  useEffect(() => () => void stop(), [stop])

  return { since, toggle, exportRound }
}

/** Resolves once the battle stands paused at cycle 0: the seek back has drawn. */
function atStart(store: ArenaVideoOptions['client']['store']): Promise<void> {
  const ready = () => {
    const { status, cycle } = store.getState()
    return status === 'paused' && cycle === 0
  }
  if (ready()) return Promise.resolve()
  return new Promise((resolve) => {
    const off = store.subscribe(() => {
      if (!ready()) return
      off()
      resolve()
    })
  })
}

/** How long a recording has run: `0:07`, `1:32`. */
export function recordingLabel(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
