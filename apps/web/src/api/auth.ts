/**
 * Password sign-in (`apps/api/src/auth/local.ts`, `routes/credentials.ts`): the ways to sign in,
 * sign-up, sign-in, recovery, and the account's own password and email. Here, not in `queries.ts`
 * or `writes.ts`: Rollup places a module whole, and every page takes those; only the sign-in
 * pages and the settings page read this one.
 */
import {
  AuthMethods,
  type ChangeEmail,
  type ChangePassword,
  Credentials,
  type LogIn,
  Me,
  parse,
  type ResetPassword,
  type SignUp,
} from '@asmbots/protocol'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiGet, apiPost } from './client'
import { useMe } from './queries'

const nothing = () => undefined

/** `GET /api/auth/methods`: the ways to sign in that are on. */
export const authMethodsQuery = () =>
  queryOptions({
    queryKey: ['auth', 'methods'],
    queryFn: ({ signal }) =>
      apiGet('/auth/methods', (v) => parse(AuthMethods, v, 'the sign-in methods'), signal),
    staleTime: 5 * 60_000,
  })

export const useAuthMethods = () => useQuery(authMethodsQuery())

/** How the signed-in account signs in, under `me` so signing out drops it with the account. */
export const credentialsQuery = () =>
  queryOptions({
    queryKey: ['me', 'credentials'],
    queryFn: ({ signal }) =>
      apiGet('/me/credentials', (v) => parse(Credentials, v, 'your sign-in'), signal),
  })

/** The signed-in account's credentials; asks nothing while nobody is signed in. */
export function useCredentials() {
  const signedIn = Boolean(useMe().data)
  return useQuery({ ...credentialsQuery(), enabled: signedIn })
}

/** Where the sign-in page's `sign in with github` goes: GitHub, then back to `returnTo` here. */
export function signInHref(returnTo: string): string {
  return `/api/auth/github?returnTo=${encodeURIComponent(returnTo)}`
}

/** `POST /api/auth/signup`: a new account, signed in. */
export function signUp(account: SignUp): Promise<Me> {
  return apiPost('/auth/signup', account, (v) => parse(Me, v, 'your account'))
}

/** `POST /api/auth/login` */
export function logIn(login: LogIn): Promise<Me> {
  return apiPost('/auth/login', login, (v) => parse(Me, v, 'your account'))
}

/** `POST /api/auth/recover`: asks for a reset link; the answer never says whether one went. */
export async function recoverAccount(login: string): Promise<void> {
  await apiPost('/auth/recover', { login }, nothing)
}

/** `POST /api/auth/reset`: a new password, with a reset link's token. */
export async function resetPassword(reset: ResetPassword): Promise<void> {
  await apiPost('/auth/reset', reset, nothing)
}

/** `POST /api/auth/verify-email`: a verification link's token. */
export async function verifyEmail(token: string): Promise<void> {
  await apiPost('/auth/verify-email', { token }, nothing)
}

/** `POST /api/me/password`: every other session of the account ends. */
export async function changePassword(change: ChangePassword): Promise<void> {
  await apiPost('/me/password', change, nothing)
}

/** `POST /api/me/email`: a new address, or null for none; it starts unverified. */
export function changeEmail(change: ChangeEmail): Promise<Credentials> {
  return apiPost('/me/email', change, (v) => parse(Credentials, v, 'your sign-in'))
}

/** `POST /api/me/email/verify`: mails the verification link again. */
export async function resendVerification(): Promise<void> {
  await apiPost('/me/email/verify', {}, nothing)
}
