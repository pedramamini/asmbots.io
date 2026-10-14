/**
 * Password sign-in, mounted at `/api/auth` beside GitHub's (`github.ts`): an account with a
 * username (its handle) and a password, and an email only when its user gives one.
 * - `GET /methods`: the ways to sign in that are on (`AuthMethods`).
 * - `POST /signup` `{ username, password, email? }`: a new account, signed in → 201 `Me`. With an
 *   email, a verification link goes to it. 409 when the username is someone's.
 * - `POST /login` `{ username, password }` → `Me`. 401 `wrong username or password` whatever is
 *   wrong: no such username, a GitHub account's handle, a wrong password.
 * - `POST /recover` `{ login }`: a username or an email. Always 202, whoever or whatever `login`
 *   names; a reset link goes to the account's verified email when it has one.
 * - `POST /reset` `{ token, password }`: the new password, with a reset link's token → 204, and
 *   every session of the account ends.
 * - `POST /verify-email` `{ token }`: marks the address the link went to verified → 204.
 *
 * What keeps this from being a way into someone's account:
 * - A password account and a GitHub account never join. GitHub sign-in finds its user by
 *   `github_id` alone, password sign-in by a handle that has a `password_credentials` row, and no
 *   route here reads `users.email` (GitHub's). A username or an email the same as a GitHub
 *   account's links nothing: the username is 409 at sign-up, the email is just another address.
 * - Only a verified email recovers an account. An address proves nothing until its link is
 *   opened, so an unverified one gets no reset link, and one address is verified on one account.
 * - No answer says whether an account or an address exists, but sign-up's 409 for a username
 *   (handles are public at `/u/:handle`). A sign-in for no account checks a password all the
 *   same (`verifyNobody`), and `/recover` does its work after it has answered.
 * - A mailed token is 32 random bytes, kept as its SHA-256, good once and for a set time, and
 *   only while the account's email is the address it went to. Its link opens `SITE_URL`.
 * - Wrong passwords are counted by address and by username, accounts made by address, each in
 *   one D1 statement that adds and reads back (`takeBudget`), so a burst cannot outrun a count.
 *   A browser that has signed in to an account before (`KNOWN_COOKIE`) is not held by the count
 *   of its username: whoever runs that out locks out other guessers, not the account's owner.
 * - A new password ends every session of the account, for sure: a session carries the
 *   `password_set_at` it signed in with, and one from before the change is no session.
 */
import {
  AUTH_TOKEN,
  type AuthMethods,
  emailProblem,
  handleProblem,
  LogIn,
  normalizeEmail,
  parse,
  passwordProblem,
  RecoverAccount,
  ResetPassword,
  SignUp,
  VerifyEmail,
} from '@asmbots/protocol'
import { type Context, Hono } from 'hono'
import { getSignedCookie, setSignedCookie } from 'hono/cookie'
import { jsonBody, limitBody } from '../body'
import {
  createPasswordUser,
  getPasswordLogin,
  getRecoverable,
  peekAuthToken,
  putAuthToken,
  rehashPassword,
  setPassword,
  takeAuthToken,
  verifyEmail,
} from '../db/credentials'
import { isHandleTaken } from '../db/queries'
import type { AppEnv } from '../env'
import { afterResponse, linkOrigin, type Mailer, mailer } from '../mail/mail'
import {
  passwordChangedMail,
  RESET_TTL_SECONDS,
  resetMail,
  VERIFY_TTL_SECONDS,
  verifyMail,
} from '../mail/messages'
import { errorResponse } from '../middleware'
import {
  type Budget,
  clientNet,
  giveBackBudget,
  LOGIN_DEVICE_BUDGET,
  LOGIN_IP_BUDGET,
  LOGIN_NAME_BUDGET,
  MAIL_TO_BUDGET,
  RECOVER_ACCOUNT_BUDGET,
  SIGNUP_BUDGET,
  SIGNUP_DAY_BUDGET,
  takeBudget,
} from '../rate-limit'
import { adminHandles } from '../routes/admin'
import { meBody } from '../routes/me'
import { hashPassword, needsRehash, verifyNobody, verifyPassword } from './password'
import {
  authConfigured,
  cookieOptions,
  dropSession,
  endPasswordSessions,
  endSession,
  passwordAuth,
  randomHex,
  startSession,
} from './session'
import { hashToken } from './token'

