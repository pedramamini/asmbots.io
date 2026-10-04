/**
 * Cloud bots (`POST /api/bots`, `PATCH` and `DELETE /api/bots/:id`, `POST /api/bots/:id/versions`,
 * `GET /api/me/bots`): versions and their dedupe, who sees what, and the limits.
 */

import { env } from 'cloudflare:workers'
import {
  AuditList,
  BotDetail,
  BotVersionDetail,
  DeletedBots,
  MAX_BOTS_PER_USER,
  MAX_VERSIONS_PER_BOT,
  MyBotList,
  OwnBotList,
  PublicBotList,
  parse,
  SavedBot,
  SavedBotVersion,
  toBase64,
  UpdatedBot,
  UpdatedBots,
  UserDetail,
} from '@asmbots/protocol'
import { describe, expect, it } from 'vitest'
import { PUBLIC_BOTS_KEY } from '../src/routes/bots'
import { botBytesKey } from '../src/storage'
import { errorOf, HALT, me, SPIN, send, signIn } from './fake-auth'
import { Jar } from './jar'

/** Signs in `as` and makes a bot of `source`; returns the jar and the saved bot. */
async function withBot(as: string, source = SPIN, visibility?: string) {
  const jar = new Jar()
  await signIn(jar, as)
  const res = await send(jar, '/api/bots', {
    method: 'POST',
    body: { name: 'Spin', source, ...(visibility !== undefined && { visibility }) },
  })
  expect(res.status).toBe(201)
  return { jar, saved: parse(SavedBot, await res.json(), 'the bot') }
}

async function addVersion(jar: Jar, id: string, source: string) {
  const res = await send(jar, `/api/bots/${id}/versions`, { method: 'POST', body: { source } })
  return { status: res.status, body: parse(SavedBotVersion, await res.json(), 'the version') }
}

async function myBots(jar: Jar) {
  const res = await send(jar, '/api/me/bots')
  expect(res.status).toBe(200)
  return parse(MyBotList, await res.json(), 'my bots').bots
}

describe('POST /api/bots', () => {
  it('makes a public bot at version 1, its bytes in R2, listed in my bots', async () => {
    const { jar, saved } = await withBot('maker')
    expect(saved.bot).toMatchObject({ name: 'Spin', slug: 'spin', visibility: 'public' })
    expect(saved.version).toMatchObject({ version: 1, source: SPIN, author: 'Tester' })
    const bytes = await env.REPLAYS.get(botBytesKey(saved.version.bytesSha256))
    expect(bytes?.size).toBe(saved.version.size)
    const mine = await myBots(jar)
    expect(mine.map((m) => [m.bot.id, m.latest?.version])).toEqual([[saved.bot.id, 1]])
    expect(mine[0]?.latest?.source).toBeUndefined()
    const again = await send(jar, '/api/bots', {
      method: 'POST',
      body: { name: 'Spin', source: HALT, visibility: 'private' },
    })
    const second = parse(SavedBot, await again.json(), 'the bot')
    expect([second.bot.slug, second.bot.visibility]).toEqual(['spin-2', 'private'])
  })

  it('is 422 for a source that does not assemble, saying why', async () => {
    const jar = new Jar()
    await signIn(jar, 'broken-maker')
    const res = await send(jar, '/api/bots', {
      method: 'POST',
      body: { name: 'Broken', source: '%name "Broken"\nstart: frob ax\n' },
    })
    const error = await errorOf(res)
    expect([error.status, error.code]).toEqual([422, 'unprocessable'])
    expect(error.message).toMatch(/^it does not assemble: line 2: /)
    expect(await myBots(jar)).toEqual([])
  })

  it('is 401 signed out, for my bots too', async () => {
    const body = { name: 'Spin', source: SPIN }
    expect((await send(new Jar(), '/api/bots', { method: 'POST', body })).status).toBe(401)
    expect((await send(new Jar(), '/api/me/bots')).status).toBe(401)
  })
})

