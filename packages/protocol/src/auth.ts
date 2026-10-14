/**
 * Password sign-in (`/api/auth/signup`, `/login`, `/recover`, `/reset`, `/verify-email`, and the
 * account's `/api/me/credentials`, `/password`, `/email`): an account with a username and a
 * password, beside GitHub sign-in. The username is the account's handle. An email is optional: an
 * account with none, or with one it has not verified, cannot recover a forgotten password. Apart
 * from `api.ts`: Rollup places a module whole, and only the sign-in pages and the settings page
 * read this one.
 */
import * as z from 'zod/mini'

/**
 * A password's length, in Unicode code points of its NFKC form (`normalizePassword`): what the
 * server hashes, so what a rule counts. 15 at least: an account here has a password and no second
 * factor, and NIST SP 800-63B-4 (§3.1.1.2) asks 15 of a password that is the only factor.
 */
export const MIN_PASSWORD = 15
export const MAX_PASSWORD = 128

/** An email address's length at most (RFC 5321). */
export const MAX_EMAIL = 254

/**
 * A password as the server hashes it and every rule reads it: NFKC (NIST SP 800-63B-4 asks for
 * NFKC or NFKD). Two keyboards that type the same word give the same bytes, and a compatibility
 * character counts as what it stands for: a fullwidth `ａ` is an `a`, a ligature `ﬀ` is two
 * letters, an `e` and a combining accent are one `é`.
 */
export function normalizePassword(password: string): string {
  return password.normalize('NFKC')
}

/** The passwords of `MIN_PASSWORD` code points or more that every guessing list has. */
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  'administrator1234',
  'correcthorsebatterystaple',
  'iloveyouiloveyou',
  'letmeinletmeinletmein',
  'passwordpassword1',
  'passwordpassword123',
  'trustno1trustno1',
  'welcometoasmbots',
])

/** Runs a keyboard or a count goes in: a password that is a piece of one is no password. */
const RUNS = [
  '01234567890123456789012345678901234567890',
  '98765432109876543210987654321098765432109',
  'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcbazyxwvutsrqponmlkjihgfedcba',
  'qwertyuiopasdfghjklzxcvbnm',
  '1q2w3e4r5t6y7u8i9o0p',
  'qazwsxedcrfvtgbyhnujmikolp',
]

/** What a guesser would try first for `password` (lowercase NFKC): no spaces, no separators. */
const bare = (lower: string) => lower.replace(/[\s._-]+/gu, '')

/**
 * What is wrong with `password` as a new password for an account that `names` name (its username,
 * its email), or null when nothing is. A name is public, so a password that starts or ends with
 * one needs `MIN_PASSWORD` code points of its own besides it. Every rule reads the password as it is hashed
 * (`normalizePassword`), so a compatibility character, a combining mark, or a character outside
 * the BMP counts as one code point of what the server keeps. Length is what counts (NIST SP
 * 800-63B-4): no rule asks for a digit or a symbol; the rest refuse what a guesser tries first.
 */
export function passwordProblem(password: string, names: readonly string[] = []): string | null {
  const kept = normalizePassword(password)
  const length = [...kept].length
  if (length < MIN_PASSWORD) return `a password is at least ${MIN_PASSWORD} characters`
  if (length > MAX_PASSWORD) return `a password is at most ${MAX_PASSWORD} characters`
  if (/^(.+?)\1+$/su.test(kept)) return 'a password is more than one piece repeated'
  const lower = kept.toLowerCase()
  const plain = bare(lower)
  for (const name of names) {
    const own = bare(normalizePassword(name).toLowerCase())
    if (own !== '' && (plain === own || plain.startsWith(own) || plain.endsWith(own))) {
      if (plain.length - own.length < MIN_PASSWORD) {
        return 'a password is more than your username or email'
      }
    }
  }
  if (COMMON_PASSWORDS.has(plain) || RUNS.some((run) => run.includes(plain))) {
    return 'that password is too common: pick another'
  }
  return null
}

/** One `@`, a dot in the domain, and nothing a mail header reads as more than an address. */
const EMAIL = /^[^\s@<>"(),;:\\]+@[^\s@<>"(),;:\\.]+(?:\.[^\s@<>"(),;:\\.]+)+$/

/** `email` as the API keeps and compares it: trimmed, lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** What is wrong with `email` (normalized) as an address, or null when nothing is. */
export function emailProblem(email: string): string | null {
  if (email.length > MAX_EMAIL) return `an email is at most ${MAX_EMAIL} characters`
  if (!EMAIL.test(email)) return 'that is not an email address'
  return null
}

/** A mailed link's token: 64 lowercase hex digits (32 random bytes). */
export const AUTH_TOKEN = /^[0-9a-f]{64}$/

/** Longer than any password or address the API takes, so its own message says what is wrong. */
const Typed = z.string().check(z.maxLength(1024))

/**
 * `POST /api/auth/signup`: a new account. `username` becomes its handle (`handleProblem`),
 * `password` passes `passwordProblem`. `email` is optional, and only when `AuthMethods.mail`.
 */
export const SignUp = z.object({ username: Typed, password: Typed, email: z.optional(Typed) })
export type SignUp = z.output<typeof SignUp>

/** `POST /api/auth/login` */
export const LogIn = z.object({ username: Typed, password: Typed })
export type LogIn = z.output<typeof LogIn>

/** `POST /api/auth/recover`: the account's username, or its verified email. */
export const RecoverAccount = z.object({ login: Typed })
export type RecoverAccount = z.output<typeof RecoverAccount>

/** `POST /api/auth/reset`: the token of a mailed reset link, and the new password. */
export const ResetPassword = z.object({ token: Typed, password: Typed })
export type ResetPassword = z.output<typeof ResetPassword>

/** `POST /api/auth/verify-email`: the token of a mailed verification link. */
export const VerifyEmail = z.object({ token: Typed })
export type VerifyEmail = z.output<typeof VerifyEmail>

/** `POST /api/me/password`: the password now, and the new one. */
export const ChangePassword = z.object({ current: Typed, password: Typed })
export type ChangePassword = z.output<typeof ChangePassword>

/** `POST /api/me/email`: a new address, or null for none, and the password now. */
export const ChangeEmail = z.object({ email: z.nullable(Typed), password: Typed })
export type ChangeEmail = z.output<typeof ChangeEmail>

/**
 * `GET /api/auth/methods`: the ways to sign in that are on. `password`: signing in with one;
 * `signup`: making a new account with one; `mail`: the server sends mail, so an account may have
 * an email and recover with it.
 */
export const AuthMethods = z.object({
  github: z.boolean(),
  password: z.boolean(),
  signup: z.boolean(),
  mail: z.boolean(),
})
export type AuthMethods = z.output<typeof AuthMethods>

/**
 * `GET /api/me/credentials` and `POST /api/me/email`: how the signed-in account signs in. `email`
 * is a password account's own (never GitHub's); only a verified one recovers the account.
 */
export const Credentials = z.object({
  method: z.enum(['github', 'password']),
  email: z.nullable(z.string()),
  emailVerified: z.boolean(),
  mail: z.boolean(),
})
export type Credentials = z.output<typeof Credentials>
