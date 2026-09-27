# @asmbots/web

The ASM BOTS web app: Vite 6, React 19, TanStack Router (file routes under `src/routes/`) and
Query, Zustand, and the `@asmbots/ui` kit.

| Script | What it does |
| --- | --- |
| `bun run --filter @asmbots/web dev` | Dev server on http://localhost:5173 |
| `bun run --filter @asmbots/web build` | `tsc -b`, then `build:vite`: the production build in `dist/`, then the docs for agents (see [Docs for agents](guide/docs-site.md#docs-for-agents)) |
| `bun run --filter @asmbots/web preview` | Serves `dist/` on http://localhost:4173 |
| `bun run --filter @asmbots/web test` | Unit and component tests (`test/`), the arena Worker in Bun's real `Worker` |
| `bun run --filter @asmbots/web e2e` | Playwright (`e2e/`) against the build and the seeded e2e Worker: see [End to end](guide/e2e.md) |

## Guide

One file a part of the app, in `guide/`. Read the one your change touches; paths in them are relative to `apps/web`.

| Part | What it covers |
| --- | --- |
| [Docs](guide/docs-site.md) | the docs site under `/docs`, its MDX, search, and the files for agents (`llms.txt`, the skill) |
| [Arena](guide/arena.md) | the battle page: routes, sound, the first visit, the Worker protocol, the renderer, its performance, adding an effect |
| [Editor and debugger](guide/editor.md) | the editor and debugger: architecture, keymap, breakpoints, adding a template |
| [Tournaments](guide/tournaments.md) | tournaments run in the browser and on the server: the files, the runner, the controls |
| [Stats](guide/stats.md) | `/stats`, the leaderboard, and the badges |
| [Empty and error states](guide/states.md) | what each page shows while loading, empty, offline, or failed |
| [Sharing and embeds](guide/sharing.md) | share links, replays, screenshots, and the embed |
| [Details that come with age](guide/details.md) | release names, the 404 imp, `robots.txt`, a bot's fights, the king's reign |
| [Accessibility](guide/accessibility.md) | DESIGN_SYSTEM §8 in practice, and the four Playwright specs that hold it |
| [Budgets](guide/budgets.md) | bundle, runtime, and network budgets, and what `bun run bundle` checks |
| [Lighthouse](guide/lighthouse.md) | the Lighthouse release gate and how to run it before a push |
| [End to end](guide/e2e.md) | the Playwright specs, the seeded e2e Worker, and the theme screenshot baselines |
