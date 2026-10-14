/**
 * The sign-in pages (`/auth/...`): sign in with GitHub or a password, make a password account,
 * ask for a reset link, set a new password from one, and verify an email from its link. A mailed
 * link carries its token after `#`, which the page reads and posts: a fragment goes to no server.
 */
import {
  AUTH_TOKEN,
  emailProblem,
  handleProblem,
  type Me,
  normalizeEmail,
  routeTitle,
} from '@asmbots/protocol'
import { Button, Panel } from '@asmbots/ui'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import {
  credentialsQuery,
  logIn,
  recoverAccount,
  resetPassword,
  signInHref,
  signUp,
  useAuthMethods,
  verifyEmail,
} from '../../../api/auth'
import { useMe } from '../../../api/queries'
import { GitHubIcon } from '../../../app/github-icon'
import { NotFound } from '../../../app/NotFound'
import { PageHeading } from '../../../app/PageHeading'
import {
  Field,
  NewPasswordFields,
  NO_RECOVERY,
  newPassword,
  TEXT_LINK,
  Warning,
  whyFailed,
} from './fields'

/**
 * A path on this site, and not one of these pages: where a sign-in may go back to. No whitespace:
 * a browser drops a tab or a newline from an address, and `/<tab>/host` would then read `//host`.
 */
const RETURNABLE = /^\/(?![/\\]|auth\/)\S*$/

/** `?returnTo=`, the page that asked for a sign-in, when it is one to go back to; else home. */
function useReturnTo(): string {
  const returnTo = useRouterState({
    select: (state) => (state.location.search as { returnTo?: unknown }).returnTo,
  })
  return typeof returnTo === 'string' && RETURNABLE.test(returnTo) ? returnTo : '/'
}

export function AuthPage({ page }: { page: string }) {
  const back = useReturnTo()
  switch (page) {
    case 'login':
      return <LogInPage back={back} />
    case 'signup':
      return <SignUpPage back={back} />
    case 'forgot':
      return <ForgotPage />
    case 'reset':
      return <ResetPage />
    case 'verify':
      return <VerifyPage />
    default:
      return <NotFound />
  }
}

/**
 * One of these pages: its name for a screen reader and for the tab, and its panel in a narrow
 * column. The tab's title is set here: the route has no `head` (`routes/auth/$.tsx` says why).
 */
function Sheet({ heading, children }: { heading: string; children: ReactNode }) {
  useEffect(() => {
    document.title = routeTitle('account', heading)
  }, [heading])
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 p-3">
      <PageHeading>{heading}</PageHeading>
      <Panel title={heading}>
        <div className="flex flex-col gap-3">{children}</div>
      </Panel>
    </div>
  )
}

/** A link to another of these pages, keeping where to go back to. */
function PageLink({ page, back, children }: { page: string; back?: string; children: string }) {
  return (
    <Link
      to="/auth/$"
      params={{ _splat: page }}
      search={(back === undefined || back === '/' ? {} : { returnTo: back }) as never}
      className={TEXT_LINK}
    >
      {children}
    </Link>
  )
}

function ErrorLine({ children }: { children: string | null }) {
  return (
    <p role="alert" className="min-h-4 text-data text-danger">
      {children ?? ''}
    </p>
  )
}

/** Takes the account a sign-in answered into the query cache, then goes back where it was asked. */
function useFinish(back: string): (me: Me) => Promise<void> {
  const client = useQueryClient()
  const router = useRouter()
  return async (me) => {
    // Nothing of an account this browser was signed in to before stays.
    client.removeQueries({ queryKey: ['me'] })
    client.setQueryData(['me'], me)
    await client.invalidateQueries({ queryKey: ['users'] })
    router.history.push(back)
  }
}

/** For a reader who is signed in already: who as, and the way on. */
function SignedIn({ me, back }: { me: Me; back: string }) {
  return (
    <Sheet heading="sign in">
      <p className="text-muted">
        signed in as <span className="text-bright">{me.user.handle}</span>.{' '}
        <a href={back} className={TEXT_LINK}>
          continue
        </a>
      </p>
    </Sheet>
  )
}

function GitHubButton({ back }: { back: string }) {
  return (
    <Button icon={GitHubIcon} onClick={() => window.location.assign(signInHref(back))}>
      sign in with github
    </Button>
  )
}