/** A sign-in body: a username, a password, an email, and JSON around them. */
export const AUTH_BODY = 4096

/** What a handle can look like, a GitHub account's too: no other string names an account. */
const HANDLE_SHAPED = /^[a-z0-9-]{1,39}$/

/** One answer for every link that does not work: wrong, used, old, or for an address since changed. */
const BAD_LINK = 'the link is not valid or has expired: ask for a new one'

const OFF = 'password sign-in is off'

/**
 * A signed cookie that says this browser has signed in to an account with its password before:
 * `<user id>.<a random id of the browser>`, kept a year, sent to `/api/auth` only. It signs
 * nobody in. It moves a sign-in for that account from the username's count of wrong passwords,
 * which anyone can run out, to a count of the browser's own (OWASP's device cookie).
 */
const KNOWN_COOKIE = 'known_browser'
const KNOWN_PATH = '/api/auth'
const KNOWN_TTL_SECONDS = 365 * 24 * 60 * 60

/** The random id of this browser, when it has signed in to `userId` with a password before. */
async function knownBrowser(c: Context<AppEnv>, userId: string): Promise<string | null> {
  const secret = c.env.SESSION_SECRET
  if (!secret) return null
  const value = await getSignedCookie(c, secret, KNOWN_COOKIE)
  if (!value) return null
  const at = value.lastIndexOf('.')
  return value.slice(0, at) === userId ? value.slice(at + 1) : null
}

/** Marks this browser as one that has signed in to `userId`, unless it is marked so already. */
async function rememberBrowser(c: Context<AppEnv>, userId: string): Promise<void> {
  const secret = c.env.SESSION_SECRET
  if (!secret || (await knownBrowser(c, userId)) !== null) return
  const value = `${userId}.${randomHex(16)}`
  await setSignedCookie(
    c,
    KNOWN_COOKIE,
    value,
    secret,
    cookieOptions(KNOWN_TTL_SECONDS, KNOWN_PATH),
  )
}

/**
 * Signs `userId` in with its password, set at `setAt`: a new session, in place of any the browser
 * had, and the browser is one the account knows from now on.
 */
export async function signInAs(c: Context<AppEnv>, userId: string, setAt: string): Promise<void> {
  const old = c.get('session')
  if (old) await dropSession(c.env.KV, old.userId, old.id)
  await startSession(c, userId, setAt)
  await rememberBrowser(c, userId)
}

/** 429 for `wait` seconds more. */
export function tooMany(c: Context<AppEnv>, wait: number, what: string): Response {
  c.header('Retry-After', String(wait))
  return errorResponse(c, 'rate_limited', `${what}: try again in ${wait} s`)
}

/** A mailed link's token: the secret that goes in the link, and the hash D1 keeps. */
async function newLinkToken(): Promise<{ secret: string; hash: string }> {
  const secret = randomHex(32)
  return { secret, hash: await hashToken(secret) }
}

/**
 * Mails `email` the link that verifies it for `user`, after the response; not past the links one
 * address is mailed an hour (`MAIL_TO_BUDGET`), whoever names it.
 */
export function mailVerifyLink(
  c: Context<AppEnv>,
  send: Mailer,
  user: { id: string; handle: string },
  email: string,
): void {
  const origin = linkOrigin(c)
  const work = async () => {
    if ((await takeBudget(c.env.DB, MAIL_TO_BUDGET, `to:${email}`)) > 0) return
    const { secret, hash } = await newLinkToken()
    const seconds = VERIFY_TTL_SECONDS
    await putAuthToken(c.env.DB, { hash, userId: user.id, kind: 'verify_email', email, seconds })
    await send(verifyMail(email, origin, user.handle, secret))
  }
  afterResponse(c, 'verification mail', work())
}

/** Mails `email` that the account's password changed, after the response. */
export function mailPasswordChanged(
  c: Context<AppEnv>,
  send: Mailer,
  handle: string,
  email: string,
): void {
  afterResponse(c, 'password notice', send(passwordChangedMail(email, linkOrigin(c), handle)))
}

