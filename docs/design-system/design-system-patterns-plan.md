# Dynasty Prestige Component Pattern Plan

## Goal

Create a stronger visual identity by turning repeated UI decisions into shared
mother templates. Each page can keep its own content and narrative, but the
structure, rhythm, buttons, cards and key page patterns should come from the
same component system.

This is not a full rebuild. The safer approach is progressive consolidation:
standardize the repeatable families first, then migrate page-specific CSS over
time.

For the operating matrix that turns these ideas into page assignments,
component families, audit checks and implementation phases, use
[`homogeneity-matrix.md`](homogeneity-matrix.md).

## Research Principles

- Design tokens should be the shared vocabulary for visual decisions. The W3C
  Design Tokens Community Group describes tokens as platform-agnostic design
  decisions that can be shared across tools and technologies.
- Components should be reusable UI parts with one main definition and many
  instances. Figma describes this model as a main component plus linked
  instances that receive updates from the source component.
- Patterns should solve page-level user tasks by composing components. GOV.UK
  separates components from patterns: components are reusable UI parts, while
  patterns adapt one or more components to a task or page type.
- Accessibility must be part of the component contract, not a later visual fix:
  WCAG text contrast and target sizing rules should be checked by audit tools.
- Content tone is part of consistency. IBM Carbon separates voice from tone:
  the voice stays recognizable, while tone adapts to context such as errors,
  onboarding or CTAs.

## Current State In This Repo

### Already strong

- `site/css/brand-tokens.css` is the central brand token layer.
- `docs/design-system/design-system-brand.md` documents core color and typography usage.
- `server/data/fleet-cards.json` plus `server/renderers/render-fleet-cards.js` already
  works like a real component renderer for fleet cards.
- `server/data/services-editor.json` and `server/data/locations-editor.json`
  already hold structured content that can become renderer-driven.
- `server/design-system/design-system-contract.js` and `server/audits/homogeneity-audit-core.js`
  already define a good base for visual contracts and homogeneity checks.

### Still fragmented

- Buttons exist under multiple local families:
  `btn`, `btn-primary`, `hero-lab__cta`, `fleet-card__primary`,
  `services-button`, `service-detail-button`, `contact-button`,
  reserve flow buttons.
- Cards exist under multiple local families:
  `fleet-card`, `service-card`, `guide-card`, `locations-guide-card`,
  `service-detail-card`, `lookup-result-card`, admin preview cards.
- Page heroes use page-specific structures:
  home hero, fleet browser hero, services hero, local-guide hero,
  service-detail hero, contact hero, reserve/lookup hero.
- Some repeated sections are still hardcoded HTML even though they behave like
  data entries.

## Recommended Architecture

Use four layers. The lower layers must be more stable; the upper layers can
adapt per page.

### 1. Tokens

Source of truth:

- `site/css/brand-tokens.css`

Add over time:

- spacing scale: `--dp-space-*`
- elevation scale: `--dp-shadow-*`
- text scale: `--dp-type-*`
- component radii: `--dp-radius-*`
- overlay recipes: `--dp-overlay-*`

Rule:

- New CSS should not introduce raw brand colors, random fonts or one-off
  spacing unless there is a documented exception.

### 2. Primitives

Create one shared CSS file for reusable building blocks:

- `site/css/dp-components.css`

Suggested primitives:

- `.dp-container`
- `.dp-section`
- `.dp-stack`
- `.dp-cluster`
- `.dp-grid`
- `.dp-surface`
- `.dp-kicker`
- `.dp-button`
- `.dp-card`
- `.dp-media`
- `.dp-form-field`
- `.dp-floating-actions`

These are not page designs. They are the controlled vocabulary for spacing,
alignment, surface, button and card behavior.

### 3. Components

Components are complete reusable blocks with approved variants.

Priority component families:

- `GlobalHeader`
- `Hero`
- `Button`
- `Card`
- `FleetCard`
- `ServiceCard`
- `GuideCard`
- `CTAGroup`
- `DatePlanner`
- `FormPanel`
- `TrustStrip`
- `FAQItem`
- `ProcessStep`
- `FloatingContact`

Each component needs:

