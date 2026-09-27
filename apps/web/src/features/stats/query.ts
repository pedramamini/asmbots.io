/**
 * `GET /api/stats` and `GET /api/leaderboard` (PRODUCT_SPEC §12). Here, not in `api/queries.ts`:
 * Rollup places a module whole, and every page takes that one; only the stats pages read these.
 */
import { Leaderboard, parse, SiteStats, STATS_TTL_SECONDS } from '@asmbots/protocol'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiGet } from '../../api/client'

/** The site in numbers. The server reads them again each `STATS_TTL_SECONDS`; so does the page. */
export const statsQuery = () =>
  queryOptions({
    queryKey: ['stats'],
    queryFn: ({ signal }) => apiGet('/stats', (v) => parse(SiteStats, v, 'the stats'), signal),
    staleTime: STATS_TTL_SECONDS * 1000,
  })

export const useStats = () => useQuery(statsQuery())

/** The leaderboard and its badges, read again as the stats are. */
export const leaderboardQuery = () =>
  queryOptions({
    queryKey: ['leaderboard'],
    queryFn: ({ signal }) =>
      apiGet('/leaderboard', (v) => parse(Leaderboard, v, 'the leaderboard'), signal),
    staleTime: STATS_TTL_SECONDS * 1000,
  })

export const useLeaderboard = () => useQuery(leaderboardQuery())
