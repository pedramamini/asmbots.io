import { MIN_PASSWORD, normalizePassword, passwordProblem } from '@asmbots/protocol'
import { cx, Input, type InputProps } from '@asmbots/ui'
import { type ReactNode, useId } from 'react'
import { ApiRequestError } from '../../../api/client'

/**
 * A labeled field, and the line under it: what is wrong with its value (`problem`), else a hint.
 * The line is there from the start, so the form does not move as it fills. A field given neither
 * (the sign-in form's, which the API alone judges) has no line.
 */
export function Field({
  label,
  problem,
  hint,
  ...input
}: InputProps & { label: string; problem?: string | null; hint?: ReactNode }) {
  const id = useId()
  const noted = problem !== undefined || hint !== undefined
  const wrong = problem !== undefined && problem !== null
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-panel-status text-muted">
        {label}
      </label>
      <Input
        id={id}
        className="w-full"
        aria-invalid={wrong}
        aria-describedby={noted ? `${id}-note` : undefined}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...input}
      />
      {noted && (
        <p
          id={`${id}-note`}
          role="status"
          className={cx('min-h-4 text-data', wrong ? 'text-danger' : 'text-muted')}
        >
          {problem ?? hint ?? ''}
        </p>
      )}
    </div>
  )
}

/**
 * What is wrong with a new password typed twice, a field each: nothing while a field is empty,
 * so a form does not complain before it is filled. `ready` once both are good. Both are read as
 * the server hashes them (`normalizePassword`), so the form and the server agree on every count.
 */
export function newPassword(password: string, again: string, names: readonly string[] = []) {
  const problem = password === '' ? null : passwordProblem(password, names)
  const same = normalizePassword(again) === normalizePassword(password)
  const differs = again !== '' && !same ? 'the two passwords differ' : null
  return {
    problem,
    differs,
    ready: password !== '' && problem === null && same,
  }
}

/** A new password, typed twice: a typo in the only copy would lock the account. */
export function NewPasswordFields({
  password,
  again,
  names,
  label = 'password',
  onPassword,
  onAgain,
}: {
  password: string
  again: string
  /** What the account is named by (its username, its email): a password is more than these. */
  names?: readonly string[] | undefined
  label?: string | undefined
  onPassword: (value: string) => void
  onAgain: (value: string) => void
}) {
  const { problem, differs } = newPassword(password, again, names)
  return (
    <>
      <Field
        label={label}
        type="password"
        autoComplete="new-password"
        value={password}
        problem={problem}
        hint={`${MIN_PASSWORD} characters or more. length is what counts: a few words do well.`}
        onChange={(event) => onPassword(event.currentTarget.value)}
      />
      <Field
        label={`${label}, again`}
        type="password"
        autoComplete="new-password"
        value={again}
        problem={differs}
        onChange={(event) => onAgain(event.currentTarget.value)}
      />
    </>
  )
}

/**
 * A link in a line of text, as `CELL_LINK` (`app/author.tsx`) draws one. Its own copy, so these
 * pages do not fetch that module's chunk for one string.
 */
export const TEXT_LINK =
  'rounded-sm text-bright underline decoration-border-strong underline-offset-2 hover:text-accent-fg hover:decoration-current focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-accent'

/** Why a request failed, in the API's words when it answered. */
export function whyFailed(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : 'could not reach the server: try again'
}

/**
 * The deal of an account with no verified email, in the words the sign-up page and the settings
 * page both use.
 */
export const NO_RECOVERY =
  'a forgotten password cannot be reset, by you or by us: the account is lost with it.'

/** A note that must be read: the warning color down its left edge, as a new token's secret has. */
export function Warning({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="border-l-2 border-warn bg-panel-2 px-3 py-2 text-data text-text">
      {children}
    </p>
  )
}
