/**
 * How the signed-in account signs in, mounted at `/api/me` beside `me.ts`. Cookie sessions only
 * (`refuseToken`): an API token never reads or changes a password or an email.
 * - `GET /credentials` → `Credentials`: `github` or `password`, and a password account's email.
 * - `POST /password` `{ current, password }`: a new password → 204. Every session of the account
 *   ends, and this browser gets a new one.
 * - `POST /email` `{ email, password }`: a new address (null: none) → `Credentials`. It starts
 *   unverified, and a verification link goes to it; the old one, when verified, is told.
 * - `POST /email/verify`: mails the verification link again → 202.
 * A GitHub account has no password and no email of its own here: each write is 409 for one. Each
 * write asks for the password again, so a session someone else got hold of cannot move the
 * account's recovery to their own address; a wrong one is 403 (`PASSWORD_BUDGET` of them).
 */
import {
  ChangeEmail,
  ChangePassword,
  type Credentials,
  emailProblem,
  normalizeEmail,
  parse,
  passwordProblem,
} from '@asmbots/protocol'
import { type Context, Hono } from 'hono'
import { AUTH_BODY, mailPasswordChanged, mailVerifyLink, signInAs, tooMany } from '../auth/local'
import { hashPassword, verifyPassword } from '../auth/password'
import { endPasswordSessions, refuseToken, requireUser } from '../auth/session'
import { jsonBody, limitBody } from '../body'
import { type CredentialRow, getCredentials, setEmail, setPassword } from '../db/credentials'
import { getUserRow } from '../db/queries'
import type { AppEnv } from '../env'
import { afterResponse, linkOrigin, mailer } from '../mail/mail'
import { emailChangedMail } from '../mail/messages'
import { errorResponse } from '../middleware'
import { EMAIL_CHANGE_BUDGET, giveBackBudget, PASSWORD_BUDGET, takeBudget } from '../rate-limit'
import { gone } from './me'

const NO_PASSWORD = 'this account signs in with github: it has no password'

function credentialsBody(row: CredentialRow | null, mail: boolean): Credentials {
  return {
    method: row === null ? 'github' : 'password',
    email: row?.email ?? null,
    emailVerified: row !== null && row.email !== null && row.email_verified_at !== null,
    mail,
  }
}

/**
 * Checks `password` against the account's: null when it is right, else the answer, 403 for a
 * wrong one and 429 past `PASSWORD_BUDGET` of them. Each try is counted before the check, and
 * given back when it was right.
 */
async function wrongPassword(
  c: Context<AppEnv>,
  row: CredentialRow,
  password: string,
): Promise<Response | null> {
  const client = `u:${row.user_id}`
  const wait = await takeBudget(c.env.DB, PASSWORD_BUDGET, client)
  if (wait > 0) return tooMany(c, wait, 'too many wrong passwords')
  if (!(await verifyPassword(password, row.password_hash))) {
    return errorResponse(c, 'forbidden', 'the current password is wrong')
  }
  await giveBackBudget(c.env.DB, PASSWORD_BUDGET, client)
  return null
}

const sessionUser = (c: Context<AppEnv>) => c.get('session')?.userId ?? ''

export const credentials = new Hono<AppEnv>()
  .get('/credentials', requireUser, refuseToken, async (c) => {
    c.header('Cache-Control', 'private, no-store')
    const row = await getCredentials(c.env.DB, sessionUser(c))
    return c.json(credentialsBody(row, mailer(c) !== null))
  })
  .post('/password', requireUser, refuseToken, limitBody(AUTH_BODY), async (c) => {
    const userId = sessionUser(c)
    const asked = parse(ChangePassword, await jsonBody(c), 'the request')
    const [user, row] = await Promise.all([
      getUserRow(c.env.DB, userId),
      getCredentials(c.env.DB, userId),
    ])
    if (user === null) return gone(c)
    if (row === null) return errorResponse(c, 'conflict', NO_PASSWORD)
    const wrong = await wrongPassword(c, row, asked.current)
    if (wrong !== null) return wrong
    const problem =
      passwordProblem(asked.password, user.handle) ??
      (asked.password === asked.current ? 'the new password is the one you have' : null)
    if (problem !== null) return errorResponse(c, 'bad_request', problem)
    const hash = await hashPassword(asked.password)
    const setAt = await setPassword(c.env.DB, userId, hash, 'password.change')
    if (setAt === null) return gone(c)
    await endPasswordSessions(c.env.KV, userId, setAt)
    c.set('session', null)
    await signInAs(c, userId, setAt)
    const send = mailer(c)
    if (send !== null && row.email !== null && row.email_verified_at !== null) {
      mailPasswordChanged(c, send, user.handle, row.email)
    }
    return c.body(null, 204)
  })
  .post('/email', requireUser, refuseToken, limitBody(AUTH_BODY), async (c) => {
    const userId = sessionUser(c)
    const asked = parse(ChangeEmail, await jsonBody(c), 'the request')
    const [user, row] = await Promise.all([
      getUserRow(c.env.DB, userId),
      getCredentials(c.env.DB, userId),
    ])
    if (user === null) return gone(c)
    if (row === null) return errorResponse(c, 'conflict', NO_PASSWORD)
    const wrong = await wrongPassword(c, row, asked.password)
    if (wrong !== null) return wrong
    const typed = normalizeEmail(asked.email ?? '')
    const email = typed === '' ? null : typed
    const send = mailer(c)
    const problem =
      email === null
        ? null
        : send === null
          ? 'this server sends no mail: an account keeps no email here'
          : emailProblem(email)
    if (problem !== null) return errorResponse(c, 'bad_request', problem)
    if (email === row.email) return c.json(credentialsBody(row, send !== null))
    if (email !== null) {
      // Each new address is mailed a link: a user sets only so many an hour.
      const wait = await takeBudget(c.env.DB, EMAIL_CHANGE_BUDGET, `u:${userId}`)
      if (wait > 0) return tooMany(c, wait, 'too many email changes')
    }
    await setEmail(c.env.DB, userId, email)
    if (send !== null && row.email !== null && row.email_verified_at !== null) {
      const told = send(emailChangedMail(row.email, linkOrigin(c), user.handle))
      afterResponse(c, 'email notice', told)
    }
    if (send !== null && email !== null) mailVerifyLink(c, send, user, email)
    const next = { ...row, email, email_verified_at: null }
    return c.json(credentialsBody(next, send !== null))
  })
  .post('/email/verify', requireUser, refuseToken, async (c) => {
    const userId = sessionUser(c)
    const [user, row] = await Promise.all([
      getUserRow(c.env.DB, userId),
      getCredentials(c.env.DB, userId),
    ])
    if (user === null) return gone(c)
    if (row === null) return errorResponse(c, 'conflict', NO_PASSWORD)
    if (row.email === null) return errorResponse(c, 'bad_request', 'the account has no email')
    if (row.email_verified_at !== null) {
      return errorResponse(c, 'conflict', 'the email is verified already')
    }
    const send = mailer(c)
    if (send === null) return errorResponse(c, 'unavailable', 'this server sends no mail')
    mailVerifyLink(c, send, user, row.email)
    return c.json({}, 202)
  })
