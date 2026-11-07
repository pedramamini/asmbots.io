/**
 * The sign-in pages (`/auth/...`) and the settings page's password panel, against `msw`: sign in,
 * make an account with and without an email, ask for a reset link, set a new password from one,
 * verify an email, and what each page says of an account that cannot be recovered.
 */
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { type AuthMethods, type Credentials, type Me, routeTitle } from '@asmbots/protocol'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { useDom, window } from '../../../packages/ui/test/dom'
import { SettingsPage } from '../src/app/SettingsPage'
import { AuthPage } from '../src/features/account/auth/AuthPage'
import { CredentialsPanel } from '../src/features/account/CredentialsPanel'
import { answer, renderAt, useApiServer } from './api-server'

useDom()
window.scrollTo = () => {}

const T = '2026-10-13T12:00:00.000Z'
const ADA: Me = {
  user: { id: 'u1', handle: 'ada', avatarUrl: null, createdAt: T, anonymous: false },
  onboarded: true,
}
const ALL: AuthMethods = { github: true, password: true, signup: true, mail: true }
const NO_MAIL: AuthMethods = { ...ALL, mail: false }
const TOKEN = 'ab'.repeat(32)
const PASSWORD = 'correct horse battery'
const LOST = 'a forgotten password cannot be reset, by you or by us: the account is lost with it.'

const server = useApiServer()

function signedIn(on: boolean) {
  // biome-ignore lint/suspicious/noDocumentCookie: the hint cookie the API would set
  document.cookie = on ? 'signed_in=1; Path=/' : 'signed_in=; Max-Age=0; Path=/'
}

beforeEach(() => signedIn(false))
afterEach(() => signedIn(false))

/** `POST /api<path>` answers `status` (and `body`), and puts each request's JSON body in `seen`. */
function post(path: string, seen: unknown[], status = 204, body?: unknown) {
  return http.post(`*/api${path}`, async ({ request }) => {
    seen.push(await request.json())
    return body === undefined
      ? new HttpResponse(null, { status })
      : HttpResponse.json(body as object, { status })
  })
}

const refusal = (code: string, message: string) => ({ error: { code, message } })

/** The sign-in page `page`, at `url` under `/auth/`. */
const open = (page: string, url = `/auth/${page}`) =>
  renderAt(url, () => <AuthPage page={page} />, '/auth/$')

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const button = (name: string) =>
  screen.getByRole('button', { name, exact: true } as never) as HTMLButtonElement

