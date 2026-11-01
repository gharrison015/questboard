import { expect, test, type Page } from '@playwright/test'
import { enterPin, openParent, setupFamily } from './helpers'

const KIDS = { kids: ['Nolan', 'Makenna'] }

/** Kid-board flows need a touch or tablet layout; the 1920 wide mouse project shows the TV board. */
function skipOnTv(name: string): void {
  test.skip(name === 'tv', 'The TV project renders the read-only TV board')
}

async function balance(page: Page): Promise<number> {
  const label = await page.getByLabel(/^Balance \$/).first().getAttribute('aria-label')
  return Number(label?.replace(/[^0-9.]/g, ''))
}

test('first run through the wizard lands on the kid board showing Nolan', async ({ page }, info) => {
  skipOnTv(info.project.name)
  await setupFamily(page, KIDS)
  await expect(page.getByRole('heading', { name: 'Nolan', level: 2 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Makenna' })).toBeVisible()
})

test('starter chores: Select all fills to the free limit, Clear all empties, Next stays on screen', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Family name').fill('The Harrisons')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('PIN', { exact: true }).fill('1234')
  await page.getByLabel('Confirm PIN').fill('1234')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('Name of kid 1').fill('Nolan')
  await page.getByRole('button', { name: 'Add another kid' }).click()
  await page.getByLabel('Name of kid 2').fill('Makenna')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('radio', { name: /Both/ }).check({ force: true })
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Select all' }).click()
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(10)
  await expect(page.getByRole('button', { name: 'Next' })).toBeInViewport()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page.getByRole('checkbox', { checked: true })).toHaveCount(0)
})

test('checking a chore updates the counter', async ({ page }, info) => {
  skipOnTv(info.project.name)
  await setupFamily(page, KIDS)
  const section = page.getByRole('region', { name: "Today's chores" })
  await expect(section).toContainText(/0\/\d+/)
  const total = Number(/0\/(\d+)/.exec((await section.textContent()) ?? '')?.[1])
  expect(total).toBeGreaterThan(0)
  await section.getByRole('button').first().click()
  await expect(section).toContainText(new RegExp(`1/${total}`))
})

test('parent logs Yelling and today shows -$0.50', async ({ page }, info) => {
  skipOnTv(info.project.name)
  await setupFamily(page, KIDS)
  await openParent(page)
  await page.locator('.pr-reason', { hasText: 'Yelling' }).click()
  await page.getByRole('button', { name: 'Lock' }).click()
  await expect(page.locator('.kb-day[data-today="true"]')).toContainText('-$0.50')
})

test('five wrong PINs show the lockout copy', async ({ page }, info) => {
  skipOnTv(info.project.name)
  await setupFamily(page, KIDS)
  await page.getByRole('button', { name: 'Parent view' }).click()
  for (let i = 0; i < 5; i++) await enterPin(page, '9999')
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Try again in')
})

test('close week, then split coins into Save on the Jars tab', async ({ page }, info) => {
  skipOnTv(info.project.name)
  await setupFamily(page, KIDS)
  await openParent(page)
  await page.getByRole('button', { name: 'Close week now' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Close week' }).click()
  await page.getByRole('button', { name: 'Lock' }).click()
  await page.getByRole('button', { name: 'Jars', exact: true }).click()
  const save = page.getByRole('group', { name: 'Save' })
  await expect(page.getByText(/\$\d+ left/)).toBeVisible()
  await save.getByRole('button', { name: '+$1' }).click()
  await expect(save).toContainText('$1')
  await expect(page.getByRole('list', { name: 'Jars' }).getByText('Save').locator('..')).toContainText('$1')
})

test('earn it back with a Math question raises the balance by $1', async ({ page }, info) => {
  skipOnTv(info.project.name)
  await setupFamily(page, KIDS)
  await openParent(page)
  // Two $0.50 deductions leave $1 of room, so one correct answer returns the full $1.
  await page.locator('.pr-reason', { hasText: 'Yelling' }).click()
  await page.locator('.pr-reason', { hasText: 'Yelling' }).click()
  await page.getByRole('button', { name: 'Lock' }).click()
  const before = await balance(page)
  await page.getByRole('button', { name: /Math/ }).click()
  const dialog = page.getByRole('dialog', { name: /Math/ })
  const prompt = (await dialog.getByText(/What is \d+ [+−] \d+\?/).textContent()) ?? ''
  const m = /(\d+) ([+−]) (\d+)/.exec(prompt)
  expect(m).not.toBeNull()
  const a = Number(m?.[1])
  const b = Number(m?.[3])
  const answer = m?.[2] === '+' ? a + b : a - b
  await dialog.getByRole('button', { name: String(answer), exact: true }).click()
  await page.keyboard.press('Escape')
  await expect.poll(() => balance(page)).toBe(before + 1)
})

test('swiping or tapping switches to Makenna', async ({ page }, info) => {
  skipOnTv(info.project.name)
  await setupFamily(page, KIDS)
  await page.getByRole('button', { name: 'Makenna' }).click()
  await expect(page.getByRole('heading', { name: 'Makenna', level: 2 })).toBeVisible()
  await page.getByRole('button', { name: 'Nolan' }).click()
  await expect(page.getByRole('heading', { name: 'Nolan', level: 2 })).toBeVisible()
  if (info.project.use.hasTouch && info.project.name !== 'ipad' && info.project.name !== 'fold') {
    await page.locator('main.qb-main').evaluate((el) => {
      const mk = (type: string, x: number): void => {
        const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 })
        el.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: type === 'touchend' ? [] : [t], changedTouches: [t] }))
      }
      mk('touchstart', 300)
      mk('touchend', 100)
    })
    await expect(page.getByRole('heading', { name: 'Makenna', level: 2 })).toBeVisible()
  }
})

test('#tv shows the board with no buttons or links', async ({ page }) => {
  await setupFamily(page, KIDS)
  await page.goto('./#tv')
  await page.reload()
  await expect(page.getByText('Nolan').first()).toBeVisible()
  await expect(page.locator('button, a')).toHaveCount(0)
})

test('reload keeps the family', async ({ page }, info) => {
  skipOnTv(info.project.name)
  await setupFamily(page, KIDS)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Nolan', level: 2 })).toBeVisible()
  await expect(page.getByLabel('Family name')).toHaveCount(0)
})

test('manifest and service worker are reachable', async ({ request }) => {
  const manifest = await request.get('manifest.webmanifest')
  expect(manifest.status()).toBe(200)
  expect(await manifest.text()).toContain('"name":"QuestBoard"')
  const sw = await request.get('sw.js')
  expect(sw.status()).toBe(200)
})
