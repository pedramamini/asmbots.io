/**
 * The signed-in user's editor layouts (`GET /api/me/layouts`). Here, not in `queries.ts`: Rollup
 * places a module whole, and every page takes that one; only the editor reads a kept layout. The
 * requests and their schemas are in `layout-requests.ts`, loaded when the list is first asked for.
 */
import { queryOptions, useQuery } from '@tanstack/react-query'
import { useMe } from './queries'

/** The signed-in user's editor layouts, under `me` so signing out drops them with the account. */
export const editorLayoutsQuery = () =>
  queryOptions({
    queryKey: ['me', 'layouts'],
    queryFn: async ({ signal }) => (await import('./layout-requests')).getEditorLayouts(signal),
  })

/** The signed-in user's editor layouts; asks nothing while nobody is signed in. */
export function useEditorLayouts() {
  const signedIn = Boolean(useMe().data)
  return useQuery({ ...editorLayoutsQuery(), enabled: signedIn })
}
