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
  ProtocolError,
  parse,
  passwordProblem,
  SignUp,
} from '../src/index'

describe('passwordProblem', () => {
  it('asks for length, and for nothing else of a password that has it', () => {
    expect(passwordProblem('correct horse battery')).toBeNull()
    expect(passwordProblem('alllowercase')).toBeNull()
    expect(passwordProblem('x'.repeat(MIN_PASSWORD - 1))).toBe(
      'a password is at least 10 characters',
    )
    expect(passwordProblem(`ab${'x'.repeat(MAX_PASSWORD - 2)}`)).toBeNull()
    expect(passwordProblem(`ab${'x'.repeat(MAX_PASSWORD - 1)}`)).toBe(
      'a password is at most 128 characters',
    )
  })

  it('refuses one character repeated, the username, and the passwords every list starts with', () => {
    expect(passwordProblem('aaaaaaaaaaaa')).toBe('a password is more than one character repeated')
    expect(passwordProblem('Long-Username', 'long-username')).toBe('a password is not the username')
    expect(passwordProblem('long-username-and-more', 'long-username')).toBeNull()
    expect(passwordProblem('PASSWORD123')).toBe('that password is too common: pick another')
    expect(passwordProblem('qwertyuiop')).toBe('that password is too common: pick another')
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
