# Arena

[`apps/web`](../README.md) › Arena. Paths are relative to `apps/web`.

The arena lives in `src/features/arena/`: `worker/protocol.ts` has the Worker's messages,
`worker/session.ts` the battle and its keyframes, `worker/frames.ts` the frames of a battle (the
sink that gathers its events, and the builder the debugger's arena strip shares), and
`worker/client.ts` the `ArenaClient` and the `useArena` store. `ArenaCanvas.tsx` draws a client's frames: `render/scene.ts` keeps the core
mirror and the glows, `render/gl.ts` and `render/shaders.ts` draw it with WebGL2 (bloom,
scanlines, and vignette from `render/post.ts`), `render/canvas2d.ts` is the 2D fallback,
`render/camera.ts` zooms and pans, and `render/overlay.ts` draws the rulers.

## Routes

`/arena` is `ArenaPage.tsx`: `ArenaSetup.tsx` until the fight button, then `ArenaBattle.tsx`. The
URL holds the setup, `?b=roster:dwarf,local:<id>&seed=42&cycles=100000&rounds=3&procs=64&spacing=1024`
(`setup/url.ts`; no `seed` is a random seed each battle; `&w=middleweight` holds the arena to one
weight class, none takes any size), and a share link carries the same query (`@asmbots/protocol`'s
`encodeShare`) and its local bots' sources in `#src=` (deflated JSON, base64url).
`setup/search.ts`, the route's `validateSearch`, imports no code, since it rides the entry chunk.
`setup/config.ts` has the limits, the presets, and the class (`ArenaConfig.weight`, which no preset
sets), and `setup/bots.ts` the roster, the local and shared bots, the bots outside the class
(`outsideWeight`), the ranking (`byRank`, `ranksOf`, `bestFill`), and the fight button's words.
The ranking reads `store/bot-records.ts` (localStorage); `battle/rate.ts`, a chunk with Glicko-2
that `ArenaBattle` loads as a match ends, counts the match there once per match key. Click-only parts load as their own chunks, since
the setup sits at the edge of its budget: the paste box (`setup/PasteBox.tsx`), dropped files
(`setup/files.ts`, with the assembler), and the problem modal with the assembler's errors
(`setup/Problems.tsx`, `setup/Diagnostics.tsx`).

The class, when set, locks the picker's weight filter (its pills count the search's bots in each
class) and both fills to it; `add` refuses a bot of another class with a warn toast (a dropped
file is still saved to my bots); choosing a class removes the picked bots of the others; and
`fightStatus` blocks a fight with one (`remove 1 bot outside middleweight`). The bots panel shows
each ready bot's class chip, and `clear` empties it, with `undo` on the toast. `vite.config.ts` loads the roster's `.asm` imports as text (`textImport` of the repo's
`scripts/text-import.ts`, which also reads the docs' figures; the API's Vitest pool uses it too).

`ArenaBattle.tsx` is the battle, its parts in `battle/`: `Hud.tsx` (a band over the core that the
camera keeps clear), `Transport.tsx` (the scrub bar marks keyframes and bot deaths), the rail's
`BotsPanel.tsx`, `EventsPanel.tsx`, and `StandingsPanel.tsx`, `Victory.tsx`, the hover tooltip
`HoverTip.tsx`, and the keys (`space . , [ ] 0 1-9 f s m`) in `keys.ts`. `log.ts` turns the Worker's
messages into the round's timeline, `view.ts` holds what the player picked (isolated bots, the
minimap, autoplay), `screenshot.ts` and `replay.ts` write the PNG and the `.asmreplay.json`. A load
is a match: the Worker plays round i with `@asmbots/tourney`'s `roundOrder` and `roundSeed` and
scores it with `withRound`, so the arena's match equals `runMatch`'s. Frames name bots by their
place in the load, whatever order a round fights them in.

Wherever the arena names a bot, it names its author, a link to their profile when the site knows it
(`app/author.tsx`). The setup's cards and picked bots link a roster bot to the house
(`/u/system`), and a local or shared bot's `%author` to the reader when it is theirs (a local bot
with none reads as theirs); the paste box's line says `name · by author · size`. The battle takes
each bot's `%author` from the Worker's `botMeta` (`sourceAuthor`): the victory table links it; the
bots panel and standings, too narrow for a link beside the name, put `name by author` in the name's
title (`byline`). The hover tooltip, which takes no clicks, writes the `%author` after the name; the
live region leaves it out. The embed's
legend (`features/embed/EmbedArena.tsx`) opens the link in a new tab, as `watch on asmbots` does.

