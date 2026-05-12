# Layout Measurement Contract

## Purpose

This document explains how Dynasty Prestige should measure page geometry so
visual quality becomes objective enough for auditors and agents.

The goal is not to turn design into cold mathematics. The goal is to use
measurements to catch the failures humans already notice:

- the header jumps between pages
- text is too pale for its background
- a first viewport hides the actual task
- cards do not align
- buttons feel cramped
- floating actions cover important content
- laptop screens get horizontal scroll
- copy is too long for the available layout

Mathematics catches the broken structure. Human review still decides taste,
imagery, emotional quality and intentional exceptions.

## Measurement Principle

Every page is measured as a set of named slots.

Each slot has:

- a selector or selector group
- a bounding rectangle
- computed styles
- text metrics
- viewport visibility
- relationship to other slots

The auditor should measure layout using Playwright and browser-side DOM APIs:

```js
element.getBoundingClientRect()
window.getComputedStyle(element)
document.documentElement.scrollWidth
document.documentElement.clientWidth
window.innerWidth
window.innerHeight
```

The final judgement comes from comparing those measurements against the
approved page pattern: `MarketingLandingPage`, `ListingPage`, `DetailPage`,
`HubPage`, `AppFlowPage` or `AdminPage`.

## Canonical Viewports

Use the viewport matrix already defined in
`server/design-system/design-system-contract.js`.

| Viewport | Size | Why It Matters |
| --- | --- | --- |
| `mobile-tiny` | 320 x 568 | catches old/small phone overflow and oversized text |
| `mobile-short` | 400 x 608 | catches cramped browser/device-mode first views |
| `mobile-small` | 360 x 640 | catches narrow phone card/form squeeze |
| `mobile-modern` | 390 x 844 | main modern phone baseline |
| `mobile-wide-short` | 432 x 768 | catches wide but short phone/bottom-sheet issues |
| `mobile-large` | 430 x 932 | catches over-expanded mobile spacing |
| `tablet-portrait` | 768 x 1024 | bridge between mobile and desktop layouts |
| `tablet-landscape` | 1024 x 768 | catches touch layouts using desktop grids |
| `laptop-compact` | 1280 x 720 | high-risk short laptop first viewport |
| `laptop` | 1366 x 768 | common laptop baseline |
| `desktop-standard` | 1440 x 900 | normal external monitor |
| `laptop-large` | 1536 x 864 | common 15-inch laptop/scaled Windows display |
| `desktop-wide` | 1707 x 893 | premium desktop composition and header checks |
| `desktop-large` | 1920 x 1080 | full HD large-screen spacing and floating controls |

Critical first-viewport checks should at minimum run on:

- `mobile-tiny`
- `mobile-short`
- `mobile-modern`
- `tablet-portrait`
- `laptop-compact`
- `laptop`
- `desktop-wide`

Computer checks must not collapse laptop and monitor into one generic desktop
bucket. Measure both:

- laptop: `laptop-compact`, `laptop`, `laptop-large`
- monitor: `desktop-standard`, `desktop-wide`, `desktop-large`

The common failure pattern is different: laptops reveal fold/height problems;
monitors reveal weak composition, oversized empty space and frame drift.

## Slots To Measure

Each page pattern can have different slots, but the slot names should stay
consistent.

| Slot | What To Measure | Example Selectors |
| --- | --- | --- |
| `header` | height, top, logo rect, nav rect, CTA rect, background color | `.site-header`, `.dp-header` |
| `mobileDrawer` | drawer bounds, brand area, menu grid, CTA visibility | `.mobile-menu`, `.nav-drawer` |
| `hero` | full hero rect, image/video rect, overlay contrast | `.dp-hero`, `.hero`, `[data-hero]` |
| `heroHeadline` | line count, width, top, contrast, font role | `h1`, `.hero-title` |
| `heroCopy` | max width, line count, contrast | `.hero-copy`, `.lead` |
| `primaryCta` | size, position, visibility, hierarchy | `[data-primary-cta]`, `.btn-primary` |
| `secondaryCtas` | count, size, relative emphasis | `.btn-secondary`, `.hero-actions a` |
| `datePlanner` | label/control alignment, grid fit, stale date values | `.date-planner`, `.booking-widget` |
| `filterPanel` | panel width, top alignment, control height | `.fleet-sidebar`, `.filters` |
| `cardGrid` | frame alignment, row top/bottom, column gap | `.js-fleet-grid`, `.fleet-results__list`, `.services-hero__selector`, `.locations-guides__grid`, `.fleet-grid`, `.cards-grid` |
| `card` | width, height, padding, CTA area ratio, overflow | `.fleet-card`, `.dp-card` |
| `formPanel` | first field visibility, control height, error visibility | `form`, `.dp-form-panel` |
| `trustStrip` | chip count, vertical footprint, CTA competition | `.trust-strip`, `.stats` |
| `floatingActions` | position, overlap, tap target size | `.floating-contact`, `.dp-floating-actions` |
| `footer` | frame alignment and CTA consistency | `footer`, `.site-footer` |

