// Buy-flow test for digital-fengshui.com
//
// Loads the REAL site (live and/or staging). In build mode every request for one of
// our files (main.min.js, styles.min.css, night/*) is answered from our fresh dist/,
// so the new code runs on the real page without anything being published.
//
// Safety: this test never pays, never creates leads or abandoned-cart records and
// never pollutes stats or the price test:
//   - every POST/PUT/beacon is stopped (Webflow form submit gets a fake "ok")
//   - analytics, Meta pixel, the stats and cart workers are blocked
//   - buy.stripe.com is answered with a local stub page, Stripe is never contacted
//   - the email used is test+ci@example.com
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const SCRIPT_SOURCE = process.env.SCRIPT_SOURCE || 'live';
const BUILD_MODE = SCRIPT_SOURCE === 'build';
// In build mode we also block our temporary hotfix (dfs_enroll_fix), to prove main.js works on its own.
const BLOCK_HOTFIX = process.env.BLOCK_HOTFIX ? process.env.BLOCK_HOTFIX === '1' : BUILD_MODE;

const SITES = {
  live: 'https://www.digital-fengshui.com/',
  staging: 'https://dfs-staging.webflow.io/'
};
const which = process.env.SITES || 'all';
const sites = which === 'all' ? Object.keys(SITES) : which.split(',');

// Price test: group -> Stripe link (a = $67, b = $47, c = $97)
const STRIPE = {
  a: 'https://buy.stripe.com/5kQbIUaGJ6JdcZE2BddjO01',
  b: 'https://buy.stripe.com/14A7sE1694B50cSejVdjO02',
  c: 'https://buy.stripe.com/bJe6oA5mpffJ4t8fnZdjO03'
};
const TEST_EMAIL = 'test+ci@example.com';

// Our site files, wherever they are loaded from (jsDelivr tag/branch, or GitHub Pages),
// under the old (rimbodesigns) or the new (Digital-Feng-Shui) owner
const REPO_FILE = '(cdn\\.jsdelivr\\.net\\/gh\\/(rimbodesigns|digital-feng-shui)\\/dfs-scripts@[^/]+|(rimbodesigns|digital-feng-shui)\\.github\\.io\\/dfs-scripts)\\/';
const OUR_FILE = new RegExp(REPO_FILE + '([^?#]+)', 'i');
const TYPES = { js: 'application/javascript; charset=utf-8', css: 'text/css; charset=utf-8', webp: 'image/webp' };
const HOTFIX = /dfs_enroll_fix/;
// Never let these through: tracking, stats, abandoned-cart, captcha
const BLOCKED = [
  /dfs-cart\.thomas-aukema\.workers\.dev/,
  /dfs-stats\.thomas-aukema\.workers\.dev/,
  /\.workers\.dev\//,
  /connect\.facebook\.net/,
  /facebook\.com\/tr/,
  /googletagmanager\.com/,
  /google-analytics\.com/,
  /doubleclick\.net/,
  /challenges\.cloudflare\.com/,
  /digital-fengshui\.com\/g0lnomhfn3m/, // Google tag, proxied through our own domain
  /dfs-staging\.webflow\.io\/g0lnomhfn3m/,
  /vmj7qw1x3g/,                         // Google Analytics loader
  /clarity\.ms/                          // Microsoft Clarity recordings
];
const WEBFLOW_FORM = /webflow\.com\/api\/v1\/form\//;

// Errors from other people's scripts that we can't fix here (keep this list short).
const IGNORED_ERRORS = [
  // Memberstack refuses its member check on the staging domain in Safari/WebKit (CORS);
  // happens with and without our code, not part of the buy flow.
  /client\.memberstack\.com\/app-member due to access control checks/,
];

const dist = (f) => fs.readFileSync(path.join(__dirname, '..', 'dist', f), 'utf8');
const builtStyles = BUILD_MODE ? dist('styles.min.css') : null;
// Our file from dist/, or null when the build doesn't have it
function built(file) {
  const f = path.join(__dirname, '..', 'dist', file);
  return file.split('/').includes('..') || !fs.existsSync(f) ? null : fs.readFileSync(f);
}

