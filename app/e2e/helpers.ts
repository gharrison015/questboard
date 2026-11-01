import { expect, type Page } from '@playwright/test'

export interface SetupOptions {
  kids: string[]
  pin?: string
}

/** Drives the first-run wizard with the Both preset and lands on the kid board. */
export async function setupFamily(page: Page, opts: SetupOptions): Promise<void> {
  const pin = opts.pin ?? '1234'
  await page.goto('./')
  await page.getByLabel('Family name').fill('The Harrisons')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByLabel('PIN', { exact: true }).fill(pin)
  await page.getByLabel('Confirm PIN').fill(pin)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Next' }).click()
  for (const [i, name] of opts.kids.entries()) {
    if (i > 0) await page.getByRole('button', { name: 'Add another kid' }).click()
    await page.getByLabel(`Name of kid ${i + 1}`).fill(name)
  }
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('radio', { name: /Both/ }).check({ force: true })
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Open the board' }).click()
  await expect(page.getByRole('button', { name: 'Open the board' })).toHaveCount(0)
}

/** Opens the PIN gate from the lock button and enters the PIN on the keypad. */
export async function enterPin(page: Page, pin: string): Promise<void> {
  for (const d of pin) await page.getByRole('dialog').getByRole('button', { name: d, exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Enter' }).click()
}

export async function openParent(page: Page, pin = '1234'): Promise<void> {
  await page.getByRole('button', { name: 'Parent view' }).click()
  await enterPin(page, pin)
  await expect(page.getByRole('region', { name: 'Parent' })).toBeVisible()
}
