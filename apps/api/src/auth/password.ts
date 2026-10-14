/**
 * Password hashing: PBKDF2-HMAC-SHA256 through Web Crypto, 600,000 iterations (OWASP's number for
 * it), a 16-byte random salt a password, a 32-byte key. No Node built-ins, and no memory-hard
 * function in script: a Worker has 128 MB for every request it serves at once.
 *
 * Cloudflare's runtime refuses a PBKDF2 call of more than 100,000 iterations (`workerd` on a dev
 * machine does not, so a test would not catch it). The 600,000 are six calls of 100,000 in a
 * chain: the password keys each one, and each one's key is the next one's salt. A guess costs all
 * six in order.
 *
 * A hash is `pbkdf2-sha256$<rounds>x<iterations>$<salt>$<key>`, the last two in base64: it says
 * how it was made, so a later cost can sit beside this one, and `needsRehash` moves a password to
 * the cost of the day the next time it signs in.
 */
import { fromBase64, toBase64 } from '@asmbots/protocol'

const SCHEME = 'pbkdf2-sha256'
/** The most iterations one call takes in production. */
const ITERATIONS = 100_000
const ROUNDS = 6
const SALT_BYTES = 16
const KEY_BITS = 256
/** The most work a stored hash may ask for: a row is never a way to stall the Worker. */
const MAX_TOTAL = 5_000_000

/** A password as it is hashed: one Unicode form (NFKC), so each keyboard types the same bytes. */
function passwordBytes(password: string): Uint8Array {
  return new TextEncoder().encode(password.normalize('NFKC'))
}

async function derive(
  password: string,
  salt: Uint8Array,
  rounds: number,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', passwordBytes(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  let out = salt
  for (let round = 0; round < rounds; round += 1) {
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: out, iterations },
      key,
      KEY_BITS,
    )
    out = new Uint8Array(bits)
  }
  return out
}

/** `password`'s hash, with a salt of its own. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key = await derive(password, salt, ROUNDS, ITERATIONS)
  return `${SCHEME}$${ROUNDS}x${ITERATIONS}$${toBase64(salt)}$${toBase64(key)}`
}

interface Parsed {
  rounds: number
  iterations: number
  salt: Uint8Array
  key: Uint8Array
}

function parseHash(stored: string): Parsed | null {
  const [scheme, cost, salt, key, ...rest] = stored.split('$')
  const match = cost?.match(/^(\d{1,3})x(\d{1,7})$/)
  if (scheme !== SCHEME || !match || !salt || !key || rest.length > 0) return null
  const rounds = Number(match[1])
  const iterations = Number(match[2])
  if (rounds < 1 || iterations < 1 || iterations > ITERATIONS) return null
  if (rounds * iterations > MAX_TOTAL) return null
  try {
    return { rounds, iterations, salt: fromBase64(salt), key: fromBase64(key) }
  } catch {
    return null
  }
}

/** Whether `a` and `b` are the same bytes, in time that does not say where they differ. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

/** Whether `password` is the one `stored` is the hash of. A hash that does not parse is nobody's. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored)
  if (parsed === null) return false
  const key = await derive(password, parsed.salt, parsed.rounds, parsed.iterations)
  return sameBytes(key, parsed.key)
}

/** Whether `stored` was made at another cost than today's: hash the password again when it signs in. */
export function needsRehash(stored: string): boolean {
  const parsed = parseHash(stored)
  return parsed === null || parsed.rounds !== ROUNDS || parsed.iterations !== ITERATIONS
}

/**
 * A hash at today's cost that is nobody's. A sign-in for a username with no password checks the
 * password against it, so the answer takes as long as it does for an account that is there, and
 * the time does not say which usernames exist.
 */
const NOBODY = `${SCHEME}$${ROUNDS}x${ITERATIONS}$${toBase64(new Uint8Array(SALT_BYTES))}$${toBase64(new Uint8Array(KEY_BITS / 8))}`

/** `verifyPassword` for no account: the same work, always false. */
export async function verifyNobody(password: string): Promise<false> {
  await verifyPassword(password, NOBODY)
  return false
}
