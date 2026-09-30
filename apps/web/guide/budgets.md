# Budgets

[`apps/web`](../README.md) › Budgets. Paths are relative to `apps/web`.

What the app may cost, and what it costs now: 2026-09-25, an M5 Max, headless Chromium 1243.
`bun run bundle` builds the app and checks the bundle rows (`scripts/check-bundle.ts`); CI runs it
as a step of its own ahead of `bun run check`, which runs it again with the API's tests, so a bundle
or network miss fails CI. The runtime rows are the Playwright `perf` project's; CI runs no
Playwright yet (EXEC 4.2), and the frame trip needs a GPU and the soak ten minutes, so run them
before a release (below).

## Bundle

A page's cold JS is what it fetches before it draws: the entry's static imports and the page's
route chunk's (and its layout route's), from the build's manifest (`dist/.vite/manifest.json`),
gzip -9, KB = 1,024 bytes. A browser's cold load of `/arena` (every JS response in 3 s, gzip -6)
came to the same: 241.2 KB over 33 files. `/arena`'s budget is PRODUCT_SPEC §11's; each other sits
about 5% over its page, so what grows one is a choice, made here and in `BUDGETS`.

| What | Now | Budget | Note |
| --- | ---: | ---: | --- |
| shell, every page | 166.2 KB | 175 KB | the entry and `vendor`; 185.2 KB before this pass |
| `/` | 184.0 KB | 185 KB | the overview's cards and `how it works` copy; the art and the footer load after paint |
| `/arena` | 209.4 KB | 250 KB | the setup, the engine, and the shell; the battle view loads as the page mounts (250.8 KB with it, as the players' bots came); 263.2 KB before the first pass |
| `/arena/$replayId` | 234.1 KB | 250 KB | |
| `/editor` | 418.8 KB | 440 KB | CodeMirror 127 KB of it |
| `/editor/$botId` | 418.8 KB | 440 KB | |
| `/tournaments` | 224.7 KB | 235 KB | |
| `/tournaments/$id` | 269.8 KB | 275 KB | the bracket, the watch's renderer, the assembler and engine a local run uses; the list page stays out (its status chip and entrant authors are in `tournaments/entrants.ts`, −4.9 KB) |
| `/tournaments/championships` | 181.4 KB | 190 KB | the week's cards, the champions table, the schedule; the enter dialog loads on `enter` |
| `/hills` | 178.7 KB | 180 KB | the cards and their skylines; the diagram, ruler, feed, and table load after the page (`HillsLower.tsx`) |
| `/hills/$slug` | 192.2 KB | 200 KB | |
| `/bots/$id` | 186.9 KB | 195 KB | |
| `/u/$handle` | 185.3 KB | 190 KB | the profile's charts: HTML boxes and SVG, no chart library, the stats page's size bars shared; its badges |
| `/docs` | 179.5 KB | 182 KB | a page's own MDX loads after its route; 180 until the header's `stats` and the badge ids (every page's API schemas read them) |
| `/docs/$` | 186.0 KB | 192 KB | the reference's `Encoding` and `Flags` load as a page draws them, with the opcode table (−5 KB); 192.1 before, when the ticker and the frame's width came (+0.2 KB) |
| `/stats` | 181.3 KB | 190 KB | the charts are HTML boxes, no chart library |
| `/stats/leaderboard` | 177.0 KB | 185 KB | the badge catalog and its 8 × 8 glyphs |
| `/settings` | 183.5 KB | 195 KB | |
| `/embed/arena` | 221.0 KB | 225 KB | |
| / art, after paint | 12.2 KB | 14 KB | `src/art`: the dither plates, the 24 dither bots, the schematic, the scope trace, the hex band (DESIGN_SYSTEM §10) |
| site footer, after paint | 7.9 KB | 10 KB | every page that scrolls; the dither scenes and the 24 bots it shares with the art |
| 404 live imp, after the shell | 35.7 KB | 37 KB | the 404 page's imp: the arena's renderer and client; 36 until the arena's battle view went lazy and split two small shared modules into chunks of their own (+0.6 KB of chunk overhead) |
| arena Worker, at the first fight | 14.2 KB | 20 KB | |
| assembler Worker, with the editor | 15.8 KB | 20 KB | |
| fonts | 104.3 KB | 120 KB | 5 woff2 subsets, as shipped |

The check also holds: CodeMirror (the `editor` chunk) and the editor's route load with the
editor's pages only, the docs' routes and pages with the docs' only; every file under
`dist/assets` has its hash in its name, and `_headers` keeps them a year; `.assetsignore` keeps the
manifest off the deploy.

What took `/arena` under 250 KB:

1. `"sideEffects": false` on the six workspace packages (asm, bots, codec, engine, protocol,
   tourney). Without it an import through a barrel kept every module behind it: every zod schema
   of the protocol, on every page (−10 KB a page).
2. No `engine` manual chunk, and the light exports in modules of their own: `DEFAULT_CONFIG`,
   placement, and scoring (`engine/src/rules.ts`); `roundOrder` and `roundSeed`
   (`tourney/src/rotation.ts`); `meleeStandings` (`tourney/src/melee-standings.ts`). Rollup shakes
   code out globally and then puts each module in one chunk, whole: `DEFAULT_CONFIG` beside
   `Battle` put `Battle`, the interpreter, and the decoder in the shell (−9.7 KB a page, −6 KB on
   `/arena` beyond).
3. The roster prebuilt: `@asmbots/bots` `rosterImage` reads each bot's machine code and metadata
   from `images.gen.ts`, which `bun run roster-images` writes (and `bun test` checks). The arena
   fights roster bots with neither the assembler nor the sources, and assembles a local, shared,
   pasted, or dropped bot with `assembleCached` from a chunk it loads then
   (`setup/assembler.ts`); a replay file reads the roster's sources when it is written
   (`replaySources`). −16 KB on `/arena`, and the ~10 ms the page spent assembling the roster.
4. The roster past lightweight on demand: the bots over 512 bytes (`images-large.gen.ts`,
   `sources-large.ts`) are most of the roster's bytes, so the routes that list the roster (`/arena`,
   `/embed/arena`, `/editor`, `/tournaments`) load them in their `loader` (`loadLargeImages`,
   `loadLargeSources`), and `rosterCatalog` has them from then on. Also out of `/arena`'s cold
   chunks: fflate's zip code (`store/local-bots-zip.ts`, the settings page's), the screenshot's
   painter and the video recorder (`battle/screenshot.ts`, `battle/record.ts`, loaded on use and as
   the battle mounts), and the end panels (`battle/Victory.tsx`, as the battle mounts). −6 KB on
   `/arena`, −13 KB on `/editor`, −4 KB on the 404 imp.