async function prepare(page) {
  const log = { served: 0, stylesServed: 0, files: [], missing: [], hotfixBlocked: 0, stripe: [], stopped: [], errors: [] };

  page.on('pageerror', (err) => {
    const msg = String(err && err.message || err);
    if (!IGNORED_ERRORS.some((re) => re.test(msg))) log.errors.push(msg + '\n' + (err.stack || ''));
  });

  // Belt and braces: no beacons leave the browser at all. We only count them.
  log.beacons = [];
  await page.exposeBinding('__dfsBeacon', (src, url) => { log.beacons.push(String(url)); });
  await page.addInitScript(() => {
    try {
      Object.defineProperty(Navigator.prototype, 'sendBeacon', {
        configurable: true,
        value: function (url) { try { window.__dfsBeacon(String(url)); } catch (e) {} return true; }
      });
    } catch (e) {}
  });

  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();

    if (/^https:\/\/buy\.stripe\.com\//.test(url)) {
      log.stripe.push(url);
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stripe stub</title><p>Stripe stub (test)</p>' });
    }
    const ours = BUILD_MODE && url.match(OUR_FILE);
    if (ours) {
      const file = ours[ours.length - 1];
      const body = built(file);
      if (!body) { log.missing.push(file); return route.abort(); }
      log.files.push(file);
      if (file === 'main.min.js') log.served++;
      if (file === 'styles.min.css') log.stylesServed++;
      const ext = file.split('.').pop();
      return route.fulfill({ status: 200, contentType: TYPES[ext] || 'application/octet-stream', body });
    }
    // Simulate "hotfix removed from Webflow": take its <script> tag out of the page HTML.
    if (BLOCK_HOTFIX && req.resourceType() === 'document' && req.isNavigationRequest() && req.frame() === page.mainFrame()) {
      const response = await route.fetch();
      const html = await response.text();
      const stripped = html.replace(/<script[^>]*dfs_enroll_fix[^>]*><\/script>/g, () => { log.hotfixBlocked++; return ''; });
      return route.fulfill({ response, body: stripped });
    }
    if (BLOCK_HOTFIX && HOTFIX.test(url)) {
      log.hotfixBlocked++;
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* hotfix blocked by test */' });
    }
    // Memberstack (logins) only reads app settings on page load; let it through so the page behaves normally.
    const memberstackRead = /memberstack[^/]*\/app-member$/.test(url);
    if (!memberstackRead && req.method() !== 'GET' && req.method() !== 'HEAD' && req.method() !== 'OPTIONS') {
      log.stopped.push(req.method() + ' ' + url);
      if (WEBFLOW_FORM.test(url)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"code":200,"msg":"ok"}' });
      }
      return route.abort();
    }
    if (BLOCKED.some((re) => re.test(url))) return route.abort();
    return route.continue();
  });

  return log;
}

// Is the element's centre inside the screen, and is it the thing you'd actually tap there?
async function inView(locator) {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const visible = r.width > 0 && r.height > 0 && cx > 0 && cy > 0 && cx < innerWidth && cy < innerHeight;
    const hit = visible ? document.elementFromPoint(cx, cy) : null;
    return visible && !!hit && (hit === el || el.contains(hit) || hit.contains(el));
  });
}

// Wait until one of the email fields in the signup forms is on screen and usable.
async function findOpenEmailField(page) {
  const fields = page.locator('form.is-signup_xp input[type="email"]');
  let found = -1;
  await expect.poll(async () => {
    const n = await fields.count();
    for (let i = 0; i < n; i++) {
      if (await inView(fields.nth(i))) { found = i; return true; }
    }
    return false;
  }, { message: 'an email field of the Enroll popup should be on screen', timeout: 20_000 }).toBe(true);
  return fields.nth(found);
}

const cases = BUILD_MODE
  ? [
      { button: 'top', group: 'a' },
      { button: 'bottom', group: 'b' },
      { button: 'bottom', group: 'c' }
    ]
  : [
      { button: 'top', group: null },   // live monitor: real visitor, random price group
      { button: 'bottom', group: null }
    ];