describe('POST /api/bots/:id/versions', () => {
  it('increments the version, and a source of the latest bytes makes none', async () => {
    const { jar, saved } = await withBot('versioner')
    const id = saved.bot.id
    const two = await addVersion(jar, id, HALT)
    expect([two.status, two.body.created, two.body.version.version]).toEqual([201, true, 2])
    expect(two.body.version.source).toBe(HALT)
    expect(two.body.bot.updatedAt >= saved.bot.updatedAt).toBe(true)

    // A comment changes the text, not the bytes: still version 2.
    const same = await addVersion(jar, id, `${HALT}; a comment\n`)
    expect([same.status, same.body.created, same.body.version.version]).toEqual([200, false, 2])
    expect(same.body.version.id).toBe(two.body.version.id)

    // Only the latest counts: version 1's bytes again are version 3.
    const three = await addVersion(jar, id, SPIN)
    expect([three.status, three.body.created, three.body.version.version]).toEqual([201, true, 3])

    const detail = parse(BotDetail, await (await send(jar, `/api/bots/${id}`)).json(), 'the bot')
    expect(detail.versions.map((v) => v.version)).toEqual([3, 2, 1])
    expect((await myBots(jar))[0]?.latest?.version).toBe(3)
  })

  it('is 422 for a source that does not assemble, and makes no version', async () => {
    const { jar, saved } = await withBot('versioner-422')
    const res = await send(jar, `/api/bots/${saved.bot.id}/versions`, {
      method: 'POST',
      body: { source: 'start: frob ax\n' },
    })
    expect((await errorOf(res)).status).toBe(422)
    expect((await myBots(jar))[0]?.latest?.version).toBe(1)
  })

  it('is 409 in the protocol error shape once the bot holds the most versions', async () => {
    const { jar, saved } = await withBot('many-versions')
    const fill = Array.from({ length: MAX_VERSIONS_PER_BOT - 1 }, (_, i) =>
      env.DB.prepare(
        `INSERT INTO bot_versions (id, bot_id, version, source, bytes_sha256, size, isa)
         VALUES (?, ?, ?, 'hlt', ?, 1, 'x16c-v1')`,
      ).bind(`fill-${i}`, saved.bot.id, i + 2, (i % 16).toString(16).repeat(64)),
    )
    await env.DB.batch(fill)
    const res = await send(jar, `/api/bots/${saved.bot.id}/versions`, {
      method: 'POST',
      body: { source: SPIN },
    })
    expect(await errorOf(res)).toEqual({
      status: 409,
      code: 'conflict',
      message: `a bot holds ${MAX_VERSIONS_PER_BOT} versions`,
    })
  })

  it("is 403 for someone else's bot they can see, 404 for one they cannot", async () => {
    const { saved: open } = await withBot('owner-a', SPIN, 'public')
    const { saved: closed } = await withBot('owner-b', SPIN, 'private')
    const jar = new Jar()
    await signIn(jar, 'intruder')
    const body = { source: HALT }
    const a = await send(jar, `/api/bots/${open.bot.id}/versions`, { method: 'POST', body })
    expect(await errorOf(a)).toMatchObject({ status: 403, code: 'forbidden' })
    const b = await send(jar, `/api/bots/${closed.bot.id}/versions`, { method: 'POST', body })
    expect((await errorOf(b)).status).toBe(404)
  })
})

describe('visibility', () => {
  it('holds on GET: private to its owner, unlisted by link without source, public with it', async () => {
    const { jar, saved } = await withBot('shower', SPIN, 'private')
    const id = saved.bot.id
    const stranger = new Jar()
    await signIn(stranger, 'stranger')
    const bot = (who: Jar) => send(who, `/api/bots/${id}`)
    const v1 = async (who: Jar) => {
      const res = await send(who, `/api/bots/${id}/versions/1`)
      return parse(BotVersionDetail, await res.json(), 'the version').version.source
    }
    const visibility = async (to: string) => {
      const res = await send(jar, `/api/bots/${id}`, { method: 'PATCH', body: { visibility: to } })
      expect(res.status).toBe(200)
      return parse(UpdatedBot, await res.json(), 'the bot').bot
    }

    expect((await bot(jar)).status).toBe(200)
    expect(await v1(jar)).toBe(SPIN)
    expect((await bot(stranger)).status).toBe(404)
    expect((await bot(new Jar())).status).toBe(404)

    expect((await visibility('unlisted')).visibility).toBe('unlisted')
    expect((await bot(stranger)).status).toBe(200)
    expect(await v1(stranger)).toBeUndefined()
    const profile = parse(UserDetail, await (await send(stranger, '/api/users/shower')).json(), '')
    expect(profile.bots).toEqual([])

    await visibility('public')
    expect(await v1(new Jar())).toBe(SPIN)
    const listed = parse(UserDetail, await (await send(stranger, '/api/users/shower')).json(), '')
    expect(listed.bots.map((b) => b.id)).toEqual([id])
  })

  it('PATCH renames, keeps the slug, and refuses an empty update or a stranger', async () => {
    const { jar, saved } = await withBot('renamer', SPIN, 'public')
    const id = saved.bot.id
    const res = await send(jar, `/api/bots/${id}`, { method: 'PATCH', body: { name: 'Twirl' } })
    const { bot } = parse(UpdatedBot, await res.json(), 'the bot')
    expect([bot.name, bot.slug, bot.visibility]).toEqual(['Twirl', 'spin', 'public'])
    const empty = await send(jar, `/api/bots/${id}`, { method: 'PATCH', body: {} })
    expect(empty.status).toBe(400)
    const bad = await send(jar, `/api/bots/${id}`, {
      method: 'PATCH',
      body: { visibility: 'deleted' },
    })
    expect(bad.status).toBe(400)
    const stranger = new Jar()
    await signIn(stranger, 'renamer-rival')
    const theirs = await send(stranger, `/api/bots/${id}`, {
      method: 'PATCH',
      body: { name: 'Mine' },
    })
    expect((await errorOf(theirs)).status).toBe(403)
  })
})

