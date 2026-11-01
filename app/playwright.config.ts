import { defineConfig } from '@playwright/test'

const base = 'http://localhost:4173/questboard/'

export default defineConfig({
  testDir: 'e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: base, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: base,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    { name: 'iphone', use: { viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true } },
    { name: 'pixel', use: { viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true } },
    { name: 'ipad', use: { viewport: { width: 1180, height: 820 }, hasTouch: true } },
    { name: 'fold', use: { viewport: { width: 1030, height: 880 }, hasTouch: true } },
    { name: 'tv', use: { viewport: { width: 1920, height: 1080 }, hasTouch: false } },
    // Amazon devices: Echo Show 5 is the shortest landscape screen we support; Fire 7 is the smallest Fire tablet.
    { name: 'echo-show-5', use: { viewport: { width: 960, height: 480 }, hasTouch: true } },
    { name: 'fire-7', use: { viewport: { width: 1024, height: 600 }, hasTouch: true } },
  ],
})
