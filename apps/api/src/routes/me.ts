import {
  type ApiTokenList,
  type AuditList,
  type CreatedApiToken,
  type EditorLayoutList,
  type EditorLayoutSaved,
  handleProblem,
  MAX_API_TOKENS,
  MAX_EDITOR_LAYOUTS,
  type Me,
  type MyBotList,
  NewApiToken,
  parse,
  SaveEditorLayout,
  UpdateEditorLayout,
  UpdateMe,
} from '@asmbots/protocol'
import { type Context, Hono } from 'hono'
import { endAllSessions, endSession, refuseToken, requireUser } from '../auth/session'
import { newToken } from '../auth/token'
import { jsonBody, limitBody } from '../body'
import {
  countApiTokens,
  countEditorLayouts,
  deleteAccount,
  deleteApiToken,
  deleteEditorLayout,
  getUserRow,
  insertApiToken,
  listApiTokens,
  listAudit,
  listEditorLayouts,
  listMyBots,
  saveEditorLayout,
  setUserAnonymous,
  setUserHandle,
  toUser,
  type UserRow,
  updateEditorLayout,
} from '../db/queries'
import type { AppEnv } from '../env'
import { errorResponse, log } from '../middleware'
import { classParam, idParam, wholeParam } from '../params'
import { ownBotsOf } from './bots'

function meBody(row: UserRow): Me {
  return { user: toUser(row, true), onboarded: row.onboarded_at !== null }
}

/** The user is gone (deleted account): the session goes with them. */
async function gone(c: Context<AppEnv>): Promise<Response> {
  await endSession(c)
  return errorResponse(c, 'unauthorized', 'sign in first')
}

/**
 * `GET /api/me`: the signed-in user; 401 when nobody is.
 * `PATCH /api/me` `{ handle?, anonymous? }`: a new handle (lowercased; `handleProblem` says which
 * are allowed), 409 when someone else has it; the first one marks the user onboarded. `anonymous`
 * hides the GitHub name, login, and avatar from every public record (PRODUCT_SPEC §6). The avatar,
 * name, and login are GitHub's, refreshed at each sign-in.
 * `GET /api/me/bots`: the signed-in user's bots, private ones too, each with its latest version.
 * `?class=` (a weight class slug) keeps only the bots whose latest version is in that class.
 * `GET /api/me/bots/arena`: the same bots as the arena fights them (`ownBotsOf`): each at its
 * latest version with its machine code, best hill place, and visibility, the best first.
 * `GET /api/me/audit?limit=`: the signed-in user's changes (`AUDIT_ACTIONS`), newest first; `limit`
 * is 1..100, 50 when left out.
 * `DELETE /api/me`: deletes the account (`deleteAccount`) and ends every session it has. 204.
 * `GET /api/me/tokens`: the signed-in user's API tokens (`token.ts`), the newest first; never a
 * token itself, nor its hash.
 * `POST /api/me/tokens` `{ name }`: a new API token, named 1..40 characters once trimmed → 201
 * `{ token, secret }`. `secret` is the token, shown this once. 409 past `MAX_API_TOKENS`.
 * `DELETE /api/me/tokens/:id`: revokes the token at once. 204; 404 when it is not theirs.
 * `GET /api/me/layouts`: the signed-in user's editor layouts, by name.
 * `POST /api/me/layouts` `{ name, layout }`: keeps the layout under the name (1..40 characters once
 * trimmed), in place of the one of that name in any case → 200 `{ saved, created: false }`, or a
 * new one → 201 `{ saved, created: true }`. 409 for a new one past `MAX_EDITOR_LAYOUTS`.
 * `PATCH /api/me/layouts/:id` `{ name?, layout? }`: renames it, keeps a new layout in it, or both →
 * `{ saved, created: false }`; 409 when another of theirs has the name, 404 when it is not theirs.
 * `DELETE /api/me/layouts/:id`: 204; 404 when it is not theirs.
 * What only a person on the site may do refuses an API token (`refuseToken`, 403): deleting the
 * account and the tokens routes, so a leaked token cannot make more tokens or lock its user out.
 */
