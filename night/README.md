# Night mode (Thomas, prototype 7 Oct 2026)

A day/night switch for the homepage, in deep night blue. Follows the visitor's Mac/phone dark mode until they use the
moon/sun button in the nav; that choice wins and is remembered in the browser.
`?night=1` / `?night=0` in the URL forces a mode (for testing).

- `night.css`       all night colours, under `html.dfs-night` (generated from a CSS snapshot + hand-tuned extras)
- `night-early.js`  in `<head>`: sets night mode before the page paints (no flash)
- `night.js`        end of `<body>`: the toggle button, hero image swap, the transition
- `*-night.webp`    night versions of the two mountain backgrounds (loaded from this folder)

Originally homepage-only; now site-wide (see below), and for now only on
`*.webflow.io` (staging). Generator and prototype: Thomas's handoff folder.

## Regenerating `night.css`
`night.css` is generated: edit `extras.css` (hand-tuned rules) and regenerate, don't edit it by hand.
```bash
pip install tinycss2
curl -s "$(curl -s https://dfs-staging.webflow.io | grep -o 'https://cdn.prod.website-files.com/[^"]*\.css' | head -1)" -o night/tools/snapshot/wf.css
python3 night/tools/gen_css.py
```
The generator (Thomas's) gives every colour rule in the Webflow CSS and `styles.css` a night twin
under `html.dfs-night`. New colours added in Webflow stay day-coloured at night until you regenerate.

Loaded site-wide from Webflow's site custom code, for now only on `*.webflow.io` (staging).
