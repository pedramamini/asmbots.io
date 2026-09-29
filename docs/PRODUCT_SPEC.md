---
type: reference
title: ASM Bots Product Specification
created: 2026-09-21
tags:
  - asm-bots
  - product
  - ux
related:
  - '[[DESIGN_SYSTEM]]'
  - '[[ARCHITECTURE]]'
  - '[[ISA_SPEC]]'
---

# ASM Bots Product Specification

Every screen, every interaction, every state. The playbooks implement this; the e2e tests assert it.

## 1. Home `/`

- Ticker: latest hill event, latest tournament result, next scheduled championship countdown.
- Overview: `ASM BOTS`, one line ("Write 8086 assembly. Fight for 64 KB."), then a card for each part of the site (arena, editor, hills, tournaments, docs, for agents): its nav icon, its name as a link, and one or two sentences on what it is. The arena's card also links the intro fight (`/arena?intro=true`). Nothing on the page moves.
- How it works: the core, write, fight, climb, each with its art (DESIGN_SYSTEM §10) and a screenshot, then `take the tour`.
- Three panels: **Main hill** top 10 (rank, bot, author, score, rating, age); **Recent matches** (10 rows, click → replay); **Championship** (the week's five, one for each weight class and one for open weight: a class picker, then the picked one's next event, entrants so far, and `enter` button).
- The site footer (every page that scrolls): the hills as a dither range, and the site's links.
- Footer status: version stamp (its release's name in a tooltip, from `CHANGELOG.md`; a link to the changelog), ISA version, `made with maestro` attribution chip center.

## 2. Arena `/arena`

The soul. Layout: arena panel 8/12 columns, right rail 4/12.

**Setup state** (no battle loaded):
- Roster picker: grid of bot cards (identicon, name, author, size, weight class, hill rating, `+` to add). Filters: roster / mine / hill / search, and a `weight class` filter whose pills count the bots of each class that match the search (`all 28`, `light 22`, …). Drop zone accepts `.asm` files (multi). Paste box for raw source.
- Ranking: each finished arena match (not a replay) counts in this browser's bot records (`localStorage`, one count per match key): wins, losses, draws, and a Glicko-2 rating, the match one rating period in which every bot plays every other by match points. The picker lists bots best ranked first (rating less twice its RD; a bot with no record keeps its place in between), and a ranked card shows `#3 · 12-4-1 · 71%`. `best fill` fills to 16 with the best ranked bots of the list, the unpicked first; `random fill` fills with random picks.
- Bots picked: hue, name, origin, size and weight class chip, `remove`; `clear` empties the list, and its toast offers `undo`. Picked bots of more than one class note `open weight: sizes mix`.
- Config: rounds (1..10), max cycles (10k..1M, default 100k), seed (random / fixed), process cap, spacing, `speed` (the cycles per frame a fight starts at, 0.01..10,000, default 100; kept in the settings, not the URL, and no preset's), and `class` (all / light / middle / heavy / super, default all; in the URL as `w=middleweight`). Preset chips: `duel`, `melee 8`, `melee 16`, `hill rules`; a preset neither sets nor reads the class.
- A class holds the arena to bots of that class: the picker's weight filter locks to it and random fill draws from it; adding a bot of another class (a card, the starters, a paste, a dropped file) is refused with a warning, though a dropped file is still saved to my bots; choosing a class removes the picked bots of the others, with a toast; and a bot of another class that comes in anyway (a link) blocks the fight: `remove 1 bot outside middleweight`. The open weight note does not show.
- `fight` button self-narrates: "add 1 more bot" → "fight · 4 bots · 1 round".

**Battle state**:
- Arena canvas (DESIGN_SYSTEM §5). Overlay HUD top-left: `cycle 12,480 / 100,000`, speed, fps. Top-right: zoom, minimap toggle, fullscreen (`f`), screenshot (`s`, saves PNG with theme and HUD, and a footer stamp: bots, seed, cycle, site URL), video (`v`, records the same frame to MP4/WebM in real time until `v` again or the match ends; `share ▾` → `export video` records the round from cycle 0).
- Transport bar under the canvas: `⏮ step-back · ▶/⏸ · step ▶| · speed slider (0.01 cycle/frame, a cycle every 100 frames, … 10,000, then max; it moves the fight on the screen, live) · scrub bar with death markers in bot hues · round N/K`.
- Right rail:
  - **Bots** table: hue swatch, name, procs (live count with sparkline), footprint (bytes owned), writes, status (`alive` / `dead @ cycle`). Click a row to isolate that bot's territory (others dim); shift-click to add.
  - **Events** log: filtered to spawns, deaths, first-blood, bot deaths, round ends; each line timestamped by cycle; click jumps the scrub bar there.
  - **Standings** (multi-round): running pMARS points per bot.
- End state: victory overlay (`WINNER · dwarf-v3 · last bot standing · cycle 41,203`), stats table, actions: `rematch`, `new seed`, `share` (copies URL that encodes bots by id/hash + config + seed), `open in debugger`, `download replay`.

**Replay** `/arena/:replayId`: same UI, bots and seed loaded from the server (or from a `#` URL fragment for local shares). Shows a `verified` chip after the local simulation matches the recorded result hash.

Keyboard: `space` play/pause, `.` step, `,` step back, `[`/`]` speed, `0` reset zoom, `1..9` isolate bot N, `f` fullscreen, `s` screenshot, `v` video, `?` key help (every key of the app on any page, a section for each place its keys work: everywhere, go to a page, the arena in a battle, the arena's core focused, the editor, the source, the debugger).

## 3. Editor and debugger `/editor`, `/editor/:botId`

Tiled workspace, default the `writing` layout: library, the source over its problems, and help; the machine hidden. Every panel (source, problems, library, help, debug controls, registers, processes, memory, watch, breakpoints, trace, arena strip) is a tile: drag its title row to dock it beside another panel, swap with it, or dock it along the page's edge, a lit box showing where it lands; drag or arrow-key the dividers to size; hide from its grip menu (the source stays); `layout ▾` shows hidden panels and offers presets (`writing`, `debugging`, `phone`), then the user's kept layouts. Signed in, `save layout…` opens `layouts`: the layout on screen kept in the account under a name (a name it has, in any case, replaces that one; 24 an account), and each kept one in little, to load, update with the layout on screen, rename, or delete; the one on screen is marked. A kept layout loads on any device the user signs in on. Signed out, the menu offers `sign in to save layouts`. A debugger key (F5, F10, F11) or the arena's `open in debugger` while the debug controls are hidden opens the `debugging` layout. Help: the instruction, directive, or register under the cursor (forms, flags, an example), a search over them all, and a link to its reference page. The layout persists in `localStorage` exactly as the user leaves it, a phone's apart from a wide window's; a moved or hidden panel keeps its state. The debugger's seed, opponents, speed, `run N` count, and strip lock persist too.

**Editor**:
- CodeMirror 6, x16c mode, theme-matched. Listing gutter (address, bytes) updated on every successful assemble. Diagnostics inline (squiggle + gutter mark + problems panel). Hover on a mnemonic: opcode doc card (encoding, flags, one example). Autocomplete for mnemonics, registers, labels, `%` directives.
- Toolbar: file name, `%name` badge, size chip with the weight class (`142 B · light`), `assemble` (auto on idle 300 ms), `format`, `lint`, `save` (local always; cloud when signed in), `versions`, `share`, `test vs ▾` (pick a roster bot from an A to Z list with a fuzzy filter field, runs 10 rounds headless in the Worker, shows W/T/L instantly; `watch` plays that match in a modal over the editor with the embed's player, and its `open in arena` opens the arena set up as tested).
- Templates menu: `blank`, `imp`, `dwarf`, `scanner skeleton`, `replicator skeleton`, `position-independent base` snippet.
- Bot library sidebar (`b`): my bots, roster (read-only, `fork` copies), recent.

**Debugger**:
- Load: current bot alone, or current bot + opponents (picker). Placement seed field.
- Panels: **Registers** (AX..SP, IP, FLAGS as `ODITSZAPC` bits with on/off styling; edit in place), **Processes** (per bot queue; the running one highlighted; click to select and follow), **Memory** (hex + disassembly window, 32 rows, follows IP by default, `goto` input, owner hue stripe per byte, write highlighting), **Watch** (addresses/expressions, byte/word), **Breakpoints** (address, condition on registers, hit count), **Trace** (last 200 instructions of the selected process).
- Transport: `run`, `pause`, `step`, `step over` (call), `step out`, `run to cursor`, `run until death`, `run N cycles`, `step back` (256-deep), `reset`. Current line highlighted in the editor; clicking a gutter sets a breakpoint (INT3 is not written into the core; breakpoints are engine-side).
- Arena strip: the same renderer, small, following the selected process with a viewport lock toggle.

## 4. Tournaments `/tournaments`, `/tournaments/:id`

- List: tiles of one height for scheduled, running, finished: a glyph of the kind, the status's color down the left edge, the champion (identicon and name), the live match count, or the entry window (`no entries yet` for an open one nobody entered), and a bar of the matches played. A championship cancelled with no entries is left out; a week's championships list lightest first. Kinds: `round robin`, `bracket`, `melee`. Filter and search.
- Weekly championships (decision 2026-09-28, Pedram: "one for every weight class and the open class"): every Friday 18:00 US Central the server runs five open brackets, `weekly <day> · lightweight`, `middleweight`, `heavyweight`, `super-heavy`, and `open weight`, each under its class hill's rules. A bot enters its own class's and open weight; one entry a player in each.
- Create (signed in): name, kind, entrant source (my bots / roster / open entry with deadline), rounds per match, config preset, start now or schedule.
- **Bracket view**: SVG bracket, 4..32 entrants, byes, third-place match, live-updating; click a node → match panel (rounds, seeds, per-round survivors, `watch` → arena replay).
- **Round robin view**: results matrix (entrants × entrants, cell = points, hue-tinted), standings table with W/T/L and points, sortable.
- **Melee view**: standings with survival cycle histograms across rounds; `watch round N`.
- **Live mode**: when the runner is executing, a `LIVE` chip pulses and the next match auto-opens in the arena for spectators, simulating locally from the inputs pushed over the WebSocket. Spectator count shown.
- **Live stage**: a server tournament under way (running or paused) opens with a full-width stage in the accent's glow: `LIVE NOW`, the match being fought (`fighting · Dwarf v Imp`), `match 9 of 15` with a bar, the `LIVE` chip, the spectators, and `tune in live`. Under the strip: the ring (the bots in their hues, big, and `watch it here`) and the scoreboard (the room's standings: place, identicon, bot, W-T-L, points; the leader in accent; the bots in the ring marked with a glowing dot and a tint; before any match is scored, the entrants unranked). Tuning in scrolls to the stage and runs the match in the arena in the ring's place, beside the scoreboard; `leave the arena` goes back. A running server tournament's tile in the list says `live now · tune in →`.
- Export: `results.json`, `bracket.svg`, standings CSV.

## 5. Hills `/hills`, `/hills/:slug`

- Hill list (redesign 2026-09-27, Pedram: "more content, especially visual"): the hills in numbers (hills, places taken, hill matches, challenges and crowns, the longest reign); a card per hill (its line of what it is for, its standings drawn as a dithered mountain with the king's flag on the peak and the empty places as flat ground, entrants of size, the king with its identicon, reign, and W/T/L, its rules, its matches and challenges, when it last changed, your rank); `how a challenge runs`, a four-step diagram on a hill of six (submit, fight each entry once, rank, push off) that plays by itself unless the reader picks a step, pauses it, or reduces motion; `when hills run` (no schedule: a challenge starts on submit; one at a time a hill; 5 an hour; boards at most 30 s old; the weekly championship's countdown, seeded by hill rating); the weight classes to scale on one ruler of bytes with each hill's band; the newest board changes on every hill; and the hills side by side (rules, entrants, king, score, what a challenge fights, matches, last change, your best rank). The cards and the feed read `GET /api/hills/overview`.
- Hill page: standings table (rank, bot, author, score, rating ± RD, W/T/L, age in submissions, `challenge` to fight it locally), the king's card (its reign in submissions), recent submissions feed with deltas ("+3 rank"), and a `submit` button (signed in; picks one of my bots; server assembles and queues a `Runner`).
- Submission flow: progress panel ("fighting 24 of 32 entrants"), then result card (score, rank, matches list with `watch`). If it did not make the hill: "scored 112, needed 131. closest fight: vs paper-v2 (lost 2–8)."
- Default hills seeded at launch: `main` (size 32, 10 rounds, 512 B), `tiny` (size 16, 256 B, 50k cycles), `melee` (8-bot melee scoring).
- Weight classes (decision 2026-09-26, Pedram): bots come in variable sizes, up to 4 KB, and each class has its own hill. `main` is the lightweight ladder (1 to 512 B). New duel hills, 10 rounds, 80k cycles: `middleweight` (size 16, 513 to 1,024 B), `heavyweight` (size 16, 1,025 to 2,048 B, spacing 2,048), `super-heavy` (size 16, 2,049 to 4,096 B, spacing 4,096), `open-weight` (size 32, 1 to 4,096 B, spacing 4,096, every class mixed). Each class has a floor, so small bots cannot win every class; above middleweight the hills run duels only; the core stays 64 KB. A bot enters its own class's hill and open weight, no other. The hill list and each hill page name the class; submit and enter refuse a bot under the floor or over the cap.

## 6. Bots and profiles `/bots/:id`, `/u/:handle`

- Bot page: name, author, strategy blurb, identicon, size, first seen, fights, versions (diff between versions), hill placements, rating history sparkline, recent matches, source (if public), `fork`, `challenge`, `share`.
- Profile: pictures, not lists. The avatar (an identicon of the handle when there is none), the GitHub display name and login, the handle, when they joined, how long they have been here, when they were last active, and on how many days. Headline tiles: bots (a line over time), versions, server matches (bars a day), rounds, cycles lived, best rank. Gauges: win rate, survival (rounds still running at the end), hill standing (the best place in a field), championships won. A W/T/L bar; an activity calendar (a week a column, matches, saves, or wins a day); bots and versions over time; the bots by weight class (a ring) and by size; a tile for each hill (rank, a strip of the field, rating, W/T/L) and each championship; a wall of bot cards filtered by class. The numbers count the bots the reader may list: the public ones, all of them for the user themself.
- Badges: under the profile's header, the badges they hold (titles first, each title with the number that won it) of all of them, and a link to every badge (§12).
- Authors: wherever the site names a bot (arena cards and battle panels, hills, tournaments, live, stats, home), it names its author beside it, linked to their profile. A server bot's author is its owner; the house (`system`, owner of the roster) reads `ASM Bots`. A bot known only by its source shows its `%author`, linked when it is `ASM Bots` or the signed-in reader, else plain. A link inside another link (a tournament tile), a picker row, a scrolling line (the ticker), or a canvas stays plain text.
- Name or anonymous: a user shows their GitHub name, login, and avatar unless they choose `anonymous` in the settings' profile panel (the default is shown). Anonymous keeps all three off every public record; the handle still shows, and the profile says `anonymous`.

## 7. Docs `/docs/*`

In-app MDX, same theme, sidebar navigation, search (`/`):

1. **Start here**: what ASM Bots is, the 60-second tour, write your first bot (imp), fight it.
2. **The machine**: memory, registers, flags, processes, cycles, death (ISA_SPEC §1, §5 in plain words with diagrams).
3. **Language reference**: every instruction with encoding, flags, cycles, example; directives; expressions; the position-independence idiom.
4. **Strategy guide**: imp, dwarf, stone, paper, scanners, vampires, imp gates, decoys, SPL tactics, stack tricks; each with a runnable example (`open in arena` button that loads it against a roster opponent).
5. **Tournaments and hills**: formats, scoring, ratings, how verification works.
6. **Tools**: CLI reference, replay format, share links, API.
7. **Changelog** and **ISA versions**.

Every code block has `copy` and `open in editor`.

## 8. Settings `/settings`

Theme (nine swatches, live preview), arena effects (bloom, scanlines, vignette, reduced motion), sound, account (GitHub link/unlink, handle), profile (what the public sees; the name shown or anonymous), api tokens, data (export my bots as a zip, delete account).

## 9. Auth and onboarding

- Anonymous: everything local works (arena, editor, debugger, local tournaments, roster). Local bots persist in IndexedDB.
- Sign in with GitHub: cloud bots, hill submissions, tournament creation, profile. First sign-in asks for a handle (prefilled from GitHub), then offers to import local bots.
- Boot screen: every load of `/` boots the core first (never on a deep link). The logo and a boot log sit on a panel over a core dump that zeroes, loads four bots, and runs them; under it, two equal buttons: `take tour` and `enter site` (it has the focus, so Enter takes it; Escape too). A browser a script drives skips it unless the URL has `?boot=1`.
- Welcome tour: `take tour` walks the whole site in 19 steps. Each step goes to its page, dims all of it, lights one part, and puts a card beside it: home (the nav, the header's tools, the site's cards, how it works, the main hill), the arena (the roster, the config, `fight`, then a battle the tour starts: the core, the transport, the bots, the events), the editor (the source, the toolbar and the debugger), tournaments, hills, and the docs. The light slides from one part to the next. Enter or `next` goes on, ← or `back` goes back, Escape or `skip the tour` leaves. The last step lists every page, then `look around` leaves the whole page in view and `watch the first battle` starts the arena's guided intro (Dwarf vs Imp, first blood, then `pick bots`). While the tour runs, the pages' own coach marks stay shut; finishing it marks the arena's seen. `enter site` on the boot screen, or `skip the tour`, marks the tour seen; the home page's `take the tour` opens it again.
- First visit to the arena: a 3-step coach mark (roster → fight → watch), dismissible, never shown again.
- Every main page explains itself: a lead line and an `ⓘ` dialog (how it works, key terms, a docs link) on the arena setup, the hills and each hill, the tournaments and each tournament, and a bot's page; the editor has the `ⓘ` in its toolbar. The home page has `how it works` (write, fight, climb).

## 10. Share and social

- Share links encode `isa, config, seed, bots` (by server id, or by inline bytes for local bots up to 4 KB each, base64url in the fragment). OG image per replay rendered server-side as SVG: arena thumbnail (owner map at end state) + winner line.
- `download replay` writes `*.asmreplay.json` (protocol schema, includes sources when the sharer allows).
- Every page's head carries its title, description, canonical link, and Open Graph and Twitter (`summary_large_image`) tags, written by the Worker from the web build's manifest or from the page's data. Share cards (1200 × 630, sentinel theme) are drawn as SVG and rendered to PNG at the edge: a replay's owner map and winner, a bot's identicon card, a hill's standings, a tournament's bracket thumbnail (or points), and a card for every other page.
- `share ▾` on the arena, replays, bots, hills, and tournaments: `copy link`, `copy embed` (an `<iframe>` of `/embed/arena…`: the arena alone, autoplaying, play/pause and restart, and a `watch on asmbots` chip), `download png`.
- `robots.txt` and `sitemap.xml` (the app's pages, the docs, the hills, the public bots); the embeds and the settings say `noindex`.

## 11. Quality bars (release gates)

- Lighthouse ≥ 95 on performance, accessibility, best practices, SEO for `/`, `/arena`, `/docs`.
- 60 fps arena at 8 bots × 2,000 cycles/frame, Chrome, M1.
- Cold load ≤ 250 KB JS gzipped on `/arena` (engine + renderer + shell; editor lazy).
- Zero console errors on every route in Playwright.
- Every roster bot assembles, formats idempotently, and has a golden.
- All nine themes pass the contrast script.
- `bun run golden` reproduces identical results in Bun, Chrome, and Miniflare.

## 12. Stats `/stats`

The site in numbers (asked for by Pedram, 2026-09-27: how long it has run, the battles, the deaths, the bots and their weight classes, the users). One read, `GET /api/stats`, at most 5 minutes old (KV); the page reads nothing else.

- The site in numbers: uptime (`3d 04h`, since the database was made), users (signed in with GitHub; those with a bot), bots (not deleted; the house's; versions), matches (melees), rounds (a match), deaths (a round), cycles (a round), tournaments finished (championships). Users, bots, and matches carry their line over time.
- Activity: a bar a day, at least the last 30 and at most the last 90, of matches, rounds, deaths, or cycles (a segmented control). Today's bar, or the hovered one, is bright; the readout above names its day and value.
- Life and death: every bot in every round split into died and lived; the matches split into melees and duels; bots a round, deaths a match, cycles a round.
- Weight classes: the bots in each class, and a histogram of their sizes (the latest version's), a bar per power of two from 1 byte to 4 KB, the classes marked under the bins they span.
- Records: fastest kill (the fewest cycles a duel's loser lived), longest fight (the most cycles a duel ran before a death), each with `watch`; the longest reign of a king now on a hill; the bot in the most matches.
- Hills: each hill in the hill list's order, its class, entrants, matches, challenges, crowns (challengers that took rank 1), king, and reign.
- Only the server's matches count: hills, tournaments, championships. A battle run in a browser is not recorded. Deaths and cycles come from each match's kept rounds; the launch seed's matches got theirs from their replays (`apps/api/scripts/backfill-rounds.ts`).
- The header's `stats` (`g s`) opens it; the footer's `compete` column links it and the leaderboard. Two tabs head both pages: `the site` and `leaderboard`.

### Leaderboard `/stats/leaderboard`

Asked for by Pedram, 2026-09-27: a user leaderboard, and badges each user can earn, shown on their profile. One read, `GET /api/leaderboard`, at most 5 minutes old.

- Every user who signed in, ranked by server match wins, then kings (hills held at rank 1 now), then matches. Columns: rank, builder, badges (the first six glyphs and the count), wins, W/T/L, win %, kills, kings, best rank, matches, bots, championships won of entered; sortable; a row opens the profile. The house (`system`, the roster's owner) has a row, `house` for its rank, and no badges.
- Bot numbers (bots, versions, sizes) and the builder badges count public bots; match, hill, and championship numbers count every living bot, since those results are public on the hill and tournament pages.
- Badges (`packages/protocol/src/badges.ts`), each an 8 × 8 glyph drawn in code: a **title** (gold, one holder at a time, level holders share it) or a **milestone** (accent, anyone past its line). Titles: fleet admiral (most bots), heavy metal (biggest bot), the atom (smallest bot), tinkerer (most versions), workhorse (most matches), top gun (most wins), reaper (most kills: duel rounds won by outliving the other), quickdraw (fastest kill), cockroach (most rounds survived), warlord (most hills held), long live the king (longest reign), contender (most hill challenges and tournaments). Milestones: hello, world; armory (10 bots); arsenal (25); full card (a bot in every class); big iron (over 2 KB); one-liner (16 bytes or fewer); revisionist (a bot in 10 versions); first blood; centurion (100 wins); grinder (1,000 matches); survivor (1,000 rounds survived); long haul (100 million cycles lived); flawless (a match of 5 rounds or more won without the other bot scoring); giant killer (a duel won against a bot twice the size); last one standing (the only bot alive after a melee round); challenger; on the board; usurper (took a crown with a challenge); king of the hill; dynasty (3 hills at once); in the ring (a championship entered); champion; triple crown (3 championships); day one (signed up in the site's first 30 days); veteran (a year).
- The badges panel lists every badge by group (building, fighting, the hills, championships, time): what it takes, and who holds it (a title's holder and number, a milestone's count, or `nobody yet`).
