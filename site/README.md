# Public Site

`site/` is the production boundary for Dynasty Prestige.

## Rules

- Keep only public pages, public assets, and deploy metadata under `site/`
- Do not place previews, labs, templates, or archived experiments under `site/`
- Keep canonical assets in one place only:
  - brand marks in `site/images/brands/`
  - icons in `site/icons/`
  - shared CSS in `site/css/`
  - shared JS in `site/js/`
- Treat `site/app/reserve/page.html` as a public page, not as scratch space
- Keep sitemap, robots, manifest, service worker, and root favicon aligned with production

## What Lives Here

- HTML pages that are intended to be public
- Shared CSS and JS used by those pages
- Images, videos, icons, and other assets referenced by public URLs
- Deploy metadata such as `robots.txt`, `sitemap.xml`, `manifest.json`, `sw.js`, and `_redirects`

## Page Structure

- Keep the trunk pages in the `site/` root:
  - `index.html`
  - `fleet.html`
  - `locations.html`
  - `services.html`
  - `about.html`
  - `contact.html`
- Keep the reservation flow in `site/app/reserve/`
- Group leaf public pages under `site/pages/` by intent:
  - `site/pages/guides/`
  - `site/pages/services/`
  - `site/pages/brands/`
  - `site/pages/vehicles/`
  - `site/pages/legal/`
- Preserve public URLs through the routing map and hosting rewrites instead of re-flattening the root

## What Does Not Live Here

- Component previews
- Template sandboxes
- Design labs
- Temporary screenshots
- Runtime logs
- Output folders from audits or tests

When a file is useful but not public, move it to `docs/previews/` or `docs/archive/` instead of keeping it under `site/`.