- a canonical class family
- approved variants
- required content fields
- responsive rules
- accessibility rules
- examples of correct and incorrect usage

### 4. Page Patterns

Patterns compose components into page types.

Recommended mother templates:

- `MarketingLandingPage`: hero, proof/trust, curated cards, CTA, FAQ.
- `ListingPage`: hero, filters/date planner, result cards, support CTA.
- `DetailPage`: hero/media, facts, gallery, booking panel, related links.
- `HubPage`: intro, priority cards, guide cards, process, CTA.
- `AppFlowPage`: header, stepper/form panel, summary, secure support.
- `LookupPage`: first-viewport secure form, safe result card, support fallback.

These templates should define layout rhythm and hierarchy. Page content can vary,
but the first viewport, CTA hierarchy, spacing and card behavior should not
drift.

## Page Layout Distribution Standard

The website also needs mother page layouts, not only mother components. This is
the layer that prevents a page from feeling visually correct in isolation but
wrong next to the rest of the site.

Every public page should declare one page pattern and follow its approved slots.
The content can change, but the order, spacing and alignment rules should stay
predictable.

### Global page frame

All public pages should share:

- one global header family
- one max-width frame token
- one horizontal gutter system
- one section spacing scale
- one footer/contact rhythm
- one floating contact position
- one primary CTA hierarchy

Recommended frame tokens:

- `--dp-frame-width`: main content width.
- `--dp-frame-gutter`: viewport gutter.
- `--dp-section-y-sm`: compact vertical section spacing.
- `--dp-section-y-md`: normal vertical section spacing.
- `--dp-section-y-lg`: editorial/hero vertical section spacing.
- `--dp-grid-gap`: normal card/grid gap.
- `--dp-grid-gap-lg`: premium wide card/grid gap.

### Standard page slots

Each page should be built from a controlled set of slots:

1. Header
2. Hero or page intro
3. Primary action area
4. Main content grid or editorial body
5. Trust/support reinforcement
6. Secondary navigation or related content
7. Final CTA
8. Footer

Not every page needs every slot, but if a slot exists it should appear in the
approved order for that page pattern.

### First viewport distribution

The first viewport must be treated as a contract:

- header must not visually jump between routes
- hero text must not compete with too many CTAs
- the main action must be visible or clearly implied
- if a planner/form appears above the fold, it must align to the same grid as
  the hero copy
- proof chips/cards must not overpower the main CTA
- no horizontal scroll at laptop, desktop, tablet or mobile widths
- important content should not be hidden under floating actions

### Desktop distribution

Desktop pages should avoid random centered islands and uneven row rhythm.

Rules:

- use a shared content frame instead of page-specific arbitrary widths
- when two blocks sit side by side, align their top edges and visual baseline
- when two or more cards form a row, align top and bottom edges unless a
  documented masonry/editorial exception exists
- keep sidebars, filters and booking panels on a predictable grid
- avoid oversized hero blocks that push the actual page task too far below the
  fold on laptop screens

### Public support first viewport shell

Services, Locations, Contact, About Us and Find Booking must share the same
laptop/monitor first-viewport shell even when their page pattern differs below
the fold.

Rules:

- same start height below the global header
- same brand frame width
- two filled columns
- left column: headline, short useful copy and trust/navigation cue
- right column: task/proof surface such as service choices, map, form, lookup,
  contact action or support panel
- top edges align; bottom edges should finish in the same visual band
- content must be edited to fit the shell instead of letting each route invent
  its own first-viewport height

### Mobile distribution

Mobile pages should prioritize clarity and continuation.

Rules:

- one column by default
- stacked CTA groups should span the card/form width
- date planners and filters should not trap the first viewport
- image-heavy sections should not appear before the user understands the page
  task
- floating back/contact controls must adapt opacity or position if they overlap
  important content

### Page pattern contracts

#### MarketingLandingPage

Use for:

- home
- main service or SEO landing pages

Slots:

- header
- cinematic hero
- primary CTA
- trust/proof strip
- curated cards
- support/FAQ
- final CTA

#### ListingPage

Use for:

- fleet
- future filtered collections

Slots:

