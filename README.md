# dfs-scripts

Site-wide JavaScript for the Digital Feng Shui website (Webflow), migrated from Slater.

- `main.js` — everything in one file. Each former Slater script is its own
  section (`dfsGlobal`, `dfsHome`, `dfsCourse`, …); the router at the bottom
  decides which sections run on which page.
- `styles.css` — the hand-written CSS (Client-First base, Osmo components,
  forms, homepage blocks) that used to sit in Webflow code embeds. Loaded in
  Site settings → Head as `@vX.Y.Z/styles.min.css`.
- `archive/` — old/unused snippets kept for reuse. Not loaded on the site.
- Served via jsDelivr, pinned to a git tag, as one tag in Webflow
  Site settings → Custom code → Footer (no `defer`):
  `<script src="https://cdn.jsdelivr.net/gh/rimbodesigns/dfs-scripts@v1.1.1/main.min.js"></script>`
  (jsDelivr builds `main.min.js` from `main.js` automatically)

Not in here (still inline in Webflow): Lenis setup, Meta pixel/events, and
Thomas's checkout / setup-pack / onboarding-picker / price-test code.

## Release flow
1. Edit `main.js`, commit, push.
2. `git tag vX.Y.Z` and push the tag.
3. Update the version in the Webflow footer tag.
4. Publish to staging (dfs-staging.webflow.io), test, then publish live.

## Live monitor
Every 15 minutes GitHub (Actions > Live monitor) runs the buy-flow check on the live site,
exactly as visitors get it: both Enroll buttons open the popup on screen and the email form
goes to the right Stripe link. Stripe is faked, trackers and our workers are blocked, so it
never makes a real checkout. When it breaks: a `site-down` issue plus a phone push (ntfy);
when it works again, the issue closes itself. Run it yourself: `npm install`,
`npx playwright install`, `npm run test:live`.
