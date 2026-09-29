/**
 * The editor's kept layouts (`/api/me/layouts`). Apart from `api.ts`: Rollup places a module whole,
 * and every page takes that one; only the editor reads a kept layout.
 */
import * as z from 'zod/mini'
import { Id, Timestamp } from './schema'

/** The most editor layouts a user may keep. */
export const MAX_EDITOR_LAYOUTS = 24

/** The most a kept editor layout takes, as JSON, bytes: every panel of the page fits in a third. */
export const MAX_EDITOR_LAYOUT_BYTES = 4096

/**
 * An editor layout as the editor keeps it (`apps/web/src/features/editor/layout/tree.ts`): the
 * tree of its panels and the ones hidden. The API checks only its shape and size: the panels are
 * the editor's, and the editor makes a kept layout whole when it reads it, as it does its own
 * store, so a layout kept before a panel was added still loads.
 */
export const EditorLayoutTree = z
  .object({
    /**
     * The root split, an object. Not `z.record`: zod's record would ride every page's `vendor`
     * chunk for this one schema; `unknown` and `refine` are there already.
     */
    root: z
      .unknown()
      .check(
        z.refine(
          (root) => typeof root === 'object' && root !== null && !Array.isArray(root),
          'a layout root is an object',
        ),
      ),
    hidden: z.array(z.string().check(z.maxLength(64))),
  })
  .check(
    z.refine(
      (layout) =>
        new TextEncoder().encode(JSON.stringify(layout)).length <= MAX_EDITOR_LAYOUT_BYTES,
      `a layout is at most ${MAX_EDITOR_LAYOUT_BYTES} bytes`,
    ),
  )
export type EditorLayoutTree = z.output<typeof EditorLayoutTree>

/** A layout's name: 1..40 characters once trimmed, one line. Unique to its user, in any case. */
const LayoutName = z
  .string()
  .check(
    z.refine((name) => /^[^\n\r]{1,40}$/.test(name.trim()), 'a layout name is 1..40 characters'),
  )

/** One of the signed-in user's editor layouts (`GET /api/me/layouts`). */
export const EditorLayout = z.object({
  id: Id,
  name: z.string(),
  layout: EditorLayoutTree,
  createdAt: Timestamp,
  updatedAt: Timestamp,
})
export type EditorLayout = z.output<typeof EditorLayout>

/** `GET /api/me/layouts`: the signed-in user's editor layouts, by name. */
export const EditorLayoutList = z.object({ layouts: z.array(EditorLayout) })
export type EditorLayoutList = z.output<typeof EditorLayoutList>

/** `POST /api/me/layouts`: a layout kept under `name`, in place of the one of that name. */
export const SaveEditorLayout = z.object({ name: LayoutName, layout: EditorLayoutTree })
export type SaveEditorLayout = z.output<typeof SaveEditorLayout>

/** `PATCH /api/me/layouts/:id`: a new name, a new layout, or both. */
export const UpdateEditorLayout = z
  .object({ name: z.optional(LayoutName), layout: z.optional(EditorLayoutTree) })
  .check(z.refine((v) => v.name !== undefined || v.layout !== undefined, 'nothing to change'))
export type UpdateEditorLayout = z.output<typeof UpdateEditorLayout>

/** `POST` and `PATCH /api/me/layouts`: the layout as kept; `created` when it is a new one. */
export const EditorLayoutSaved = z.object({ saved: EditorLayout, created: z.boolean() })
export type EditorLayoutSaved = z.output<typeof EditorLayoutSaved>