- header
- compact hero or listing intro
- planner/filter controls
- result count and context
- card grid
- support CTA

The listing task must appear early. Do not let a decorative hero consume the
desktop first viewport.

#### DetailPage

Use for:

- vehicle pages
- service detail pages

Slots:

- header
- detail hero/media
- key facts or booking panel
- trust and process
- gallery/details
- related content
- final CTA

#### HubPage

Use for:

- services
- locations
- brand/type hubs

Slots:

- header
- hub intro
- priority choices
- guide/card grid
- process section
- final CTA

#### AppFlowPage

Use for:

- reserve flow
- reservation lookup
- admin-like customer utility pages

Slots:

- header
- secure/app intro
- form panel
- result/summary panel
- support fallback

These pages should feel more task-driven and less editorial.

## Homogeneity Auditor Additions For Page Layouts

The auditor should learn page-level distribution, not just color/header issues.

Add checks for:

- page declares an approved pattern
- first viewport has one dominant headline
- first viewport has no more than one dominant CTA
- hero/form/grid align to the same frame
- desktop side-by-side blocks have aligned top and bottom edges
- card rows have consistent heights unless the pattern allows editorial rhythm
- section vertical spacing uses the approved scale
- no page-specific max-width creates a visible layout jump
- no first viewport pushes the primary task too far below the fold
- no route changes header height, header background, menu spacing or dropdown
  surface style

## Geometry: Turning Visual Quality Into Measurements

A large part of visual homogeneity is measurable. The auditor should not only
ask whether a page "looks good"; it should measure whether the layout obeys the
brand geometry.

Useful measurements:

- `boundingClientRect()` for every important slot: header, hero, CTA group,
  planner, card grid, form panel and floating actions.
- left/right frame alignment between hero copy, filters, cards and form panels.
- top/bottom edge deltas for blocks that share a row on desktop.
- gap consistency between cards, sections, labels and controls.
- width ratios: CTA group width versus content width, image width versus copy
  width, sidebar width versus results width.
- first-viewport depth: how far below the fold the primary task starts.
- overlap ratios between floating controls and important content.
- scroll width versus viewport width to catch horizontal overflow.
- computed contrast ratio between text color and the actual surface behind it.
- tap target dimensions for buttons, links, chips and mobile controls.

Initial contract thresholds:

- row top alignment delta: max 8px.
- row bottom alignment delta: max 12px.
- shared frame left/right delta: max 10px.
- horizontal overflow: max 2px.
- primary task starts before 82% of the viewport height on task pages.
- tap targets: minimum 44px for project comfort.
- floating controls may not cover more than 12% of an important element.
- text contrast: WCAG 4.5:1 for normal text and 3:1 for large text.

This means the auditor can mark many visual issues objectively:

- "The filter panel and results grid are not aligned."
- "The hero consumes too much of the laptop first viewport."
- "The CTA group is visually dominating the vehicle card."
- "The floating WhatsApp button overlaps the booking CTA."
- "The card row bottoms are inconsistent enough to feel broken."
- "The text/background contrast is below the allowed threshold."

This should become a second homogeneity layer:

```bash
npm run audit:homogeneity:layouts
```

The output should tell us:

- which page pattern was detected
- which slots are present
- which slot is missing or out of order
- where alignment/spacing drifts from the approved template
- screenshots for the first viewport at mobile, tablet, laptop and desktop

## What To Build First

### Phase 1: Component inventory and contract

Create a component manifest:

- `server/design-system/design-system-components.json`

It should list approved component families, variants, required selectors and
forbidden duplicate patterns.

Example:

```json
{
  "button": {
    "canonicalClass": "dp-button",
    "variants": ["primary", "secondary", "ghost", "whatsapp", "call"],
    "minHeightPx": 44,
    "allowedColorTokens": [
      "--dp-color-gold",
      "--dp-color-carbon",
      "--dp-color-whatsapp"
    ]
  }
}
```

### Phase 2: Shared component CSS

Add `site/css/dp-components.css` and import it after `brand-tokens.css`.

Start with:

- buttons
- cards
- section heads
- CTA groups
- form fields
- page shells

