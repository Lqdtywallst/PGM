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

## What Does Not Live Here

- Component previews
- Template sandboxes
- Design labs
- Temporary screenshots
- Runtime logs
- Output folders from audits or tests

When a file is useful but not public, move it to `docs/previews/` or `docs/archive/` instead of keeping it under `site/`.