for (const site of sites) {
  const base = SITES[site];
  if (!base) throw new Error('Unknown site ' + site);

  test.describe(`${site} (${BUILD_MODE ? 'new build' : 'as live'})`, () => {
    for (const c of cases) {
      test(`${c.button} Enroll -> popup in view -> Stripe${c.group ? ' (group ' + c.group + ')' : ''}`, async ({ page }) => {
        const log = await prepare(page);
        const url = base + (c.group ? '?dfs_group=' + c.group : '');

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        // Big media can keep the 'load' event waiting; scripts we need have run by then anyway.
        await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(1500); // let page scripts and animations settle

        if (BUILD_MODE) expect(log.served, 'the new main.min.js should have replaced the site script').toBeGreaterThan(0);
        if (BUILD_MODE) expect(log.missing, 'every file the site loads from this repo should be in the build').toEqual([]);
        if (BLOCK_HOTFIX) expect(log.hotfixBlocked, 'the hotfix should have been blocked').toBeGreaterThan(0);

        // Stylesheet: loaded and applied. In build mode, a site that doesn't link styles.min.css
        // yet (e.g. staging before its next publish) gets our build added, so it is tested too.
        if (BUILD_MODE && log.stylesServed === 0) {
          await page.addStyleTag({ content: builtStyles });
          test.info().annotations.push({ type: 'note', description: 'site does not link styles.min.css yet; build CSS was added by the test' });
        }
        const styled = await page.evaluate(() => {
          const el = document.querySelector('.grid-background');
          return el ? getComputedStyle(el).backgroundImage : 'no .grid-background on page';
        });
        expect(styled, 'styles.css should be applied (grid background)').toContain('repeating-linear-gradient');

        // 1. Click the Enroll button
        const buttons = page.locator('[start-popup]');
        expect(await buttons.count(), 'page should have a top and a bottom Enroll button').toBeGreaterThanOrEqual(2);
        const button = c.button === 'top' ? buttons.first() : buttons.last();
        await button.scrollIntoViewIfNeeded();
        await page.waitForTimeout(800);
        await button.click();

        // 2. A popup with the email form must slide into view
        const email = await findOpenEmailField(page);
        await page.waitForTimeout(700); // slide-in animation (0.6s)
        expect(await inView(email), 'email field should still be on screen after the animation').toBe(true);

        // Which price group this visitor is in (set by the price test script)
        const group = c.group || (await page.evaluate(() => { try { return localStorage.getItem('dfs_pg'); } catch (e) { return null; } })) || 'a';

        // 3. Fill in a fake email and continue
        await email.fill(TEST_EMAIL);
        const form = email.locator('xpath=ancestor::form[1]');
        const submit = form.locator('input[type="submit"], button[type="submit"]').first();
        expect(await inView(submit), 'the "Continue to payment" button should be on screen').toBe(true);
        // Popup must look styled, not raw HTML: real size and a non-transparent background somewhere up the popup.
        const popupLooksStyled = await email.evaluate((el) => {
          const pop = el.closest('.get_started_container, [get-started]') || el.closest('form');
          const r = pop.getBoundingClientRect();
          let node = pop, bg = false;
          while (node && node !== document.body && !bg) {
            const c = getComputedStyle(node).backgroundColor;
            bg = c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)';
            node = node.parentElement;
          }
          return r.width > 200 && r.height > 100 && bg;
        });
        expect(popupLooksStyled, 'popup should be visible and styled').toBe(true);
        await test.info().attach('popup', { body: await page.screenshot(), contentType: 'image/png' });

        // Click "Continue to payment". Webflow keeps this button disabled until Cloudflare
        // Turnstile (anti-bot) has run; the test blocks Turnstile and never submits to Webflow,
        // so when the button is disabled we fire the same submit event the button would.
        if (await submit.isEnabled()) {
          await submit.click();
        } else {
          await form.evaluate((f) => f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
        }

        // 4. We must end up at one of the three Stripe links
        await expect.poll(() => log.stripe.length, { message: 'should go to buy.stripe.com', timeout: 10_000 }).toBeGreaterThan(0);
        const target = new URL(log.stripe[0]);
        const link = target.origin + target.pathname;
        expect(Object.values(STRIPE), 'should be one of the price-test Stripe links').toContain(link);
        expect(target.searchParams.get('prefilled_email')).toBe(TEST_EMAIL);
        expect(target.searchParams.get('client_reference_id') || '').toMatch(/^dfs-/);
        // Exactly one abandoned-cart record per checkout (no double handling by two scripts)
        const cartStarts = log.beacons.filter((u) => /dfs-cart[^/]*\/start/.test(u));
        expect(cartStarts.length, 'exactly one abandoned-cart "start" per checkout').toBe(1);

        expect(link, `group ${group} should get its own Stripe link (same price as shown)`).toBe(STRIPE[group]);

        // 5. No JavaScript errors on the page
        expect(log.errors, 'no JavaScript errors').toEqual([]);

        if (BUILD_MODE) test.info().annotations.push({ type: 'served from build', description: [...new Set(log.files)].join(', ') });
        test.info().annotations.push({ type: 'stopped requests', description: log.stopped.join(' | ') || 'none' });
      });
    }
  });
}
