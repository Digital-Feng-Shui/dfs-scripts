// Buy-flow tests for digital-fengshui.com. See tests/buy-flow.spec.js for what is checked.
//
// Settings (environment variables):
//   SCRIPT_SOURCE=live   (default) load the real site exactly as visitors get it (the live monitor)
//   SCRIPT_SOURCE=build  swap our files for a local dist/ build (needs a build step, not in this repo yet)
//   SITES=all|live|staging   which site(s) to test (default: all = live + staging)
const { defineConfig, devices } = require('@playwright/test');

const isCI = !!process.env.CI;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // The pages are heavy (long page, many animations): too many at once makes them slow and flaky.
  workers: isCI ? 2 : 3,
  // The real site is on the internet, so allow a retry for network hiccups.
  retries: isCI ? 2 : 1,
  reporter: isCI ? [['list'], ['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } }
  ]
});