Do not delete page CSS yet. First add aliases and migrate gradually.

### Phase 3: Migrate high-risk duplicated families

Priority order:

1. Buttons
2. Cards
3. Section headings and kickers
4. Hero first viewport shells
5. Form panels
6. Floating controls

Buttons and cards are first because they are the most visible source of brand
inconsistency.

### Phase 4: Data-driven renderers

Fleet already has a working model. Extend that approach:

- `server/render-services-content.js`
- `server/render-locations-content.js`
- later: `server/render-page-patterns.js`

The idea is not to generate the whole site blindly. The idea is to generate
repeatable blocks from structured data while keeping hand-authored page
narrative where needed.

### Phase 5: Audit gates

Extend the homogeneity auditor to detect:

- raw colors outside token allowlist
- unknown button classes or button variants
- unknown card families
- card CTA layout drift across mobile/tablet/desktop
- first viewport hierarchy violations
- text contrast below WCAG thresholds
- tap targets below project threshold
- header/menu/dropdown visual drift
- page templates missing required component slots

## Component Rules For PGM

### Buttons

Use one family:

- `.dp-button`

Variants:

- `.dp-button--primary`: main commercial CTA.
- `.dp-button--secondary`: lower emphasis navigation CTA.
- `.dp-button--ghost`: quiet action on dark/image surfaces.
- `.dp-button--whatsapp`: WhatsApp only.
- `.dp-button--call`: phone contact only.
- `.dp-button--danger`: admin/destructive only.

Rules:

- One dominant CTA above the fold.
- Secondary CTA must be visually quieter.
- Minimum target height: 44px for project comfort, even though WCAG AA minimum
  is lower.
- WhatsApp green is only for WhatsApp actions.

### Cards

Use one base:

- `.dp-card`

Variants:

- `.dp-card--vehicle`
- `.dp-card--service`
- `.dp-card--guide`
- `.dp-card--feature`
- `.dp-card--booking`
- `.dp-card--result`

Rules:

- Same radius system.
- Same internal padding scale.
- Same label/title/body/action order unless a variant documents otherwise.
- Desktop card rows should align top and bottom edges.
- Mobile CTA groups stack cleanly and span the card width.

### Heroes

Use one page pattern family:

- `.dp-hero`

Variants:

- `.dp-hero--home`
- `.dp-hero--listing`
- `.dp-hero--detail`
- `.dp-hero--hub`
- `.dp-hero--form`

Rules:

- First viewport must have one main headline and one main CTA.
- Text over image/video must use a verified overlay.
- Laptop short-height viewports are first-class, not an afterthought.
- The date planner can appear above the fold only when it helps the primary
  booking intent and does not compete with the headline.

### Forms

Use:

- `.dp-form-panel`
- `.dp-field`
- `.dp-field__label`
- `.dp-field__control`
- `.dp-field__help`
- `.dp-field__error`

Rules:

- Labels stay visible.
- Errors are human and non-technical.
- Inputs and selects share the same height, radius and focus style.
- Sensitive reservation lookup views never expose private data in public.

## Auditor Upgrade Plan

Add a new component homogeneity mode:

```bash
npm run audit:homogeneity:components
```

It should combine static and browser checks:

- Static: scan HTML/CSS for unknown classes, raw colors, raw fonts, duplicate
  button/card systems.
- Runtime: use Playwright to compute dimensions, contrast, target sizes, first
  viewport composition and component slot order.
- Output: `artifacts/homogeneity-components/<timestamp>/report.json`.

Severity model:

- High: broken header family, inaccessible contrast, CTA impossible to tap,
  first viewport overflow, unknown primary button system.
- Medium: card rhythm drift, inconsistent radius/padding, repeated component
  structure not using canonical family.
- Low: small typography drift, non-blocking spacing drift, naming cleanup.

## Best Next Move

Do not redesign the whole website from zero.

Best next step:

1. Add `dp-components.css`.
2. Add `server/design-system/design-system-components.json`.
3. Normalize all buttons first.
4. Normalize fleet/service/location cards second.
5. Extend the homogeneity auditor to enforce those component contracts.

This gives the brand a stronger system without risking a full rebuild.
