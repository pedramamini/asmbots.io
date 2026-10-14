/**
 * Password hashing: scrypt (RFC 7914), the runtime's own (`node:crypto`, BoringSSL, with
 * `nodejs_compat` in wrangler.jsonc), N = 2^14, r = 8, p = 5: one of the parameter sets of equal
 * strength in the OWASP Password Storage Cheat Sheet. A 16-byte random salt a password, a 32-byte
 * key, the password as it is read everywhere (`normalizePassword`: NFKC, UTF-8).
 *
 * Why this one (apps/api/README.md, "Password hashing", has the measurements):
 * - Argon2id, OWASP's first choice, is not in the Workers runtime (`node:crypto` there has no
 *   `argon2`), and a WebAssembly build of it would be a new dependency to vet, slower than
 *   native code, and no smaller in memory. scrypt is OWASP's choice when Argon2id is not there.
 * - Of the OWASP scrypt sets, the larger memory ones do not fit: N = 2^17 needs 128 MiB, a whole
 *   isolate's memory, and N = 2^15 fails at the runtime's 32 MiB default bound. N = 2^14 needs
 *   16 MiB (128 * N * r) for each hash, and makes up the work with p = 5.
 * - Not PBKDF2: scrypt is memory-hard, so a guess on a GPU costs about what it costs here.
 *
 * A hash is a PHC string, `$scrypt$ln=14,r=8,p=5$<salt>$<key>` (unpadded base64): it says how it
 * was made, so a later cost can sit beside this one, and `needsRehash` moves a password to the
 * cost of the day the next time it signs in.
 */
import { scrypt } from 'node:crypto'
import { fromBase64, normalizePassword, toBase64 } from '@asmbots/protocol'

/** The cost of the day: `ln` is log2 N. */
const LN = 14
const R = 8
const P = 5
const SALT_BYTES = 16
const KEY_BYTES = 32

/** The most memory a stored hash may ask for (128 * N * r), and the most work (N * r * p). */
const MAX_MEMORY = 32 * 1024 * 1024
const MAX_WORK = 2 * 2 ** LN * R * P

interface Cost {
  ln: number
  r: number
  p: number
}

/** The bytes of a password as they are hashed. */
function passwordBytes(password: string): Uint8Array {
  return new TextEncoder().encode(normalizePassword(password))
}

/** Base64 without its padding, as a PHC string has it. */
const unpadded = (bytes: Uint8Array) => toBase64(bytes).replace(/=+$/, '')

function derive(password: string, salt: Uint8Array, { ln, r, p }: Cost, bytes: number) {
  const N = 2 ** ln
  // The runtime refuses past `maxmem`: room for one block of N * r and its working copy.
  const maxmem = 2 * 128 * N * r
  return new Promise<Uint8Array>((resolve, reject) => {
    scrypt(passwordBytes(password), salt, bytes, { N, r, p, maxmem }, (err, key) => {
      if (err) reject(err)
      else resolve(new Uint8Array(key))
    })
  })
}

/** `password`'s hash, with a salt of its own. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const key = await derive(password, salt, { ln: LN, r: R, p: P }, KEY_BYTES)
  return `$scrypt$ln=${LN},r=${R},p=${P}$${unpadded(salt)}$${unpadded(key)}`
}

interface Parsed extends Cost {
  salt: Uint8Array
  key: Uint8Array
}

const PHC =
  /^\$scrypt\$ln=(\d{1,2}),r=(\d{1,2}),p=(\d{1,2})\$([A-Za-z0-9+/]{16,})\$([A-Za-z0-9+/]{16,})$/

/**
 * A stored hash, or null for one this code did not make, or one that asks for more memory or work
 * than ours does twice over: a row is never a way to stall or starve the Worker.
 */
function parseHash(stored: string): Parsed | null {
  const match = PHC.exec(stored)
  if (match === null) return null
  const [ln, r, p] = [match[1], match[2], match[3]].map(Number) as [number, number, number]
  if (ln < 10 || r < 1 || p < 1) return null
  if (128 * 2 ** ln * r > MAX_MEMORY || 2 ** ln * r * p > MAX_WORK) return null
  try {
    const salt = fromBase64(match[4] ?? '')
    const key = fromBase64(match[5] ?? '')
    // Ours have 16 bytes of salt; 8 is the floor for any (RFC 7914's own test vectors have 14).
    if (salt.length < 8 || key.length < KEY_BYTES) return null
    return { ln, r, p, salt, key }
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
  const key = await derive(password, parsed.salt, parsed, parsed.key.length)
  return sameBytes(key, parsed.key)
}

/** Whether `stored` was made at another cost than today's: hash the password again when it signs in. */
export function needsRehash(stored: string): boolean {
  const parsed = parseHash(stored)
  return parsed === null || parsed.ln !== LN || parsed.r !== R || parsed.p !== P
}

/**
 * A hash at today's cost that is nobody's. A sign-in for a username with no password checks the
 * password against it, so the answer takes as long as it does for an account that is there, and
 * the time does not say which usernames exist.
 */
const NOBODY = `$scrypt$ln=${LN},r=${R},p=${P}$${unpadded(new Uint8Array(SALT_BYTES))}$${unpadded(new Uint8Array(KEY_BYTES))}`

/** `verifyPassword` for no account: the same work, always false. */
export async function verifyNobody(password: string): Promise<false> {
  await verifyPassword(password, NOBODY)
  return false
}