## Core Metrics

These are the measurements every visual/homogeneity audit should compute.

| Metric | Formula | Good Signal |
| --- | --- | --- |
| Horizontal overflow | `scrollWidth - clientWidth` | `<= 2px` |
| Frame left delta | `abs(slotA.left - slotB.left)` | `<= 10px` |
| Frame right delta | `abs(slotA.right - slotB.right)` | `<= 10px` |
| Row top delta | `max(top) - min(top)` for row items | `<= 8px` |
| Row bottom delta | `max(bottom) - min(bottom)` for row items | `<= 12px` |
| Task depth | `primaryTask.top / viewportHeight` | task pages `<= 0.82` |
| CTA visibility | CTA rect intersects viewport | primary CTA visible or clearly implied |
| Tap target height | `rect.height` | `>= 44px` |
| Tap target width | `rect.width` | `>= 44px` |
| Floating overlap ratio | overlap area / important element area | `<= 0.12` |
| Card CTA dominance | CTA area / card area | mobile normally `<= 0.32` |
| Hero vertical dominance | hero height / viewport height | listing pages normally `<= 0.62` on laptop |
| Form first field depth | first required field top / viewport height | app flow pages `<= 0.86` |
| Text contrast | WCAG contrast ratio | normal `>= 4.5`, large `>= 3` |
| H1 line count | DOM range/client rect lines | mobile `2-5`, desktop `1-3` unless intentional |
| Body line length | rendered text width or characters per line | target `45-75ch` desktop, shorter mobile |

## Typography Scale Guardrail

The layout auditor should flag oversized typography, especially in the first
viewport. Premium display type should create hierarchy without making the page
feel like it is zoomed for elderly users.

Suggested H1 warning thresholds:

| Viewport Group | Warning |
| --- | --- |
| mobile | H1 above `56px` or more than 5 rendered lines |
| tablet | H1 above `72px` without a documented exception |
| laptop | H1 above `80px` when primary task/cards/forms move below the fold |
| desktop | H1 above `92px` unless the page is intentionally cinematic and approved |

The auditor should prefer a copy/layout fix over simply shrinking everything:

1. shorten the headline
2. reduce first-viewport clutter
3. adjust grid distribution
4. then tune font size

## Pattern-Specific Geometry

### MarketingLandingPage

Examples:

- Home
- major SEO landing pages

Measure:

- header consistency
- hero headline dominance
- primary CTA visibility
- date planner or booking intent alignment
- trust strip footprint

Targets:

- one dominant message in first viewport
- one dominant commercial CTA
- no more than two CTA groups above the fold
- hero copy, CTA and planner share the same frame or an intentional split grid
- proof chips must not visually overpower the CTA

Failure examples:

- Home hero looks good on desktop but hides dates on laptop.
- H1 breaks into awkward steps on mobile.
- Floating WhatsApp covers the date planner.

### ListingPage

Examples:

- Fleet
- future filtered listings

Measure:

- hero height
- filter/date planner top
- card grid top
- card row geometry
- result count visibility

Targets:

- listing task starts early on laptop and mobile
- decorative hero does not consume the whole first viewport
- filters align with result grid
- desktop card rows have aligned contact bars
- mobile cards stack actions cleanly

Failure examples:

- laptop first view shows only hero and no useful fleet task.
- filter panel and cards start from different grid lines.
- desktop cards have side gutters around split call/WhatsApp bars.

### DetailPage

Examples:

- vehicle pages
- service detail pages

Measure:

- hero/media split
- facts/booking panel position
- primary reserve CTA depth
- gallery/content rhythm
- text contrast across mixed surfaces

Targets:

- vehicle/service identity visible immediately
- booking path visible or clearly implied in first viewport
- media and facts align on desktop
- mobile availability/reserve CTA not buried

Failure examples:

