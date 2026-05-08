# Block Editor Roadmap

## Goal

Let the admin add cards and other repeatable content blocks without hand-editing raw HTML every time.

## What is already easy

### Fleet cards

This is the best current candidate.

- data source: `server/data/fleet-cards.json`
- renderer: `server/render-fleet-cards.js`
- page target: `site/pages/core/fleet.html`

This means fleet cards are already close to a real CMS pattern:

- structured data
- one shared renderer
- one stable visual component

Adding `Add fleet card`, `Delete fleet card`, and `Reorder fleet card` in the admin would be low-risk.

## What is semi-repeatable already

### Services hub

File:

- `site/pages/core/services.html`

Current repeatable-looking groups:

- `services-lane-orb`
- `services-directory__item`

These are still hardcoded in HTML, but they already behave like data entries.

Good candidate for migration to JSON:

- service lane cards
- additional service route cards
- location guide cards inside the services hub

### Locations hub

File:

- `site/pages/core/locations.html`

Current repeatable-looking groups:

- `locations-hero__zone`
- `locations-guide-card`
- `locations-zone-card`
- `locations-process__item`

These are strong candidates for admin-managed repeatable cards and steps.

### Reservation lookup

File:

- `site/pages/core/reservation-lookup.html`

This page is less “card collection” oriented and more application-like.
It is a worse first candidate for arbitrary block adding.

## What is risky right now

### Header and mega-menu cards

These are repeated in many pages and still mostly duplicated in raw HTML.

Examples:

- `lab-nav__card--brand`
- `lab-nav__card--type`

Do not make these directly editable per-page first.

Best path:

- centralize them first
- then expose them once as shared site navigation content

### Arbitrary freeform DOM builder

“Add any element” sounds attractive, but in this project it would be fragile fast.

Why:

- spacing systems are hand-tuned
- many sections rely on exact class names
- mobile behavior depends on existing component structure
- one malformed block can damage layout or navigation

So the safer path is:

- not “add any HTML node”
- but “add one supported block type”

## Best architecture for your site

### Recommended model

Use a block registry with safe templates.

Each editable page becomes:

- page metadata
- ordered blocks

Each block has:

- `type`
- `variant`
- `content`
- optional `media`
- optional `actions`

## Good block types for phase 1

These match the current site well:

1. `card_grid`
2. `feature_card`
3. `cta_row`
4. `faq_list`
5. `process_steps`
6. `testimonial_list`
7. `hero_split`
8. `media_text_split`
9. `stat_list`

## What “add card easily” should mean

In admin, for supported sections, you should be able to:

1. add item
2. duplicate item
3. delete item
4. reorder item
5. edit image, title, copy, CTA, and tags

That is the sweet spot between flexibility and stability.

## Recommended implementation order

### Phase 1

Extend the current admin to support:

- `Add fleet card`
- `Delete fleet card`
- `Duplicate fleet card`
- `Reorder fleet card`

### Phase 2

Add structured editors for:

- services hub cards
- locations hub cards

### Phase 3

Add reusable block sections:

- FAQ blocks
- process step blocks
- CTA rows

### Phase 4

Only if still needed:

- a page-composer UI where the user can add supported blocks in order

## Recommendation

The best next move is not a fully freeform page builder.

The best next move is:

- make repeatable card families data-driven
- expose those families in admin
- then add a safe block composer for selected section types

That would give you the feeling of editing the whole site visually, while keeping the front-end stable.