describe('GET /api/bots', () => {
  it('lists every bot, a private one too, with its bytes and visibility, cached a minute', async () => {
    const { saved: open } = await withBot('lister')
    const { saved: closed } = await withBot('lister-b', HALT, 'private')
    const res = await send(new Jar(), '/api/bots')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60')
    const { bots: all } = parse(PublicBotList, await res.json(), 'the arena bots')
    const bots = all.filter((b) => b.bot.owner.startsWith('lister'))
    const bytes = await env.REPLAYS.get(botBytesKey(open.version.bytesSha256))
    expect(bots).toContainEqual({
      bot: expect.objectContaining({ botId: open.bot.id, owner: 'lister', version: 1 }),
      strategy: 'Jump to itself',
      bytes: toBase64(new Uint8Array((await bytes?.arrayBuffer()) ?? [])),
      updatedAt: open.bot.updatedAt,
      best: null,
      visibility: 'public',
    })
    // A private bot fights in the arena: its machine code is listed, its source stays hidden.
    const hidden = bots.find((b) => b.bot.botId === closed.bot.id)
    expect(hidden?.visibility).toBe('private')
    expect(hidden?.bytes.length).toBeGreaterThan(0)
    const version = await send(new Jar(), `/api/bots/${closed.bot.id}/versions/1`)
    expect(version.status).toBe(404)
    expect(bots).toHaveLength(2)
  })
})

