# Empty and error states

[`apps/web`](../README.md) › Empty and error states. Paths are relative to `apps/web`.

Every list says when it is empty with the kit's `EmptyState` (DESIGN_SYSTEM §4, §9): one muted
sentence and one accent action. A link action goes through `app/link-action.ts`
(`useLinkAction`), a real `href` the router takes over on a plain click.

| List | It says | Its action |
| --- | --- | --- |
| Hills (`/hills`, `/stats`) | no hill is open yet. | see how hills work (`/docs/tournaments/hills`) |
| A hill's standings, its feed; the home page's top 10 | no entrants yet. / no submissions yet | submit a bot: the hill's own `submit` dialog, `sign in to submit a bot` signed out; the home page links `/hills/main` |
| Matches (hill, home) | no matches played yet. | fight one in the arena |
| Tournaments | no tournaments yet (this browser, the server) / no tournament matches. | new tournament / clear the filters |
| My bots: arena, library, profile, submit and enter dialogs | none saved in this browser yet. / no bots in your account yet | write a bot, save this bot, write a new bot, open the editor |
| Roster and my bots, searched | no roster bot matches "x". | clear the search |
| Versions (the editor's `versions`, open for any bot that can be saved) | no saves yet | save now |
| Watch | nothing watched yet | watch ip |
| Breakpoints | no breakpoints yet | break on the cursor's line (F9's work) |
| Events | no events yet. (every filter keeps the round's first line, so only a round not loaded) | play |
| A bot's hill placements; a profile's hills and championships | not on any hill yet. / on no hill yet. / no championships yet. | see the hills, see the tournaments |

A read of the API that fails draws `app/LoadFailure.tsx` in its panel: `could not load: <the
API's words>` and `retry`, which refetches. TanStack Query v5 clears the error of a read that has
no data when it fetches again, so the panel shows its loading state until the answer.

Offline (the browser's `offline` event), the status bar's left end trades `● local` for
`○ offline` and `arena, editor, and local tournaments still work`, in a live region
(`app/online.ts`), and a failed read says it will load once the network is back (TanStack
refetches on reconnect). The limit: there is no service worker, so the arena and the editor work
offline with the code the page has already loaded (the arena's Worker starts with its first fight,
the assembler's with the editor). A route never opened needs the network; TanStack's lazy routes
reload the page when a chunk does not come.