function LogInPage({ back }: { back: string }) {
  const { data: methods } = useAuthMethods()
  const { data: me } = useMe()
  const finish = useFinish(back)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (me) return <SignedIn me={me} back={back} />
  const ready = username.trim() !== '' && password !== ''

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    try {
      await finish(await logIn({ username, password }))
    } catch (failure) {
      setError(whyFailed(failure))
      setBusy(false)
    }
  }

  return (
    <Sheet heading="sign in">
      {methods?.github !== false && (
        <div className="flex flex-col items-start gap-2">
          <GitHubButton back={back} />
        </div>
      )}
      {methods?.password === false ? (
        <p className="text-muted">signing in with a password is off on this server.</p>
      ) : (
        <form className="flex flex-col gap-2" onSubmit={(event) => void submit(event)}>
          <p className="text-panel-status text-muted">or with a username and a password</p>
          <Field
            label="username"
            autoComplete="username"
            maxLength={39}
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
          />
          <Field
            label="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
          <ErrorLine>{error}</ErrorLine>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" loading={busy} disabled={!ready}>
              sign in
            </Button>
            <PageLink page="forgot">forgot the password?</PageLink>
          </div>
        </form>
      )}
      {methods?.signup !== false && (
        <p className="text-muted">
          no account?{' '}
          <PageLink page="signup" back={back}>
            make one
          </PageLink>
          : a username and a password, no email needed.
        </p>
      )}
    </Sheet>
  )
}

function SignUpPage({ back }: { back: string }) {
  const { data: methods } = useAuthMethods()
  const { data: me } = useMe()
  const finish = useFinish(back)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (me) return <SignedIn me={me} back={back} />
  if (methods?.signup === false) {
    return (
      <Sheet heading="new account">
        <p className="text-muted">new password accounts are closed on this server.</p>
        <p className="text-muted">
          <PageLink page="login" back={back}>
            sign in
          </PageLink>
        </p>
      </Sheet>
    )
  }
  // Mail is off until the server says it is on: the field shows only when an email can be kept.
  const mail = methods?.mail === true
  const typed = normalizeEmail(email)
  const nameProblem = username === '' ? null : handleProblem(username)
  const mailProblem = typed === '' ? null : emailProblem(typed)
  const pass = newPassword(password, again, username)
  const ready = username !== '' && nameProblem === null && pass.ready && mailProblem === null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    try {
      const account = { username, password, ...(mail && typed !== '' && { email: typed }) }
      await finish(await signUp(account))
    } catch (failure) {
      setError(whyFailed(failure))
      setBusy(false)
    }
  }

  return (
    <Sheet heading="new account">
      <form className="flex flex-col gap-2" onSubmit={(event) => void submit(event)}>
        <Field
          label="username"
          autoComplete="username"
          maxLength={24}
          value={username}
          problem={nameProblem}
          hint={`3 to 24 of a-z, 0-9, and -. it is your handle: /u/${username || '…'}`}
          onChange={(event) => setUsername(event.currentTarget.value.toLowerCase())}
        />
        <NewPasswordFields
          password={password}
          again={again}
          username={username}
          onPassword={setPassword}
          onAgain={setAgain}
        />
        {mail && (
          <Field
            label="email (optional)"
            type="email"
            autoComplete="email"
            value={email}
            problem={mailProblem}
            hint="only to reset a forgotten password. never shown, never mailed anything else."
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
        )}
        {mail ? (
          <Warning>
            <b>an email is optional, and without one there is no way back.</b> with no email, or
            with one you never verify, {NO_RECOVERY} give an email and open the link we mail to it,
            and that address can reset the password.
          </Warning>
        ) : (
          <Warning>
            <b>there is no password reset here.</b> this server sends no mail, so an account holds
            no email, and {NO_RECOVERY} keep the password in a password manager.
          </Warning>
        )}
        <ErrorLine>{error}</ErrorLine>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" loading={busy} disabled={!ready}>
            make the account
          </Button>
        </div>
      </form>
      <p className="text-muted">
        have an account?{' '}
        <PageLink page="login" back={back}>
          sign in
        </PageLink>
      </p>
    </Sheet>
  )
}

