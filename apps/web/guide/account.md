# Account

[`apps/web`](../README.md) › Account. Paths are relative to `apps/web`.

An account signs in with GitHub, or with a username and a password (PRODUCT_SPEC §9). The API's
side is in [`apps/api/README.md`](../../api/README.md), "Sign-in and sessions" and "Password
sign-in".

## Signing in

Every `sign in` on the site (`SignInButton` and `signIn` in `src/features/account/AccountSlot.tsx`:
the header, the settings page, the hill and tournament dialogs, the command menu) opens
`/auth/login?returnTo=<this page>`. The page offers `sign in with github` (off to
`/api/auth/github`) and a username and password form, and goes back to `returnTo` after either.
`returnTo` is a path on this site and not one of the sign-in pages; anything else goes home.

| Page | Does |
| --- | --- |
| `/auth/login` | GitHub, or a username and a password |
| `/auth/signup` | a new password account: username (the handle), password twice, an optional email |
| `/auth/forgot` | asks for a reset link by username or email; the answer is the same whoever is named |
| `/auth/reset` | a new password, from a reset link (`#<token>`) |
| `/auth/verify` | verifies an email, from a verification link (`#<token>`), on a click |

One route file serves the five, `src/routes/auth/$.tsx`: a route file is in the entry chunk, which
every page loads, and `/editor` has next to nothing left of its budget ([Budgets](budgets.md)). So
the route says only its path. `AuthPage` (`src/features/account/auth/AuthPage.tsx`) picks the page
in its own chunk, reads `returnTo` itself, and titles the tab (the route has no `head`, so the
header's brand shows no page name there). `src/api/auth.ts` holds the requests, apart from `queries.ts` and `writes.ts` for the same
reason. A page that is not one of the five shows the 404 panel.

A mailed link carries its token after `#`. The page reads it once (`useLinkToken`), takes it out of
the address bar, and posts it: a fragment goes to no server, so the token is in no log.

## What the pages must say

An email is optional, and an account with no verified email cannot recover a forgotten password:
nobody can reset it. The words are one constant, `NO_RECOVERY` in
`src/features/account/auth/fields.tsx`, in a `Warning` (`role="note"`):

- the sign-up page, beside the form, before the account is made;
- the forgot page, under the form;
- the settings page's `password and recovery` panel, for as long as the account has no email or an
  unverified one. With a verified email it says `recovery is on.` instead.

`GET /api/auth/methods` says what is on. With `mail: false` (the server sends no mail) the sign-up
page shows no email field and says there is no reset at all, and the forgot page shows no form.

## The settings page

`password and recovery` (`src/features/account/CredentialsPanel.tsx`) is a password account's
only: its email (set, change, remove, each with the password, each unverified anew; `mail the link
again` while it waits) and its password (the current one, the new one twice). It is its own chunk,
loaded when the account has no GitHub login to its name, so a GitHub account never fetches it, nor
`GET /api/me/credentials`. The account panel says `github: linked` only when the account has a
GitHub login.

A password account's username is its handle: a new handle (the account panel) is a new username.

## Tests

`test/auth-pages.test.tsx` (the five pages and the panel, against `msw`),
`e2e/password-account.spec.ts` (sign up with no email, the warnings, sign out, sign in again, on
the e2e Worker, which sends no mail). The specs that sign in with GitHub click through
`/auth/login` (`account`, `hills`, `keyboard`, `a11y`, `editor-saved-layouts`).
