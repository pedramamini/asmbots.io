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
 * - Wrong passwords are counted by IP and by username (`rate-limit.ts`), accounts made by IP.
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
  checkBudget,
  clientIp,
  LOGIN_IP_BUDGET,
  LOGIN_NAME_BUDGET,
  RECOVER_ACCOUNT_BUDGET,
  spendBudget,
} from '../rate-limit'
import { meBody } from '../routes/me'
import { hashPassword, needsRehash, verifyNobody, verifyPassword } from './password'
import {
  authConfigured,
  dropSession,
  endAllSessions,
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

/** Signs `userId` in: a new session, in place of any the browser had. */
async function signInAs(c: Context<AppEnv>, userId: string): Promise<void> {
  const old = c.get('session')
  if (old) await dropSession(c.env.KV, old.userId, old.id)
  await startSession(c, userId)
}

/** 429 for `wait` seconds more. */
function tooMany(c: Context<AppEnv>, wait: number, what: string): Response {
  c.header('Retry-After', String(wait))
  return errorResponse(c, 'rate_limited', `${what}: try again in ${wait} s`)
}

/** A mailed link's token: the secret that goes in the link, and the hash D1 keeps. */
async function newLinkToken(): Promise<{ secret: string; hash: string }> {
  const secret = randomHex(32)
  return { secret, hash: await hashToken(secret) }
}

/** Mails `email` the link that verifies it for `user`, after the response. */
export function mailVerifyLink(
  c: Context<AppEnv>,
  send: Mailer,
  user: { id: string; handle: string },
  email: string,
): void {
  const origin = linkOrigin(c)
  const work = async () => {
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
 * email and has not been mailed its hour's links, gets a new one.
 */
async function recover(
  c: Context<AppEnv>,
  send: Mailer,
  login: string,
  origin: string,
): Promise<void> {
  const account = await getRecoverable(c.env.DB, login)
  if (account === null) return
  const client = `u:${account.userId}`
  if ((await checkBudget(c.env.KV, RECOVER_ACCOUNT_BUDGET, client)) > 0) return
  await spendBudget(c.env.KV, RECOVER_ACCOUNT_BUDGET, client)
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
    const row = await createPasswordUser(c.env.DB, {
      id: crypto.randomUUID(),
      handle: username,
      passwordHash: await hashPassword(asked.password),
      email,
    })
    if (row === 'taken') return errorResponse(c, 'conflict', `${username} is taken`)
    await signInAs(c, row.id)
    if (email !== null && send !== null) mailVerifyLink(c, send, row, email)
    return c.json(meBody(row), 201)
  })
  .post('/login', limitBody(AUTH_BODY), async (c) => {
    if (!passwordAuth(c).login) return errorResponse(c, 'unavailable', OFF)
    const asked = parse(LogIn, await jsonBody(c), 'the request')
    const username = asked.username.trim().toLowerCase()
    const ip = `ip:${clientIp(c.req.raw)}`
    const name = HANDLE_SHAPED.test(username) ? `name:${username}` : null
    const wait = Math.max(
      await checkBudget(c.env.KV, LOGIN_IP_BUDGET, ip),
      name === null ? 0 : await checkBudget(c.env.KV, LOGIN_NAME_BUDGET, name),
    )
    if (wait > 0) return tooMany(c, wait, 'too many wrong passwords')
    const found = name === null ? null : await getPasswordLogin(c.env.DB, username)
    const right =
      found === null
        ? await verifyNobody(asked.password)
        : await verifyPassword(asked.password, found.passwordHash)
    if (found === null || !right) {
      await Promise.all([
        spendBudget(c.env.KV, LOGIN_IP_BUDGET, ip),
        name === null ? null : spendBudget(c.env.KV, LOGIN_NAME_BUDGET, name),
      ])
      return errorResponse(c, 'unauthorized', 'wrong username or password')
    }
    if (needsRehash(found.passwordHash)) {
      const again = hashPassword(asked.password).then((hash) =>
        rehashPassword(c.env.DB, found.user.id, hash),
      )
      afterResponse(c, 'password rehash', again)
    }
    await signInAs(c, found.user.id)
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
    const changed =
      used !== null &&
      (await setPassword(c.env.DB, used.userId, passwordHash, 'password.reset', used.email))
    if (used === null || !changed) return errorResponse(c, 'bad_request', BAD_LINK)
    await endAllSessions(c.env.KV, used.userId)
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
