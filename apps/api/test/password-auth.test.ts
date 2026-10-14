/**
 * Password sign-in (`src/auth/local.ts`, `src/routes/credentials.ts`): sign-up with and without
 * an email, sign-in, the limits, the mailed links (through the test transport, so no mail
 * leaves), recovery by a verified email only, and what keeps a password account and a GitHub
 * account apart. The Worker's own module takes each request; what a route does after it answers
 * (`waitUntil`) is awaited by `settle`.
 */
import { env } from 'cloudflare:workers'
import {
  AuditList,
  AuthMethods,
  Credentials,
  HillSubmitted,
  Me,
  parse,
  SavedBot,
  SiteStats,
} from '@asmbots/protocol'
import { beforeAll, describe, expect, it } from 'vitest'
import { hashPassword, needsRehash, verifyNobody, verifyPassword } from '../src/auth/password'
import { createPasswordUser, rehashPassword } from '../src/db/credentials'
import { applySeed, buildSeed } from '../src/db/seed'
import type { Env } from '../src/env'
import worker from '../src/index'
import { type Mail, testMailKey } from '../src/mail/mail'
import { clientNet } from '../src/rate-limit'
import { errorOf, SPIN, signIn } from './fake-auth'
import { Jar } from './jar'

const LOCAL = 'http://localhost:8787'
/** Mail on, through the test transport; GitHub sign-in faked, for the accounts beside these. */
const MAIL: Env = { ...env, DEV_FAKE_AUTH: '1', MAIL_TRANSPORT: 'test' }
/** As production is until its mail is set up: no transport. */
const NO_MAIL: Env = { ...env, DEV_FAKE_AUTH: '1' }

const PASSWORD = 'correct horse battery'
const OTHER = 'staple gun and a half'

const pending: Promise<unknown>[] = []
const CTX = {
  waitUntil: (work: Promise<unknown>) => void pending.push(work),
  passThroughOnException: () => {},
  props: {},
} as unknown as ExecutionContext

/** Waits for what the routes left for after their answers. */
async function settle(): Promise<void> {
  while (pending.length > 0) await Promise.all(pending.splice(0))
}

interface Call {
  method?: string
  body?: unknown
  site?: string
  vars?: Env
  origin?: string | null
  headers?: Record<string, string>
}