5. The battle view lazy (`ArenaPage.tsx`, 2026-09-28): the setup draws without the renderer, the
   HUD, and the battle's panels, and the page asks for their chunk as it mounts, so it has come by
   the first fight. It came with the players' public bots in the roster, which put `/arena` at
   250.8 KB. −41 KB on `/arena`.

## Runtime

The `perf` project, 1280 × 720, DPR 1, every post effect on; on Metal unless it says software
(`PERF_GL=software`, SwiftShader, as a machine with no GPU has it).

| What | Where | Now | Budget |
| --- | --- | --- | --- |
| 60 fps, 16 bots × 2,000 cycles a frame | the arena alone (`e2e/harness/arena.html`) | frame gap p50 16.7, p95 16.7, max 16.8 ms | p95 ≤ 20 ms |
| 60 fps, the same melee | the battle page, production build | p50 16.7, p95 16.7, max 16.8 ms | p95 ≤ 20 ms |
| 60 fps, software GL | both | p95 16.7 ms | p95 ≤ 20 ms |
| a frame's trip, Worker → page | the arena alone | p50 0.0, p95 0.1, max 0.2 ms | p95 < 1 ms |
| a frame's trip, Worker → page | the battle page | p50 0.0, p95 0.3 to 0.8, max 2.2 to 2.5 ms | p95 < 1 ms |
| a frame's trip, software GL | both | p50 7.5 to 10.3, p95 9.7 to 12.4 ms | reported, not held |
| memory over a 10-minute autoplay | the battle page: the melee, 10 rounds, rematch at each end | +1.62 MB over 10.4 min, 16 matches, 160 rounds (page JS +1.06, DOM +0.47, Worker +0.09) | < 20 MB |