/**
 * `/recover`'s work, after it has answered: the account `login` names, when it has a verified
 * email and has not been mailed its half hour's links, gets a new one.
 */
async function recover(
  c: Context<AppEnv>,
  send: Mailer,
  login: string,
  origin: string,
): Promise<void> {
  const account = await getRecoverable(c.env.DB, login)
  if (account === null) return
  if ((await takeBudget(c.env.DB, RECOVER_ACCOUNT_BUDGET, `u:${account.userId}`)) > 0) return
  const { secret, hash } = await newLinkToken()
  await putAuthToken(c.env.DB, {
    hash,
    userId: account.userId,
    kind: 'reset_password',
    email: account.email,
    seconds: RESET_TTL_SECONDS,
  })
  await send(resetMail(account.email, origin, account.handle, secret))
}

export const local = new Hono<AppEnv>()
  .get('/methods', (c) => {
    const { login, signup } = passwordAuth(c)
    return c.json({
      github: authConfigured(c),
      password: login,
      signup,
      mail: mailer(c) !== null,
    } satisfies AuthMethods)
  })
  .post('/signup', limitBody(AUTH_BODY), async (c) => {
    const on = passwordAuth(c)
    if (!on.signup) {
      return errorResponse(c, 'unavailable', on.login ? 'new password accounts are closed' : OFF)
    }
    const asked = parse(SignUp, await jsonBody(c), 'the request')
    const username = asked.username.trim().toLowerCase()
    const typed = normalizeEmail(asked.email ?? '')
    const email = typed === '' ? null : typed
    const send = mailer(c)
    const problem =
      handleProblem(username) ??
      // An admin's handle is not one to take by signing up for it (`ADMIN_HANDLES`).
      (adminHandles(c.env.ADMIN_HANDLES).has(username) ? `${username} is reserved` : null) ??
      passwordProblem(asked.password, username) ??
      (email === null
        ? null
        : send === null
          ? 'this server sends no mail: leave the email out'
          : (emailProblem(email) ??
            (asked.password.toLowerCase() === email ? 'a password is not the email' : null)))
    if (problem !== null) return errorResponse(c, 'bad_request', problem)
    if (await isHandleTaken(c.env.DB, username)) {
      return errorResponse(c, 'conflict', `${username} is taken`)
    }
    // The address's accounts, a day's then an hour's, counted before the account is made.
    const ip = `ip:${clientNet(c.req.raw)}`
    const taken: Budget[] = []
    for (const budget of [SIGNUP_DAY_BUDGET, SIGNUP_BUDGET]) {
      const wait = await takeBudget(c.env.DB, budget, ip)
      if (wait === 0) {
        taken.push(budget)
        continue
      }
      await Promise.all(taken.map((b) => giveBackBudget(c.env.DB, b, ip)))
      return tooMany(c, wait, 'too many new accounts from this address')
    }
    const made = await createPasswordUser(c.env.DB, {
      id: crypto.randomUUID(),
      handle: username,
      passwordHash: await hashPassword(asked.password),
      email,
    })
    if (made === 'taken') {
      await Promise.all(taken.map((b) => giveBackBudget(c.env.DB, b, ip)))
      return errorResponse(c, 'conflict', `${username} is taken`)
    }
    await signInAs(c, made.user.id, made.passwordSetAt)
    if (email !== null && send !== null) mailVerifyLink(c, send, made.user, email)
    return c.json(meBody(made.user), 201)
  })
  .post('/login', limitBody(AUTH_BODY), async (c) => {
    if (!passwordAuth(c).login) return errorResponse(c, 'unavailable', OFF)
    const asked = parse(LogIn, await jsonBody(c), 'the request')
    const username = asked.username.trim().toLowerCase()
    const named = HANDLE_SHAPED.test(username)
    const found = named ? await getPasswordLogin(c.env.DB, username) : null
    // Each try is counted before the password is checked, and given back when it was right. The
    // address's first: past them, nothing else is counted or checked.
    const ip = `ip:${clientNet(c.req.raw)}`
    const tries: [Budget, string][] = [[LOGIN_IP_BUDGET, ip]]
    const stopped = await takeBudget(c.env.DB, LOGIN_IP_BUDGET, ip)
    if (stopped > 0) return tooMany(c, stopped, 'too many sign-ins from this address')
    // Then the username's, or this browser's own when the account knows it.
    const browser = found === null ? null : await knownBrowser(c, found.user.id)
    if (browser !== null) tries.push([LOGIN_DEVICE_BUDGET, `dev:${browser}`])
    else if (named) tries.push([LOGIN_NAME_BUDGET, `name:${username}`])
    const second = tries[1]
    const wait = second === undefined ? 0 : await takeBudget(c.env.DB, ...second)
    if (wait > 0) return tooMany(c, wait, 'too many wrong passwords')
    const right =
      found === null
        ? await verifyNobody(asked.password)
        : await verifyPassword(asked.password, found.passwordHash)
    if (found === null || !right) {
      return errorResponse(c, 'unauthorized', 'wrong username or password')
    }
    await Promise.all(tries.map(([budget, client]) => giveBackBudget(c.env.DB, budget, client)))
    if (needsRehash(found.passwordHash)) {
      const again = hashPassword(asked.password).then((hash) =>
        rehashPassword(c.env.DB, found.user.id, found.passwordHash, hash),
      )
      afterResponse(c, 'password rehash', again)
    }
    await signInAs(c, found.user.id, found.passwordSetAt)
    return c.json(meBody(found.user))
  })
  .post('/recover', limitBody(AUTH_BODY), async (c) => {
    if (!passwordAuth(c).login) return errorResponse(c, 'unavailable', OFF)
    const send = mailer(c)
    if (send === null) {
      return errorResponse(c, 'unavailable', 'this server sends no mail: no account recovers here')
    }
    const login = normalizeEmail(parse(RecoverAccount, await jsonBody(c), 'the request').login)
    afterResponse(c, 'account recovery', recover(c, send, login, linkOrigin(c)))
    return c.json({}, 202)
  })
  .post('/reset', limitBody(AUTH_BODY), async (c) => {
    if (!passwordAuth(c).login) return errorResponse(c, 'unavailable', OFF)
    const asked = parse(ResetPassword, await jsonBody(c), 'the request')
    const hash = AUTH_TOKEN.test(asked.token) ? await hashToken(asked.token) : null
    // Read first, so a password the API refuses leaves the link good for another.
    const link = hash === null ? null : await peekAuthToken(c.env.DB, hash, 'reset_password')
    if (hash === null || link === null) return errorResponse(c, 'bad_request', BAD_LINK)
    const problem = passwordProblem(asked.password, link.handle)
    if (problem !== null) return errorResponse(c, 'bad_request', problem)
    const passwordHash = await hashPassword(asked.password)
    const used = await takeAuthToken(c.env.DB, hash, 'reset_password')
    const setAt =
      used === null
        ? null
        : await setPassword(c.env.DB, used.userId, passwordHash, 'password.reset', used.email)
    if (used === null || setAt === null) return errorResponse(c, 'bad_request', BAD_LINK)
    await endPasswordSessions(c.env.KV, used.userId, setAt)
    if (c.get('session')?.userId === used.userId) await endSession(c)
    const send = mailer(c)
    if (send !== null) mailPasswordChanged(c, send, link.handle, used.email)
    return c.body(null, 204)
  })
  .post('/verify-email', limitBody(AUTH_BODY), async (c) => {
    const asked = parse(VerifyEmail, await jsonBody(c), 'the request')
    const used = AUTH_TOKEN.test(asked.token)
      ? await takeAuthToken(c.env.DB, await hashToken(asked.token), 'verify_email')
      : null
    if (used === null) return errorResponse(c, 'bad_request', BAD_LINK)
    const verified = await verifyEmail(c.env.DB, used.userId, used.email)
    if (verified === 'taken') {
      return errorResponse(c, 'conflict', 'that email is verified on another account')
    }
    if (!verified) return errorResponse(c, 'bad_request', BAD_LINK)
    return c.body(null, 204)
  })