async function call(
  jar: Jar,
  path: string,
  {
    method = 'GET',
    body,
    site = LOCAL,
    vars = MAIL,
    origin = site,
    headers: extra = {},
  }: Call = {},
): Promise<Response> {
  const headers = new Headers({ ...extra, Cookie: jar.header(), 'CF-Connecting-IP': jar.ip })
  if (method !== 'GET' && origin !== null) headers.set('Origin', origin)
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  const request = new Request(`${site}${path}`, {
    method,
    headers,
    redirect: 'manual',
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const res = await worker.fetch(request, vars, CTX)
  jar.take(res)
  return res
}

const post = (jar: Jar, path: string, body: unknown, more: Call = {}) =>
  call(jar, path, { method: 'POST', body, ...more })

/** A new account from a browser and an IP of its own, signed in. */
async function signUp(
  username: string,
  {
    email,
    password = PASSWORD,
    vars = MAIL,
  }: { email?: string; password?: string; vars?: Env } = {},
): Promise<Jar> {
  const jar = new Jar()
  const res = await post(jar, '/api/auth/signup', { username, password, email }, { vars })
  expect(res.status).toBe(201)
  await settle()
  return jar
}

const logIn = (jar: Jar, username: string, password: string, more: Call = {}) =>
  post(jar, '/api/auth/login', { username, password }, more)

async function whoAmI(jar: Jar): Promise<Me | null> {
  const res = await call(jar, '/api/me')
  return res.status === 200 ? parse(Me, await res.json(), 'me') : null
}

async function credentialsOf(jar: Jar, vars = MAIL): Promise<Credentials> {
  const res = await call(jar, '/api/me/credentials', { vars })
  expect(res.status).toBe(200)
  return parse(Credentials, await res.json(), 'the credentials')
}

/** The last message the test transport kept for `to`, and takes it, so the next read is the next. */
async function mailTo(to: string): Promise<Mail | null> {
  await settle()
  const mail = await env.KV.get<Mail>(testMailKey(to), 'json')
  await env.KV.delete(testMailKey(to))
  return mail
}

/** The token of the link in `mail`. */
function tokenIn(mail: Mail | null, page: string): string {
  const match = mail?.text.match(new RegExp(`${LOCAL}/auth/${page}#([0-9a-f]{64})\\b`))
  if (!match?.[1]) throw new Error(`no ${page} link in ${JSON.stringify(mail)}`)
  return match[1]
}

/** An account whose email is verified: it can recover. */
async function verified(username: string, email: string): Promise<Jar> {
  const jar = await signUp(username, { email })
  const token = tokenIn(await mailTo(email.toLowerCase()), 'verify')
  expect((await post(new Jar(), '/api/auth/verify-email', { token })).status).toBe(204)
  return jar
}

async function audit(jar: Jar): Promise<string[]> {
  const res = await call(jar, '/api/me/audit')
  return parse(AuditList, await res.json(), 'the audit').entries.map((e) => e.action)
}

describe('password hashing', () => {
  it('verifies the password it hashed, and no other', async () => {
    const hash = await hashPassword(PASSWORD)
    expect(hash).toMatch(/^pbkdf2-sha256\$6x100000\$[A-Za-z0-9+/]{22}==\$[A-Za-z0-9+/]{43}=$/)
    expect(await verifyPassword(PASSWORD, hash)).toBe(true)
    expect(await verifyPassword(`${PASSWORD} `, hash)).toBe(false)
    expect(await verifyPassword('', hash)).toBe(false)
    expect(needsRehash(hash)).toBe(false)
  })

  it('salts each hash, so one password hashes two ways', async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(await hashPassword(PASSWORD))
  })

  it('reads a password in one Unicode form, however it was typed', async () => {
    const hash = await hashPassword('café au lait 123')
    expect(await verifyPassword('café au lait 123', hash)).toBe(true)
  })

  it('takes no hash it did not make, and none that asks for unbounded work', async () => {
    const [, , salt, key] = (await hashPassword(PASSWORD)).split('$')
    for (const stored of [
      '',
      'plain',
      `md5$1x1$${salt}$${key}`,
      `pbkdf2-sha256$6x100000$${salt}`,
      `pbkdf2-sha256$0x100000$${salt}$${key}`,
      `pbkdf2-sha256$6x100001$${salt}$${key}`,
      `pbkdf2-sha256$999x100000$${salt}$${key}`,
      `pbkdf2-sha256$6x100000$!!$${key}`,
    ]) {
      expect(await verifyPassword(PASSWORD, stored)).toBe(false)
      expect(needsRehash(stored)).toBe(true)
    }
    expect(await verifyNobody(PASSWORD)).toBe(false)
  })

  it('marks a hash made at another cost for hashing again', async () => {
    const [, , salt] = (await hashPassword(PASSWORD)).split('$')
    expect(needsRehash(`pbkdf2-sha256$1x1000$${salt}$${salt}`)).toBe(true)
  })
})

describe('GET /api/auth/methods', () => {
  it('says what is on: mail only with a transport, sign-up unless closed', async () => {
    const read = async (vars: Env, site = LOCAL) =>
      parse(
        AuthMethods,
        await (await call(new Jar(), '/api/auth/methods', { vars, site })).json(),
        'the methods',
      )
    expect(await read(MAIL)).toEqual({ github: true, password: true, signup: true, mail: true })
    expect(await read(NO_MAIL)).toEqual({ github: true, password: true, signup: true, mail: false })
    expect(await read({ ...MAIL, PASSWORD_AUTH: 'login' })).toMatchObject({
      password: true,
      signup: false,
    })
    expect(await read({ ...MAIL, PASSWORD_AUTH: 'off' })).toMatchObject({
      password: false,
      signup: false,
    })
    // The sign-in page reads it on every visit: it is outside the ten-a-minute sign-in limit.
    const visitor = new Jar()
    for (let i = 0; i < 12; i++) {
      expect((await call(visitor, '/api/auth/methods')).status).toBe(200)
    }
    // The test transport is for localhost: any other host has no mail from it.
    expect((await read(MAIL, 'https://asmbots.test')).mail).toBe(false)
  })
})

describe('POST /api/auth/signup', () => {
  beforeAll(async () => {
    const hill = {
      slug: 'open',
      name: 'open',
      description: '',
      size: 5,
      rounds: 1,
      config: {
        coreSize: 0x10000,
        maxCycles: 2000,
        maxProcesses: 64,
        minSpacing: 1024,
        maxBotBytes: 512,
      },
      scoring: 'duel' as const,
    }
    await applySeed(
      env,
      await buildSeed([{ slug: 'spin', source: SPIN, melee: false }], { hills: [hill] }),
    )
  })

  it('makes an account with no email, signed in and onboarded, that submits a bot to a hill', async () => {
    const jar = new Jar()
    const res = await post(
      jar,
      '/api/auth/signup',
      { username: 'Nobody-Known', password: PASSWORD },
      { vars: NO_MAIL },
    )
    expect(res.status).toBe(201)
    const made = parse(Me, await res.json(), 'me')
    expect(made.user.handle).toBe('nobody-known')
    expect(made.user.github).toBeUndefined()
    expect(made.user.avatarUrl).toBeNull()
    expect(made.onboarded).toBe(true)
    expect(jar.cookies.has('__Host-session')).toBe(true)
    expect(jar.cookies.get('signed_in')).toBe('1')
    expect((await whoAmI(jar))?.user.id).toBe(made.user.id)
    expect(await credentialsOf(jar, NO_MAIL)).toEqual({
      method: 'password',
      email: null,
      emailVerified: false,
      mail: false,
    })

    const saved = await post(jar, '/api/bots', {
      name: 'looper',
      source: '%name "Looper"\nstart: nop\n jmp start\n',
    })
    expect(saved.status).toBe(201)
    const { version } = parse(SavedBot, await saved.json(), 'the bot')
    const submit = await post(jar, '/api/hills/open/submit', { botVersionId: version.id })
    expect(submit.status).toBe(201)
    expect(parse(HillSubmitted, await submit.json(), 'the answer').submissionId).toBeTruthy()

    const profile = await call(new Jar(), '/api/users/nobody-known')
    expect(profile.status).toBe(200)
  })

  it('keeps the password as a hash, and no email of the account in `users`', async () => {
    await signUp('hash-kept', { email: 'hash-kept@example.com' })
    const row = await env.DB.prepare(
      `SELECT u.github_id, u.email AS github_email, p.password_hash, p.email, p.email_verified_at
       FROM users u JOIN password_credentials p ON p.user_id = u.id WHERE u.handle = 'hash-kept'`,
    ).first<Record<string, unknown>>()
    expect(row).toMatchObject({
      github_id: null,
      github_email: null,
      email: 'hash-kept@example.com',
      email_verified_at: null,
    })
    expect(String(row?.password_hash)).toMatch(/^pbkdf2-sha256\$/)
    expect(String(row?.password_hash)).not.toContain(PASSWORD)
  })

  it('refuses a bad username, a weak password, and an email when no mail is sent', async () => {
    const refused = async (body: object, vars = MAIL) =>
      errorOf(await post(new Jar(), '/api/auth/signup', body, { vars }))
    expect(await refused({ username: 'ab', password: PASSWORD })).toMatchObject({ status: 400 })
    expect(await refused({ username: 'admin', password: PASSWORD })).toMatchObject({
      status: 400,
      message: 'admin is reserved',
    })
    expect(await refused({ username: 'has space', password: PASSWORD })).toMatchObject({
      status: 400,
    })
    expect(await refused({ username: 'weak-one', password: 'short' })).toMatchObject({
      status: 400,
      message: 'a password is at least 10 characters',
    })
    expect(await refused({ username: 'weak-two', password: 'Password123' })).toMatchObject({
      status: 400,
    })
    expect(await refused({ username: 'weak-three', password: 'aaaaaaaaaaaa' })).toMatchObject({
      status: 400,
    })
    expect(await refused({ username: 'same-as-name', password: 'Same-As-Name' })).toMatchObject({
      status: 400,
    })
    expect(await refused({ username: 'weak-four', password: 'x'.repeat(129) })).toMatchObject({
      status: 400,
    })
    expect(
      await refused({ username: 'bad-mail', password: PASSWORD, email: 'not an address' }),
    ).toMatchObject({
      status: 400,
      message: 'that is not an email address',
    })
    expect(
      await refused({
        username: 'bad-mail',
        password: PASSWORD,
        email: 'a@b.example\r\nBcc: x@y.example',
      }),
    ).toMatchObject({ status: 400 })
    expect(
      await refused({ username: 'no-mail', password: PASSWORD, email: 'a@example.com' }, NO_MAIL),
    ).toMatchObject({
      status: 400,
      message: 'this server sends no mail: leave the email out',
    })
    expect(await refused({ username: 'no-body' })).toMatchObject({ status: 400 })
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM users WHERE handle IN ('weak-one', 'weak-two', 'bad-mail', 'no-mail')",
    ).first<{ n: number }>()
    expect(count?.n).toBe(0)
  })

  it('takes a blank email as none', async () => {
    const jar = new Jar()
    const res = await post(
      jar,
      '/api/auth/signup',
      { username: 'blank-mail', password: PASSWORD, email: '  ' },
      { vars: NO_MAIL },
    )
    expect(res.status).toBe(201)
    expect((await credentialsOf(jar)).email).toBeNull()
  })

  it('answers 409 for a username someone has, in any case', async () => {
    await signUp('first-come')
    const again = await post(new Jar(), '/api/auth/signup', {
      username: 'First-Come',
      password: OTHER,
    })
    expect(await errorOf(again)).toEqual({
      status: 409,
      code: 'conflict',
      message: 'first-come is taken',
    })
  })

  it('gives a username to one of two sign-ups that race for it, and leaves nothing of the other', async () => {
    const account = { passwordHash: await hashPassword(PASSWORD), email: null }
    const first = await createPasswordUser(env.DB, {
      ...account,
      id: 'race-a',
      handle: 'race-name',
    })
    const second = await createPasswordUser(env.DB, {
      ...account,
      id: 'race-b',
      handle: 'Race-Name',
    })
    expect(first).toMatchObject({
      user: { id: 'race-a', handle: 'race-name', github_id: null },
    })
    expect(second).toBe('taken')
    const left = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM password_credentials WHERE user_id = 'race-b'",
    ).first<{ n: number }>()
    expect(left?.n).toBe(0)
  })

  it('makes three accounts an hour from one IP, refused ones not counted', async () => {
    const ip = '203.0.113.7'
    const make = (username: string, password = PASSWORD) =>
      post(new Jar(ip), '/api/auth/signup', { username, password })
    expect((await make('limit-bad', 'short')).status).toBe(400)
    for (const name of ['limit-a', 'limit-b', 'limit-c'])
      expect((await make(name)).status).toBe(201)
    const fourth = await make('limit-d')
    expect(fourth.status).toBe(429)
    expect(Number(fourth.headers.get('Retry-After'))).toBeGreaterThan(0)
    // A session does not start a new count: the limit is the IP's, not the user's.
    const signedIn = new Jar(ip)
    await logIn(signedIn, 'limit-a', PASSWORD)
    expect(
      (await post(signedIn, '/api/auth/signup', { username: 'limit-e', password: PASSWORD }))
        .status,
    ).toBe(429)
    expect(
      (await post(new Jar(), '/api/auth/signup', { username: 'limit-f', password: PASSWORD }))
        .status,
    ).toBe(201)
  })

  it('makes three of a burst of sign-ups at once from one address', async () => {
    const ip = '203.0.113.70'
    const all = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        post(new Jar(ip), '/api/auth/signup', { username: `burst-new-${i}`, password: PASSWORD }),
      ),
    )
    const statuses = all.map((res) => res.status)
    expect(statuses.filter((status) => status === 201)).toHaveLength(3)
    expect(statuses.filter((status) => status === 429)).toHaveLength(5)
    const made = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM users WHERE handle LIKE 'burst-new-%'",
    ).first<{ n: number }>()
    expect(made?.n).toBe(3)
  })

  it('gives no admin`s handle to a sign-up', async () => {
    const vars: Env = { ...MAIL, ADMIN_HANDLES: 'pedram, The-Boss' }
    const res = await post(
      new Jar(),
      '/api/auth/signup',
      { username: 'the-boss', password: PASSWORD },
      { vars },
    )
    expect(await errorOf(res)).toEqual({
      status: 400,
      code: 'bad_request',
      message: 'the-boss is reserved',
    })
  })

  it('mails one address three verification links an hour, whichever accounts name it', async () => {
    for (const name of ['flood-a', 'flood-b', 'flood-c']) {
      await signUp(name, { email: 'flooded@example.com' })
      expect(await mailTo('flooded@example.com')).not.toBeNull()
    }
    const fourth = await signUp('flood-d', { email: 'flooded@example.com' })
    expect(await mailTo('flooded@example.com')).toBeNull()
    expect((await credentialsOf(fourth)).email).toBe('flooded@example.com')
  })

  it('closes with PASSWORD_AUTH: `login` keeps sign-in, `off` ends it', async () => {
    await signUp('before-close')
    const closed: Env = { ...MAIL, PASSWORD_AUTH: 'login' }
    const off: Env = { ...MAIL, PASSWORD_AUTH: 'off' }
    const body = { username: 'after-close', password: PASSWORD }
    expect(
      await errorOf(await post(new Jar(), '/api/auth/signup', body, { vars: closed })),
    ).toMatchObject({
      status: 503,
      message: 'new password accounts are closed',
    })
    expect((await logIn(new Jar(), 'before-close', PASSWORD, { vars: closed })).status).toBe(200)
    expect((await post(new Jar(), '/api/auth/signup', body, { vars: off })).status).toBe(503)
    expect((await logIn(new Jar(), 'before-close', PASSWORD, { vars: off })).status).toBe(503)
  })

  it('refuses a write from another site, and counts a password account as a user', async () => {
    const before = parse(SiteStats, await (await call(new Jar(), '/api/stats')).json(), 'the stats')
    const cross = await post(
      new Jar(),
      '/api/auth/signup',
      { username: 'cross-site', password: PASSWORD },
      { origin: 'https://evil.example' },
    )
    expect(cross.status).toBe(403)
    await signUp('counted-user')
    await env.KV.delete('stats:site')
    const after = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM users WHERE id NOT IN ('system', 'deleted')",
    ).first<{ n: number }>()
    expect(after?.n).toBeGreaterThan(before.users)
  })
})

