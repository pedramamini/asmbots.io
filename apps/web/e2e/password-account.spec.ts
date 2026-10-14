/**
 * A password account (PRODUCT_SPEC §9), against the Worker, which sends no mail: make one with a
 * username and a password from the header's `sign in`, read what the site says of an account
 * with no email (it cannot be recovered), sign out, and sign in again with the password.
 */
import { expect, test } from '@playwright/test'
import { WORKER } from '../playwright.config'

test.use({ baseURL: WORKER })

const PASSWORD = 'correct horse battery'

test('makes an account with no email, is told it cannot be recovered, and signs in again', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const name = `pw-${Date.now().toString(36)}`
  // An address of its own: the Worker makes three accounts an hour an address, and a Worker left
  // running keeps its count.
  const octet = () => 1 + Math.floor(Math.random() * 250)
  await page.setExtraHTTPHeaders({ 'CF-Connecting-IP': `10.13.${octet()}.${octet()}` })

  await page.goto('/hills')
  await page.getByRole('button', { name: 'sign in', exact: true }).first().click()
  await expect(page).toHaveURL(`${WORKER}/auth/login?returnTo=%2Fhills`)
  await expect(page.getByRole('button', { name: 'sign in with github' })).toBeVisible()
  // The page titles its own tab: the one route of the sign-in pages has no head.
  await expect(page).toHaveTitle(/sign in/i)
  await page.getByRole('link', { name: 'make one' }).click()
  await expect(page).toHaveURL(`${WORKER}/auth/signup?returnTo=%2Fhills`)
  await expect(page).toHaveTitle(/new account/i)

  // No mail here, so no email field, and the page says what that costs before the account is made.
  const deal = page.getByRole('note')
  await expect(deal).toContainText('there is no password reset here.')
  await expect(deal).toContainText('a forgotten password cannot be reset, by you or by us')
  await expect(page.getByLabel('email (optional)')).toHaveCount(0)

  const make = page.getByRole('button', { name: 'make the account' })
  await page.getByLabel('username').fill(name)
  await page.getByLabel('password', { exact: true }).fill('short')
  await expect(page.getByText('a password is at least 10 characters')).toBeVisible()
  await expect(make).toBeDisabled()
  await page.getByLabel('password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('password, again').fill(PASSWORD)
  await make.click()

  // Back where sign-in was asked, signed in, with no handle to pick: the username is the handle.
  await expect(page).toHaveURL(`${WORKER}/hills`)
  await expect(page.getByRole('button', { name: `account: ${name}` })).toBeVisible()
  await expect(page).toHaveTitle(/hills/i)
  await expect(page.getByRole('dialog', { name: 'pick a handle' })).toHaveCount(0)

  await page.goto('/settings')
  const account = page.getByRole('region', { name: 'account' })
  await expect(account).toContainText(`signed in: ${name}`)
  await expect(account).not.toContainText('github: linked')
  const recovery = page.getByRole('region', { name: 'password and recovery' })
  await expect(recovery).toContainText('no email')
  await expect(recovery.getByRole('note')).toContainText(
    'this account has no email, so it cannot be recovered.',
  )

  await account.getByRole('button', { name: 'sign out' }).click()
  await expect(account).toContainText('signed out')
  await account.getByRole('button', { name: 'sign in', exact: true }).click()
  await expect(page).toHaveURL(`${WORKER}/auth/login?returnTo=%2Fsettings`)
  const form = page.locator('form')
  await form.getByLabel('username').fill(name)
  await form.getByLabel('password').fill('not the password at all')
  await form.getByRole('button', { name: 'sign in', exact: true }).click()
  await expect(form.getByRole('alert')).toHaveText('wrong username or password')
  await form.getByLabel('password').fill(PASSWORD)
  await form.getByRole('button', { name: 'sign in', exact: true }).click()
  await expect(page).toHaveURL(`${WORKER}/settings`)
  await expect(page.getByRole('region', { name: 'account' })).toContainText(`signed in: ${name}`)
  expect(errors).toEqual([])
})
