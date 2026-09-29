/** The new bot's templates (`src/features/editor/EmptyEditor.tsx`), put away from a spec. */
import { expect, type Page } from '@playwright/test'

/**
 * Waits for the templates a new bot opens on, a modal that makes the page behind it inert, and
 * puts them away: `start on your own`, or Escape when the spec goes by the keyboard. The source
 * takes the focus.
 */
export async function startOnYourOwn(page: Page, by: 'click' | 'escape' = 'click'): Promise<void> {
  const templates = page.getByRole('dialog', { name: 'new bot' })
  await expect(templates).toBeVisible()
  if (by === 'escape') await page.keyboard.press('Escape')
  else await templates.getByRole('button', { name: 'start on your own' }).click()
  await expect(templates).toBeHidden()
}