`/arena/$replayId` is `ReplayPage.tsx`: a replay in the same battle view. The victory's
`replay link` copies `/arena/<match key>#r=<base64url of the replay's JSON>`: `@asmbots/protocol`'s
`Replay` (the `download replay` file), with the bots' bytes and SHA-256 but not their sources.
`battle/replay.ts` still reads the arena's older `asmbots-replay-local/1` files and links. The page loads it into the Worker and plays at once.
`battle/verify.ts` checks each bot's SHA-256, then that the Worker's match key (`matchHash` of the
replay's inputs) is the recorded one, then each round's result hash as the round ends. The chip
beside the arena's title says `verifying`, `verified 1/3`, `verified` in accent, or `mismatch` in
danger with the reason in its title and on the victory. A link is held to what the arena runs (2
to 16 bots, 10 rounds, 1M cycles, 256 processes a bot) before anything loads. On a replay, `share ▾`
copies its link, `download replay` saves it as it came, and `setup` goes to `/arena`. A link with
no `#r=` loads the replay from the API (`GET /api/replays/:key`).

The boot screen and the welcome tour live in `src/app/boot/`. `main.tsx` calls `armBoot()` before
the first render: the page boots when it loads at `/`, once a session (`sessionStorage`), and not
when `navigator.webdriver` is set, so Playwright and Lighthouse see `/` as before; `?boot=1`
forces it (`e2e/boot.spec.ts`, the a11y spec). `core-dump.ts` is the backdrop: a seeded model of a
core that zeroes, loads four bots, and runs them, drawn on a 2D canvas one changed cell at a time;
under reduced motion it is a still. The tour
(`WelcomeTour.tsx`, its own chunk) ends on `/arena?intro=true`.

The home page's hero is `demo/HomeDemo.tsx`, driven by `demo/demo.ts`: Spiral and LCG painters,
Dwarf, and Paper in the duel config, 400 cycles a frame, a new random seed that places them each
battle, and 3 s on each battle's end before the next. `DemoLoop` pauses the battle while the tab
is hidden or the hero is off screen. `ArenaCanvas` draws it with `interactive={false}`: a
`role="img"` picture with no HUD, minimap, hover, or keys, which the wheel scrolls past. Bloom
follows the settings, on by default. Under reduced motion the hero is a still: battle 62 at
cycle 24,000, all four bots alive, painted by the 2D renderer's `CorePainter` onto a 256 x 256
canvas. `HomePage.tsx` loads the demo after the page's first contentful paint and an idle moment,
so its 65 KB gz (the renderer, the roster, the engine, and the Worker) costs `/` nothing in
Lighthouse. The demo makes no sound.

## Sound

`src/features/sound/engine.ts` synthesizes DESIGN_SYSTEM §7's cues with WebAudio, no samples: a
tick, a write click (band-passed noise), a process death's thud, a bot death's falling tone (from a
pentatonic step per hue), the victory (root, fifth, octave), and the transport's click. Sound is
off until `m` in a battle, the HUD's sound button, or `/settings` (master volume, one switch per
cue) turns it on. No AudioContext exists before the page's first gesture (`keydown` but `esc`,
`mousedown`, a touch's `pointerup`), so a replay that plays at load stays silent until one. The
budget: 12 cues in any second; tick, write, and death at most every 125 ms and 8 a second; clicks
10; bot deaths and the victory the rest. Writes coalesce into one click per 250 ms, as loud as the
writes it stands for. `sound/arena.ts`'s `useArenaSound` plays a battle's cues in `ArenaBattle`
(`/arena` and replays); full frames (a load, a seek) are silent. The 404 page's imp, the live panel,
and a tournament's watch modal play by themselves and stay silent. The synth builds as a small
chunk of its own (`engine-*.js`, named after its file); a `manualChunks` rule for it would pull
the kit out of the entry. Tests: `test/sound.test.ts` on `test/fake-audio.ts`, and
`e2e/sound.spec.ts`, which takes away the user activation Playwright's `goto` gives a page.

