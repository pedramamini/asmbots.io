# Accessibility

[`apps/web`](../README.md) › Accessibility. Paths are relative to `apps/web`.

DESIGN_SYSTEM §8. Four Playwright specs hold it, all nine themes where color matters. CI runs no
Playwright, so run them before a change to the UI ships (about 4 minutes; the Worker ones need the
e2e Worker, which `playwright.config.ts` starts):

```sh
bunx playwright test e2e/a11y.spec.ts e2e/focus.spec.ts e2e/keyboard.spec.ts e2e/motion.spec.ts --project chromium
```

| Spec | What it proves |
| --- | --- |
| `a11y.spec.ts` | axe (`@axe-core/playwright`, every rule it runs by default: WCAG 2.2 A and AA and its best practices) finds nothing on every route, every docs page, and the states users reach: a battle paused, its share menu, its victory, the key help, the theme menu, the docs search, a local round robin's form and matrix, the first sign-in, the hill's submit dialog, the settings with sound on. 6 tests a theme. |
| `focus.spec.ts` | The focus ring shows at 3:1 or more on `--panel` in every theme (pixels, not CSS: two shots of one clip, focused and not), and every Tab stop of 14 routes shows its focus (53 on `/`, 45 on `/arena`, 31 in a battle, 153 on `/editor`, 111 on `/docs`). |
| `keyboard.spec.ts` | With keys alone: load two bots and fight (the live region speaks); write a bot and debug it (F11, F9, F5); create a tournament and watch it finish; sign in, save a bot to the account (`mod+s`), and submit it to a hill. Each control is reached by Tab. |
| `motion.spec.ts` | The system's reduced motion, or the app's setting over it, stills the ticker and the coach marks; `full` over the system's reduce moves them. |

`bun run contrast` (in `bun run check`) gates the token colors themselves: every text token at
4.5:1 on the three surfaces and on the `--accent-10` fill, `--text-bright` on the `--accent-25` and
`--accent-45` fills too, and `--accent` (the ring) at 3:1.

Rules for new UI, each learned from a violation this pass fixed:

- **Text colors**: `text-text`, `text-bright`, `text-muted`, `text-accent-fg`, `text-warn`,
  `text-danger`, `text-info`. `text-accent` is not for text (it is the border and ring color; in
  pedurple it reads 4.0:1), and `text-dim` is never content (placeholders, the input's `>` glyph,
  list markers). Text on an `--accent-25` or `--accent-45` fill is `text-bright` (white is now):
  the debugger's IP row and line (`cm/debug.ts`) drop their syntax colors for it.
- **A box that truncates and holds a link or a button** uses `truncate-ring`, not `truncate`: it
  clips 2 px out, where the ring is (the kit's table cells, `Stat`'s value, the king's card). It is
  `overflow: clip`, which makes no scroll container: a flex item needs `min-w-0` as well.
- **A link in running text is underlined** (`CELL_LINK`, `EmptyState`'s action, the docs' links),
  never color alone.
- **A box that scrolls** (a `<pre>`, the source) is a Tab stop with a ring, or holds one.
- **One `<h1>` a page**: its visible title (home, a bot, a profile, a docs page), else
  `app/PageHeading.tsx`, hidden, in the route's component.
- **Landmarks**: the frame puts the ticker in an `aside`, a route's toolbar in a `section`
  (`<label> tools`), and the page in `main#content`, which the skip link (the first Tab stop)
  focuses without touching the URL's fragment. A docs callout is `role="note"`, not an `aside`.
- **Rings the page cannot cut**: the arena's is an `::after` layer over its canvases (an outline
  inside the box sat under the WebGL layer); a sticky sidebar caps its height to the window and
  scrolls itself, so Tab never lands on a link out of sight (`DocsFrame`).
- **Motion**: the kit's `motion-reduce:` variant and `useReducedMotion()` read `<html data-motion>`
  before the media query; `store/settings.ts` keeps it on the user's setting (`applyMotion`).

The arena speaks every 2 s while it plays (`battle/Announcer.tsx`, a polite status region):
`cycle 12,480; 3 bots alive; dwarf-v3 leads footprint`. The victory's headline is a live region
too. The embed and the 404 page's imp say nothing: a frame on someone else's page, and a decoration.
