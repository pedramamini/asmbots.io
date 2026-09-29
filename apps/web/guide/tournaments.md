# Tournaments

[`apps/web`](../README.md) › Tournaments. Paths are relative to `apps/web`.

Local tournaments (PRODUCT_SPEC §4) run in this browser: the arena Worker plays the matches,
headless, and `@asmbots/tourney` schedules and scores them. The code is in
`src/features/tournaments/`. EXEC 3.3 adds server-run tournaments on the same views.

| File | What it holds |
| --- | --- |
| `store.ts` | The `Tournament` record in IndexedDB (`asmbots-tournaments`), its query hooks. A local bot's source is copied in, so a later edit changes nothing; each entrant keeps its `%author` (a server one its `owner`). |
| `runner.ts` | `tournamentRunner()`, the page's runner: `iterateRoundRobin`, `iterateBracket`, or a melee a round at a time, saved after every match. `start`, `pause`, `cancel`; `useRunnerSync()` keeps the query cache current and resumes what a reload left `running`. |
| `create.ts`, `NewTournament.tsx` | The new tournament form: entrant limits (bracket 3..32, melee 2..16, round robin 2..32), the match count and time estimate, the fixed seed. |
| `TournamentsPage.tsx`, `TournamentTile.tsx` | `/tournaments`: tiles of one height (a glyph of the kind, a stripe of the status's color, the champion and its author, the live match count or the entry window, a bar of the matches played), kind and status filters, search. |
| `ChampionshipsPage.tsx`, `TournamentsTabs.tsx` | `/tournaments/championships`: the next week's five (the clock, the entry window, a card a class with `enter`), the champions by week and class, the schedule of Fridays, and the most titles, from `GET /api/championships` (its query lives in the page's module). The tabs sit in both pages' intros; `/tournaments` takes them as a prop, as `/tournaments/$id` imports `TournamentsPage.tsx` for its helpers. |
| `TournamentPage.tsx`, `TournamentHeader.tsx` | `/tournaments/$id`: the header (name, kind, status, controls, `share`, entrants by their authors, the champion in accent) over the view of the kind. |
| `BracketView.tsx`, `RoundRobinView.tsx`, `MeleeView.tsx` | The views: `BracketSvg` (the CLI's `bracketSvg`, themed), `ResultsMatrix` and `StandingsTable`, the melee's survival histograms. Each has its `MatchPanel`. |
| `LiveStage.tsx` | A running server tournament's live stage over its page (`ServerTournament.tsx`): the `LIVE NOW` strip with `tune in live`, the ring, and the scoreboard from the room's standings, each bot by its owner. Tuned in, `live/LiveArena.tsx` runs the match in the ring's place. |
| `TournamentControls.tsx` | The status chip, `start` / `pause` / `resume` / `cancel`, and `auto-watch`. |
| `watch.ts`, `WatchModal.tsx` | A round rebuilt from its inputs and played in the arena; a recorded round checks its result hash. |
| `export.ts` | `results.json`, `bracket.svg`, `standings.csv`. |
| `share.ts` | Tournament links. |

Every view names each bot's author beside it, `by <author>`, a link to the profile at `/u/$handle`
when the site knows it (`entrantAuthor` in `TournamentsPage.tsx`, `app/author.tsx`): a server bot's
owner; a roster bot's `ASM Bots`, the house; a local bot's `%author`, the reader's own for a bot of
this browser. The results matrix names it in its headers' titles. A tile (a link itself) and the
new tournament form's picker (a click there picks the bot) name it as text.

A tournament on the page is this browser's by that id. When there is none, the page reads the
link's fragment. `share` copies `/tournaments/<id>#t=<base64url of the deflated JSON>`, schema
`asmbots-tournament-link/1`: the name, kind, status, config (written out in full), rounds, a
bracket's seeding and third-place flag, the entrants, and every match played. A roster bot travels
as its slug; a local bot as its machine code in base64url, up to 4,096 B (`MAX_BOT_BYTES`, so every
bot that assembles), and so its rounds can be watched from the link, and its `%author`. The page rebuilds the
bracket, standings, progress, and champion from the matches with `@asmbots/tourney`, and rejects a
link whose matches do not fit its entrants (`this tournament link is broken: …`). A shared
tournament is read only: it has no controls, nothing stores it, and one shared while running reads
`paused`.

Tests: `test/tournaments-*.test.ts(x)` (store and runner, form, list, bracket, views, share and
detail page) and `e2e/tournaments.spec.ts` (a bracket and a round robin to the end, and the round
robin's link opened in a fresh browser).
