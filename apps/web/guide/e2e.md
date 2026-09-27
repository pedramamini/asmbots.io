# End to end

[`apps/web`](../README.md) › End to end. Paths are relative to `apps/web`.

`bun run --filter @asmbots/web e2e` runs the Playwright suite (`e2e/`). `playwright.config.ts`
starts three servers, or reuses ones already up (not in CI):

| Server | Port | What it is |
| --- | --- | --- |
| `vite preview` | 4173 | The production build (`build:vite`); its `/api` goes to the e2e Worker (`API_ORIGIN`) |
| `vite` | 5173 | The dev server, for `/_gallery` |
| `wrangler dev` | 8788 | The e2e Worker (Miniflare): the same build and the API on one origin, `DEV_FAKE_AUTH=1`, its own storage emptied, migrated, and seeded at each start |

CI (`.github/workflows/ci.yml`, job `e2e`) runs the `chromium` project in the Playwright image,
in 4 shards. A failed test runs once more (`retries: 1` under `CI`) and keeps its trace; a failed
shard uploads `test-results/` as `e2e-traces-<shard>`. The `perf` project (frame rate, soak) stays
local: it needs a GPU.

What covers each PRODUCT_SPEC section:

| Flow | Specs |
| --- | --- |
| Home: the demo plays, the panels load | `home-demo`, `home-docs` |
| Arena: setup → fight → victory → share → replay, verified | `arena-setup`, `arena`, `arena-replay` |
| Editor: write → lint → format → test vs → save, local and cloud | `editor`, `account` (fake sign-in) |
| Debugger: breakpoint → step → step back | `debugger` |
| Local tournaments: bracket, round robin, melee | `tournaments` |
| Hills: submit → board | `hills`, `ticker-verify` |
| Server tournaments: enter → live watch from a second browser | `tournaments-server` |
| Docs: search, `open in arena` | `docs`, `home-docs` |
| Settings persist | `settings`, `smoke` |
| Keyboard only | `keyboard`, `focus` |
| Five themes on `/`, `/arena`, `/editor`: compared screenshots | `themes` |
| The goldens in a Chromium Worker (CI's determinism matrix) | `goldens` |

## Screenshots

`e2e/themes.spec.ts` compares each page with a committed baseline in `e2e/__snapshots__/`, 0.2% of
its pixels at most. There is one set a platform: `-darwin` from a Mac, `-linux` from CI's image.
After a change to the look, make both, and review the PNGs before committing them:

```sh
bunx playwright test --project=chromium e2e/themes.spec.ts --update-snapshots   # -darwin
scripts/e2e-linux.sh e2e/themes.spec.ts --update-snapshots                       # -linux (Docker)
```

`scripts/e2e-linux.sh` runs any Playwright arguments in CI's image on a copy of the checkout and
copies back the baselines and `test-results/`: the way to see a Linux-only failure here.
