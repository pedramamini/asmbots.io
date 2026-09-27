# Lighthouse

[`apps/web`](../README.md) › Lighthouse. Paths are relative to `apps/web`.

## The release gate

`bun run lighthouse` (the repo root) builds the app and runs Lighthouse CI (`@lhci/cli` 0.15.1,
`lighthouserc.json`) on `/`, `/arena`, `/editor`, `/docs`, and `/hills/main`: the build under
`vite preview`, its `/api` on the seeded e2e Worker (`scripts/lighthouse-servers.ts` starts both,
with playwright.config.ts's `WORKER_COMMAND`), three runs a page, the desktop preset. Performance,
accessibility, best practices, and SEO must each be 95 or more in the median run (PRODUCT_SPEC
§11). CI runs it as the `lighthouse` job and keeps the reports (`.lighthouseci/`) as an artifact.
On a Mac, point it at Playwright's Chrome for Testing:

```sh
CHROME_PATH="$HOME/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  bun run lighthouse
```

2026-09-25, three runs a page:

| Page | Performance | Accessibility | Best practices | SEO | Mobile, one run |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` | 100 | 100 | 100 | 100 | 92 / 100 / 100 / 100 |
| `/arena` | 99 | 100 | 100 | 100 | 87 / 100 / 100 / 100 |
| `/editor` | 98 | 100 | 100 | 100 | 76 / 96 / 100 / 100 |
| `/docs` | 100 | 100 | 100 | 100 | 94 / 100 / 100 / 100 |
| `/hills/main` | 99 to 100 | 100 | 100 | 100 | 79 / 100 / 100 / 100 |

The gate is the desktop preset: the app is a dense desktop layout (DESIGN_SYSTEM §3), and §11's other bars are desktop ones (Chrome, M1). Mobile is not gated. Its
first paint waits for the entry and `vendor` chunks over simulated slow 4G (FCP 2.3 to 3.2 s), and
nothing short of HTML prerendered for each route moves that.

What the gate took:

- `/editor` accessibility 96 to 100. The templates' rows had an `aria-label` of the template alone
  over visible text of the template and its detail (axe `label-content-name-mismatch`): the detail
  now sits over the row beside the button and describes it. The first visit's coach mark hung
  over the registers panel, and its `got it` covered part of the `si` field (axe `target-size`): it
  is now `inline` under the transport.
- `/hills/main` performance 96 to 99, CLS 0.10 to 0.03: the hill's description line and the live
  panel held their room while the hill loads, instead of pushing the standings and the right
  column down when it came.

## Before the gate

Lighthouse 12.8.2 on `/` from `preview`, Chromium 1243 (Playwright's), headless, 2026-09-23, with
the home demo (EXEC 2.3), three mobile runs and two desktop runs.

| Run | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Mobile (default throttling) | 94 to 95 | 100 | 96 | 100 |
| Desktop (`--preset=desktop`) | 100 | 100 | 100 | 100 |

Mobile: FCP 2.3 s, LCP 2.6 s (the ticker), TBT 0 ms, CLS 0. Desktop: FCP 0.5 s, LCP 0.6 s. The
build before the demo scores the same: the demo loads after the first contentful paint. Loaded at
the `load` event instead, which comes before the app's first render, it cost mobile 5 points
(LCP 3.2 s).

Fixed in the app shell's pass: the missing favicon (a 404 in the console, best practices 93) and
the missing `robots.txt` (the SPA fallback served HTML, SEO 91).

`/docs`, 2026-09-24 (EXEC 2.6 task 5), same setup, three mobile runs and one desktop run:

| Page | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| `/docs`, mobile | 95 | 100 | 100 | 100 |
| `/docs`, desktop | 100 | 100 | 100 | 100 |
| `/docs/strategy/imps`, mobile | 94 | 100 | 100 | 100 |
| `/docs/reference/string`, mobile | 93 | 100 | 100 | 100 |

Mobile `/docs`: FCP 2.1 s, LCP 2.6 s (the ticker, as on `/`), CLS 0. What it took:

- The stylesheet is inline in `index.html` (`inlineStylesheet` in `vite.config.ts`, with
  `cssCodeSplit` off so no lazy chunk links it again): FCP 2.3 s to 2.1 s, and `/docs` from 94 or
  95 a run to 95 each run. `/` gained the same (95).
- Code blocks waited for nothing before: their runtime pulled the `editor` and `engine` chunks
  before the first paint, and Lighthouse billed them to LCP (`imps` 88, `reference/string` 82).
  They now wait for paint and idle.
- Accessibility 96 to 100: prose links were told apart by color alone (1.48:1 against body text),
  and code comments, block labels, and flag-table captions were `--text-dim` (3.07:1).

Open items then, for mobile, which the gate does not measure:

- Mobile performance: the `vendor` chunk carries about 55 KiB that `/` does not run. A content
  page's own chunks come one round trip after the entry's (reference pages 92 to 93).
- ~~The app header does not fit a 390 px phone~~: fixed 2026-09-27. Under `md` the nav is one
  menu button that opens `NavSheet` (`src/app/NavSheet.tsx`, a lazy chunk), every page as a 48 px
  row with a line on what it holds, then settings and the source; the header is 390 px wide.
- Mobile best practices, `font-size`: most text is under 12 px. The type scale (DESIGN_SYSTEM §3)
  sets this on purpose, for a dense desktop layout.

Reproduce:

```sh
bun run --filter @asmbots/web build && bun run --filter @asmbots/web preview &
CHROME_PATH="$HOME/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
  bunx lighthouse@12 http://localhost:4173/ --chrome-flags="--headless=new" --view
```