describe('/auth/login', () => {
  it('signs in with a username and a password, then goes back where it was asked', async () => {
    const seen: unknown[] = []
    server.use(answer('/auth/methods', ALL), post('/auth/login', seen, 200, ADA))
    const router = await open('login', '/auth/login?returnTo=%2Fhills')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('sign in')
    expect(document.title).toBe(routeTitle('account', 'sign in'))
    expect(button('sign in with github')).toBeTruthy()
    expect(button('sign in').disabled).toBe(true)
    type('username', 'Ada')
    type('password', PASSWORD)
    fireEvent.click(button('sign in'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/hills'))
    expect(seen).toEqual([{ username: 'Ada', password: PASSWORD }])
  })

  it('says what the API said when the password is wrong, and stays', async () => {
    server.use(
      answer('/auth/methods', ALL),
      post('/auth/login', [], 401, refusal('unauthorized', 'wrong username or password')),
    )
    const router = await open('login')
    type('username', 'ada')
    type('password', 'not the password')
    fireEvent.click(button('sign in'))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('wrong username or password'),
    )
    expect(router.state.location.pathname).toBe('/auth/login')
    expect(button('sign in').disabled).toBe(false)
  })

  it('goes home after a sign-in asked from another site, or from one of these pages', async () => {
    for (const returnTo of [
      '//evil.example/x',
      'https://evil.example',
      '/\t/evil.example',
      '/\\evil.example',
      '/auth/signup',
    ]) {
      server.use(answer('/auth/methods', ALL), post('/auth/login', [], 200, ADA))
      const router = await open('login', `/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
      type('username', 'ada')
      type('password', PASSWORD)
      fireEvent.click(button('sign in'))
      await waitFor(() => expect(router.state.location.pathname).toBe('/'))
      cleanup()
    }
  })

  it('offers only what is on: no password form, no sign-up link, no github', async () => {
    server.use(
      answer('/auth/methods', { github: false, password: false, signup: false, mail: false }),
    )
    await open('login')
    expect(await screen.findByText(/signing in with a password is off/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'sign in with github' })).toBeNull()
    expect(screen.queryByLabelText('username')).toBeNull()
    expect(screen.queryByRole('link', { name: 'make one' })).toBeNull()
  })

  it('tells a signed-in reader who they are, and shows no form', async () => {
    signedIn(true)
    server.use(answer('/auth/methods', ALL), answer('/me', ADA))
    await open('login', '/auth/login?returnTo=%2Fhills')
    expect(await screen.findByText('ada')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'continue' }).getAttribute('href')).toBe('/hills')
    expect(screen.queryByLabelText('password')).toBeNull()
  })
})

describe('/auth/signup', () => {
  it('says plainly that an account with no verified email cannot be recovered', async () => {
    server.use(answer('/auth/methods', ALL))
    await open('signup')
    const note = await screen.findByRole('note')
    expect(note.textContent).toContain(
      'an email is optional, and without one there is no way back.',
    )
    expect(note.textContent).toContain(LOST)
    expect(screen.getByLabelText('email (optional)')).toBeTruthy()
  })

  it('takes no email, and says there is no reset at all, when the server sends no mail', async () => {
    server.use(answer('/auth/methods', NO_MAIL))
    await open('signup')
    const note = await screen.findByRole('note')
    expect(note.textContent).toContain('there is no password reset here.')
    expect(note.textContent).toContain(LOST)
    expect(screen.queryByLabelText('email (optional)')).toBeNull()
  })

  it('checks each field as it is typed, and makes the account only when all are good', async () => {
    const seen: unknown[] = []
    server.use(answer('/auth/methods', ALL), post('/auth/signup', seen, 201, ADA))
    const router = await open('signup', '/auth/signup?returnTo=%2Feditor')
    await screen.findByLabelText('email (optional)')
    const make = button('make the account')
    expect(make.disabled).toBe(true)

    type('username', 'A')
    expect((screen.getByLabelText('username') as HTMLInputElement).value).toBe('a')
    expect(screen.getByText('a handle is 3 to 24 characters')).toBeTruthy()
    type('username', 'ada')
    type('password', 'short')
    expect(screen.getByText('a password is at least 15 characters')).toBeTruthy()
    type('password', PASSWORD)
    type('password, again', 'correct horse batteri')
    expect(screen.getByText('the two passwords differ')).toBeTruthy()
    expect(make.disabled).toBe(true)
    type('password, again', PASSWORD)
    expect(make.disabled).toBe(false)
    type('email (optional)', 'not an address')
    expect(screen.getByText('that is not an email address')).toBeTruthy()
    expect(make.disabled).toBe(true)
    type('email (optional)', '')

    fireEvent.click(make)
    await waitFor(() => expect(router.state.location.pathname).toBe('/editor'))
    // No email was typed: none is sent, not even an empty one.
    expect(seen).toEqual([{ username: 'ada', password: PASSWORD }])
  })

  it('sends the email it was given, trimmed and lowercase', async () => {
    const seen: unknown[] = []
    server.use(answer('/auth/methods', ALL), post('/auth/signup', seen, 201, ADA))
    await open('signup')
    await screen.findByLabelText('email (optional)')
    type('username', 'ada')
    type('password', PASSWORD)
    type('password, again', PASSWORD)
    type('email (optional)', '  Ada@Example.com ')
    fireEvent.click(button('make the account'))
    await waitFor(() => expect(seen).toHaveLength(1))
    expect(seen[0]).toEqual({ username: 'ada', password: PASSWORD, email: 'ada@example.com' })
  })

  it('says so when the username is taken', async () => {
    server.use(
      answer('/auth/methods', NO_MAIL),
      post('/auth/signup', [], 409, refusal('conflict', 'ada is taken')),
    )
    await open('signup')
    type('username', 'ada')
    type('password', PASSWORD)
    type('password, again', PASSWORD)
    fireEvent.click(button('make the account'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('ada is taken'))
  })

  it('says new accounts are closed when they are', async () => {
    server.use(answer('/auth/methods', { ...ALL, signup: false }))
    await open('signup')
    expect(await screen.findByText(/new password accounts are closed/)).toBeTruthy()
    expect(screen.queryByLabelText('username')).toBeNull()
  })
})

describe('/auth/forgot', () => {
  it('asks for a link and answers the same whoever was named', async () => {
    const seen: unknown[] = []
    server.use(answer('/auth/methods', ALL), post('/auth/recover', seen, 202, {}))
    await open('forgot')
    expect(screen.getByRole('note').textContent).toContain(LOST)
    type('username or email', ' ada@example.com ')
    fireEvent.click(button('mail a reset link'))
    expect(
      await screen.findByText(/if that account has a verified email, a reset link is on its way/),
    ).toBeTruthy()
    expect(seen).toEqual([{ login: 'ada@example.com' }])
    expect(screen.queryByLabelText('username or email')).toBeNull()
  })

  it('says no password can be reset when the server sends no mail', async () => {
    server.use(answer('/auth/methods', NO_MAIL))
    await open('forgot')
    expect(await screen.findByText('no password can be reset here.')).toBeTruthy()
    expect(screen.queryByLabelText('username or email')).toBeNull()
  })
})

describe('/auth/reset', () => {
  it('sets a new password with the token of the link it opened from', async () => {
    const seen: unknown[] = []
    server.use(post('/auth/reset', seen))
    await open('reset', `/auth/reset#${TOKEN}`)
    type('new password', PASSWORD)
    type('new password, again', PASSWORD)
    fireEvent.click(button('set the password'))
    expect((await screen.findByRole('status')).textContent).toContain('the password is changed')
    expect(seen).toEqual([{ token: TOKEN, password: PASSWORD }])
    expect(screen.getByRole('link', { name: 'sign in' }).getAttribute('href')).toBe('/auth/login')
  })

  it('says a link is bad in the API`s words, and offers a new one', async () => {
    const message = 'the link is not valid or has expired: ask for a new one'
    server.use(post('/auth/reset', [], 400, refusal('bad_request', message)))
    await open('reset', `/auth/reset#${TOKEN}`)
    type('new password', PASSWORD)
    type('new password, again', PASSWORD)
    fireEvent.click(button('set the password'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(message))
    expect(screen.getByRole('link', { name: 'ask for a new link' }).getAttribute('href')).toBe(
      '/auth/forgot',
    )
  })

  it('asks for nothing when it was not opened from a link', async () => {
    for (const url of ['/auth/reset', '/auth/reset#not-a-token']) {
      await open('reset', url)
      expect(screen.getByText(/this page opens from the link in a reset mail/)).toBeTruthy()
      expect(screen.queryByLabelText('new password')).toBeNull()
      cleanup()
    }
  })
})

describe('/auth/verify', () => {
  it('verifies the address on a click, with the token of the link', async () => {
    const seen: unknown[] = []
    server.use(post('/auth/verify-email', seen))
    await open('verify', `/auth/verify#${TOKEN}`)
    fireEvent.click(button('verify this email'))
    expect((await screen.findByRole('status')).textContent).toContain(
      'verified. this address can now reset the account password.',
    )
    expect(seen).toEqual([{ token: TOKEN }])
  })

  it('says why not when another account verified the address first', async () => {
    const message = 'that email is verified on another account'
    server.use(post('/auth/verify-email', [], 409, refusal('conflict', message)))
    await open('verify', `/auth/verify#${TOKEN}`)
    fireEvent.click(button('verify this email'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(message))
  })

  it('offers nothing to verify without a link', async () => {
    await open('verify')
    expect(screen.getByText(/this page opens from the link in a verification mail/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'verify this email' })).toBeNull()
  })
})

describe('the settings page`s password panel', () => {
  const credentials = (over: Partial<Credentials> = {}): Credentials => ({
    method: 'password',
    email: null,
    emailVerified: false,
    mail: true,
    ...over,
  })

  async function panel(now: Credentials) {
    signedIn(true)
    server.use(answer('/me', ADA), answer('/me/credentials', now))
    await renderAt('/', () => <CredentialsPanel />)
    return screen.findByRole('region', { name: 'password and recovery' })
  }

  it('warns an account with no email that it cannot be recovered', async () => {
    const region = await panel(credentials())
    expect(region.textContent).toContain('no email')
    const note = within(region).getByRole('note')
    expect(note.textContent).toContain('this account has no email, so it cannot be recovered.')
    expect(note.textContent).toContain(LOST)
    expect(note.textContent).toContain('add an email below')
  })

  it('says no email can be added when the server sends no mail, and shows no email form', async () => {
    const region = await panel(credentials({ mail: false }))
    expect(within(region).getByRole('note').textContent).toContain('this server sends no mail')
    expect(within(region).queryByLabelText('email')).toBeNull()
    expect(within(region).getByLabelText('current password')).toBeTruthy()
  })

  it('warns that an unverified email recovers nothing, and mails the link again', async () => {
    const seen: unknown[] = []
    server.use(post('/me/email/verify', seen, 202, {}))
    const region = await panel(credentials({ email: 'ada@example.com' }))
    expect(region.textContent).toContain('email not verified')
    expect(within(region).getByRole('note').textContent).toContain(
      'ada@example.com is not verified, so this account cannot be recovered yet.',
    )
    fireEvent.click(within(region).getByRole('button', { name: 'mail the link again' }))
    expect(await screen.findByText('a new link is on its way to ada@example.com.')).toBeTruthy()
    expect(seen).toEqual([{}])
  })

  it('says recovery is on once the email is verified', async () => {
    const region = await panel(credentials({ email: 'ada@example.com', emailVerified: true }))
    expect(region.textContent).toContain('email verified')
    expect(region.textContent).toContain('recovery is on.')
    expect(within(region).queryByRole('note')).toBeNull()
  })

  it('changes the password with the current one, and says a wrong one under its field', async () => {
    const seen: unknown[] = []
    server.use(
      post('/me/password', seen, 403, refusal('forbidden', 'the current password is wrong')),
    )
    const region = await panel(credentials())
    const change = within(region).getByRole('button', { name: 'change password' })
    expect((change as HTMLButtonElement).disabled).toBe(true)
    type('current password', 'not the password')
    type('new password', PASSWORD)
    type('new password, again', PASSWORD)
    fireEvent.click(change)
    expect(await within(region).findByText('the current password is wrong')).toBeTruthy()

    server.use(post('/me/password', seen))
    type('current password', 'the old password')
    fireEvent.click(change)
    expect(
      await screen.findByText('the password is changed. every other session is signed out.'),
    ).toBeTruthy()
    expect(seen).toEqual([
      { current: 'not the password', password: PASSWORD },
      { current: 'the old password', password: PASSWORD },
    ])
    expect((screen.getByLabelText('current password') as HTMLInputElement).value).toBe('')
  })

  it('sets an email with the password, and removes it', async () => {
    const seen: unknown[] = []
    const set = credentials({ email: 'ada@example.com' })
    server.use(post('/me/email', seen, 200, set))
    const region = await panel(credentials())
    const save = within(region).getByRole('button', { name: 'save email' }) as HTMLButtonElement
    type('email', ' Ada@Example.com ')
    expect(save.disabled).toBe(true)
    type('password, to change the email', PASSWORD)
    fireEvent.click(save)
    expect(
      await screen.findByText('a verification link is on its way to ada@example.com.'),
    ).toBeTruthy()
    await waitFor(() => expect(region.textContent).toContain('email not verified'))

    server.use(post('/me/email', seen, 200, credentials()))
    type('password, to change the email', PASSWORD)
    fireEvent.click(await within(region).findByRole('button', { name: 'remove email' }))
    await waitFor(() => expect(region.textContent).toContain('no email'))
    expect(seen).toEqual([
      { email: 'ada@example.com', password: PASSWORD },
      { email: null, password: PASSWORD },
    ])
  })

  it('is not there for an account that signs in with github', async () => {
    signedIn(true)
    server.use(answer('/me', ADA))
    await renderAt('/', () => <CredentialsPanel />)
    await waitFor(() => expect(document.cookie).toContain('signed_in=1'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.queryByRole('region', { name: 'password and recovery' })).toBeNull()
  })

  it('loads on the settings page for a password account, and not for a github one', async () => {
    signedIn(true)
    let asked = 0
    const counted = http.get('*/api/me/credentials', () => {
      asked += 1
      return HttpResponse.json(credentials())
    })
    const rest = [answer('/me/bots', { bots: [] }), answer('/me/tokens', { tokens: [] }), counted]
    server.use(answer('/me', { ...ADA, user: { ...ADA.user, github: 'ada-l' } }), ...rest)
    await renderAt('/', () => <SettingsPage />)
    const account = await screen.findByRole('region', { name: 'account' })
    await waitFor(() => expect(account.textContent).toContain('github: linked'))
    expect(screen.queryByRole('region', { name: 'password and recovery' })).toBeNull()
    expect(asked).toBe(0)
    cleanup()

    server.use(answer('/me', ADA), ...rest)
    await renderAt('/', () => <SettingsPage />)
    expect(await screen.findByRole('region', { name: 'password and recovery' })).toBeTruthy()
    const again = await screen.findByRole('region', { name: 'account' })
    expect(again.textContent).not.toContain('github: linked')
    expect(asked).toBe(1)
  })
})

describe('a page that is not one', () => {
  it('is not found', async () => {
    await open('nowhere')
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('0x404')
  })
})
