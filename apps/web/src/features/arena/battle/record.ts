/**
 * The arena's video recorder (`video.ts`): a chunk of its own with the screenshot's painter, which
 * `useArenaVideo` loads as the battle mounts, so the arena's cold chunks do not take it.
 */
import type { ArenaCanvasHandle } from '../ArenaCanvas'
import { paintShot, readPalette, shotLayout } from './screenshot'
import type { ScreenshotText } from './shot-text'
import { type ArenaRecording, MAX_WIDTH, videoFormat } from './video'

/** The frames a second the video takes at most: one per display frame. */
const FPS = 60
/** Enough for the core's fine grain to stay sharp. */
const BITRATE = 8_000_000

/**
 * Records the arena of `handle` from its next frame on, `text()` on each frame. The video's size
 * is set now, from the arena's: a resize later fits the arena into it. Null where the browser
 * cannot record, or the arena has no canvas yet.
 */
export function recordArena(
  handle: ArenaCanvasHandle,
  text: () => ScreenshotText,
): ArenaRecording | null {
  const format = videoFormat()
  const source = handle.canvas
  if (format === null || source === null || handle.renderer === null) return null
  const frame = document.createElement('canvas')
  if (typeof frame.captureStream !== 'function') return null
  const probe = frame.getContext('2d')
  if (probe === null) return null
  const layout = shotLayout(probe, source, text().bots, { maxWidth: MAX_WIDTH, even: true })
  frame.width = layout.pixelWidth
  frame.height = layout.pixelHeight
  // A new size resets the context.
  const ctx = frame.getContext('2d') as CanvasRenderingContext2D
  const palette = readPalette()
  const stream = frame.captureStream(FPS)
  const release = () => {
    for (const track of stream.getTracks()) track.stop()
  }
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: BITRATE })
  } catch {
    release()
    return null
  }
  const chunks: Blob[] = []
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  })
  const off = handle.onDraw((canvas, overlay) =>
    paintShot(ctx, layout, canvas, overlay, text(), palette),
  )
  // A chunk a second: a long battle's video is not one buffer held to the end.
  recorder.start(1000)
  return {
    format,
    stop: () =>
      new Promise((resolve) => {
        off()
        const done = () => {
          release()
          resolve(chunks.length === 0 ? null : new Blob(chunks, { type: format.type }))
        }
        if (recorder.state === 'inactive') {
          done()
          return
        }
        recorder.addEventListener('stop', done, { once: true })
        recorder.stop()
      }),
  }
}
