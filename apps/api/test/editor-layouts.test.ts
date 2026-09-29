/**
 * Editor layouts (`/api/me/layouts`): a signed-in user keeps their arrangements of the editor's
 * panels by name, recalls them on any device, renames them, keeps a new arrangement in one, and
 * deletes them. Each user sees only their own; the layouts go with the account.
 */
import { env } from 'cloudflare:workers'
import {
  EditorLayoutList,
  EditorLayoutSaved,
  type EditorLayoutTree,
  MAX_EDITOR_LAYOUT_BYTES,
  MAX_EDITOR_LAYOUTS,
  parse,
} from '@asmbots/protocol'
import { describe, expect, it } from 'vitest'
import { errorOf, send, signIn } from './fake-auth'
import { Jar } from './jar'

async function user(as: string): Promise<Jar> {
  const jar = new Jar()
  await signIn(jar, as)
  return jar
}

/** A layout of the source beside `other`, the rest hidden. */
function tree(other = 'help', share = 0.5): EditorLayoutTree {
  return {
    root: {
      kind: 'split',
      dir: 'row',
      children: [
        { kind: 'panel', id: 'source' },
        { kind: 'panel', id: other },
      ],
      weights: [share, 1 - share],
    },
    hidden: ['library'],
  }
}

async function save(jar: Jar, name: string, layout = tree()): Promise<Response> {
  return send(jar, '/api/me/layouts', { method: 'POST', body: { name, layout } })
}

async function saved(res: Response, status: number): Promise<EditorLayoutSaved> {
  expect(res.status).toBe(status)
  return parse(EditorLayoutSaved, await res.json(), 'the layout')
}

async function layouts(jar: Jar): Promise<EditorLayoutList['layouts']> {
  const res = await send(jar, '/api/me/layouts')
  expect(res.status).toBe(200)
  return parse(EditorLayoutList, await res.json(), 'the layouts').layouts
}

describe('POST /api/me/layouts', () => {
  it('keeps a layout under its name, trimmed, as it was sent', async () => {
    const jar = await user('layout-maker')
    const { saved: kept, created } = await saved(await save(jar, '  wide debug  '), 201)
    expect(created).toBe(true)
    expect(kept.name).toBe('wide debug')
    expect(kept.layout).toEqual(tree())
    expect(await layouts(jar)).toEqual([kept])
  })

  it('saving under a name it has, in any case, replaces that one and takes the new case', async () => {
    const jar = await user('layout-replacer')
    const first = await saved(await save(jar, 'Focus'), 201)
    const again = await saved(await save(jar, 'FOCUS', tree('memory', 0.3)), 200)
    expect(again.created).toBe(false)
    expect(again.saved.id).toBe(first.saved.id)
    expect(again.saved.name).toBe('FOCUS')
    expect(again.saved.layout).toEqual(tree('memory', 0.3))
    expect(await layouts(jar)).toHaveLength(1)
  })

  it('lists them by name, in any case', async () => {
    const jar = await user('layout-lister')
    for (const name of ['zeta', 'Alpha', 'beta']) await saved(await save(jar, name), 201)
    expect((await layouts(jar)).map((l) => l.name)).toEqual(['Alpha', 'beta', 'zeta'])
  })

  it('refuses a name that is empty once trimmed, or longer than 40', async () => {
    const jar = await user('layout-namer')
    for (const name of ['   ', 'x'.repeat(41), 'two\nlines']) {
      expect(await errorOf(await save(jar, name))).toEqual({
        status: 400,
        code: 'bad_request',
        message: 'a layout name is 1..40 characters',
      })
    }
  })

  it('refuses what is not a layout, and one over the size', async () => {
    const jar = await user('layout-shaper')
    for (const layout of [null, { root: 'source', hidden: [] }, { root: {} }]) {
      const res = await send(jar, '/api/me/layouts', {
        method: 'POST',
        body: { name: 'bad', layout },
      })
      expect(res.status).toBe(400)
    }
    const huge = { root: { kind: 'panel', id: 'x'.repeat(MAX_EDITOR_LAYOUT_BYTES) }, hidden: [] }
    expect(await errorOf(await save(jar, 'huge', huge))).toEqual({
      status: 400,
      code: 'bad_request',
      message: `a layout is at most ${MAX_EDITOR_LAYOUT_BYTES} bytes`,
    })
  })

  it(`keeps ${MAX_EDITOR_LAYOUTS} layouts an account: 409 for a new one past that, not a replace`, async () => {
    const jar = await user('layout-hoarder')
    for (let n = 0; n < MAX_EDITOR_LAYOUTS; n++) await saved(await save(jar, `l${n}`), 201)
    expect(await errorOf(await save(jar, 'one more'))).toMatchObject({
      status: 409,
      code: 'conflict',
    })
    await saved(await save(jar, 'l0', tree('trace')), 200)
    expect(await layouts(jar)).toHaveLength(MAX_EDITOR_LAYOUTS)
  })

  it('is 401 signed out', async () => {
    expect((await save(new Jar(), 'x')).status).toBe(401)
    expect((await send(new Jar(), '/api/me/layouts')).status).toBe(401)
  })
})

