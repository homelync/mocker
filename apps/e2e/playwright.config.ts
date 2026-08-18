import { defineConfig, devices } from '@playwright/test'

/**
 * The one thing the unit tests cannot tell you.
 *
 * `packages/mocker-playwright` is tested against a stub route, which covers
 * scope, resource types, override precedence, the fixture store and the miss
 * ledger without a browser. What a stub cannot cover is real request and
 * response plumbing — whether a fulfilled response actually reaches a page's
 * `fetch`, whether the browser applies CORS to it, what `resourceType` a real
 * navigation reports. Those are the assumptions a hand-written stub would
 * happily assert as true while being wrong.
 *
 * Chromium alone, because this is a check on Playwright's interception rather
 * than on any app: a second engine would double the CI time to re-answer a
 * question about the same API.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5175',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node server.mjs',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: !process.env.CI,
  },
})
