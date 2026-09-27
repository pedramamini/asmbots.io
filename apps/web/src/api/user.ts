/**
 * `GET /api/users/:handle` (PRODUCT_SPEC §6). Here, not in `queries.ts`: Rollup places a module
 * whole, and every page takes that one; only a profile and the hills (the signed-in user's best
 * places) read a user, and its numbers' schema stays in their chunks.
 */
import { parse, UserDetail } from '@asmbots/protocol'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiGet } from './client'

export const userQuery = (handle: string) =>
  queryOptions({
    queryKey: ['users', handle.toLowerCase()],
    queryFn: ({ signal }) =>
      apiGet(
        `/users/${encodeURIComponent(handle)}`,
        (v) => parse(UserDetail, v, 'the user'),
        signal,
      ),
  })

export const useUser = (handle: string) => useQuery(userQuery(handle))

/** A profile; waits while `handle` is null. */
export const useMaybeUser = (handle: string | null) =>
  useQuery({ ...userQuery(handle ?? ''), enabled: handle !== null })
