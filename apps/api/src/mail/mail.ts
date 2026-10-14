/**
 * Account mail: the link that verifies an email, the link that resets a password, and the notes
 * that say a password or an address changed. One `Mailer` whatever sends it:
 * - `EMAIL`, a Cloudflare `send_email` binding (Email Service), from `MAIL_FROM`: production's.
 *   No key to keep: the binding is the credential. Off until both are set (RUNBOOK, "Mail").
 * - the test transport (`MAIL_TRANSPORT=test`, a request to localhost only, as `fakeAuth`): no
 *   mail leaves. The message goes to KV at `mail:test:<to>` for an hour, where a test reads it,
 *   and to the log, where `wrangler dev` shows the link to click.
 * With neither, mail is off (`mailer` is null): an account may hold no email, and none recovers.
 */
import type { Context } from 'hono'
import { isLocalHost } from '../auth/session'
import type { AppEnv, Env } from '../env'
import { log } from '../middleware'

export interface Mail {
  to: string
  subject: string
  /** Plain text: no HTML, so nothing in a message is markup to inject into. */
  text: string
}

export type Mailer = (mail: Mail) => Promise<void>

/** The name mail comes from. */
const FROM_NAME = 'ASM Bots'

/** How long the test transport keeps a message. */
const TEST_TTL_SECONDS = 60 * 60

/** Where the test transport keeps the last message to `to`. */
export function testMailKey(to: string): string {
  return `mail:test:${to}`
}

function testMailer(env: Env): Mailer {
  return async (mail) => {
    await env.KV.put(testMailKey(mail.to), JSON.stringify(mail), {
      expirationTtl: TEST_TTL_SECONDS,
    })
    log('info', 'mail (test transport, not sent)', mail)
  }
}

function cloudflareMailer(binding: SendEmail, from: string): Mailer {
  return async ({ to, subject, text }) => {
    await binding.send({ from: { name: FROM_NAME, email: from }, to, subject, text })
  }
}

/** What sends this request's mail, or null when mail is off. */
export function mailer(c: Context<AppEnv>): Mailer | null {
  if (c.env.MAIL_TRANSPORT === 'test' && isLocalHost(c)) return testMailer(c.env)
  if (c.env.EMAIL && c.env.MAIL_FROM) return cloudflareMailer(c.env.EMAIL, c.env.MAIL_FROM)
  return null
}

/**
 * The origin a mailed link opens: the site's canonical one (`SITE_URL`), never one a request
 * names, so a forged `Host` or `Origin` cannot point a reset link at another site. On localhost
 * only (dev, the tests): the page that asked, so the link opens the dev server.
 */
export function linkOrigin(c: Context<AppEnv>): string {
  if (!isLocalHost(c)) return c.env.SITE_URL
  return c.req.header('Origin') ?? new URL(c.req.url).origin
}

/**
 * Runs `work` (a link kept, a message sent) after the response (`waitUntil`), so the answer takes
 * as long whether there was mail to send or not. A failure is logged with the request, never the
 * message or its link.
 */
export function afterResponse(c: Context<AppEnv>, what: string, work: Promise<void>): void {
  const done = work.catch((err) => {
    log('error', `${what} failed`, {
      requestId: c.get('requestId'),
      error: err instanceof Error ? err.message : String(err),
    })
  })
  c.executionCtx.waitUntil(done)
}
