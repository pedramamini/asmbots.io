# Sharing and embeds

[`apps/web`](../README.md) › Sharing and embeds. Paths are relative to `apps/web`.

`share ▾` (`features/share/ShareMenu.tsx`, PRODUCT_SPEC §10) offers what a page has of three
things: `copy link`, `copy embed` (an `<iframe>` of the page's battle, 800 x 450), and `download
png` (the page's share card from the API, or the arena's screenshot). Each copy says so in a toast.

| Page | Link | Embed | PNG |
| --- | --- | --- | --- |
| A battle (`/arena`, title row and victory) | the setup's share link | the same link under `/embed` | the screenshot (`s`) |
| A replay (`/arena/$replayId`) | the stored replay's page, else its `#r=` link | `/embed/arena/<key>` (or the `#r=` link) | the screenshot |
| A bot (`/bots/$id`) | its page | once its source is known: it sparring with `dwarf`, seed 1, its source in `#src=` | its card, unless private |
| A hill (`/hills/$slug`) | its page | its newest match that has a replay | its card |
| A server tournament | its page | the match it finished last that has a replay | its card, unless a draft |
| A tournament of this browser | its `#t=` link | none | a bracket drawn in the page's theme (`export.ts`) |

The embed of an arena URL is the same URL under `/embed` (`share/share.ts`): `/embed/arena?b=…#src=…`
fights the battle an arena link names (the roster's bots and those the fragment carries; this
browser's own bots are not read, since a third-party frame has no access to them), and
`/embed/arena/$replayId` plays a replay (`features/embed/EmbedArena.tsx`). The embed routes set
`staticData.frame: false`, so the root draws no header, ticker, or status bar: the arena, a legend,
the outcome line at the end, and a bar with play/pause, restart, the round and cycle, and `watch on
asmbots`, which opens the same battle in the arena in a new tab. It plays as it loads (under
reduced motion it waits for `play`), rounds follow on after `ROUND_PAUSE_MS`, and the arena is a
picture (`interactive={false}`), so the wheel scrolls the page around it. No sound, no keys.

Crawlers and link previews (`app/pages.ts`): the build writes `meta/pages.json` (each page the
server can describe without data: the app's pages and every docs page, by the titles their routes'
`head`s write, a description, and the card's words), `sitemap.xml` (the pages search may index;
the Worker adds the hills and the public bots), and `robots.txt`, and puts the home page's head
tags in `index.html` (`sitePages` in `vite.config.ts`). The Worker swaps those tags for each page's
own (`apps/api` README, Pages and share cards). `SITE_URL` is `https://asmbots.io`, as the Worker's.

Tests: `test/share.test.tsx`, `test/embed.test.tsx` (the embed in the app's own route tree has no
header), `test/site-pages.test.ts` (the manifest's titles are the routes' `head`s), and
`e2e/embed.spec.ts` (the embed plays to its end; `copy embed` pasted into another page plays
there, framed; the Worker's heads, cards as PNGs, frame policy, sitemap, and robots).
