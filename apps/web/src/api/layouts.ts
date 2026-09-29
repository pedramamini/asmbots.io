/**
 * The signed-in user's editor layouts (`GET /api/me/layouts`). Here, not in `queries.ts`: Rollup
 * places a module whole, and every page takes that one; only the editor reads a kept layout. The
 * writes are in `layout-writes.ts`, which only the layouts dialog loads.
 */
import { EditorLayoutList, parse } from '@asmbots/protocol'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import { useMe } from './queries'

/** The signed-in user's editor layouts, under `me` so signing out drops them with the account. */
export const editorLayoutsQuery = () =>
  queryOptions({
    queryKey: ['me', 'layouts'],
    queryFn: ({ signal }) =>
      apiGet('/me/layouts', (v) => parse(EditorLayoutList, v, 'your layouts'), signal),
  })

/** The signed-in user's editor layouts; asks nothing while nobody is signed in. */
export function useEditorLayouts() {
  const signedIn = Boolean(useMe().data)
  return useQuery({ ...editorLayoutsQuery(), enabled: signedIn })
}
