// Usage: node e2e/shots.mjs <url> [project ...]
// The URL is a running preview (http://localhost:4173/questboard/) or dev server. On a dev server the
// demo seed is used; otherwise the family is created through the setup wizard with PIN 1234.
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const PROJECTS = {
  iphone: { viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true },
  pixel: { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true },
  narrow: { viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true },
  ipad: { viewport: { width: 1180, height: 820 }, hasTouch: true },
  fold: { viewport: { width: 1030, height: 880 }, hasTouch: true },
  tv: { viewport: { width: 1920, height: 1080 }, hasTouch: false },
}
const APPEARANCES = ['bright', 'calm', 'dark']
const SCREENS = ['today', 'week', 'jars', 'badges', 'parent', 'settings', 'tv']
const MIN_TAP = 48

const url = process.argv[2]
if (!url) {
  console.error('Usage: node e2e/shots.mjs <url> [project ...]')
  process.exit(1)
}
const base = url.endsWith('/') ? url : `${url}/`
const only = process.argv.slice(3)
const names = only.length ? only : Object.keys(PROJECTS)

async function next(page) {
  await page.getByRole('button', { name: 'Next' }).click()
}

async function wizard(page) {
  await page.getByLabel('Family name').fill('The Harrisons')
  await next(page)
  await page.getByLabel('PIN', { exact: true }).fill('1234')
  await page.getByLabel('Confirm PIN').fill('1234')
  await next(page)
  await page.getByRole('checkbox').check()
  await next(page)
  await page.getByLabel('Name of kid 1').fill('Nolan')
  await page.getByRole('button', { name: 'Add another kid' }).click()
  await page.getByLabel('Name of kid 2').fill('Makenna')
  await next(page)
  await page.getByRole('radio', { name: /Both/ }).check({ force: true })
  await next(page)
  await next(page)
  await next(page)
  await page.getByRole('button', { name: 'Open the board' }).click()
  await page.getByRole('button', { name: 'Open the board' }).waitFor({ state: 'detached' })
}

async function pin(page) {
  const d = page.getByRole('dialog')
  for (const c of '1234') await d.getByRole('button', { name: c, exact: true }).click()
  await d.getByRole('button', { name: 'Enter' }).click()
}

async function appearance(page, a) {
  await page.evaluate((v) => { document.documentElement.dataset.appearance = v }, a)
  await page.waitForTimeout(150)
}

/** Reports horizontal page overflow and interactive elements under 48px in either direction. */
async function audit(page, label) {
  const found = await page.evaluate((min) => {
    const over = document.documentElement.scrollWidth - window.innerWidth
    const small = []
    for (const el of document.querySelectorAll('button, a, input:not([type=file]), select')) {
      const lab = el.closest('label')
      const r = (lab && el.matches('input') ? lab : el).getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue
      if (r.height < min || r.width < min) {
        small.push(`${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
    }
    return { over, small: [...new Set(small)] }
  }, MIN_TAP)
  if (found.over > 1) console.log(`  OVERFLOW ${label}: page is ${found.over}px wider than the viewport`)
  if (found.small.length) console.log(`  SMALL ${label}: ${found.small.slice(0, 8).join('; ')}`)
}

const browser = await chromium.launch()
let count = 0
for (const name of names) {
  const cfg = PROJECTS[name]
  if (!cfg) { console.error(`Unknown project ${name}`); continue }
  const ctx = await browser.newContext({ ...cfg, baseURL: base, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('?demo=1')
  const isTv = cfg.viewport.width >= 1280 && !cfg.hasTouch
  await page.waitForTimeout(800)
  if (await page.getByLabel('Family name').count()) await wizard(page)
  const kid = !isTv
  if (kid) {
    // A little history so the screens are not empty: one chore checked, one deduction.
    await page.getByRole('region', { name: "Today's chores" }).getByRole('button').first().click().catch(() => {})
    await page.getByRole('button', { name: 'Parent view' }).click()
    await pin(page)
    await page.locator('.pr-reason', { hasText: 'Yelling' }).click().catch(() => {})
    // Close the week so the Jars tab has coins, and split one dollar into Save.
    await page.getByRole('button', { name: 'Close week now' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Close week' }).click()
    await page.getByRole('button', { name: 'Lock' }).click()
    await page.getByRole('button', { name: 'Jars', exact: true }).click()
    await page.getByRole('group', { name: 'Save' }).getByRole('button', { name: '+$1' }).click().catch(() => {})
  }
  for (const a of APPEARANCES) {
    for (const screen of SCREENS) {
      const dir = `e2e/shots/${name}/${a}`
      mkdirSync(dir, { recursive: true })
      const file = `${dir}/${screen}.png`
      if (screen === 'tv') {
        await page.goto('./#tv')
        await page.reload()
        await page.waitForTimeout(400)
      } else if (!kid) {
        continue
      } else {
        if (await page.locator('main.qb-main .pr-view').count()) await page.getByRole('button', { name: 'Lock' }).click()
        if (screen === 'today' || screen === 'week' || screen === 'jars' || screen === 'badges') {
          const tab = { today: 'Today', week: 'Week', jars: 'Jars', badges: 'Badges' }[screen]
          await page.getByRole('button', { name: tab, exact: true }).click()
        } else {
          await page.getByRole('button', { name: 'Parent view' }).click()
          await pin(page)
          if (screen === 'settings') await page.getByRole('button', { name: 'Settings' }).click()
        }
      }
      await appearance(page, a)
      await page.addStyleTag({ content: '.qb-toaster { display: none !important }' })
      await page.screenshot({ path: file, fullPage: false })
      await audit(page, `${name}/${a}/${screen}`)
      count++
      if (screen === 'tv') {
        await page.goto('./')
        await page.reload()
        await page.waitForTimeout(300)
      }
    }
  }
  if (errors.length) console.log(`  CONSOLE ${name}: ${[...new Set(errors)].slice(0, 3).join(' | ')}`)
  await ctx.close()
}
await browser.close()
console.log(`${count} screenshots written to e2e/shots/`)
