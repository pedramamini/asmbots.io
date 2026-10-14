import { describe, expect, it } from 'bun:test'
import {
  AUTH_TOKEN,
  AuthMethods,
  ChangeEmail,
  Credentials,
  emailProblem,
  MAX_EMAIL,
  MAX_PASSWORD,
  MIN_PASSWORD,
  normalizeEmail,
  normalizePassword,
  ProtocolError,
  parse,
  passwordProblem,
  SignUp,
} from '../src/index'

describe('passwordProblem', () => {
  it('asks 15 code points, and nothing else of a password that has them', () => {
    expect(MIN_PASSWORD).toBe(15)
    expect(passwordProblem('correct horse battery')).toBeNull()
    expect(passwordProblem('alllowercaseonly')).toBeNull()
    expect(passwordProblem(`${'x'.repeat(13)}yz`)).toBeNull()
    expect(passwordProblem(`${'x'.repeat(12)}yz`)).toBe('a password is at least 15 characters')
    expect(passwordProblem(`ab${'x'.repeat(MAX_PASSWORD - 2)}`)).toBeNull()
    expect(passwordProblem(`ab${'x'.repeat(MAX_PASSWORD - 1)}`)).toBe(
      'a password is at most 128 characters',
    )
  })

  it('counts code points of the NFKC form, as the server hashes it', () => {
    // 15 UTF-16 units, but an `e` and a combining accent are one `é`: 14 once normalized.
    const combining = 'café au lait x'
    expect(combining.length).toBe(15)
    expect(normalizePassword(combining)).toBe('café au lait x')
    expect(passwordProblem(combining)).toBe('a password is at least 15 characters')
    // Seven emoji are 14 UTF-16 units and 7 code points, and eight letters make 15.
    expect(passwordProblem(`${'\u{1F916}'.repeat(7)}asmbotsz`)).toBeNull()
    expect(passwordProblem(`${'\u{1F916}'.repeat(7)}asmbots`)).toBe(
      'a password is at least 15 characters',
    )
    // A ligature is the two letters it stands for.
    expect(normalizePassword('ﬀ')).toBe('ff')
  })

  it('refuses a piece repeated, in any form a compatibility character gives it', () => {
    expect(passwordProblem('aaaaaaaaaaaaaaaa')).toBe('a password is more than one piece repeated')
    expect(passwordProblem('abcabcabcabcabcabc')).toBe('a password is more than one piece repeated')
    // Fullwidth `ａ` and `a` are one letter once normalized: no way past the rule.
    expect(passwordProblem('ａa'.repeat(8))).toBe('a password is more than one piece repeated')
  })

  it('refuses the account`s own names, and them with a short tail, however they are typed', () => {
    expect(passwordProblem('long-username-x', ['long-username-x'])).toBe(
      'a password is more than your username or email',
    )
    expect(passwordProblem('Long.Username.X!!', ['long-username-x'])).toBe(
      'a password is more than your username or email',
    )
    expect(passwordProblem('ada@example.com', ['ada', 'ada@example.com'])).toBe(
      'a password is more than your username or email',
    )
    // A username is public: with it at either end, a password needs 15 of its own besides. Fullwidth
    // letters of the username are the username.
    expect(passwordProblem('\uff41\uff44\uff41-lovelace-1815', ['ada'])).toBe(
      'a password is more than your username or email',
    )
    expect(passwordProblem('ada-lovelace-1815', ['ada'])).toBe(
      'a password is more than your username or email',
    )
    expect(passwordProblem('ａｄａａｄａａｄａ-2-3-4-5', ['adaadaada'])).toBe(
      'a password is more than your username or email',
    )
    expect(passwordProblem('ada-lovelace-was-first', ['ada'])).toBeNull()
  })

  it('refuses what a guesser tries first, with or without spaces and in any case', () => {
    const common = 'that password is too common: pick another'
    expect(passwordProblem('correct horse battery staple')).toBe(common)
    expect(passwordProblem('Correct-Horse-Battery-Staple')).toBe(common)
    expect(passwordProblem('123456789012345')).toBe(common)
    expect(passwordProblem('qwertyuiopasdfgh')).toBe(common)
    expect(passwordProblem('abcdefghijklmnop')).toBe(common)
    // Fullwidth digits are digits.
    expect(passwordProblem('１２３４５６７８９０１２３４５')).toBe(common)
  })
})

describe('emails', () => {
  it('normalizes an address: trimmed, lowercase', () => {
    expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com')
    expect(normalizeEmail('   ')).toBe('')
  })

  it('takes an address, and nothing a mail header reads as more than one', () => {
    for (const good of ['ada@example.com', 'a.b+tag@sub.example.co', 'x_y-z@example.io']) {
      expect(emailProblem(good)).toBeNull()
    }
    for (const bad of [
      '',
      'ada',
      'ada@',
      '@example.com',
      'ada@example',
      'ada@@example.com',
      'ada@example..com',
      'ada@.example.com',
      'ada@example.com.',
      'ada lovelace@example.com',
      'ada@example.com\nBcc: eve@example.com',
      'ada@example.com,eve@example.com',
      'Ada <ada@example.com>',
      '"ada"@example.com',
    ]) {
      expect(emailProblem(bad)).toBe('that is not an email address')
    }
    expect(emailProblem(`${'a'.repeat(MAX_EMAIL)}@example.com`)).toBe(
      'an email is at most 254 characters',
    )
  })
})

describe('the sign-in records', () => {
  it('read a sign-up with or without an email, and refuse one too long to be either', () => {
    expect(parse(SignUp, { username: 'ada', password: 'p' }, 'the request')).toEqual({
      username: 'ada',
      password: 'p',
    })
    expect(parse(SignUp, { username: 'ada', password: 'p', email: 'a@b.co' }, 'x').email).toBe(
      'a@b.co',
    )
    expect(() => parse(SignUp, { username: 'ada' }, 'the request')).toThrow(ProtocolError)
    expect(() => parse(SignUp, { username: 'ada', password: 'x'.repeat(1025) }, 'x')).toThrow(
      ProtocolError,
    )
  })

  it('read an email change to an address or to none', () => {
    expect(parse(ChangeEmail, { email: null, password: 'p' }, 'x').email).toBeNull()
    expect(() => parse(ChangeEmail, { password: 'p' }, 'x')).toThrow(ProtocolError)
  })

  it('read the methods and an account`s credentials', () => {
    const methods = { github: true, password: true, signup: false, mail: false }
    expect(parse(AuthMethods, methods, 'the methods')).toEqual(methods)
    const credentials = { method: 'password', email: null, emailVerified: false, mail: true }
    expect(parse(Credentials, credentials, 'the credentials')).toEqual(credentials)
    expect(() => parse(Credentials, { ...credentials, method: 'saml' }, 'x')).toThrow(ProtocolError)
  })

  it('know a mailed token: 64 lowercase hex digits', () => {
    expect(AUTH_TOKEN.test('a'.repeat(64))).toBe(true)
    expect(AUTH_TOKEN.test('A'.repeat(64))).toBe(false)
    expect(AUTH_TOKEN.test('a'.repeat(63))).toBe(false)
  })
})
