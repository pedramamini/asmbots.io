/**
 * The settings page's panel for an account that signs in with a password: whether it can recover
 * a forgotten password (only with a verified email, and it says so), its email, and its password.
 * A GitHub account has neither here, and no panel.
 */
import { type Credentials, emailProblem, type Me, normalizeEmail } from '@asmbots/protocol'
import { Button, Panel, useToast } from '@asmbots/ui'
import { useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import {
  changeEmail,
  changePassword,
  credentialsQuery,
  resendVerification,
  useCredentials,
} from '../../api/auth'
import { useMe } from '../../api/queries'
import {
  Field,
  NewPasswordFields,
  NO_RECOVERY,
  newPassword,
  Warning,
  whyFailed,
} from './auth/fields'

export function CredentialsPanel() {
  const { data: me } = useMe()
  const { data: credentials } = useCredentials()
  if (!me || credentials?.method !== 'password') return null
  const status =
    credentials.email === null
      ? 'no email'
      : credentials.emailVerified
        ? 'email verified'
        : 'email not verified'
  return (
    <Panel className="col-span-12 lg:col-span-6" title="password and recovery" status={status}>
      <div className="flex flex-col gap-4">
        <Recovery credentials={credentials} />
        {credentials.mail && <EmailForm key={credentials.email ?? ''} credentials={credentials} />}
        <PasswordForm me={me} />
      </div>
    </Panel>
  )
}

/** Whether a forgotten password can be reset, in plain words, and the link again when it waits. */
function Recovery({ credentials }: { credentials: Credentials }) {
  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const { email, emailVerified, mail } = credentials

  const resend = async () => {
    setSending(true)
    try {
      await resendVerification()
      toast(`a new link is on its way to ${email}.`)
    } catch (error) {
      toast(`could not send the link: ${whyFailed(error)}.`, { variant: 'danger' })
    }
    setSending(false)
  }

  if (email !== null && emailVerified) {
    return (
      <p className="text-muted">
        <span className="text-accent-fg">recovery is on.</span> {email} is verified: if you forget
        the password, a reset link goes there.
      </p>
    )
  }
  if (email !== null) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Warning>
          <b>{email} is not verified, so this account cannot be recovered yet.</b> open the link we
          mailed to it. until then, {NO_RECOVERY}
        </Warning>
        {mail && (
          <Button size="sm" loading={sending} onClick={() => void resend()}>
            mail the link again
          </Button>
        )}
      </div>
    )
  }
  return (
    <Warning>
      <b>this account has no email, so it cannot be recovered.</b> {NO_RECOVERY}{' '}
      {mail
        ? 'add an email below and open the link we mail to it, and that address can reset the password.'
        : 'this server sends no mail, so no email can be added: keep the password in a password manager.'}
    </Warning>
  )
}

/** Sets, changes, or removes the email. Each asks for the password, and starts unverified. */
function EmailForm({ credentials }: { credentials: Credentials }) {
  const client = useQueryClient()
  const { toast } = useToast()
  const [email, setEmail] = useState(credentials.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const typed = normalizeEmail(email)
  const problem = typed === '' ? null : emailProblem(typed)
  const changed = typed !== (credentials.email ?? '')
  const ready = changed && problem === null && password !== ''

  const save = async (next: string | null) => {
    if (busy || password === '') return
    setBusy(true)
    setError(null)
    try {
      client.setQueryData(credentialsQuery().queryKey, await changeEmail({ email: next, password }))
      setPassword('')
      toast(
        next === null
          ? 'the email is removed: this account cannot be recovered.'
          : `a verification link is on its way to ${next}.`,
      )
    } catch (failure) {
      setError(whyFailed(failure))
    }
    setBusy(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ready) void save(typed === '' ? null : typed)
  }

  return (
    <form className="flex w-full max-w-sm flex-col gap-2" onSubmit={submit}>
      <Field
        label="email"
        type="email"
        autoComplete="email"
        value={email}
        problem={problem}
        hint="only to reset a forgotten password. never shown, never mailed anything else."
        onChange={(event) => setEmail(event.currentTarget.value)}
      />
      <Field
        label="password, to change the email"
        type="password"
        autoComplete="current-password"
        value={password}
        problem={error}
        onChange={(event) => {
          setPassword(event.currentTarget.value)
          setError(null)
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} disabled={!ready}>
          save email
        </Button>
        {credentials.email !== null && (
          <Button
            variant="ghost"
            disabled={busy || password === ''}
            onClick={() => void save(null)}
          >
            remove email
          </Button>
        )}
      </div>
    </form>
  )
}

/** A new password, with the one it replaces. Every other session of the account ends. */
function PasswordForm({ me }: { me: Me }) {
  const { toast } = useToast()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ready = current !== '' && newPassword(password, again, me.user.handle).ready

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    try {
      await changePassword({ current, password })
      setCurrent('')
      setPassword('')
      setAgain('')
      toast('the password is changed. every other session is signed out.')
    } catch (failure) {
      setError(whyFailed(failure))
    }
    setBusy(false)
  }

  return (
    <form className="flex w-full max-w-sm flex-col gap-2" onSubmit={(event) => void submit(event)}>
      <p className="text-data text-muted">
        you sign in as <span className="text-bright">{me.user.handle}</span>: your username is your
        handle, so a new handle is a new username.
      </p>
      <Field
        label="current password"
        type="password"
        autoComplete="current-password"
        value={current}
        problem={error}
        onChange={(event) => {
          setCurrent(event.currentTarget.value)
          setError(null)
        }}
      />
      <NewPasswordFields
        label="new password"
        password={password}
        again={again}
        username={me.user.handle}
        onPassword={setPassword}
        onAgain={setAgain}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy} disabled={!ready}>
          change password
        </Button>
      </div>
    </form>
  )
}
