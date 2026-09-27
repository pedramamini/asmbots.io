# Docs

[`apps/web`](../README.md) › Docs. Paths are relative to `apps/web`.

`/docs` pages are MDX in `src/docs/`: a page at slug `machine/memory` is `machine/memory.mdx`,
listed in the sidebar tree `src/docs/nav.ts` (a test holds every file to a page). MDX compiles
with GitHub tables and fenced-block meta (`src/docs/remark.ts`). A page uses these blocks with no
import (`src/docs/components.tsx`):

| Block | What it draws |
| --- | --- |
| ```` ```asm run="vs=imp" ```` or `<Asm run="vs=imp">` | x16c in the editor's colors, `copy`, `open in editor`, and with `run`, `open in arena` against that roster bot, or a melee against several (`vs=dwarf,stone,paper`, up to 15); `seed=7` fixes the seed. `fragment` marks a piece of a bot: copy only |
| `<Encoding form="mov r/m16, imm16" />` | A form's bytes from `docs/opcodes.json`: opcode, ModR/M, displacement, immediate |
| `<Flags op="add" />`, `<Flags set="CZ" />` | The ODITSZAPC row, changed flags lit |
| `<Keys>g a</Keys>`, `<Keys>ctrl+enter</Keys>` | Keycaps: a chord, a combination |
| `<Note>`, `<Warn>` | Callouts |
| `<Fig src="modrm" alt="…">caption</Fig>` | An SVG of `src/docs/figures/`, drawn inline in theme colors |
| `<KeyMap />` | Every key of the app, from the key tables of `src/app/keymaps.ts` |

A code block's colors and links load once the page has painted and gone idle
(`src/docs/asm-runtime.ts`: the CM tokenizer and the share codec; `usePaintedAndIdle` in
`src/app/paint.ts`, which the site's art and footer also wait on). In a block, comments are `--text-muted`,
not the editor's `--text-dim`: in the docs they are prose. Links in prose are underlined, not
only accent-colored. The sidebar's search (`/`) reads a prebuilt index of every page's
headings and prose, `src/docs/generated/search-index.json`: run `bun run docs-index` after
editing a page (`test/docs-index.test.ts` fails on a stale index). `test/docs.test.tsx` compiles
and draws every page, and assembles every `open in editor` snippet with zero errors.
`test/docs-machine.test.ts`, `test/docs-strategy.test.ts`, and `test/docs-guide.test.ts` run
what the pages claim: every record table is fought again, every roster bot on a page must be the
roster's file word for word, and each "try" edit is made and measured. Change a bot, the engine,
or a page, and they say which words no longer hold.

`bun run docs-links` (in `bun run check`) checks every link of every page: a `/docs/…` path is a
page of `nav.ts` and its `#anchor` one of its headings, any other path a route of
`routeTree.gen.ts`, an outside link `https://` (not fetched), no relative paths, and each `Fig`
and `Shot` a real file. It prints `file:line: why` per broken link. A link to a file of the docs
for agents (below, listed in `src/docs/agent-files.ts`) passes, and loads as a file, not a route.

## Docs for agents

`build:vite` runs `scripts/agent-docs.ts` after Vite, which writes into `dist/` from the same MDX
(`bun scripts/agent-docs.ts [dist]` runs it alone on a build):

| File | What it holds |
| --- | --- |
| `llms.txt` | The [llmstxt.org](https://llmstxt.org) index: a summary, the key rules, a link to every page's `.md` by section, and the agents' files |
| `llms-full.txt` | Every page in reading order, each under its `#` heading and URL |
| `docs/<slug>.md` | One page as Markdown: `Note`/`Warn` as quotes, `Flags`, `Encoding`, and `KeyMap` as tables of their data, `Fig` as its description, `Shot` as an image, `Keys` as code, no fence meta, and site links to `https://asmbots.io/docs/<slug>.md` |
| `skill/SKILL.md` | The agent skill's instructions: `skill/SKILL.md` here, with the references and examples lists filled in |
| `skill/asm-bots.zip` | The skill folder `asm-bots/`: `SKILL.md`, `references/` (every page, links as sibling files), `examples/` (the roster's six families), and `bin/asmbots.js` (the CLI's `bundle`, for Node). Entries sorted, one fixed time: the same files make the same bytes |

A component with no Markdown form fails the build (add it to `toMarkdown`). `public/_headers`
gives these files `Access-Control-Allow-Origin: *` and an hour's cache, and `run_worker_first` in
`apps/api/wrangler.jsonc` leaves them to the static assets, which type `.md` as `text/markdown`
and `.txt` as `text/plain`. `test/agent-docs.test.ts` converts every page without a build.