/** Puts `versionId` on a new hill `slug` at `rank`, rated `rating`. */
async function placeOnHill(slug: string, versionId: string, rank: number, rating: number) {
  const config = { coreSize: 65536, maxCycles: 100000, maxProcesses: 64, minSpacing: 512 }
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO hills (id, slug, name, size, rounds, config_json) VALUES (?1, ?1, ?1, 10, 1, ?2)`,
    ).bind(slug, JSON.stringify({ ...config, maxBotBytes: 512 })),
    env.DB.prepare(
      'INSERT INTO hill_entries (hill_id, bot_version_id, rank, rating) VALUES (?, ?, ?, ?)',
    ).bind(slug, versionId, rank, rating),
  ])
}

describe('the best first', () => {
  it('GET /api/bots lists a bot with a hill place before a newer one without', async () => {
    const { saved: placed } = await withBot('best-first-a')
    await placeOnHill('best-first', placed.version.id, 2, 1600)
    const { saved: newer } = await withBot('best-first-b', HALT)
    // The list is cached a minute: an earlier test's read would hide these bots.
    await env.KV.delete(PUBLIC_BOTS_KEY)
    const { bots } = parse(PublicBotList, await (await send(new Jar(), '/api/bots')).json(), '')
    const ids = bots.map((b) => b.bot.botId)
    expect(ids.indexOf(placed.bot.id)).toBeLessThan(ids.indexOf(newer.bot.id))
    expect(bots.find((b) => b.bot.botId === placed.bot.id)?.best?.rank).toBe(2)
  })

  it('GET /api/me/bots/arena: mine, every visibility, with bytes, the best first', async () => {
    const { jar, saved: open } = await withBot('own-lister', SPIN, 'public')
    const hidden = await send(jar, '/api/bots', {
      method: 'POST',
      body: { name: 'Halt', source: HALT, visibility: 'private' },
    })
    const closed = parse(SavedBot, await hidden.json(), 'the bot')
    await placeOnHill('own-best', closed.version.id, 1, 1700)
    await withBot('own-lister-rival')
    const res = await send(jar, '/api/me/bots/arena')
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
    const { bots } = parse(OwnBotList, await res.json(), 'my arena bots')
    expect(bots.map((b) => [b.bot.botId, b.visibility, b.best?.rank ?? null])).toEqual([
      [closed.bot.id, 'private', 1],
      [open.bot.id, 'public', null],
    ])
    const bytes = await env.REPLAYS.get(botBytesKey(open.version.bytesSha256))
    expect(bots[1]?.bytes).toBe(toBase64(new Uint8Array((await bytes?.arrayBuffer()) ?? [])))
    expect((await send(new Jar(), '/api/me/bots/arena')).status).toBe(401)
  })
})

describe('bulk changes', () => {
  it("PATCH /api/me/bots sets many of my bots at once, and leaves a stranger's", async () => {
    const { jar, saved: a } = await withBot('bulk-owner', SPIN, 'public')
    const made = await send(jar, '/api/bots', { method: 'POST', body: { name: 'B', source: HALT } })
    const b = parse(SavedBot, await made.json(), 'the bot')
    const { saved: theirs } = await withBot('bulk-stranger', SPIN, 'public')
    const res = await send(jar, '/api/me/bots', {
      method: 'PATCH',
      body: { ids: [a.bot.id, b.bot.id, theirs.bot.id, a.bot.id], visibility: 'private' },
    })
    expect(res.status).toBe(200)
    const { bots } = parse(UpdatedBots, await res.json(), 'the bots')
    expect(bots.map((bot) => [bot.id, bot.visibility]).sort()).toEqual(
      [
        [a.bot.id, 'private'],
        [b.bot.id, 'private'],
      ].sort(),
    )
    const mine = await myBots(jar)
    expect(mine.every((m) => m.bot.visibility === 'private')).toBe(true)
    const stranger = parse(
      BotDetail,
      await (await send(new Jar(), `/api/bots/${theirs.bot.id}`)).json(),
      '',
    )
    expect(stranger.bot.visibility).toBe('public')
    const audit = await send(jar, '/api/me/audit')
    const { entries } = parse(AuditList, await audit.json(), 'the audit')
    expect(entries.filter((row) => row.action === 'bot.update')).toHaveLength(2)
  })

  it('POST /api/me/bots/delete deletes many of mine at once', async () => {
    const { jar, saved: a } = await withBot('bulk-deleter')
    const made = await send(jar, '/api/bots', { method: 'POST', body: { name: 'B', source: HALT } })
    const b = parse(SavedBot, await made.json(), 'the bot')
    const res = await send(jar, '/api/me/bots/delete', {
      method: 'POST',
      body: { ids: [a.bot.id, b.bot.id, 'no-such-bot'] },
    })
    expect(res.status).toBe(200)
    const { deleted } = parse(DeletedBots, await res.json(), 'the ids')
    expect(deleted.sort()).toEqual([a.bot.id, b.bot.id].sort())
    expect(await myBots(jar)).toEqual([])
    expect((await send(jar, `/api/bots/${a.bot.id}`)).status).toBe(404)
  })

  it('refuses an empty list, a bad visibility, and a stranger signed out', async () => {
    const jar = new Jar()
    await signIn(jar, 'bulk-refused')
    const patch = (body: unknown) => send(jar, '/api/me/bots', { method: 'PATCH', body })
    expect((await patch({ ids: [], visibility: 'private' })).status).toBe(400)
    expect((await patch({ ids: ['x'], visibility: 'gone' })).status).toBe(400)
    const out = await send(new Jar(), '/api/me/bots/delete', {
      method: 'POST',
      body: { ids: ['x'] },
    })
    expect(out.status).toBe(401)
  })
})

describe('DELETE /api/bots/:id', () => {
  it('hides the bot from everyone, its owner too, and frees its room', async () => {
    const { jar, saved } = await withBot('deleter', SPIN, 'public')
    const id = saved.bot.id
    const stranger = new Jar()
    await signIn(stranger, 'deleter-rival')
    expect((await send(stranger, `/api/bots/${id}`, { method: 'DELETE' })).status).toBe(403)

    expect((await send(jar, `/api/bots/${id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await send(jar, `/api/bots/${id}`)).status).toBe(404)
    expect((await send(new Jar(), `/api/bots/${id}`)).status).toBe(404)
    expect((await send(jar, `/api/bots/${id}`, { method: 'DELETE' })).status).toBe(404)
    const late = await send(jar, `/api/bots/${id}/versions`, {
      method: 'POST',
      body: { source: HALT },
    })
    expect(late.status).toBe(404)
    expect(await myBots(jar)).toEqual([])
    const profile = parse(UserDetail, await (await send(jar, '/api/users/deleter')).json(), '')
    expect(profile.bots).toEqual([])

    // Soft: the rows stay, and a new bot of the same name takes a new slug.
    const row = await env.DB.prepare('SELECT deleted_at FROM bots WHERE id = ?')
      .bind(id)
      .first<{ deleted_at: string | null }>()
    expect(row?.deleted_at).toMatch(/^\d{4}-/)
    const again = await send(jar, '/api/bots', {
      method: 'POST',
      body: { name: 'Spin', source: SPIN },
    })
    expect(parse(SavedBot, await again.json(), 'the bot').bot.slug).toBe('spin-2')
  })
})

