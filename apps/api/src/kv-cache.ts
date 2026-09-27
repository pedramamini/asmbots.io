/**
 * Reads a crowd repeats and a few minutes' delay does not hurt (the stats, the leaderboard): kept in
 * KV with when they were read, so every colo shares one copy and the database answers once each
 * `ttlSeconds`, however many ask. No request skips the copy.
 */

/** A value as KV keeps it, with when it was read (ms since the epoch). */
interface Kept<T> {
  readonly at: number
  readonly value: T
}

/**
 * The value under `key` while it is younger than `ttlSeconds` as of `now` (ms), else `make`'s, kept
 * for the next read. KV drops the key after twice the TTL, and never under its 60 s least.
 */
export async function kvCached<T>(
  kv: KVNamespace,
  key: string,
  ttlSeconds: number,
  now: number,
  make: () => Promise<T>,
): Promise<T> {
  const kept = await kv.get<Kept<T>>(key, 'json')
  if (kept !== null && now >= kept.at && now - kept.at < ttlSeconds * 1000) return kept.value
  const value = await make()
  await kv.put(key, JSON.stringify({ at: now, value } satisfies Kept<T>), {
    expirationTtl: Math.max(60, ttlSeconds * 2),
  })
  return value
}
