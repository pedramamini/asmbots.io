/** Session key: when the page last reloaded for a missing chunk (epoch ms). */
export const STALE_CHUNK_KEY = 'asmbots:stale-chunk-reload'

/** A second failure within this window is a real fault, not a deploy: show it. */
export const STALE_CHUNK_WINDOW_MS = 10_000

interface StaleChunkDeps {
  key?: string
  windowMs?: number
  storage?: Pick<Storage, 'getItem' | 'setItem'> | undefined
  reload?: () => void
  now?: () => number
}

/**
 * The inline script of index.html that arms `armStaleChunkReload` before the bundle runs, so the
 * shell carries none of it. Self-contained: the function is serialized with `toString()`, and the
 * constants go in as its argument.
 */
export function staleChunkBootScript(): string {
  const config = { key: STALE_CHUNK_KEY, windowMs: STALE_CHUNK_WINDOW_MS }
  return `(${armStaleChunkReload.toString()})(${JSON.stringify(config)})`
}

/**
 * A deploy replaces every hashed chunk. A tab opened before it still asks for the old names, and
 * the lazy import fails ("Failed to fetch dynamically imported module"). Vite reports each such
 * failure as `vite:preloadError`; this reloads the page once so the tab picks up the new
 * `index.html` (the error still throws; the reload replaces the page). A second failure inside
 * `STALE_CHUNK_WINDOW_MS` passes through to the error page, so a chunk that is truly gone cannot
 * loop the page. Returns the unsubscribe.
 */
export function armStaleChunkReload({
  key = STALE_CHUNK_KEY,
  windowMs = STALE_CHUNK_WINDOW_MS,
  storage = globalThis.sessionStorage,
  reload = () => location.reload(),
  now = Date.now,
}: StaleChunkDeps = {}): () => void {
  const onError = () => {
    const last = Number(storage?.getItem(key) ?? 0)
    if (now() - last < windowMs) return
    storage?.setItem(key, String(now()))
    reload()
  }
  window.addEventListener('vite:preloadError', onError)
  return () => window.removeEventListener('vite:preloadError', onError)
}
