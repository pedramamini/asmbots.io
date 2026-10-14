/**
 * Password sign-in (`/api/auth/signup`, `/login`, `/recover`, `/reset`, `/verify-email`, and the
 * account's `/api/me/credentials`, `/password`, `/email`): an account with a username and a
 * password, beside GitHub sign-in. The username is the account's handle. An email is optional: an
 * account with none, or with one it has not verified, cannot recover a forgotten password. Apart
 * from `api.ts`: Rollup places a module whole, and only the sign-in pages and the settings page
 * read this one.
 */
import * as z from 'zod/mini'

/** A password's length, in characters. */
export const MIN_PASSWORD = 10
export const MAX_PASSWORD = 128

/** An email address's length at most (RFC 5321). */
export const MAX_EMAIL = 254

/** The passwords of `MIN_PASSWORD` characters or more that every guessing list starts with. */
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  '0123456789',
  '1234567890',
  '12345678910',
  '123456789a',
  '1q2w3e4r5t',
  '1q2w3e4r5t6y',
  'abcdefghij',
  'administrator',
  'asmbots.io',
  'iloveyou123',
  'letmein12345',
  'password123',
  'password1234',
  'passwordpassword',
  'qwerty12345',
  'qwertyuiop',
  'qwertyuiop123',
  'trustno1trustno1',
])

/**
 * What is wrong with `password` as a new password for the account named `username`, or null when
 * nothing is. Length is what counts (NIST SP 800-63B): no rule asks for a digit or a symbol.
 */
export function passwordProblem(password: string, username = ''): string | null {
  if (password.length < MIN_PASSWORD) return `a password is at least ${MIN_PASSWORD} characters`
  if (password.length > MAX_PASSWORD) return `a password is at most ${MAX_PASSWORD} characters`
  if (/^(.)\1*$/su.test(password)) return 'a password is more than one character repeated'
  const lower = password.toLowerCase()
  if (username !== '' && lower === username.toLowerCase()) return 'a password is not the username'
  if (COMMON_PASSWORDS.has(lower)) return 'that password is too common: pick another'
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