describe('PATCH /api/me/layouts/:id', () => {
  it('renames it, keeps a new layout in it, or both', async () => {
    const jar = await user('layout-editor')
    const { saved: kept } = await saved(await save(jar, 'draft'), 201)
    const renamed = await saved(
      await send(jar, `/api/me/layouts/${kept.id}`, {
        method: 'PATCH',
        body: { name: ' final ' },
      }),
      200,
    )
    expect(renamed.saved).toMatchObject({ id: kept.id, name: 'final', layout: tree() })
    const moved = await saved(
      await send(jar, `/api/me/layouts/${kept.id}`, {
        method: 'PATCH',
        body: { layout: tree('arena', 0.7) },
      }),
      200,
    )
    expect(moved.saved).toMatchObject({ name: 'final', layout: tree('arena', 0.7) })
  })

  it('is 409 for a name another of theirs has, in any case; a new case of its own is fine', async () => {
    const jar = await user('layout-clasher')
    await saved(await save(jar, 'one'), 201)
    const { saved: two } = await saved(await save(jar, 'two'), 201)
    const path = `/api/me/layouts/${two.id}`
    const clash = await send(jar, path, { method: 'PATCH', body: { name: 'ONE' } })
    expect(await errorOf(clash)).toMatchObject({ status: 409, code: 'conflict' })
    const recased = await send(jar, path, { method: 'PATCH', body: { name: 'TWO' } })
    expect((await saved(recased, 200)).saved.name).toBe('TWO')
  })

  it("is 404 for another user's layout, and 400 for nothing to change", async () => {
    const owner = await user('layout-owner')
    const other = await user('layout-other')
    const { saved: kept } = await saved(await save(owner, 'mine'), 201)
    const path = `/api/me/layouts/${kept.id}`
    const res = await send(other, path, { method: 'PATCH', body: { name: 'stolen' } })
    expect(res.status).toBe(404)
    expect((await send(owner, path, { method: 'PATCH', body: {} })).status).toBe(400)
    expect(await layouts(other)).toEqual([])
    expect((await layouts(owner))[0]?.name).toBe('mine')
  })
})

describe('DELETE /api/me/layouts/:id', () => {
  it("deletes the user's own, and is 404 for another's", async () => {
    const owner = await user('layout-deleter')
    const other = await user('layout-bystander')
    const { saved: kept } = await saved(await save(owner, 'gone'), 201)
    const path = `/api/me/layouts/${kept.id}`
    expect((await send(other, path, { method: 'DELETE' })).status).toBe(404)
    expect((await send(owner, path, { method: 'DELETE' })).status).toBe(204)
    expect(await layouts(owner)).toEqual([])
    expect((await send(owner, path, { method: 'DELETE' })).status).toBe(404)
  })

  it('the layouts go with the account', async () => {
    const jar = await user('layout-leaver')
    const { saved: kept } = await saved(await save(jar, 'bye'), 201)
    expect((await send(jar, '/api/me', { method: 'DELETE' })).status).toBe(204)
    const row = await env.DB.prepare('SELECT id FROM editor_layouts WHERE id = ?')
      .bind(kept.id)
      .first()
    expect(row).toBeNull()
  })
})
