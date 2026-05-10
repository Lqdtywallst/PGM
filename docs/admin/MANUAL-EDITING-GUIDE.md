# Manual Editing Guide

## Goal

Make small and medium website changes by hand without accidentally moving unrelated parts.

## Local preview

Use this flow before and after each edit:

```bash
npm run http
```

Then open:

```text
http://localhost:8080/index.html
```

## Visual editor

There is now a private content editor for the most common low-risk edits:

- admin page: `http://127.0.0.1:3000/admin/content.html`
- scope:
  - home hero copy and CTA links
  - fleet card copy and pricing
  - full HTML editing for all public site pages in the route map

The editor writes into the real project files:

- `site/index.html`
- `server/data/fleet-cards.json`
- any mapped public HTML file under `site/`

When fleet cards are saved, `site/pages/core/fleet.html` is regenerated automatically.

## Best low-risk editing rule

Touch the smallest possible surface:

- if the change is copy on one page, edit only that HTML file
- if the change is layout on one page, edit that page plus its page-specific CSS
- if the change is fleet card content, edit the JSON source and regenerate
- avoid shared JS unless the change is behavioral

## Safe manual edit map

### Homepage

- File: `site/index.html`
- Use for:
  - hero headline
  - hero CTA labels and links
  - homepage section text
  - featured car copy on the homepage
  - review section shell markup

### Global shared styles

- File: `site/css/site-v2.css`
- Use for:
  - header
  - hero
  - shared buttons
  - shared spacing
  - shared typography
- Risk:
  - changes here can affect many pages at once

### Page-specific styles

- `site/css/site-v2-fleet.css`
- `site/css/site-v2-services.css`
- `site/css/site-v2-contact.css`
- `site/css/site-v2-about.css`
- `site/css/site-v2-locations.css`
- `site/css/site-v2-service-detail.css`
- Use these first when the issue belongs to one route family only.

### Fleet page card content

- Source of truth: `server/data/fleet-cards.json`
- Generated output: `site/pages/core/fleet.html`
- Rebuild command:

```bash
npm run build:fleet
```

- Use for:
  - vehicle names in the fleet grid
  - prices
  - badges
  - descriptions
  - WhatsApp messages
  - per-card links

Do not hand-edit the repeated fleet card block in `site/pages/core/fleet.html` unless it is an emergency. The JSON is the safer manual source.

### Vehicle pages

- Folder: `site/pages/vehicles/`
- Use for:
  - one specific car page
  - that car's title, copy, CTA text, image order

### Brand pages

- Folder: `site/pages/brands/`
- Use for:
  - Lamborghini, Ferrari, Mercedes, Porsche, Rolls-Royce landing pages

### Service pages

- Main hub: `site/pages/core/services.html`
- Detail pages: `site/pages/services/`

### Guide pages

- Folder: `site/pages/guides/`

### Contact page

- File: `site/pages/core/contact.html`
- Form behavior file: `site/js/contact-form.js`

### Reservation flow

- Main page: `site/app/reserve/page.html`
- Behavior: `site/js/reserve-flow.js`
- Shared reserve shell: `site/js/reserve-shell.js`

Treat reservation files as higher risk. Small copy edits are fine; layout or logic edits here should be tested carefully.

## High-risk manual zones

These are the places most likely to create the feeling that one change moved the rest:

- repeated header markup copied across many HTML files
- repeated footer/contact blocks copied across many HTML files
- `site/js/site-v2.js`
- `site/css/site-v2.css`
- shared classes like `.lab-header`, `.lab-nav`, `.hero-lab__*`, `.fleet-card__*`

## Why changes can spread

The project mixes two patterns:

- direct page HTML, which is easy to edit locally
- shared CSS and shared JS, which affect many routes together

That means copy changes are usually safe, but shared class or shared script changes can ripple across the site.

## Recommended manual workflow

1. Identify the exact route you want to change.
2. Edit only that page file first.
3. If spacing or visual styling is still wrong, edit the page-specific CSS before the global CSS.
4. If the change is in fleet cards, edit `server/data/fleet-cards.json` and run `npm run build:fleet`.
5. Preview in `localhost:8080`.
6. Check mobile and desktop before considering the change done.

## Good manual edits

- changing the home hero headline in `site/index.html`
- changing one service paragraph in `site/pages/services/*.html`
- changing one vehicle page title or description in `site/pages/vehicles/*.html`
- changing fleet prices in `server/data/fleet-cards.json`

## Edits to avoid doing casually

- changing header structure on one page only
- renaming shared classes in HTML
- editing `site/js/site-v2.js` for purely visual tweaks
- editing fleet card markup directly in `site/pages/core/fleet.html` instead of the JSON source

## Fast search commands

Find repeated phone or email references:

```bash
rg -n "971586122568|prestigegoalmotion@gmail.com" site server
```

Find where a visible phrase lives:

```bash
rg -n "Dubai luxury, delivered|Rent a luxury car" site
```

Find all files tied to a page family:

```bash
rg -n "fleet-card|fleet-browser|js-fleet" site server
```

## Best practical approach for you

Right now, the easiest manual workflow is:

- content edits in page HTML
- visual fixes in page-specific CSS
- fleet updates in `fleet-cards.json`
- avoid shared JS unless the problem is interactive

## Longer-term improvement

If you want the site to become much easier to maintain by hand, the next refactor should be:

1. centralize header and footer into one shared include or generator
2. centralize business constants like phone, email, and WhatsApp text
3. move more repeated card content into JSON-driven sources

That would reduce the risk of one chat-driven edit descolocando the rest.