- vehicle page has white text on white/light background.
- booking panel starts too far below the fold.
- left and right hero panels align at top but end at different heights.

### HubPage

Examples:

- Services
- Locations
- brand/type hubs

Measure:

- hub intro alignment
- priority choice visibility
- choice card/circle spacing
- guide grid alignment
- redundant panels or indirect click friction

Targets:

- choices are visible and clickable in the first useful viewport
- no decorative preview panel required before navigation
- guide cards share frame and rhythm

Failure examples:

- service circles are centered on mobile but float oddly on desktop.
- intro text is not aligned with cards below.
- user must click a circle and then another CTA to navigate.

### AppFlowPage

Examples:

- Reserve
- Find Booking
- contact-like task pages

Measure:

- secure intro height
- form panel top and bottom
- first required field depth
- CTA row visibility
- support fallback placement

Targets:

- task starts within first viewport
- first required field visible or almost visible on mobile
- form controls share height/radius/focus style
- support CTA is helpful, not competing with primary submit

Failure examples:

- Find Booking has a huge editorial headline but form is cropped.
- Reserve mobile hides delivery/location field too low.
- two submit-like buttons compete equally.

## Message And Copy Fit

Copy must be measured with the layout, not reviewed separately.

For every page, document:

- primary message
- secondary message
- primary CTA
- support CTA
- trust signal

Then measure:

- H1 line count
- paragraph line count
- CTA label wrapping
- card title wrapping
- labels that become too small or too pale

Rules:

- If text breaks the geometry, rewrite the text before shrinking the design.
- CTAs should not wrap unless the pattern explicitly allows it.
- Labels must remain readable; uppercase tracking is not an excuse for tiny grey
  text.
- Error messages should fit the form width and avoid technical vocabulary.

Examples:

- Bad: "Compare six real models by occasion, luggage, arrival style and daily
  rate..." if it creates a dense first viewport.
- Better: "Choose the car that fits your Dubai plan."

## Measurement Output Shape

Future layout audits should write a JSON object per route and viewport.

```json
{
  "route": "/fleet.html",
  "pattern": "ListingPage",
  "viewport": "laptop",
  "viewportSize": { "width": 1366, "height": 768 },
  "slots": {
    "header": { "top": 0, "left": 0, "width": 1366, "height": 96 },
    "hero": { "top": 96, "height": 320 },
    "datePlanner": { "top": 430, "height": 96 },
    "cardGrid": { "top": 560 }
  },
  "metrics": {
    "horizontalOverflowPx": 0,
    "primaryTaskDepthRatio": 0.56,
    "frameLeftDeltaPx": 4,
    "rowBottomDeltaPx": 8
  },
  "findings": []
}
```

Reports should include:

- route
- pattern
- viewport
- screenshot
- slot map
- failed metric
- expected threshold
- measured value
- severity
- short human explanation

## Mathematical Distribution Rules

Yes, layout can be distributed mathematically, but not by forcing every page into
the same shape.

Use mathematics for:

- frame widths
- grid columns
- row alignment
- vertical rhythm
- component size ratios
- first viewport depth
- tap targets
- contrast
- overflow

Use human judgement for:

- image mood
- luxury feel
- copy emotion
- intentional asymmetry
- whether a page should feel cinematic, task-driven or editorial

The right model is:

1. Decide page pattern.
2. Define slots.
3. Measure each slot.
4. Compare to pattern thresholds.
5. Allow only documented exceptions.
6. Let human review approve the final visual baseline.

## First Implementation Target

Build the future layout auditor around these stages:

1. `collectLayoutSlots(page, route, pattern)`
2. `measureSlotGeometry(slots, viewport)`
3. `measureTextFit(slots)`
4. `measureContrast(slots)`
5. `measureOverlap(slots)`
6. `scoreLayoutAgainstPattern(pattern, metrics)`
7. `writeLayoutReport(route, viewport, metrics, findings)`

Suggested npm script:

```bash
npm run audit:homogeneity:layouts
```

This script should start advisory, not blocking. Once the team approves the
first baselines, it can become stricter.

## Most Important Rule

If a page looks wrong, first ask:

1. Is the message too big or unclear for the first viewport?
2. Is the page using the right pattern?
3. Are the slots aligned to the same frame?
4. Are buttons/cards using the shared component family?
5. Is any important element below the fold too early?
6. Is contrast or spacing making the page feel unfinished?

That sequence prevents random patching.