describe('the bot limit', () => {
  it('is 409 in the protocol error shape at MAX_BOTS_PER_USER; a deleted bot frees a place', async () => {
    const jar = new Jar()
    await signIn(jar, 'bot-hoarder')
    const { user } = await me(jar)
    const fill = Array.from({ length: MAX_BOTS_PER_USER }, (_, i) =>
      env.DB.prepare('INSERT INTO bots (id, owner_id, slug, name) VALUES (?, ?, ?, ?)').bind(
        `bh-${i}`,
        user.id,
        `bh-${i}`,
        `Hoard ${i}`,
      ),
    )
    await env.DB.batch(fill)
    const body = { name: 'One more', source: SPIN }
    const res = await send(jar, '/api/bots', { method: 'POST', body })
    expect(await errorOf(res)).toEqual({
      status: 409,
      code: 'conflict',
      message: `an account holds ${MAX_BOTS_PER_USER} bots: there is room for 0 more`,
    })
    expect((await send(jar, '/api/bots/bh-0', { method: 'DELETE' })).status).toBe(204)
    expect((await send(jar, '/api/bots', { method: 'POST', body })).status).toBe(201)
  })
})

describe('bot lists by weight class', () => {
  /** A middleweight: 600 bytes. */
  const WIDE = '%name "Wide"\nstart: jmp start\n        times 598 db 0x90\n'

  it('carries each bot’s latest size, and `?class=` keeps that class by the latest version', async () => {
    const { jar, saved } = await withBot('classer', SPIN, 'public')
    const light = saved.bot.id
    const made = await send(jar, '/api/bots', {
      method: 'POST',
      body: { name: 'Wide', source: WIDE, visibility: 'public' },
    })
    const wide = parse(SavedBot, await made.json(), 'the bot')
    expect(wide.version.size).toBe(600)

    const mine = await myBots(jar)
    expect(mine.map((m) => [m.bot.id, m.bot.size])).toEqual([
      [wide.bot.id, 600],
      [light, saved.version.size],
    ])
    for (const m of mine) expect(m.bot.size).toBe(m.latest?.size)
    const profile = parse(
      UserDetail,
      await (await send(new Jar(), '/api/users/classer')).json(),
      '',
    )
    expect(profile.bots.map((b) => b.size)).toEqual([600, saved.version.size])

    const mineOf = async (cls: string) => {
      const res = await send(jar, `/api/me/bots?class=${cls}`)
      return parse(MyBotList, await res.json(), 'my bots').bots.map((m) => m.bot.id)
    }
    const profileOf = async (cls: string) => {
      const res = await send(new Jar(), `/api/users/classer?class=${cls}`)
      return parse(UserDetail, await res.json(), 'the user').bots.map((b) => b.id)
    }
    expect(await mineOf('middleweight')).toEqual([wide.bot.id])
    expect(await mineOf('lightweight')).toEqual([light])
    expect(await mineOf('heavyweight')).toEqual([])
    expect(await profileOf('middleweight')).toEqual([wide.bot.id])
    expect(await profileOf('super-heavy')).toEqual([])

    // The latest version decides: the light bot grows into a middleweight.
    expect((await addVersion(jar, light, WIDE)).status).toBe(201)
    expect((await profileOf('middleweight')).sort()).toEqual([light, wide.bot.id].sort())
    expect(await mineOf('lightweight')).toEqual([])
  })

  it('is 400 for an unknown class, naming the classes', async () => {
    const { jar } = await withBot('bad-classer')
    for (const path of ['/api/me/bots?class=open', '/api/users/bad-classer?class=Heavyweight']) {
      const error = await errorOf(await send(jar, path))
      expect(error.status).toBe(400)
      expect(error.message).toBe(
        'the class must be one of lightweight, middleweight, heavyweight, super-heavy',
      )
    }
  })
})
