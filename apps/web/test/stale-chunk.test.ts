import { describe, expect, it } from 'bun:test'
import { useDom } from '../../../packages/ui/test/dom'
import {
  armStaleChunkReload,
  STALE_CHUNK_KEY,
  STALE_CHUNK_WINDOW_MS,
  staleChunkBootScript,
} from '../src/app/stale-chunk'

useDom()

function harness(start = 100_000) {
  const store = new Map<string, string>()
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  }
  let time = start
  let reloads = 0
  const off = armStaleChunkReload({ storage, reload: () => reloads++, now: () => time })
  const fail = () => window.dispatchEvent(new window.Event('vite:preloadError'))
  return {
    store,
    fail,
    off,
    reloads: () => reloads,
    advance: (ms: number) => {
      time += ms
    },
  }
}

describe('armStaleChunkReload', () => {
  it('reloads once on a missing chunk', () => {
    const h = harness()
    h.fail()
    expect(h.reloads()).toBe(1)
    expect(h.store.get(STALE_CHUNK_KEY)).toBe('100000')
    h.off()
  })

  it('lets a second failure inside the window reach the error page', () => {
    const h = harness()
    h.fail()
    h.advance(STALE_CHUNK_WINDOW_MS - 1)
    h.fail()
    expect(h.reloads()).toBe(1)
    h.off()
  })

  it('reloads again for a later deploy', () => {
    const h = harness()
    h.fail()
    h.advance(STALE_CHUNK_WINDOW_MS)
    h.fail()
    expect(h.reloads()).toBe(2)
    h.off()
  })

  it('stops listening when unsubscribed', () => {
    const h = harness()
    h.off()
    h.fail()
    expect(h.reloads()).toBe(0)
  })
})

describe('staleChunkBootScript', () => {
  it('arms on its own, with the constants it carries', () => {
    const script = staleChunkBootScript()
    expect(script).not.toContain('STALE_CHUNK_')
    // Run as index.html runs it; its unsubscribe comes back, so the listener goes with the test.
    const off = new Function(`return ${script}`)() as () => void
    expect(typeof off).toBe('function')
    off()
  })
})