export const me = new Hono<AppEnv>()
  .get('/', requireUser, async (c) => {
    const row = await getUserRow(c.env.DB, c.get('session')?.userId ?? '')
    return row === null ? gone(c) : c.json(meBody(row))
  })
  .get('/bots', requireUser, async (c) => {
    const band = classParam(c.req.query('class'))
    const bots = await listMyBots(c.env.DB, c.get('session')?.userId ?? '', band)
    return c.json({ bots } satisfies MyBotList)
  })
  .get('/bots/arena', requireUser, async (c) => {
    c.header('Cache-Control', 'private, no-store')
    return c.json(await ownBotsOf(c.env, c.get('session')?.userId ?? ''))
  })
  .get('/audit', requireUser, async (c) => {
    const limit = wholeParam(c.req.query('limit'), 'the limit', 1, 100, 50)
    const entries = await listAudit(c.env.DB, c.get('session')?.userId ?? '', limit)
    return c.json({ entries } satisfies AuditList)
  })
  .get('/tokens', requireUser, refuseToken, async (c) => {
    const tokens = await listApiTokens(c.env.DB, c.get('session')?.userId ?? '')
    return c.json({ tokens } satisfies ApiTokenList)
  })
  .post('/tokens', requireUser, refuseToken, limitBody(1024), async (c) => {
    const userId = c.get('session')?.userId ?? ''
    const name = parse(NewApiToken, await jsonBody(c), 'the request').name.trim()
    if ((await countApiTokens(c.env.DB, userId)) >= MAX_API_TOKENS) {
      return errorResponse(
        c,
        'conflict',
        `an account holds ${MAX_API_TOKENS} api tokens: revoke one to make another`,
      )
    }
    const { secret, hash, prefix } = await newToken()
    const token = await insertApiToken(c.env.DB, {
      id: crypto.randomUUID(),
      userId,
      name,
      prefix,
      hash,
    })
    return c.json({ token, secret } satisfies CreatedApiToken, 201)
  })
  .delete('/tokens/:id', requireUser, refuseToken, async (c) => {
    const id = idParam(c.req.param('id'), 'the token id')
    const deleted = await deleteApiToken(c.env.DB, c.get('session')?.userId ?? '', id)
    if (!deleted) return errorResponse(c, 'not_found', `no api token ${id}`)
    return c.body(null, 204)
  })
  .get('/layouts', requireUser, async (c) => {
    const layouts = await listEditorLayouts(c.env.DB, c.get('session')?.userId ?? '')
    return c.json({ layouts } satisfies EditorLayoutList)
  })
  .post('/layouts', requireUser, limitBody(8192), async (c) => {
    const userId = c.get('session')?.userId ?? ''
    const asked = parse(SaveEditorLayout, await jsonBody(c), 'the request')
    const name = asked.name.trim()
    const { count, named } = await countEditorLayouts(c.env.DB, userId, name)
    if (!named && count >= MAX_EDITOR_LAYOUTS) {
      return errorResponse(
        c,
        'conflict',
        `an account keeps ${MAX_EDITOR_LAYOUTS} layouts: delete one to save another`,
      )
    }
    const kept = await saveEditorLayout(c.env.DB, userId, name, asked.layout)
    return c.json(kept satisfies EditorLayoutSaved, kept.created ? 201 : 200)
  })
  .patch('/layouts/:id', requireUser, limitBody(8192), async (c) => {
    const id = idParam(c.req.param('id'), 'the layout id')
    const asked = parse(UpdateEditorLayout, await jsonBody(c), 'the request')
    const name = asked.name?.trim()
    const saved = await updateEditorLayout(c.env.DB, c.get('session')?.userId ?? '', id, {
      name,
      layout: asked.layout,
    })
    if (saved === null) return errorResponse(c, 'not_found', `no layout ${id}`)
    if (saved === 'taken') return errorResponse(c, 'conflict', `you have a layout named ${name}`)
    return c.json({ saved, created: false } satisfies EditorLayoutSaved)
  })
  .delete('/layouts/:id', requireUser, async (c) => {
    const id = idParam(c.req.param('id'), 'the layout id')
    const deleted = await deleteEditorLayout(c.env.DB, c.get('session')?.userId ?? '', id)
    if (!deleted) return errorResponse(c, 'not_found', `no layout ${id}`)
    return c.body(null, 204)
  })
  .delete('/', requireUser, refuseToken, async (c) => {
    const userId = c.get('session')?.userId ?? ''
    const deleted = await deleteAccount(c.env.DB, userId)
    const sessions = await endAllSessions(c.env.KV, userId)
    await endSession(c)
    log('info', 'account deleted', { requestId: c.get('requestId'), userId, deleted, sessions })
    return c.body(null, 204)
  })
  .patch('/', requireUser, limitBody(1024), async (c) => {
    const asked = parse(UpdateMe, await jsonBody(c), 'the request')
    const userId = c.get('session')?.userId ?? ''
    const handle = asked.handle?.trim().toLowerCase()
    const problem = handle === undefined ? null : handleProblem(handle)
    if (problem !== null) return errorResponse(c, 'bad_request', problem)
    let row = handle === undefined ? null : await setUserHandle(c.env.DB, userId, handle)
    if (row === 'taken') return errorResponse(c, 'conflict', `${handle} is taken`)
    if (asked.anonymous !== undefined)
      row = await setUserAnonymous(c.env.DB, userId, asked.anonymous)
    return row === null ? gone(c) : c.json(meBody(row))
  })
