/**
 * Rows read a page at a time. D1 refuses a query whose result is over 50 MB ("D1 query result
 * exceeded the maximum response size limit"), and a query over every finished match passed that on
 * 2026-11-15 (27 k matches, 44 MB of JSON: the leaderboard, and with it every profile, answered
 * 500). A query whose rows grow with the match count reads them through `forEachPage`.
 */

/** Rows per page: a finished match is at most ~3 KB, so a page stays under ~12 MB. */
export const PAGE_ROWS = 4000

/**
 * Calls `each` with every row of `sql`, `pageRows` at a time, in rowid order. `sql` selects a
 * `_rowid` column and ends with `AND <table>.rowid > ?N ORDER BY <table>.rowid LIMIT ?M`, where
 * `?N` and `?M` follow `binds` (so `?{binds.length + 1}` and `?{binds.length + 2}`).
 */
export async function forEachPage<T extends { _rowid: number }>(
  db: D1Database,
  sql: string,
  binds: unknown[],
  each: (row: T) => void,
  pageRows = PAGE_ROWS,
): Promise<void> {
  const statement = db.prepare(sql)
  let after = 0
  for (;;) {
    const { results } = await statement.bind(...binds, after, pageRows).all<T>()
    for (const row of results) each(row)
    if (results.length < pageRows) return
    after = (results[results.length - 1] as T)._rowid
  }
}
