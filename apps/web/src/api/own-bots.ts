/**
 * `GET /api/me/bots/arena` (PRODUCT_SPEC §2): the signed-in user's bots as the arena fights them,
 * every visibility, with their machine code, the best first. Here, not in `queries.ts`: only the
 * arena reads them, and their schema stays in its chunk.
 */
import { OwnBotList, parse } from '@asmbots/protocol'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiGet } from './client'

/** Under `['me', 'bots']`: signing out drops them, and a change to my bots reads them again. */
export const ownBotsQuery = () =>
  queryOptions({
    queryKey: ['me', 'bots', 'arena'],
    queryFn: ({ signal }) =>
      apiGet('/me/bots/arena', (v) => parse(OwnBotList, v, 'my bots'), signal),
  })

/** My account's bots; waits while `enabled` is off (signed out, or nothing reads them). */
export const useOwnBots = (enabled: boolean) => useQuery({ ...ownBotsQuery(), enabled })
