/**
 * Reads, keeps, renames, and deletes the signed-in user's editor layouts (`/api/me/layouts`), with
 * their schemas. Apart from `layouts.ts`: the layouts dialog loads it, and the list's query when it
 * first asks, so none of it rides the editor's cold JS.
 */
import {
  EditorLayoutList,
  EditorLayoutSaved,
  type EditorLayoutTree,
  parse,
  type UpdateEditorLayout,
} from '@asmbots/protocol'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import { editorLayoutsQuery } from './layouts'

const segment = encodeURIComponent

/** `GET /api/me/layouts`. */
export function getEditorLayouts(signal?: AbortSignal): Promise<EditorLayoutList> {
  return apiGet('/me/layouts', (v) => parse(EditorLayoutList, v, 'your layouts'), signal)
}

/** `POST /api/me/layouts`: keeps `layout` under `name`, in place of the one of that name. */
export function saveEditorLayout(
  name: string,
  layout: EditorLayoutTree,
): Promise<EditorLayoutSaved> {
  return apiPost('/me/layouts', { name, layout }, (v) => parse(EditorLayoutSaved, v, 'the layout'))
}

/** `PATCH /api/me/layouts/:id`: renames a kept layout, keeps a new one in it, or both. */
export function updateEditorLayout(
  id: string,
  update: UpdateEditorLayout,
): Promise<EditorLayoutSaved> {
  return apiPatch(`/me/layouts/${segment(id)}`, update, (v) =>
    parse(EditorLayoutSaved, v, 'the layout'),
  )
}

/** `DELETE /api/me/layouts/:id`. */
export function deleteEditorLayout(id: string): Promise<void> {
  return apiDelete(`/me/layouts/${segment(id)}`)
}

/** Keeps, renames, or deletes an editor layout, then reads the list again. */
export function useEditorLayoutActions() {
  const client = useQueryClient()
  const onSuccess = () => client.invalidateQueries({ queryKey: editorLayoutsQuery().queryKey })
  return {
    save: useMutation({
      mutationFn: ({ name, layout }: { name: string; layout: EditorLayoutTree }) =>
        saveEditorLayout(name, layout),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, update }: { id: string; update: UpdateEditorLayout }) =>
        updateEditorLayout(id, update),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: deleteEditorLayout, onSuccess }),
  }
}
