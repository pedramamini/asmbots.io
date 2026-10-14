/**
 * The account mail, in words. A link carries its token after `#`: a fragment stays in the
 * browser, so the token is in no server log and no `Referer`. The page reads it and posts it.
 */
import type { Mail } from './mail'

/** How long a verification link works: a day. */
export const VERIFY_TTL_SECONDS = 24 * 60 * 60
/** How long a reset link works: half an hour. */
export const RESET_TTL_SECONDS = 30 * 60

const SIGNATURE = 'ASM Bots'

export function verifyMail(to: string, origin: string, handle: string, token: string): Mail {
  return {
    to,
    subject: 'ASM Bots: verify your email',
    text: [
      `Someone, we hope you, gave this address for the ASM Bots account ${handle}.`,
      '',
      'Verify it, and it can reset the account password if you forget it:',
      '',
      `${origin}/verify-email#${token}`,
      '',
      'The link works once, for 24 hours. If this was not you, do nothing: an address that is',
      'not verified can do nothing with the account.',
      '',
      SIGNATURE,
    ].join('\n'),
  }
}

export function resetMail(to: string, origin: string, handle: string, token: string): Mail {
  return {
    to,
    subject: 'ASM Bots: reset your password',
    text: [
      `Someone, we hope you, asked to reset the password of the ASM Bots account ${handle}.`,
      '',
      'Pick a new password here:',
      '',
      `${origin}/reset-password#${token}`,
      '',
      'The link works once, for 30 minutes. If this was not you, do nothing: the password stays',
      'as it is.',
      '',
      SIGNATURE,
    ].join('\n'),
  }
}

export function passwordChangedMail(to: string, origin: string, handle: string): Mail {
  return {
    to,
    subject: 'ASM Bots: your password changed',
    text: [
      `The password of the ASM Bots account ${handle} just changed, and every other session of`,
      'the account was signed out.',
      '',
      `If this was not you, reset the password now: ${origin}/forgot-password`,
      '',
      SIGNATURE,
    ].join('\n'),
  }
}

export function emailChangedMail(to: string, origin: string, handle: string): Mail {
  return {
    to,
    subject: 'ASM Bots: your account email changed',
    text: [
      `This address is no longer the email of the ASM Bots account ${handle}: it was changed or`,
      'removed in the account settings, and it can no longer reset the password.',
      '',
      `If this was not you, sign in and change the password: ${origin}/login`,
      '',
      SIGNATURE,
    ].join('\n'),
  }
}
