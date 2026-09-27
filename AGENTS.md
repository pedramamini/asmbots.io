# Agents: start here

ASM Bots is Core War in a real 8086 subset (x16c v1): a Bun monorepo, a React web app, and a Cloudflare Worker. This file is an index. Read the one document your task needs, at the section named, and no more.

## Where to read

| Task | Read |
|---|---|
| The repository's shape, a package's job | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) §1, §2 |
| Anything visible: color, type, layout, a component | [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) §1 (principles), then the section of the part |
| A picture: a dither plate, a banner, the footer | [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) §10, "Add a plate" |
| A theme | [packages/ui/README.md](./packages/ui/README.md), "Add a theme" |
| A UI primitive | [packages/ui/README.md](./packages/ui/README.md) |
| A page of the web app | [apps/web/README.md](./apps/web/README.md), the page's section (Arena, Editor and debugger, Tournaments, …) |
| A bundle, runtime, or Lighthouse budget | [apps/web/README.md](./apps/web/README.md), "Budgets" and "Lighthouse" |
| An end-to-end spec or a screenshot baseline | [apps/web/README.md](./apps/web/README.md), "End to end" and "Screenshots" |
| The docs site, `llms.txt`, the agent skill | [apps/web/README.md](./apps/web/README.md), "Docs" and "Docs for agents" |
| The API, D1, Durable Objects | [apps/api/README.md](./apps/api/README.md) |
| The CLI | [apps/cli/README.md](./apps/cli/README.md) |
| An instruction, the encoder, the engine | [docs/ISA_SPEC.md](./docs/ISA_SPEC.md) (frozen), [packages/codec/README.md](./packages/codec/README.md), [packages/engine/README.md](./packages/engine/README.md) |
| A roster bot | [packages/bots/README.md](./packages/bots/README.md), "Adding a bot" |
| A feature's intent, a release gate | [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md) |
| A deploy, a rollback, a migration, a secret | [docs/RUNBOOK.md](./docs/RUNBOOK.md) |

## Rules that hold everywhere

- `bun run check` passes before every commit: types, lint, contrast, docs links, tests, and the bundle budgets.
- `bun run lint` reads only the root's files (Biome's `files.includes`). To lint app code, run Biome with a copy of `biome.json` whose includes are `**/*.ts` and `**/*.tsx`. Never format CSS with Biome: it lowercases the token hex values the spec tests read.
- A push to `main` deploys once CI is green. Watch CI and the Deploy run to the end.
- A change to what battles do updates the goldens (`bun run golden`). A change to a page's layout updates its theme baselines, `-darwin` and `-linux`.
- The spec documents are the source: change the document with the code, in the same commit.
