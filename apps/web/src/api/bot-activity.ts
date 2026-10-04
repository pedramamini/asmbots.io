/**
 * `GET /api/bots/:id/activity` (PRODUCT_SPEC §6). Here, not in `queries.ts`: Rollup places a module
 * whole, and every page takes that one; only a bot page's charts read it, and its schema stays in
 * their chunk.
 */
import { BotActivity, parse } from '@asmbots/protocol'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiGet } from './client'

export const botActivityQuery = (id: string) =>
  queryOptions({
    queryKey: ['bots', id, 'activity'],
    queryFn: ({ signal }) =>
      apiGet(
        `/bots/${encodeURIComponent(id)}/activity`,
        (v) => parse(BotActivity, v, 'the bot’s activity'),
        signal,
      ),
  })

export const useBotActivity = (id: string) => useQuery(botActivityQuery(id))
