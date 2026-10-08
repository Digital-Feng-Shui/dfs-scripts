# Rules for the DFS site code

Short and simple, so the site keeps selling while we change things.

## Code (JavaScript and CSS)
1. Code only changes through this repo, with a pull request. Never paste or edit code
   directly in Webflow custom code (site settings, page settings or embeds).
2. A pull request is merged only when the tests are green.
3. Green on main goes to GitHub Pages by itself. Red never does.
4. Something wrong on the live site? Run **Actions > Rollback** first, fix after.
5. Version tags: name the version in the commit message ("v1.2.3: ..."). Tag it yourself or
   let the workflow do it; it uses your tag and never re-creates or moves a tag.

## Webflow design changes
1. Publish to staging (dfs-staging.webflow.io) first and check it, on a phone too.
2. Send a message in the DFS group before publishing to the live site.
3. Then publish live. The live monitor checks the buy flow every 15 minutes after that.

## Not allowed in code
- Passwords, API keys or tokens. This repo is public.
