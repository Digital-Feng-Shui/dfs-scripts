# dfs-scripts

Site-wide JavaScript for the Digital Feng Shui website (Webflow), migrated from Slater.

- `main.js` — everything in one file. Each former Slater script is its own
  section (`dfsGlobal`, `dfsHome`, `dfsCourse`, …); the router at the bottom
  decides which sections run on which page.
- `styles.css` — the hand-written CSS (Client-First base, Osmo components,
  forms, homepage blocks) that used to sit in Webflow code embeds. Loaded in
  Site settings → Head (see below).
- `archive/` — old/unused snippets kept for reuse. Not loaded on the site.
- `night/`: night mode (`night-early.js` in Head, `night.js` + `night.css` in Footer).
- Today Webflow loads these files from jsDelivr, pinned to a tag
  (`cdn.jsdelivr.net/gh/Digital-Feng-Shui/dfs-scripts@vX.Y.Z/main.min.js`, `styles.min.css`,
  `night/night-early.min.js`, `night/night.min.js`, `night/night.min.css`). A pinned tag never changes,
  so merging here changes nothing on the site until Webflow points at a new tag or at Pages.
- Every green version on main is also put on GitHub Pages (only tested code gets there):
  `https://digital-feng-shui.github.io/dfs-scripts/main.min.js`, `/styles.min.css`, `/night/...`,
  and `/version.json` shows which version it is.
- Later, manual step in Webflow (staging first, then live): swap the jsDelivr URLs for the Pages
  URLs above. From then on code goes live automatically after green tests, without a Webflow publish.

Not in here (still inline in Webflow): Lenis setup, Meta pixel/events, and
Thomas's checkout / setup-pack / onboarding-picker / price-test code.

## Release flow (automatic)
See `RULES.md` for the house rules.
1. Make a branch, edit `main.js` / `styles.css`, open a pull request.
2. GitHub tests it on the real site (live + staging, desktop + phone + iPhone):
   both Enroll buttons open a popup on screen, the email form goes to the right
   Stripe link, no JavaScript errors, styles applied. Nothing is published by the test.
3. Green? Merge. GitHub tags the version from the commit message (or uses your own tag) and puts it on
   GitHub Pages within a few minutes. Once Webflow loads from Pages, no Webflow publish is needed.
4. Red? Nothing goes live. Open the failed run to see screenshots.

Every 15 minutes the **Live monitor** checks the real buy flow. If it breaks it opens a
`site-down` issue and sends alerts. **Rollback**: Actions > Rollback > Run workflow
(empty = one version back).

Run the tests on your own computer: `npm install`, `npx playwright install`, `npm test`.
Check the live site as-is: `npm run test:live`.