describe('POST /api/auth/login', () => {
  it('signs in with the username in any case, on a new session each time', async () => {
    const first = await signUp('sign-in-ok')
    const jar = new Jar()
    const res = await logIn(jar, '  Sign-In-OK ', PASSWORD)
    expect(res.status).toBe(200)
    expect(parse(Me, await res.json(), 'me').user.handle).toBe('sign-in-ok')
    expect(jar.cookies.get('__Host-session')).not.toBe(first.cookies.get('__Host-session'))
    expect((await whoAmI(jar))?.user.handle).toBe('sign-in-ok')
    // Signing in again drops the session the browser had.
    const old = jar.cookies.get('__Host-session')
    await logIn(jar, 'sign-in-ok', PASSWORD)
    const stale = new Jar()
    stale.cookies.set('__Host-session', old ?? '')
    expect(await whoAmI(stale)).toBeNull()
  })

  it('gives one answer for a wrong password, no such username, and a GitHub account', async () => {
    await signUp('one-answer')
    await signIn(new Jar(), 'github-only')
    const wrong = await errorOf(await logIn(new Jar(), 'one-answer', OTHER))
    const nobody = await errorOf(await logIn(new Jar(), 'no-such-user', PASSWORD))
    const github = await errorOf(await logIn(new Jar(), 'github-only', PASSWORD))
    const odd = await errorOf(await logIn(new Jar(), 'not a handle!', PASSWORD))
    expect(wrong).toEqual({
      status: 401,
      code: 'unauthorized',
      message: 'wrong username or password',
    })
    expect(nobody).toEqual(wrong)
    expect(github).toEqual(wrong)
    expect(odd).toEqual(wrong)
    const jar = new Jar()
    await logIn(jar, 'one-answer', OTHER)
    expect(jar.cookies.has('__Host-session')).toBe(false)
  })

  it('refuses a write from another site, and a cookie-less body that is not a sign-in', async () => {
    await signUp('csrf-target')
    expect(
      (await logIn(new Jar(), 'csrf-target', PASSWORD, { origin: 'https://evil.example' })).status,
    ).toBe(403)
    expect((await post(new Jar(), '/api/auth/login', { username: 'csrf-target' })).status).toBe(400)
    expect(
      (
        await post(new Jar(), '/api/auth/login', {
          username: 'csrf-target',
          password: 'x'.repeat(2000),
        })
      ).status,
    ).toBe(400)
  })

  it('stops an IP after ten wrong passwords, the right one too, until the window ends', async () => {
    await signUp('ip-limited')
    const ip = '203.0.113.20'
    for (let i = 0; i < 10; i++) {
      expect((await logIn(new Jar(ip), `ip-victim-${i}`, OTHER)).status).toBe(401)
    }
    const stopped = await logIn(new Jar(ip), 'ip-limited', PASSWORD)
    expect(stopped.status).toBe(429)
    expect(Number(stopped.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect((await logIn(new Jar(), 'ip-limited', PASSWORD)).status).toBe(200)
  })

  it('stops guesses at one username from many IPs, whether the account is there or not', async () => {
    await signUp('name-limited')
    for (const name of ['name-limited', 'name-not-there']) {
      for (let i = 0; i < 30; i++) expect((await logIn(new Jar(), name, OTHER)).status).toBe(401)
      const stopped = await errorOf(await logIn(new Jar(), name, PASSWORD))
      expect(stopped).toMatchObject({ status: 429, code: 'rate_limited' })
    }
  })

  it('lets a burst of sign-ins at once through only as far as the count goes', async () => {
    await signUp('burst-target')
    const ip = '203.0.113.60'
    const all = await Promise.all(
      Array.from({ length: 24 }, () => logIn(new Jar(ip), 'burst-target', OTHER)),
    )
    const statuses = all.map((res) => res.status)
    expect(statuses.filter((status) => status === 401)).toHaveLength(10)
    expect(statuses.filter((status) => status === 429)).toHaveLength(14)
  })

  it('does not hold a browser the account knows by the username`s count, and counts its own', async () => {
    const owner = await signUp('known-owner')
    expect(owner.cookies.has('known_browser')).toBe(true)
    for (let i = 0; i < 30; i++) {
      expect((await logIn(new Jar(), 'known-owner', OTHER)).status).toBe(401)
    }
    // Anyone else is stopped now, the right password or not; the owner`s browser is not.
    expect((await logIn(new Jar(), 'known-owner', PASSWORD)).status).toBe(429)
    const known = () => {
      const jar = new Jar()
      jar.cookies.set('known_browser', owner.cookies.get('known_browser') ?? '')
      return jar
    }
    expect((await logIn(known(), 'known-owner', PASSWORD)).status).toBe(200)
    // The cookie is for its account only, and a forged one is nobody`s.
    await signUp('known-other')
    for (let i = 0; i < 30; i++) await logIn(new Jar(), 'known-other', OTHER)
    expect((await logIn(known(), 'known-other', PASSWORD)).status).toBe(429)
    const forged = new Jar()
    forged.cookies.set('known_browser', 'someone.else.signature')
    expect((await logIn(forged, 'known-owner', PASSWORD)).status).toBe(429)
    // The browser has a count of its own: ten wrong passwords an hour.
    for (let i = 0; i < 10; i++)
      expect((await logIn(known(), 'known-owner', OTHER)).status).toBe(401)
    expect((await logIn(known(), 'known-owner', PASSWORD)).status).toBe(429)
  })

  it('counts an IPv6 client by its /64, so a new address is not a new count', async () => {
    const at = (ip: string) =>
      clientNet(new Request('https://x.test', { headers: { 'CF-Connecting-IP': ip } }))
    expect(at('203.0.113.9')).toBe('203.0.113.9')
    expect(at('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).toBe('2001:db8:1:2::/64')
    expect(at('2001:0DB8:0001:0002::1')).toBe('2001:db8:1:2::/64')
    expect(at('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(at('::1')).toBe('0:0:0:0::/64')
    expect(at('2001:db8:1:3::1')).not.toBe(at('2001:db8:1:2::1'))

    await signUp('v6-target')
    for (let i = 0; i < 10; i++) {
      const res = await logIn(new Jar(`2001:db8:7:7::${(i + 1).toString(16)}`), 'v6-nobody', OTHER)
      expect(res.status).toBe(401)
    }
    expect((await logIn(new Jar('2001:db8:7:7:ffff::1'), 'v6-target', PASSWORD)).status).toBe(429)
    expect((await logIn(new Jar('2001:db8:7:8::1'), 'v6-target', PASSWORD)).status).toBe(200)
  })

  it('hashes a password again when its hash was made at another cost', async () => {
    await signUp('old-cost')
    const salt = btoa('0123456789abcdef')
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(PASSWORD),
      'PBKDF2',
      false,
      ['deriveBits'],
    )
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: new TextEncoder().encode('0123456789abcdef'),
        iterations: 1000,
      },
      key,
      256,
    )
    const weak = `pbkdf2-sha256$1x1000$${salt}$${btoa(String.fromCharCode(...new Uint8Array(bits)))}`
    await env.DB.prepare(
      "UPDATE password_credentials SET password_hash = ? WHERE user_id = (SELECT id FROM users WHERE handle = 'old-cost')",
    )
      .bind(weak)
      .run()
    expect((await logIn(new Jar(), 'old-cost', PASSWORD)).status).toBe(200)
    await settle()
    const row = await env.DB.prepare(
      "SELECT password_hash FROM password_credentials WHERE user_id = (SELECT id FROM users WHERE handle = 'old-cost')",
    ).first<{ password_hash: string }>()
    expect(row?.password_hash).toMatch(/^pbkdf2-sha256\$6x100000\$/)
    expect((await logIn(new Jar(), 'old-cost', PASSWORD)).status).toBe(200)
  })

  it('keeps a password set since over a hash made again for the one before', async () => {
    await signUp('rehash-race')
    const id = (
      await env.DB.prepare("SELECT id FROM users WHERE handle = 'rehash-race'").first<{
        id: string
      }>()
    )?.id as string
    const read = async () =>
      (
        await env.DB.prepare('SELECT password_hash FROM password_credentials WHERE user_id = ?')
          .bind(id)
          .first<{ password_hash: string }>()
      )?.password_hash
    const now = await read()
    await rehashPassword(env.DB, id, 'the hash that was checked, since replaced', 'a stale hash')
    expect(await read()).toBe(now)
    await rehashPassword(env.DB, id, now ?? '', await hashPassword(PASSWORD))
    expect(await read()).not.toBe(now)
    expect((await logIn(new Jar(), 'rehash-race', PASSWORD)).status).toBe(200)
  })
})

describe('email verification', () => {
  it('mails a link at sign-up; the address counts once the link is opened, once', async () => {
    const jar = await signUp('verify-me', { email: '  Verify.Me@Example.com ' })
    expect(await credentialsOf(jar)).toEqual({
      method: 'password',
      email: 'verify.me@example.com',
      emailVerified: false,
      mail: true,
    })
    const mail = await mailTo('verify.me@example.com')
    expect(mail?.subject).toBe('ASM Bots: verify your email')
    expect(mail?.text).toContain('account verify-me')
    const token = tokenIn(mail, 'verify')
    // Only the hash is kept.
    const kept = await env.DB.prepare('SELECT hash FROM auth_tokens').all<{ hash: string }>()
    expect(kept.results.map((r) => r.hash)).not.toContain(token)

    expect((await post(new Jar(), '/api/auth/verify-email', { token })).status).toBe(204)
    expect((await credentialsOf(jar)).emailVerified).toBe(true)
    expect(await audit(jar)).toContain('email.verify')
    const again = await errorOf(await post(new Jar(), '/api/auth/verify-email', { token }))
    expect(again).toMatchObject({
      status: 400,
      message: 'the link is not valid or has expired: ask for a new one',
    })
    for (const bad of ['', 'nope', 'f'.repeat(64), 'F'.repeat(64)]) {
      expect((await post(new Jar(), '/api/auth/verify-email', { token: bad })).status).toBe(400)
    }
  })

  it('sends the link again when asked, and only the newest one works', async () => {
    const jar = await signUp('verify-again', { email: 'again@example.com' })
    const first = tokenIn(await mailTo('again@example.com'), 'verify')
    expect((await post(jar, '/api/me/email/verify', undefined)).status).toBe(202)
    const second = tokenIn(await mailTo('again@example.com'), 'verify')
    expect(second).not.toBe(first)
    expect((await post(new Jar(), '/api/auth/verify-email', { token: first })).status).toBe(400)
    expect((await post(new Jar(), '/api/auth/verify-email', { token: second })).status).toBe(204)
    expect(await errorOf(await post(jar, '/api/me/email/verify', undefined))).toMatchObject({
      status: 409,
    })
  })

  it('refuses a link past its day, and a reset link as a verification', async () => {
    await signUp('verify-late', { email: 'late@example.com' })
    const token = tokenIn(await mailTo('late@example.com'), 'verify')
    expect((await post(new Jar(), '/api/auth/reset', { token, password: OTHER })).status).toBe(400)
    await env.DB.prepare(
      "UPDATE auth_tokens SET expires_at = '2020-01-01T00:00:00.000Z' WHERE email = 'late@example.com'",
    ).run()
    expect((await post(new Jar(), '/api/auth/verify-email', { token })).status).toBe(400)
  })

  it('verifies one address on one account: the second to open its link is refused', async () => {
    const a = await signUp('shared-a', { email: 'shared@example.com' })
    const tokenA = tokenIn(await mailTo('shared@example.com'), 'verify')
    const b = await signUp('shared-b', { email: 'shared@example.com' })
    const tokenB = tokenIn(await mailTo('shared@example.com'), 'verify')
    expect((await post(new Jar(), '/api/auth/verify-email', { token: tokenB })).status).toBe(204)
    expect(
      await errorOf(await post(new Jar(), '/api/auth/verify-email', { token: tokenA })),
    ).toEqual({
      status: 409,
      code: 'conflict',
      message: 'that email is verified on another account',
    })
    expect((await credentialsOf(a)).emailVerified).toBe(false)
    expect((await credentialsOf(b)).emailVerified).toBe(true)
  })
})

describe('account recovery', () => {
  const ask = (login: string, more: Call = {}) =>
    post(new Jar(), '/api/auth/recover', { login }, more)

  it('answers the same for anyone, and mails only an account with a verified email', async () => {
    await signUp('rec-none')
    await signUp('rec-unverified', { email: 'rec-unverified@example.com' })
    await mailTo('rec-unverified@example.com')
    await signIn(new Jar(), 'rec-github')
    await env.DB.prepare(
      "UPDATE users SET email = 'rec-github@example.com' WHERE handle = 'rec-github'",
    ).run()
    await verified('rec-ok', 'rec-ok@example.com')

    const answers: string[] = []
    for (const login of [
      'rec-none',
      'rec-unverified',
      'rec-unverified@example.com',
      'rec-github',
      'rec-github@example.com',
      'nobody-at-all',
      'nobody@example.com',
      'rec-ok',
    ]) {
      const res = await ask(login)
      answers.push(`${res.status} ${await res.text()}`)
    }
    expect(new Set(answers)).toEqual(new Set(['202 {}']))
    expect(await mailTo('rec-unverified@example.com')).toBeNull()
    expect(await mailTo('rec-github@example.com')).toBeNull()
    expect(await mailTo('nobody@example.com')).toBeNull()
    const mail = await mailTo('rec-ok@example.com')
    expect(mail?.subject).toBe('ASM Bots: reset your password')
    tokenIn(mail, 'reset')
    // No reset link was kept for anyone else.
    const kept = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM auth_tokens WHERE kind = 'reset_password'",
    ).first<{ n: number }>()
    expect(kept?.n).toBe(1)
  })

  it('resets the password with the link, once: the old one and every session end', async () => {
    const jar = await verified('reset-me', 'Reset.Me@example.com')
    const elsewhere = new Jar()
    await logIn(elsewhere, 'reset-me', PASSWORD)
    await ask('RESET.me@example.com')
    const token = tokenIn(await mailTo('reset.me@example.com'), 'reset')

    // A password the API refuses leaves the link good.
    expect(
      await errorOf(await post(new Jar(), '/api/auth/reset', { token, password: 'short' })),
    ).toMatchObject({
      status: 400,
      message: 'a password is at least 10 characters',
    })
    expect((await post(new Jar(), '/api/auth/reset', { token, password: 'reset-me' })).status).toBe(
      400,
    )
    const done = await post(jar, '/api/auth/reset', { token, password: OTHER })
    expect(done.status).toBe(204)
    expect(jar.cookies.has('__Host-session')).toBe(false)
    expect(await whoAmI(elsewhere)).toBeNull()
    expect((await logIn(new Jar(), 'reset-me', PASSWORD)).status).toBe(401)
    const back = new Jar()
    expect((await logIn(back, 'reset-me', OTHER)).status).toBe(200)
    expect(await audit(back)).toContain('password.reset')
    expect((await mailTo('reset.me@example.com'))?.subject).toBe('ASM Bots: your password changed')

    const again = await errorOf(
      await post(new Jar(), '/api/auth/reset', { token, password: PASSWORD }),
    )
    expect(again).toMatchObject({
      status: 400,
      message: 'the link is not valid or has expired: ask for a new one',
    })
    expect((await logIn(new Jar(), 'reset-me', OTHER)).status).toBe(200)
  })

  it('lets one of two requests with one link through', async () => {
    await verified('reset-race', 'race@example.com')
    await ask('reset-race')
    const token = tokenIn(await mailTo('race@example.com'), 'reset')
    const both = await Promise.all([
      post(new Jar(), '/api/auth/reset', { token, password: OTHER }),
      post(new Jar(), '/api/auth/reset', { token, password: `${OTHER} two` }),
    ])
    expect(both.map((r) => r.status).sort()).toEqual([204, 400])
  })

  it('keeps each link of the half hour good until one is used, and none past its time', async () => {
    await verified('reset-late', 'reset-late@example.com')
    await ask('reset-late')
    const first = tokenIn(await mailTo('reset-late@example.com'), 'reset')
    await ask('reset-late')
    const second = tokenIn(await mailTo('reset-late@example.com'), 'reset')
    expect((await post(new Jar(), '/api/auth/verify-email', { token: second })).status).toBe(400)
    // The older link works too: whoever asks for links in an owner's name cannot void theirs.
    expect(
      (await post(new Jar(), '/api/auth/reset', { token: first, password: OTHER })).status,
    ).toBe(204)
    await mailTo('reset-late@example.com')
    // One used, the rest are void.
    expect(
      (await post(new Jar(), '/api/auth/reset', { token: second, password: PASSWORD })).status,
    ).toBe(400)

    await ask('reset-late')
    const third = tokenIn(await mailTo('reset-late@example.com'), 'reset')
    await env.DB.prepare(
      "UPDATE auth_tokens SET expires_at = '2020-01-01T00:00:00.000Z' WHERE email = 'reset-late@example.com'",
    ).run()
    expect(
      (await post(new Jar(), '/api/auth/reset', { token: third, password: PASSWORD })).status,
    ).toBe(400)
    expect((await logIn(new Jar(), 'reset-late', OTHER)).status).toBe(200)
  })

  it('ends the account`s API tokens with a reset, and a session a list of sessions missed', async () => {
    const jar = await verified('reset-all', 'reset-all@example.com')
    const made = await post(jar, '/api/me/tokens', { name: 'ci' })
    const { secret } = (await made.json()) as { secret: string }
    const bearer = { headers: { Authorization: `Bearer ${secret}` }, origin: null }
    expect((await call(new Jar(), '/api/me', bearer)).status).toBe(200)
    // A session of the old password, as KV holds it.
    const id = decodeURIComponent(jar.cookies.get('__Host-session') ?? '').split('.')[0] ?? ''
    const kept = await env.KV.get(`sess:${id}`)
    expect(kept).toContain('"pw"')

    await ask('reset-all')
    const token = tokenIn(await mailTo('reset-all@example.com'), 'reset')
    expect((await post(new Jar(), '/api/auth/reset', { token, password: OTHER })).status).toBe(204)
    expect((await call(new Jar(), '/api/me', bearer)).status).toBe(401)
    // The session comes back, as one would that the list of sessions missed or that a sign-in
    // with the old password wrote beside the reset: it is of a password since replaced.
    await env.KV.put(`sess:${id}`, kept ?? '')
    expect(await whoAmI(jar)).toBeNull()
    expect(await env.KV.get(`sess:${id}`)).toBeNull()
    // A session of the new password stands.
    const back = new Jar()
    await logIn(back, 'reset-all', OTHER)
    expect((await whoAmI(back))?.user.handle).toBe('reset-all')
  })

  it('voids a reset link when the account email changes after it was mailed', async () => {
    const jar = await verified('reset-moved', 'moved-old@example.com')
    await ask('reset-moved')
    const token = tokenIn(await mailTo('moved-old@example.com'), 'reset')
    const moved = await post(jar, '/api/me/email', {
      email: 'moved-new@example.com',
      password: PASSWORD,
    })
    expect(moved.status).toBe(200)
    expect((await post(new Jar(), '/api/auth/reset', { token, password: OTHER })).status).toBe(400)
    // The new address is not verified yet, so nothing recovers the account.
    await mailTo('moved-new@example.com')
    await ask('moved-new@example.com')
    await ask('moved-old@example.com')
    expect(await mailTo('moved-new@example.com')).toBeNull()
    expect((await mailTo('moved-old@example.com'))?.subject).toBe(
      'ASM Bots: your account email changed',
    )
  })

  it('mails one account three links in half an hour, and an IP asks five times an hour', async () => {
    await verified('rec-budget', 'rec-budget@example.com')
    for (let i = 0; i < 3; i++) {
      await ask('rec-budget')
      expect(await mailTo('rec-budget@example.com')).not.toBeNull()
    }
    expect((await ask('rec-budget')).status).toBe(202)
    expect(await mailTo('rec-budget@example.com')).toBeNull()

    const ip = '203.0.113.40'
    for (let i = 0; i < 5; i++) {
      expect((await post(new Jar(ip), '/api/auth/recover', { login: `whoever-${i}` })).status).toBe(
        202,
      )
    }
    expect((await post(new Jar(ip), '/api/auth/recover', { login: 'whoever' })).status).toBe(429)
  })

  it('is off with no mail transport, and says so', async () => {
    expect(await errorOf(await ask('anyone', { vars: NO_MAIL }))).toMatchObject({
      status: 503,
      code: 'unavailable',
    })
  })

  it('links to SITE_URL in production, whatever host or origin the request names', async () => {
    const sent: unknown[] = []
    const binding = {
      send: async (message: unknown) => void sent.push(message),
    } as unknown as SendEmail
    const PROD: Env = { ...env, EMAIL: binding, MAIL_FROM: 'accounts@asmbots.example' }
    const preview = 'https://preview.attacker.example'
    const jar = new Jar()
    const made = await post(
      jar,
      '/api/auth/signup',
      { username: 'prod-mail', password: PASSWORD, email: 'prod@example.com' },
      { vars: PROD, site: preview },
    )
    expect(made.status).toBe(201)
    await settle()
    expect(sent).toHaveLength(1)
    const message = sent[0] as {
      from: unknown
      to: string
      subject: string
      text: string
      html?: string
    }
    expect(message.from).toEqual({ name: 'ASM Bots', email: 'accounts@asmbots.example' })
    expect(message.to).toBe('prod@example.com')
    expect(message.html).toBeUndefined()
    expect(message.text).toMatch(new RegExp(`^${env.SITE_URL}/auth/verify#[0-9a-f]{64}$`, 'm'))
    expect(message.text).not.toContain('attacker')
    // The test transport never runs off localhost, so no link is in KV or the log there.
    expect(await env.KV.get(testMailKey('prod@example.com'))).toBeNull()
  })
})

describe('a password account and a GitHub account', () => {
  it('never join on a handle: each sign-in finds only its own kind', async () => {
    const octo = new Jar()
    await signIn(octo, 'octo-first')
    const taken = await post(new Jar(), '/api/auth/signup', {
      username: 'octo-first',
      password: PASSWORD,
    })
    expect(taken.status).toBe(409)
    expect((await logIn(new Jar(), 'octo-first', PASSWORD)).status).toBe(401)
    expect(await credentialsOf(octo)).toEqual({
      method: 'github',
      email: null,
      emailVerified: false,
      mail: true,
    })

    // The other way: a GitHub login the same as a password account's username gets its own user.
    const mallory = await signUp('mallory')
    const real = new Jar()
    await signIn(real, 'mallory')
    const [mine, theirs] = [await whoAmI(mallory), await whoAmI(real)]
    expect(mine?.user.handle).toBe('mallory')
    expect(theirs?.user.handle).toMatch(/^mallory-[0-9a-f]{4}$/)
    expect(theirs?.user.id).not.toBe(mine?.user.id)
    expect(theirs?.user.github).toBe('mallory')
    expect(mine?.user.github).toBeUndefined()
    expect((await logIn(new Jar(), theirs?.user.handle ?? '', PASSWORD)).status).toBe(401)
  })

  it('never join on an email: GitHub`s address recovers nothing and links nothing', async () => {
    const octo = new Jar()
    await signIn(octo, 'octo-mail')
    await env.DB.prepare(
      "UPDATE users SET email = 'both@example.com' WHERE handle = 'octo-mail'",
    ).run()
    const octoId = (await whoAmI(octo))?.user.id

    const twin = await verified('twin', 'both@example.com')
    const twinId = (await whoAmI(twin))?.user.id
    expect(twinId).not.toBe(octoId)

    await post(new Jar(), '/api/auth/recover', { login: 'both@example.com' })
    const token = tokenIn(await mailTo('both@example.com'), 'reset')
    expect((await post(new Jar(), '/api/auth/reset', { token, password: OTHER })).status).toBe(204)
    // The reset was the password account's: the GitHub account kept its session and has no password.
    expect((await whoAmI(octo))?.user.id).toBe(octoId)
    expect(await whoAmI(twin)).toBeNull()
    expect((await logIn(new Jar(), 'octo-mail', OTHER)).status).toBe(401)
    const rows = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM password_credentials WHERE user_id = ?',
    )
      .bind(octoId)
      .first<{ n: number }>()
    expect(rows?.n).toBe(0)
    // GitHub sign-in still finds its own user, not the one with its address.
    const again = new Jar()
    await signIn(again, 'octo-mail')
    expect((await whoAmI(again))?.user.id).toBe(octoId)
  })

  it('gives a GitHub account no password to change and no email to set', async () => {
    const octo = new Jar()
    await signIn(octo, 'octo-settings')
    const password = await post(octo, '/api/me/password', { current: PASSWORD, password: OTHER })
    expect(await errorOf(password)).toMatchObject({ status: 409, code: 'conflict' })
    expect(
      (await post(octo, '/api/me/email', { email: 'x@example.com', password: PASSWORD })).status,
    ).toBe(409)
    expect((await post(octo, '/api/me/email/verify', undefined)).status).toBe(409)
    expect((await logIn(new Jar(), 'octo-settings', OTHER)).status).toBe(401)
  })
})

describe('the account`s password and email', () => {
  it('changes the password with the current one: other sessions end, this one goes on', async () => {
    const jar = await verified('change-pw', 'change-pw@example.com')
    const elsewhere = new Jar()
    await logIn(elsewhere, 'change-pw', PASSWORD)
    const before = jar.cookies.get('__Host-session')

    expect(
      await errorOf(await post(jar, '/api/me/password', { current: OTHER, password: OTHER })),
    ).toEqual({
      status: 403,
      code: 'forbidden',
      message: 'the current password is wrong',
    })
    expect(
      (await post(jar, '/api/me/password', { current: PASSWORD, password: 'short' })).status,
    ).toBe(400)
    expect(
      (await post(jar, '/api/me/password', { current: PASSWORD, password: PASSWORD })).status,
    ).toBe(400)
    expect(
      (await post(jar, '/api/me/password', { current: PASSWORD, password: OTHER })).status,
    ).toBe(204)

    expect(jar.cookies.get('__Host-session')).not.toBe(before)
    expect((await whoAmI(jar))?.user.handle).toBe('change-pw')
    expect(await whoAmI(elsewhere)).toBeNull()
    expect((await logIn(new Jar(), 'change-pw', PASSWORD)).status).toBe(401)
    expect((await logIn(new Jar(), 'change-pw', OTHER)).status).toBe(200)
    expect(await audit(jar)).toContain('password.change')
    expect((await mailTo('change-pw@example.com'))?.subject).toBe('ASM Bots: your password changed')
  })

  it('stops after five wrong current passwords, the right one too', async () => {
    const jar = await signUp('change-limit')
    for (let i = 0; i < 5; i++) {
      expect(
        (await post(jar, '/api/me/password', { current: OTHER, password: OTHER })).status,
      ).toBe(403)
    }
    expect(
      (await post(jar, '/api/me/password', { current: PASSWORD, password: OTHER })).status,
    ).toBe(429)
    expect((await post(jar, '/api/me/email', { email: null, password: PASSWORD })).status).toBe(429)
  })

  it('sets, changes, and removes the email, each with the password, each unverified anew', async () => {
    const jar = await signUp('change-mail')
    const set = (email: string | null, password = PASSWORD, vars = MAIL) =>
      post(jar, '/api/me/email', { email, password }, { vars })
    expect((await set('first@example.com', OTHER)).status).toBe(403)
    expect((await set('not an address')).status).toBe(400)
    expect(await errorOf(await set('first@example.com', PASSWORD, NO_MAIL))).toMatchObject({
      status: 400,
    })

    const first = await set(' First@Example.com ')
    expect(parse(Credentials, await first.json(), 'the credentials')).toEqual({
      method: 'password',
      email: 'first@example.com',
      emailVerified: false,
      mail: true,
    })
    const token = tokenIn(await mailTo('first@example.com'), 'verify')
    expect((await post(new Jar(), '/api/auth/verify-email', { token })).status).toBe(204)
    expect((await credentialsOf(jar)).emailVerified).toBe(true)

    // The same address again changes nothing: it stays verified, and no mail goes.
    expect((await set('first@example.com')).status).toBe(200)
    expect((await credentialsOf(jar)).emailVerified).toBe(true)
    expect(await mailTo('first@example.com')).toBeNull()

    expect((await set('second@example.com')).status).toBe(200)
    expect(await credentialsOf(jar)).toMatchObject({
      email: 'second@example.com',
      emailVerified: false,
    })
    expect((await mailTo('first@example.com'))?.subject).toBe(
      'ASM Bots: your account email changed',
    )
    const stale = tokenIn(await mailTo('second@example.com'), 'verify')

    expect((await set(null)).status).toBe(200)
    expect(await credentialsOf(jar)).toMatchObject({ email: null, emailVerified: false })
    expect((await post(new Jar(), '/api/auth/verify-email', { token: stale })).status).toBe(400)
    expect(await errorOf(await post(jar, '/api/me/email/verify', undefined))).toMatchObject({
      status: 400,
    })
    expect((await audit(jar)).filter((a) => a === 'email.change')).toHaveLength(3)
  })

  it('sets five new addresses an hour, each one mailed a link', async () => {
    const jar = await signUp('mail-cannon')
    for (let i = 0; i < 5; i++) {
      const res = await post(jar, '/api/me/email', {
        email: `victim-${i}@example.com`,
        password: PASSWORD,
      })
      expect(res.status).toBe(200)
    }
    const sixth = await post(jar, '/api/me/email', {
      email: 'victim-6@example.com',
      password: PASSWORD,
    })
    expect(await errorOf(sixth)).toMatchObject({ status: 429, code: 'rate_limited' })
    expect(await mailTo('victim-6@example.com')).toBeNull()
    // Removing the email mails nobody: it is not counted.
    expect((await post(jar, '/api/me/email', { email: null, password: PASSWORD })).status).toBe(200)
  })

  it('refuses an API token and a signed-out reader', async () => {
    const jar = await signUp('token-holder')
    const made = await post(jar, '/api/me/tokens', { name: 'ci' })
    const { secret } = (await made.json()) as { secret: string }
    const bearer = { headers: { Authorization: `Bearer ${secret}` }, origin: null }
    expect((await call(new Jar(), '/api/me/credentials', bearer)).status).toBe(403)
    expect(
      (await post(new Jar(), '/api/me/password', { current: PASSWORD, password: OTHER }, bearer))
        .status,
    ).toBe(403)
    expect(
      (await post(new Jar(), '/api/me/email', { email: null, password: PASSWORD }, bearer)).status,
    ).toBe(403)
    expect((await call(new Jar(), '/api/me/credentials')).status).toBe(401)
    expect(
      (await post(new Jar(), '/api/me/password', { current: PASSWORD, password: OTHER })).status,
    ).toBe(401)
    // A token still does what a token does, for a password account as for any.
    expect((await call(new Jar(), '/api/me', bearer)).status).toBe(200)
  })

  it('goes with the account when it is deleted, and frees the username', async () => {
    const jar = await signUp('to-delete', { email: 'to-delete@example.com' })
    const id = (await whoAmI(jar))?.user.id
    expect((await call(jar, '/api/me', { method: 'DELETE' })).status).toBe(204)
    for (const table of ['password_credentials', 'auth_tokens']) {
      const left = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`)
        .bind(id)
        .first<{ n: number }>()
      expect(left?.n).toBe(0)
    }
    expect((await logIn(new Jar(), 'to-delete', PASSWORD)).status).toBe(401)
    const reborn = await signUp('to-delete', { password: OTHER })
    expect((await whoAmI(reborn))?.user.id).not.toBe(id)
  })
})
