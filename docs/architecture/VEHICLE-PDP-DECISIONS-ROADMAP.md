# Vehicle PDP Decisions and Roadmap

Last updated: 2026-04-18

## Purpose

This document keeps the vehicle-page work aligned before implementation starts at scale.

It answers three practical questions:
- what has already been decided
- what remains open
- what we build next, in order

## Goal

Build premium vehicle detail pages for the fleet that:
- feel materially stronger than the current pages
- keep the white PGM visual base
- support excellent SEO on a per-car basis
- let the team move fast without rebuilding every page from zero

## Current progress snapshot

The work completed so far is:
- benchmark review completed against the chosen premium reference direction
- structural template rules documented
- SEO non-negotiables documented
- first visual template shell created in the codebase
- first Ferrari pilot page started as an exploration
- decision taken that final SEO pages must be completed one by one
- decision taken that the system will use one common base plus family variants by vehicle type

## Core decision

We will not make one generic live page that swaps content only in the browser.

We will use:
- one strong mother base for the shared structure
- one family variant layer by vehicle type
- one final page per car with its own SEO, media and copy

This means:
- same underlying system
- same core section order
- family-level variation in tone and emphasis
- per-car variation in narrative, metadata, schema, images, video and internal links

## Why this is the right approach

### For SEO

- Each car needs its own URL, title, meta description, H1 and canonical.
- Each car needs unique copy and FAQ content.
- Each car needs its own schema and entity signals.
- Static per-car pages are cleaner for indexing than a single client-side content swap approach.

### For design

- Premium pages work better when the structure is stable.
- The premium feel comes from hierarchy, spacing, media choice and alignment, not from reinventing the layout every time.
- Reusing the same shell avoids visual chaos across the fleet.
- Family variants keep Ferrari, Urus and Cullinan from feeling trapped in exactly the same mould.

### For production

- The team can improve the template once and apply it many times.
- Car-specific work becomes a controlled content task instead of a full redesign task.

## Decisions already taken

### Design and layout

- White background stays.
- The top of the page follows the media-first direction inspired by the chosen Rotana Star reference.
- The system uses a common base plus family variants by car type.
- The mobile approach is hybrid responsive, not a separate mobile template.
- The real Home/App header component stays present across vehicle pages as part of the shared system.
- Vehicle pages use that exact `lab-header` component with `Fleet` as the active state; the previous `site-header` shell is not part of the new PDP system.
- The initial family set is:
  - supercars
  - premium SUVs
  - ultra-luxury / chauffeur-led
- The first screen is:
  1. site header
  2. breadcrumb
  3. dominant main image on the left
  4. right media rail with support stills
  5. title and intro below the gallery
  6. facts and booking card below that
- Video does not sit in the top gallery rail.
- Video belongs below the first summary and booking layer.
- Max corner radius stays at 8px.

### SEO

- Final live pages must be built one by one.
- Every final page needs unique metadata, schema, copy, alt text and internal linking.
- Template preview files remain `noindex`.
- "Perfect SEO" means technical cleanliness plus genuinely unique page intent, not only metadata.

### Content

- Changing only photos is not enough.
- Changing only photos and videos is not enough.
- Each car must also change:
  - lead copy
  - use cases
  - FAQs
  - booking language
  - related-car logic

## Current working assets

- Template rules doc: `docs/templates/vehicle-page-template.md`
- Mother base preview: `docs/previews/vehicle-template-base.html`
- Supercar variant preview: `docs/previews/vehicle-template-premium.html`
- Current pilot page: `site/ferrari-rental-dubai.html`

## Recommended implementation model

### Layer 1: Mother base template

This is the reusable page skeleton.

It owns:
- section order
- grid system
- card styles
- booking card structure
- FAQ block structure
- related-cars block structure
- shared SEO conventions

It does not own:
- final model copy
- final model media
- final model schema values

### Layer 2: Family variant

This adjusts the mother base by vehicle type.

Initial family set:
- supercars
- premium SUVs
- ultra-luxury / chauffeur-led

Typical changes by family:
- media tone
- use-case emphasis
- copy rhythm
- operational priority
- related-car logic

