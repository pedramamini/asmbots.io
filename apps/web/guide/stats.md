# Stats

[`apps/web`](../README.md) › Stats. Paths are relative to `apps/web`.

`/stats` (PRODUCT_SPEC §12) is the site in numbers, from one read, `GET /api/stats`, and
`/stats/leaderboard` the builders ranked with their badges, from `GET /api/leaderboard`; each at
most 5 minutes old. The code is in `src/features/stats/` and `src/features/badges/`.

| File | What it holds |
| --- | --- |
| `query.ts` | `statsQuery`, `useStats`. Not in `api/queries.ts`: every page takes that module, and only this one reads the stats. |
| `series.ts` | Every day from the first to today (at least 30, at most 90 on the chart), running totals, uptime (`3d 04h`), the bots by class and by size in powers of two, `compact` (`142M`). |
| `charts.tsx` | `DayChart` (a bar a day, the hovered or today's bright, its readout above), `SizeChart` (the size histogram, the classes under the bins they span), `ClassCounts`, `Split` (two counts as one bar). HTML boxes in the theme's tokens, no chart library; each chart is one image to assistive tech, its label the numbers. |
| `StatsPage.tsx` | The panels: the site in numbers, activity, life and death, weight classes, records, hills. A record's bots and a hill's king each name their author (`BotLink by`). |
| `StatsTabs.tsx` | The two tabs that head both pages, `the site` and `leaderboard`. |
| `LeaderboardPage.tsx` | `/stats/leaderboard`: the builders ranked (the house last, dimmed), then every badge by group with its holders. |
| `../badges/glyphs.ts`, `../badges/Badge.tsx` | Each badge's 8 × 8 glyph as 8 strings (`#` its color, `*` bright), `BadgeGlyph`, `BadgeTile`. A title is `--info`, a milestone the accent, a badge nobody holds `--border-strong`. |
| `../badges/ProfileBadges.tsx` | The profile's badges panel. |

The banner is the `chart` plate (DESIGN_SYSTEM §10). The footer's `compete` column links the page.

The header's `stats` holds both pages. The badge ids are their own module
(`@asmbots/protocol` `badge-ids.ts`): every page's API schemas read them, and the catalog, with its
words and rules, stays out of the shell.

Tests: `test/stats.test.tsx` (the series, the page, a failed read), `test/leaderboard.test.tsx`
(the glyphs, the board, the badges), the profile's badges in `test/api-pages.test.tsx`; API
`test/stats.test.ts`, `test/leaderboard.test.ts`; protocol `test/badges.test.ts`. Both pages are in
the smoke, axe, and focus specs.
