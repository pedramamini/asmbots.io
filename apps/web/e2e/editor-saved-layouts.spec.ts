/**
 * Kept editor layouts against the Worker (`wrangler dev` with `DEV_FAKE_AUTH`, PRODUCT_SPEC §3):
 * signed out, the layout menu offers a sign-in; signed in, `save layout…` keeps the layout on
 * screen by name, the menu lists it, and it loads back over another layout, after a reload too.
 */
import { expect, type Page, test } from '@playwright/test'
import { WORKER } from '../playwright.config'

test.use({ baseURL: WORKER, viewport: { width: 1600, height: 1000 } })

async function layoutMenu(page: Page, item: string) {
  await page.getByRole('button', { name: 'layout ▾' }).click()
  await page.getByRole('menuitem', { name: item }).click()
}

test('keeps the layout on screen by name, and loads it back from the layout menu', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const login = `e2e-layouts-${Date.now().toString(36)}`
  await page.route('**/api/auth/github?*', (route) =>
    route.continue({ url: `${route.request().url()}&as=${login}` }),
  )
  await page.goto('/editor')
  await expect(page.locator('.cm-editor')).toBeVisible()
  await page.getByRole('button', { name: 'layout ▾' }).click()
  await expect(page.getByRole('menuitem', { name: 'sign in to save layouts' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'sign in with github' }).first().click()
  const pick = page.getByRole('dialog', { name: 'pick a handle' })
  await pick.getByRole('button', { name: 'continue' }).click()
  await expect(pick).toBeHidden()

  // The debugging layout, the memory beside the source, kept as `wide debug`.
  await layoutMenu(page, 'debugging layout')
  await expect(page.getByRole('region', { name: 'registers' })).toBeVisible()
  await layoutMenu(page, 'save layout…')
  const dialog = page.getByRole('dialog', { name: 'layouts' })
  await expect(dialog.getByText('no layouts kept yet.')).toBeVisible()
  await dialog.getByRole('textbox', { name: 'layout name' }).fill('wide debug')
  await dialog.getByRole('button', { name: 'save', exact: true }).click()
  const list = dialog.getByRole('list', { name: 'your layouts' })
  await expect(list).toContainText('wide debug')
  await expect(list).toContainText('on screen')
  await dialog.getByRole('button', { name: 'close' }).first().click()

  // Another layout, then the kept one back from the menu, after a reload too.
  await layoutMenu(page, 'writing layout')
  await expect(page.getByRole('region', { name: 'registers' })).toBeHidden()
  await page.reload()
  await expect(page.locator('.cm-editor')).toBeVisible()
  await layoutMenu(page, 'wide debug')
  await expect(page.getByRole('region', { name: 'registers' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'library' })).toBeHidden()
  expect(errors).toEqual([])
})
