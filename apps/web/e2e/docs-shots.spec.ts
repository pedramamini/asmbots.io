/**
 * The tour screenshots of the home page and the start page (EXEC 2.6 task 3), taken from the
 * production build: `public/docs-shots/tour-*.webp`, 1280 × 800, once in each theme (`shotSrc`
 * names the files: the default theme's is `tour-arena.webp`, another's `tour-arena.nord.webp`),
 * and the root README's hero, `docs/hero.webp`, 1600 × 960, in the default theme. Each page is set
 * up once, then shot in every theme, picked from the command menu as a reader would. It runs only
 * when asked, since each run rewrites the files:
 *
 *   DOCS_SHOTS=1 bunx playwright test e2e/docs-shots.spec.ts
 *
 * Needs `cwebp` (libwebp) on the PATH.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { THEMES } from '@asmbots/ui/themes'
import { expect, type Page, test } from '@playwright/test'
import { SHOT_PATH, shotSrc } from '../src/app/shots'

const OUT = new URL('../public/docs-shots/', import.meta.url).pathname
const TMP = mkdtempSync(join(tmpdir(), 'docs-shots-'))

test.skip(!process.env.DOCS_SHOTS, 'set DOCS_SHOTS=1 to take the docs screenshots')
test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
// Each page is shot in every theme.
test.describe.configure({ timeout: 300_000 })

// The default theme (Playwright's light color scheme would pick paper), and the first-visit tips
// seen: the arena's would stand over its events log.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'sentinel')
    localStorage.setItem(
      'asmbots:settings',
      JSON.stringify({ state: { coachMarksSeen: ['arena', 'editor'] }, version: 1 }),
    )
  })
})

/** Saves the page as `public/docs-shots/<name>.webp`, or in `out` when given. */
async function shoot(page: Page, name: string, out = OUT) {
  const png = join(TMP, `${name}.png`)
  await page.mouse.move(0, 0)
  await page.screenshot({ path: png, animations: 'disabled' })
  execFileSync('cwebp', ['-quiet', '-q', '80', png, '-o', `${out}${name}.webp`])
}

/** Picks `theme` from the command menu, and waits for the page to draw in it. */
async function pickTheme(page: Page, theme: string) {
  if ((await page.locator('html').getAttribute('data-theme')) === theme) return
  await page.keyboard.press('ControlOrMeta+k')
  const menu = page.getByRole('dialog', { name: 'commands' })
  await menu.getByRole('combobox').fill(theme)
  await menu.getByRole('option', { name: new RegExp(`^${theme}( \\(current\\))?$`) }).click()
  await expect(menu).toBeHidden()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
  // The arena's renderer takes the palette on its next frame.
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  )
}

/** The file name, less `.webp`, of shot `name` in `theme`. */
const fileOf = (name: string, theme: (typeof THEMES)[number]) =>
  shotSrc(name, theme).slice(SHOT_PATH.length, -'.webp'.length)

/** Shoots the page as it stands in every theme. */
async function shootThemes(page: Page, name: string) {
  for (const theme of THEMES) {
    await pickTheme(page, theme)
    await shoot(page, fileOf(name, theme))
  }
}

/** The arena's cycle, from its HUD chip `cycle 12,480 / 100,000`. */
async function cycle(page: Page): Promise<number> {
  const text = await page
    .getByText(/^cycle [\d,]+ \/ [\d,]+$/)
    .first()
    .textContent()
  return Number((text ?? '').replace(/^cycle ([\d,]+).*$/, '$1').replace(/,/g, ''))
}

test('the arena mid-battle', async ({ page }) => {
  // A battle per theme: the writes' flashes fade while it is paused, so each shot is taken as it
  // pauses. At seed 6 all four live to cycle 26,525; the default speed, 100 a frame, stops near
  // 12,000.
  for (const theme of THEMES) {
    await page.goto('/arena?b=roster:imp-ring,roster:stone,roster:scanner,roster:silk&seed=6')
    await pickTheme(page, theme)
    await page.locator('button[name="fight"]').click()
    await expect(page.getByRole('application', { name: 'arena' })).toBeVisible()
    await expect
      .poll(() => cycle(page), { timeout: 30_000, intervals: [100] })
      .toBeGreaterThan(12_000)
    await page.getByRole('button', { name: 'pause' }).click()
    await shoot(page, fileOf('tour-arena', theme))
  }
})

test.describe('the root README', () => {
  // Wide enough that the bots panel shows whole names.
  test.use({ viewport: { width: 1600, height: 960 } })

  test('the hero: an eight-bot melee mid-battle', async ({ page }) => {
    const bots = [
      'imp-ring',
      'dwarf',
      'stone',
      'paper',
      'scanner',
      'silk',
      'vampire',
      'painter-spiral',
    ]
    await page.goto(`/arena?b=${bots.map((b) => `roster:${b}`).join(',')}&seed=6`)
    await page.locator('button[name="fight"]').click()
    await expect(page.getByRole('application', { name: 'arena' })).toBeVisible()
    await expect
      .poll(() => cycle(page), { timeout: 30_000, intervals: [100] })
      .toBeGreaterThan(12_000)
    await page.getByRole('button', { name: 'pause' }).click()
    await shoot(page, 'hero', new URL('../../../docs/', import.meta.url).pathname)
  })
})

test('the editor and the debugger on the imp', async ({ page }) => {
  await page.goto('/docs/start-here')
  await page
    .getByRole('figure', { name: 'Imp · x16c code' })
    .getByRole('link', { name: 'open in editor' })
    .click()
  await expect(page).toHaveTitle('ASM BOTS // EDITOR')
  const tip = page.getByRole('note', { name: 'tip' })
  if (await tip.isVisible()) await tip.getByRole('button', { name: 'got it' }).click()
  // The debugger's panels, as the debugging layout has them.
  await page.getByRole('button', { name: 'layout ▾' }).click()
  await page.getByRole('menuitem', { name: 'debugging layout' }).click()
  await expect(page.getByRole('region', { name: 'registers' })).toBeVisible()
  // Through the setup: bx holds the base, and the first copy is made.
  for (let k = 0; k < 6; k++) await page.keyboard.press('F11')
  await shootThemes(page, 'tour-editor')
})

test('a bracket of eight roster bots', async ({ page }) => {
  await page.goto('/tournaments')
  await page.getByRole('button', { name: 'new tournament' }).first().click()
  const form = page.getByRole('dialog', { name: 'new tournament' })
  await form.getByRole('textbox', { name: 'name' }).fill('spring cup')
  await form.getByRole('radio', { name: 'bracket' }).click()
  for (const name of ['Imp', 'Dwarf', 'Stone', 'Paper', 'Scanner', 'Silk', 'Vampire', 'Imp Ring']) {
    await form.getByRole('checkbox', { name, exact: true }).check()
  }
  await form.locator('button[name="create"]').click()
  const card = page.getByRole('listitem', { name: 'spring cup' })
  await expect(card).toContainText('finished', { timeout: 120_000 })
  await card.getByRole('link').click()
  const bracket = page.getByRole('region', { name: 'bracket' }).last()
  await expect(bracket.locator('[data-champion]')).toHaveCount(1)
  await shootThemes(page, 'tour-tournament')
})
