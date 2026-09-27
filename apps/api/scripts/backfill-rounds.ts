/**
 * `bun run scripts/backfill-rounds.ts --local | --remote` (in `apps/api`): writes each round into
 * the result of a match stored without them (`MatchOutcome.rounds`), from its replay in R2, so the
 * stats page counts its deaths and cycles (PRODUCT_SPEC §12). Seeds before 2026-09-27 kept only
 * the points. A replay whose result hash is not the match's is skipped. Running it again changes
 * nothing. Flags after `--local` go to every wrangler command, as for the seed.
 */
import { execFile, execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import type { MatchOutcome, ReplayResult } from '@asmbots/protocol'
import { replayObjectKey } from '../src/storage'

const [where, ...flags] = process.argv.slice(2)
if (where !== '--local' && where !== '--remote') {
  console.error('usage: bun run scripts/backfill-rounds.ts --local [--persist-to <dir>] | --remote')
  process.exit(2)
}

const wrangler = fileURLToPath(new URL('../node_modules/.bin/wrangler', import.meta.url))
const cwd = fileURLToPath(new URL('..', import.meta.url))
const run = promisify(execFile)
const BUCKET = 'asmbots-replays'
/** R2 reads at once. */
const PARALLEL = 8

interface Row {
  id: string
  replay_key: string
  result_json: string
}

const listed = execFileSync(
  wrangler,
  [
    'd1',
    'execute',
    'asmbots',
    '--json',
    '--command',
    `SELECT id, replay_key, result_json FROM matches
     WHERE result_json IS NOT NULL AND replay_key IS NOT NULL
       AND json_type(result_json, '$.rounds') IS NULL`,
    where,
    ...flags,
  ],
  { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
)
const rows = (JSON.parse(listed) as { results: Row[] }[])[0]?.results ?? []
console.log(`backfill: ${rows.length} matches without rounds`)

const updates: string[] = []
let skipped = 0
for (let i = 0; i < rows.length; i += PARALLEL) {
  await Promise.all(
    rows.slice(i, i + PARALLEL).map(async (row) => {
      const { stdout } = await run(
        wrangler,
        [
          'r2',
          'object',
          'get',
          `${BUCKET}/${replayObjectKey(row.replay_key)}`,
          '--pipe',
          where,
          ...flags,
        ],
        { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
      )
      const replay = JSON.parse(stdout) as { result: ReplayResult }
      const outcome = JSON.parse(row.result_json) as MatchOutcome
      if (replay.result.resultHash !== outcome.resultHash) {
        skipped += 1
        console.warn(`backfill: ${row.id}: the replay's result is not the match's; skipped`)
        return
      }
      const rounds = JSON.stringify(replay.result.rounds).replaceAll("'", "''")
      updates.push(
        `UPDATE matches SET result_json = json_set(result_json, '$.rounds', json('${rounds}'))
         WHERE id = '${row.id.replaceAll("'", "''")}' AND json_type(result_json, '$.rounds') IS NULL;`,
      )
    }),
  )
  process.stdout.write(`\rbackfill: read ${Math.min(i + PARALLEL, rows.length)}/${rows.length}`)
}
console.log()

if (updates.length > 0) {
  const dir = mkdtempSync(join(tmpdir(), 'asmbots-backfill-'))
  try {
    const sql = join(dir, 'backfill.sql')
    writeFileSync(sql, updates.join('\n'))
    execFileSync(wrangler, ['d1', 'execute', 'asmbots', '--file', sql, '--yes', where, ...flags], {
      cwd,
      stdio: 'inherit',
    })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
console.log(`backfill: ${updates.length} matches given their rounds, ${skipped} skipped`)
