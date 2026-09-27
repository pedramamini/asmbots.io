import { DELETED_HANDLE, type UserDetail } from '@asmbots/protocol'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import {
  getUserByHandle,
  listBotsByOwner,
  listUserChampionships,
  listUserHillBests,
} from '../db/queries'
import { readUserStats } from '../db/user-stats'
import type { AppEnv } from '../env'
import { classParam } from '../params'
import { viewerId } from '../viewer'

/**
 * `GET /api/users/:handle` (any case): the user and their public bots (all of them for the user
 * themself), each with its latest size, their best place on each hill, their championship
 * results, and their numbers over the same bots (`readUserStats`). An anonymous user's name,
 * GitHub login, and avatar are left out (`toUser`). `?class=` (a weight class slug) keeps only the bots whose latest version is in that
 * class; any other value is a 400. `deleted`, the owner of what deleted accounts leave on hills,
 * is a 404.
 */
export const users = new Hono<AppEnv>().get('/:handle', async (c) => {
  const handle = c.req.param('handle')
  const band = classParam(c.req.query('class'))
  const user = await getUserByHandle(c.env.DB, handle)
  // The owner of deleted accounts' hill bots is no one's profile.
  if (user === null || user.handle === DELETED_HANDLE)
    throw new HTTPException(404, { message: `no user ${handle}` })
  const publicOnly = user.id !== viewerId(c)
  const [bots, hills, championships, stats] = await Promise.all([
    listBotsByOwner(c.env.DB, user.id, publicOnly, band),
    listUserHillBests(c.env.DB, user.id),
    listUserChampionships(c.env.DB, user.id),
    readUserStats(c.env.DB, user.id, publicOnly),
  ])
  return c.json({ user, bots, hills, championships, stats } satisfies UserDetail)
})
