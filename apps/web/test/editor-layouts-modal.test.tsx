/**
 * The editor's `layouts` dialog, against `msw`: it lists the signed-in user's kept layouts, each in
 * little, the one on screen marked; loads one; keeps the layout on screen under a name (`replace`
 * for a name it has); renames one; and deletes one after asking.
 */
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'bun:test'
import type { EditorLayout, EditorLayoutSaved, Me } from '@asmbots/protocol'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { useDom, window } from '../../../packages/ui/test/dom'
import { LayoutsModal } from '../src/features/editor/LayoutsModal'
import { type Layout, PRESETS } from '../src/features/editor/layout/tree'
import { answer, answerPost, renderAt, useApiServer } from './api-server'

useDom()
window.scrollTo = () => {}

const T = '2026-09-24T12:00:00.000Z'
const ME: Me = {
  user: { id: 'u1', handle: 'octo', avatarUrl: null, createdAt: T },
  onboarded: true,
}
const tree = (layout: Layout) => JSON.parse(JSON.stringify(layout))
const WRITING: EditorLayout = {
  id: 'l1',
  name: 'Writing',
  layout: tree(PRESETS.writing()),
  createdAt: T,
  updatedAt: T,
}
const DEBUG: EditorLayout = {
  id: 'l2',
  name: 'wide debug',
  layout: tree(PRESETS.debugging()),
  createdAt: T,
  updatedAt: T,
}

const server = useApiServer()

function signedIn(on: boolean) {
  // biome-ignore lint/suspicious/noDocumentCookie: the hint cookie the API would set
  document.cookie = on ? 'signed_in=1; Path=/' : 'signed_in=; Max-Age=0; Path=/'
}
afterEach(() => signedIn(false))

/** The dialog over the writing layout, the user keeping `layouts`; what it applied and closed. */
async function open(layouts: EditorLayout[]) {
  signedIn(true)
  server.use(answer('/me', ME), answer('/me/layouts', { layouts }))
  const applied: [Layout, string][] = []
  const closed: true[] = []
  await renderAt('/editor', () => (
    <LayoutsModal
      open
      current={PRESETS.writing()}
      onClose={() => closed.push(true)}
      onApply={(layout, name) => applied.push([layout, name])}
    />
  ))
  const dialog = await screen.findByRole('dialog', { name: 'layouts' })
  return { dialog, applied, closed }
}

describe('the layouts dialog', () => {
  it('lists the kept layouts in little, marks the one on screen, and loads one', async () => {
    const { dialog, applied, closed } = await open([WRITING, DEBUG])
    const list = await within(dialog).findByRole('list', { name: 'your layouts' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('Writingon screen'),
      expect.stringContaining('wide debugsaved'),
    ])
    expect(within(list).getAllByRole('img')[1]?.getAttribute('aria-label')).toContain('memory')
    expect(dialog.textContent).toContain('2 of 24')
    fireEvent.click(within(rows[1] as HTMLElement).getByRole('button', { name: 'load' }))
    expect(applied).toEqual([[PRESETS.debugging(), 'wide debug']])
    expect(closed).toHaveLength(1)
  })

  it('keeps the layout on screen under a name; a name it has, in any case, replaces that one', async () => {
    const { dialog } = await open([DEBUG])
    const seen: unknown[] = []
    const saved: EditorLayoutSaved = { saved: { ...DEBUG, id: 'l3', name: 'mine' }, created: true }
    server.use(answerPost('/me/layouts', saved, 201, seen))
    const name = within(dialog).getByRole('textbox', { name: 'layout name' })
    fireEvent.change(name, { target: { value: 'WIDE DEBUG' } })
    expect(within(dialog).getByRole('button', { name: 'replace' })).toBeTruthy()
    expect(dialog.textContent).toContain('replaces wide debug.')
    fireEvent.change(name, { target: { value: '  mine ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'save' }))
    await waitFor(() => expect(seen).toHaveLength(1))
    expect(seen[0]).toEqual({ name: 'mine', layout: tree(PRESETS.writing()) })
    await waitFor(() => expect((name as HTMLInputElement).value).toBe(''))
  })

  it('renames one in place', async () => {
    const { dialog } = await open([DEBUG])
    const seen: unknown[] = []
    server.use(
      http.patch('*/api/me/layouts/l2', async ({ request }) => {
        seen.push(await request.json())
        return HttpResponse.json({ saved: { ...DEBUG, name: 'deep' }, created: false })
      }),
    )
    fireEvent.click(await within(dialog).findByRole('button', { name: 'rename wide debug' }))
    const field = within(dialog).getByRole('textbox', { name: 'new name' })
    fireEvent.change(field, { target: { value: 'deep' } })
    fireEvent.submit(field)
    await waitFor(() => expect(seen).toEqual([{ name: 'deep' }]))
    await waitFor(() =>
      expect(within(dialog).queryByRole('textbox', { name: 'new name' })).toBeNull(),
    )
  })

  it('deletes one after asking', async () => {
    const { dialog } = await open([DEBUG])
    const deleted: string[] = []
    server.use(
      http.delete('*/api/me/layouts/:id', ({ params }) => {
        deleted.push(String(params.id))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    fireEvent.click(await within(dialog).findByRole('button', { name: 'delete wide debug' }))
    expect(dialog.textContent).toContain('delete it?')
    fireEvent.click(within(dialog).getByRole('button', { name: 'keep' }))
    expect(deleted).toEqual([])
    fireEvent.click(within(dialog).getByRole('button', { name: 'delete wide debug' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'delete' }))
    await waitFor(() => expect(deleted).toEqual(['l2']))
  })
})