- **The trip**: the Worker stamps each frame as it posts it (`sentAt`, `performance.timeOrigin +
  performance.now()`, the clock the page and its Workers share), and the client marks its
  arrival (`arena:frame-received`) and measures from the stamp to the mark
  (`arena:frame-transfer`, `worker/client.ts`). DevTools shows both under Timings; only the latest
  of each stays on the timeline, so a long battle does not grow it. The trip is the copy and
  whatever holds the page's thread when the frame lands. Under software GL the page's thread
  uploads each image's textures through SwiftShader for 8 to 10 ms, and the frame waits: the
  Worker answers in 0.5 ms. The spec holds the trip where the GL is a GPU's, and reports it
  otherwise.
- **The soak** (`e2e/arena-soak.spec.ts`): after the first match and after the last it collects
  the garbage and reads the heaps a heap snapshot counts, through CDP: the page's JS with its
  typed arrays' buffers, its DOM (Blink's heap), and the arena Worker's (a browser session
  attached to the Worker's target). Both reads come at a match's end, when the Worker holds all of
  its 128 keyframes (~17 MB of its 24 MB), never half of them.

```sh
bun run bundle                                                  # build, then the bundle budgets
bunx playwright test --project perf --no-deps                   # frame rate and trip, Metal on a Mac
PERF_GL=software bunx playwright test --project perf --no-deps  # software GL
SOAK=1 bunx playwright test --project perf --no-deps e2e/arena-soak.spec.ts  # 10 minutes
```

The battle page and the soak run on the preview, which needs the seeded dev Worker on :8787
(`bunx wrangler dev --inspector-port 9249` in apps/api). `SOAK_MINUTES=2` makes a short soak.

## Network

| What | Where | Rule | Checked by |
| --- | --- | --- | --- |
| hashed files, `/assets/*`: JS, fonts | `public/_headers` | `public, max-age=31536000, immutable` | `bun run bundle` (the rule, a hash in every name), `e2e/network.spec.ts` |
| pictures, `/docs-shots/*`, `/favicon.svg` | `public/_headers` | `public, max-age=86400` | `e2e/network.spec.ts` |
| the build's manifest | `public/.assetsignore` | not deployed | `bun run bundle`, `e2e/network.spec.ts` |
| replays, `GET /api/replays/:key` | API | `public, max-age=31536000, immutable` and an `ETag`: the key names the content | API `read-api.test.ts`, `e2e/network.spec.ts` |
| hills and standings, `GET /api/hills`, `/api/hills/:slug` | API `edgeCached` | 30 s in the colo's edge cache (Cache API), `public, max-age=30`, with `Age`; a request with `Cache-Control: no-cache` gets them as they are | API `edge-cache.test.ts`, `hill-submit.test.ts`; web `api-cache.test.ts`; `e2e/network.spec.ts` |
| the stats and the leaderboard, `GET /api/stats`, `/api/leaderboard` | API KV | 5 min in KV for every colo, no request skips it; `public, max-age=60` | API `stats.test.ts` |
| GitHub avatars | `features/account/avatars.ts` | `preconnect` to `https://avatars.githubusercontent.com`: the header when the `signed_in` hint is there, the profile page always | `e2e/network.spec.ts` |

The app reads a hill's board past the cache each time it reads it again (a job ended, a
submission finished, the tab came back: `hillQuery`, `hillsQuery`), so a board it knows has
changed shows as it is; a first read may be up to 30 s old. Workers Static Assets applies
`_headers` to the files it serves itself: the hashed files and the pictures never reach the
Worker (`run_worker_first` in apps/api/wrangler.jsonc), and pages keep the default (revalidate
each load).