function ForgotPage() {
  const { data: methods } = useAuthMethods()
  const [login, setLogin] = useState('')
  const [asked, setAsked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (login.trim() === '' || busy) return
    setBusy(true)
    setError(null)
    try {
      await recoverAccount(login.trim())
      setAsked(true)
    } catch (failure) {
      setError(whyFailed(failure))
    }
    setBusy(false)
  }

  if (methods?.mail === false) {
    return (
      <Sheet heading="forgot password">
        <Warning>
          <b>no password can be reset here.</b> this server sends no mail, so {NO_RECOVERY}
        </Warning>
        <p className="text-muted">
          <PageLink page="login">sign in</PageLink>
        </p>
      </Sheet>
    )
  }
  return (
    <Sheet heading="forgot password">
      {asked ? (
        <p role="status" className="text-text">
          if that account has a verified email, a reset link is on its way to it. the link works
          once, for 30 minutes.
        </p>
      ) : (
        <form className="flex flex-col gap-2" onSubmit={(event) => void submit(event)}>
          <Field
            label="username or email"
            autoComplete="username"
            maxLength={254}
            value={login}
            onChange={(event) => setLogin(event.currentTarget.value)}
          />
          <ErrorLine>{error}</ErrorLine>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" loading={busy} disabled={login.trim() === ''}>
              mail a reset link
            </Button>
          </div>
        </form>
      )}
      <Warning>
        the link goes only to an email the account has <b>verified</b>. for an account with no
        email, or with one that was never verified, {NO_RECOVERY}
      </Warning>
      <p className="text-muted">
        <PageLink page="login">sign in</PageLink>
      </p>
    </Sheet>
  )
}

/**
 * The token of the mailed link this page opened from, read once from the address's fragment,
 * which then goes from the address bar. Null when there is none: the page was opened by hand.
 */
function useLinkToken(): string | null {
  const hash = useRouterState({ select: (state) => state.location.hash })
  const [token] = useState(() => (AUTH_TOKEN.test(hash) ? hash : null))
  useEffect(() => {
    if (window.location.hash === '') return
    const { pathname, search } = window.location
    window.history.replaceState(window.history.state, '', `${pathname}${search}`)
  }, [])
  return token
}

function ResetPage() {
  const token = useLinkToken()
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { ready } = newPassword(password, again)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (token === null || !ready || busy) return
    setBusy(true)
    setError(null)
    try {
      await resetPassword({ token, password })
      setDone(true)
    } catch (failure) {
      setError(whyFailed(failure))
    }
    setBusy(false)
  }

  if (token === null) {
    return (
      <Sheet heading="reset password">
        <p className="text-muted">
          this page opens from the link in a reset mail.{' '}
          <PageLink page="forgot">ask for one</PageLink>
        </p>
      </Sheet>
    )
  }
  if (done) {
    return (
      <Sheet heading="reset password">
        <p role="status" className="text-text">
          the password is changed. every session of the account is signed out, and its api tokens
          are revoked. <PageLink page="login">sign in</PageLink>
        </p>
      </Sheet>
    )
  }
  return (
    <Sheet heading="reset password">
      <form className="flex flex-col gap-2" onSubmit={(event) => void submit(event)}>
        <NewPasswordFields
          label="new password"
          password={password}
          again={again}
          onPassword={setPassword}
          onAgain={setAgain}
        />
        <ErrorLine>{error}</ErrorLine>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" loading={busy} disabled={!ready}>
            set the password
          </Button>
          {error !== null && <PageLink page="forgot">ask for a new link</PageLink>}
        </div>
      </form>
    </Sheet>
  )
}

function VerifyPage() {
  const token = useLinkToken()
  const client = useQueryClient()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const verify = async () => {
    if (token === null || busy) return
    setBusy(true)
    setError(null)
    try {
      await verifyEmail(token)
      await client.invalidateQueries({ queryKey: credentialsQuery().queryKey })
      setDone(true)
    } catch (failure) {
      setError(whyFailed(failure))
    }
    setBusy(false)
  }

  if (token === null) {
    return (
      <Sheet heading="verify email">
        <p className="text-muted">
          this page opens from the link in a verification mail. to get one, set your email in{' '}
          <Link to="/settings" className={TEXT_LINK}>
            settings
          </Link>
          .
        </p>
      </Sheet>
    )
  }
  if (done) {
    return (
      <Sheet heading="verify email">
        <p role="status" className="text-text">
          verified. this address can now reset the account password.{' '}
          <Link to="/settings" className={TEXT_LINK}>
            settings
          </Link>
        </p>
      </Sheet>
    )
  }
  return (
    <Sheet heading="verify email">
      <p className="text-muted">
        verify this address, and it can reset the account password if you forget it.
      </p>
      <ErrorLine>{error}</ErrorLine>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" loading={busy} onClick={() => void verify()}>
          verify this email
        </Button>
      </div>
    </Sheet>
  )
}