## First visit and the intro

A first visit to `/arena` gets a three-step tour (PRODUCT_SPEC §9, `tour.tsx`), one kit `CoachMark`
at a time: `1/3` under the first roster card's `+` until two bots are picked, `2/3` over the fight
button, `3/3` in the events log once the battle shows (`placement="inline"`, so the newest lines
stay in view). Doing a step moves the tour on. `skip the tour` or `got it` puts it away for good,
as does `setup` from the battle it ends on (`coachMarksSeen` holds `arena`, beside the editor's
`editor`).

The header's `intro` links to `/arena?intro=true`: `ArenaPage` loads Dwarf vs Imp at seed 263
(`intro.tsx`; Dwarf's bomb lands on Imp's next word at cycle 55,602, first blood and the end),
writes that setup to the URL, and sets 200 cycles a frame. Its guide (`useIntroGuide`, three marks)
holds the placement 6 s (or until `play now`), plays, points at the events log at first blood,
then offers `pick bots` (the setup, with the intro's bots in) and `done`. About 30 s in all. The
tour stays out of the intro's battle, and picks up in the setup after it.

## Worker protocol

The Worker (`worker/arena.worker.ts`) is an `ArenaSession` behind `postMessage`. It runs cycles
only when asked, never on its own. Every typed array it sends is transferred, not copied.

| Request | Answer |
| --- | --- |
| `load { bots, config, rounds }` | `loaded`, then a full frame of round 1 at cycle 0 |
| `setRound { round }` | `loaded`, then a full frame: a round played before, or the next |
| `step { cycles }` | a frame |
| `seek { cycle }` | a full frame |
| `requestFrame` | a frame of `speed` cycles, only while playing |
| `play`, `pause`, `speed { cyclesPerFrame }` | nothing, or an `error` |
| `match { bots, config, rounds }` | `match { match }`: the whole match headless, as `runMatch` gives it, or an `error` |

- `match` (the editor's `test vs`) runs beside the battle and leaves it as it was: no frames,
  and `ArenaClient.runMatch` settles its calls in the order it sent them.
- Each request that moves the battle (`load`, `setRound`, `step`, `seek`, `requestFrame`) gets
  exactly one `frame`, or an `error` in its place. `ended { result, hash, round, match }` follows
  the frame that ends a round. A failed request leaves the battle as it was.
- A frame is what changed: written bytes as (address, byte and owner tag) pairs with each byte's
  write cycle, run bytes as (address, bot) pairs, each live process's IP (`IP_FRONT` on each bot's
  front process), the spawns, deaths (with the killer's tag), and bot deaths, and 3 stats per bot
  (processes, bytes owned, writes). A full frame (`load`, `setRound`, `seek`) carries the whole core
  and owner map instead, and every bot dead by then.
- Pacing: `ArenaClient` asks for one frame per display frame, and never while one is owed, so a
  slow or hidden tab slows the battle instead of queueing frames. A frame runs `speed` cycles
  (0.01 to 10,000, or `max`; below 1 the Worker adds up the shares and runs a cycle each time
  they pass a whole one) and stops early at 12 ms (`FRAME_BUDGET_MS`): a slow machine gets fewer
  cycles per frame, not fewer frames. A seek waits while frames are owed, and a later seek
  replaces it, so a scrub drag sends its last.
- Seeking: a keyframe `snapshot()` every 1,000 cycles, 128 at most, dropping the one farthest from
  the playhead. A seek restores the latest keyframe at or before its target and runs forward with
  the frame's events off.
- A match's round i fights the bots in `roundOrder` with `roundSeed` (ISA §5.5). The messages name
  bots by their place in the load, so a bot keeps its hue from round to round.

## Renderer passes

`render/gl.ts` draws only when something moved: a frame, a glow or ring still fading, the camera,
or a setting. Each image:

1. Uploads what changed, each texture whole, 256 x 256: the owner map (R8UI), a non-zero bitmask
   (R8UI, a bit a byte), and the write and exec ages in ms (R16UI).
2. The scene pass (`ARENA_FRAG` on one full-screen triangle): each byte its owner's hue at 0.55
   alpha, or 0.22 when the byte is zero; the exec trail `exp(-age/600)` in yellow; the write flash
   `exp(-age/220)` in white; the lattice from zoom 4. A dead bot's territory desaturates 40%;
   isolation dims the others to 20%. Then the death ripples and spawn pulses (`RING_*`, instanced,
   256 at most) and one marker per live process (`MARKER_*`, instanced). The pass writes two
   targets: the color, and the emissive light alone (trails, flashes, markers, rings).
3. Bloom: the emissive target down to quarter size (`DOWNSAMPLE_FRAG`, a 4 x 4 mean), a 9-tap
   Gaussian across and then down (`BLUR_FRAG`).
4. Composite onto the canvas (`COMPOSITE_FRAG`): the color, plus the bloom at the theme's strength,
   times the scanlines and the vignette (`render/post.ts`: paper has neither). With all three
   effects off, the scene pass draws straight onto the canvas.
5. Zoomed in, the minimap: the owner map again, small, with the view's outline.

The rulers and the hover crosshair are a 2D canvas over it (`render/overlay.ts`). Where WebGL2 is
missing, `render/canvas2d.ts` paints the core on the CPU (`CorePainter`, repainting only the
bytes that changed or still glow) and draws it scaled, with the same colors and no post effects.

## Performance

Measured on an M5 Max in headless Chromium 1243, 2026-09-23.

| What | Where | Result |
| --- | --- | --- |
| `ArenaSession`, 16 roster bots, 2,000 cycles a frame | Bun | p50 1.1 ms, p95 2.8 ms a frame; seeks 0.2 to 6 ms |
| `e2e/arena-perf.spec.ts`, 16 bots, 2,000 cycles a frame, all effects | 1280 x 720, DPR 1 | p50 16.7 ms, p95 16.8 ms frame gap |
| The battle page, same melee (HUD, rail, sparklines, log) | 1280 x 720 DPR 1, 1440 x 900 DPR 2 on Metal | p95 16.7 ms, no long tasks |
| The home demo, 4 bots, 400 cycles a frame, bloom | 1280 x 720 DPR 1, 1440 x 900 DPR 2 on Metal | p95 16.7 ms, max 16.8 ms |
| Cold JS | every page | [Budgets](budgets.md) below: `bun run bundle` measures it at each `bun run check` |

Headless Chromium's WebGL is SwiftShader (software) unless launched with `--use-angle=metal`. It
holds 60 fps at DPR 1; at DPR 2 with bloom the melee's p95 is 33 ms. The renderer's first images
under SwiftShader make one long task of about 120 ms (half with the post effects off), which
the home page moves past its first paint.

The renderer's Playwright specs drive `e2e/harness/arena.html`, a page only the dev server serves.
`e2e/arena-perf.spec.ts` (16 roster bots at 2,000 cycles a frame: the arena alone, then the
production build's battle page) and `e2e/arena-soak.spec.ts` (10 minutes, opt-in) are the `perf`
project, which runs after the rest, on Metal on a Mac: `bunx playwright test --project perf
--no-deps` runs them alone. Their budgets are in [Budgets](budgets.md).

## Adding an effect

1. State: keep it in `render/scene.ts`. Take its data from the frames in `applyFrame` (or add a
   field to the frame in `worker/protocol.ts` and `worker/frames.ts`), move it along in `advance`,
   bump a `*Version` counter when it changes, and push the matching `…Until` time out while it
   still moves, so `advance` reports the image as changed until it is done.
2. Draw it in both renderers. WebGL2: a uniform or texture that `ARENA_FRAG` reads, or an
   instanced pass like `RING_*`, in `render/shaders.ts`, with its upload in `render/gl.ts`. Light
   that should bloom goes to the emissive target too. 2D: `CorePainter.paintCell`, or a draw over
   the core in `render/canvas2d.ts`.
3. A post effect: its strength per theme in `THEME_POST` (`render/post.ts`), a switch in
   `ArenaEffects` (`store/settings.ts`, `sanitizeSettings`, and the settings page), and its math
   in `COMPOSITE_FRAG`.
4. Motion: under reduced motion (`scene.reducedMotion`) an effect that moves must not, as the rings
   do not.
5. Tests: the state in `test/arena-scene.test.ts`, the 2D pixels in `test/arena-canvas2d.test.ts`,
   the WebGL pixels in `e2e/arena-render.spec.ts`, and then `e2e/arena-perf.spec.ts` alone.
