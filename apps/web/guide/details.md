# Details that come with age

[`apps/web`](../README.md) › Details that come with age. Paths are relative to `apps/web`.

- **Release names.** The status bar's version chip links `/docs/changelog` and names its release
  in a tooltip: `2026.10.03a · "imp gate"`, or for a build ahead of every release, the one in the
  making: `2026.09.25a · "imp gate" · unreleased` (`app/version.ts`). The names live in the root
  `CHANGELOG.md` (`## <version> · "<name>"`, `## Unreleased · "<name>"`), which
  `scripts/changelog.ts` reads at build (`__APP_RELEASE__`) and the changelog page renders: a docs
  page may name a repository Markdown file (`markdown` in `docs/nav.ts`), compiled as plain
  Markdown, indexed, and link-checked like the rest. A link to `https://asmbots.io/...` there
  (it reads on GitHub too) goes through the router like an app path. `scripts/version.ts` gives
  a commit tagged as a release (`v2026.10.03a`) that version.
- **The fps chip** turns `--warn` under 50 fps (`FPS_WARN`), and its tooltip names the speed
  slider (and `[`) as the fix. It is a Tab stop while it shows, so the keyboard reads it too.
- **Screenshots** (`s`, `download png`) end in a footer stamp: the bots (or their count when the
  names would reach the site), the seed, the cycle, and `asmbots.io` (`SITE_HOST`, whatever host
  served the page).
- **The 404 page** runs the roster's imp in the arena renderer (`demo/LiveImp.tsx`, a chunk the
  shell never waits for): seed 182,052 places it at 0x0404, 2 cycles a frame, a lap of the core,
  then again; the view fits the core's columns to its width and follows the imp's row. It pauses
  out of sight, makes no sound, and stands still 400 cycles in under reduced motion.
- **`robots.txt`** opens with the imp in one line of ASCII: its loop's bytes, `A5 90`, and its
  head.
- **A bot's page** says its fights (the server's matches of any of its versions) and when it was
  first seen, with how long ago; **a hill's king card** its reign: the submissions it has held
  the top through.

`main` keeps a scroll padding (`scroll-py-2`): a Tab stop the browser scrolls into view keeps its
focus ring clear of the scrollport's edge (the Tab walk of `/hills/main` found a ring cut there).

Tests: `test/frame.test.tsx` (the version chip, its title, the fps chip), `test/screenshot.test.ts`,
`test/live-imp.test.tsx`, `test/site-pages.test.ts` (the imp's bytes are the roster imp's loop),
`test/api-pages.test.tsx`, `scripts/changelog.test.ts`, `scripts/version.test.ts`, and
`e2e/delights.spec.ts` (the tooltip and the changelog page, the imp walking in WebGL2, a real
screenshot's footer pixels, and from the Worker: uptime, fights, first seen, reign).