### Layer 3: Car data sheet

Each car needs a content and media sheet with at least:
- page slug
- brand
- model
- year label if relevant
- main keyword
- title tag
- meta description
- canonical
- H1
- subline
- lead paragraph
- quick tags
- price label
- operational facts
- use-case cards
- FAQ set
- related cars
- hero image
- support gallery images
- video asset
- schema values

### Layer 4: Final per-car page

This is the actual public page for that vehicle.

It uses:
- the mother base structure
- the relevant family variant
- the specific car data sheet

## Open decisions

These are still open, but they do not block the next step.

1. Data source format
- Option A: maintain per-car content directly in HTML
- Option B: keep a structured content file per car and render pages from it later

Recommended current path:
- define the field list now
- keep first implementation simple
- decide on data-file automation only after the first master page is approved

2. Variant depth
- Decide how far each family variant should go in visual change before it stops feeling like the same brand system

Recommended current path:
- keep the shared structure fixed
- let the first differences happen in copy hierarchy, media choice and support sections

3. Media sourcing workflow
- Need a clear rule for final hero image, support stills and meaningful video per model

## Target state

Where we want to arrive:

- one stable mother base for all vehicle pages
- one approved supercar variant
- one approved premium SUV variant
- one approved ultra-luxury variant
- one per-car content sheet/checklist
- one fully benchmarked Ferrari page
- a repeatable rollout path for the rest of the fleet
- pages that feel premium visually and stand on their own for SEO

## Definition of done for one car page

A car page is not considered finished until all of this is true:

- layout matches the premium template
- first screen passes visual composition review for hierarchy, balance, alignment and perspective
- copy is unique to that model
- metadata is unique
- schema is complete and valid
- hero image is strong enough to carry the first screen
- support stills are real and not repeated filler
- video has a real narrative purpose
- internal links are meaningful
- FAQ answers real booking questions
- mobile layout holds together cleanly
- page is indexable only when complete

## Roadmap

### Phase 0 - Alignment and decisions
Status: done

- document the structural decisions
- document the SEO rules
- agree that final pages are built one by one
- agree that the system is base plus family variants

### Phase 1 - Mother base template
Status: next

- finalize the shared premium template structure
- fix spacing, alignment and hierarchy
- lock the section order
- lock the booking card behavior
- lock the responsive layout

Deliverable:
- one approved mother base

### Phase 2 - First family variant
Status: next

- build the first family variant on top of the mother base
- start with the supercar variant
- decide what belongs to the base and what belongs only to the family layer

Deliverable:
- one approved supercar variant

### Phase 3 - Car content schema
Status: next

- define the exact field list for a car page
- define the minimum media pack per car
- define the minimum SEO pack per car

Deliverable:
- one reusable checklist or content sheet for every vehicle

### Phase 4 - Ferrari master page
Status: after template approval

- use Ferrari as the first full master implementation
- replace placeholders with real copy and real media logic
- complete metadata, schema, FAQ and internal links

Deliverable:
- one fully finished benchmark page

### Phase 5 - Remaining family variants
Status: later

- adapt the base for premium SUVs
- adapt the base for ultra-luxury / chauffeur-led cars
- keep the underlying system aligned across all families

Deliverable:
- three approved family variants in total

### Phase 6 - Fleet rollout
Status: later

Suggested order:
1. Ferrari 296 GTS
2. Lamborghini Huracan
3. Lamborghini Urus
4. Rolls-Royce Cullinan Black Badge
5. Porsche page
6. remaining fleet pages

For each page:
- adapt copy
- adapt media
- adapt SEO
- adapt related links

### Phase 7 - QA and SEO pass
Status: later

- verify page titles, canonicals and metadata
- verify schema consistency
- verify image alt text
- verify internal links
- verify page weight and media loading
- verify mobile layout and CLS risk

## Immediate next step

Build and approve the mother base, then turn it into the first supercar variant before expanding any more individual pages.

That is the highest-leverage move because it decides:
- the premium visual language
- the production speed for the rest of the fleet
- the baseline that every future car page inherits
