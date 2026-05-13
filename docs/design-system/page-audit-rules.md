# Dynasty Prestige Page Audit Rules

## Purpose

This checklist is the shared memory for building and reviewing Dynasty Prestige
pages. It turns repeated feedback into stable rules so every new page or agent
work session starts from the same standard.

Use this document before changing:

- home and first viewport sections
- fleet/listing pages
- brand landings
- vehicle landings
- service landings
- locations and guide pages
- reserve, contact and lookup flows

## Non-Negotiable Standard

Every page must feel like the same premium brand.

That means:

- same header family
- same frame width logic
- same typography roles
- same CTA language and hierarchy
- same card rhythm
- same contrast discipline
- same responsive behaviour across mobile, tablet, laptop and desktop

If a page feels like it belongs to another website, it fails even when it is
technically functional.

## First Viewport Rules

The first visible screen is the highest-priority UX area.

Required:

- one main message
- one main commercial action
- direct path to the page purpose
- no clutter above the fold
- no oversized decorative block hiding the useful task
- no important CTA below the fold unless the page pattern explicitly allows it
- no horizontal overflow
- no floating action covering important content

Pattern examples:

- Home: brand promise plus booking/date intent visible early.
- Fleet: filters or vehicles must appear quickly; hero cannot consume the page.
- Brand landing: brand context plus model cards visible early.
- Vehicle landing: media and availability panel visible early.
- Service landing: service choices or booking path visible early.
- Find Booking/Reserve: form task starts inside the first viewport.

## Typography Scale Rules

Premium does not mean huge text.

Headlines should feel elegant, not like accessibility zoom for grandparents.
Large type is allowed only when it improves hierarchy without damaging the
first viewport.

Guardrails:

- use `--dp-font-display` for major H1/editorial titles only
- use `--dp-font-sans` for nav, body, cards, forms, labels and CTAs
- CTAs, nav labels and chips use uppercase tracking, but must stay readable
- body text must never be pale grey on white or low-contrast on image
- do not create page-specific font stacks
- if text is too large for the layout, reduce the message before shrinking the
  whole page around it

Suggested H1 ranges:

| Viewport | H1 Target | Hard Warning |
| --- | --- | --- |
| mobile | 38px-52px | above 56px or more than 5 lines |
| tablet | 46px-64px | above 72px without documented reason |
| laptop | 52px-72px | above 80px when it pushes task below fold |
| desktop | 56px-82px | above 92px unless purely cinematic and approved |

Line-count targets:

- mobile H1: 2-5 lines
- tablet H1: 2-4 lines
- laptop/desktop H1: 1-3 lines
- body copy: short enough to scan; avoid dense paragraphs above the fold

Failure examples:

- giant H1 pushes cards, filters or forms below the fold
- headline breaks into awkward steps
- labels are tiny, tracked out and grey
- different pages use visibly different font families

## Copy Usefulness Rules

Every visible text block must earn its place.

A section, paragraph, card label or SEO block is allowed only if it helps at
least one of these jobs:

- reserve: moves the guest toward checking availability, reserving or contacting support
- trust: explains safety, confirmation, payment, handover, support or privacy
- compare: helps choose a vehicle, brand, service, location or route
- understand: explains what happens next in plain customer language
- navigate: points clearly to the next useful page or action
- rank: supports real Dubai/search intent with specific, believable information

If text does not pass one of those jobs, cut it, shorten it or rewrite it.

Required:

- first-viewport copy must be short enough to scan in under five seconds
- every H1/H2 must say something specific, not just sound luxurious
- paragraphs above the fold must stay compact and useful
- SEO sections must add real vehicle, brand, service, route, booking or handover value
- repeated pages may share structure, but not lazy duplicated filler
- customer-facing copy must never mention technical internals unless it is an admin-only surface

Failure examples:

- generic luxury claims that could belong to any rental company
- paragraphs that repeat the heading without adding new information
- SEO blocks added only to make the page longer
- overexplaining a simple step until it pushes the useful task below the fold
- vague promises about insurance, availability or delivery that are not guaranteed

## Header Rules

The public header is a brand asset, not page decoration.

Required:

- same logo treatment
- same dark header family
- same nav rhythm
- same reserve CTA style
- same dropdown surface style
- no flash/jump when navigating between pages
- no whitewashed header variant unless explicitly approved

Failure examples:

- dropdown dark on Home but white on brand pages
- header height changes between Fleet and Reserve
- logo/brand text scale changes by page
- nav shifts during load

## Frame And Geometry Rules

Most visual quality issues are geometry issues.

Required:

- main page content aligns to the same frame as the header content
- parallel desktop blocks align top and bottom unless intentionally documented
- card grids share consistent gaps
- filters align with result grids
- image and detail panels use the same vertical rhythm
- laptop and monitor are audited separately

Core thresholds:

- horizontal overflow: max 2px
- shared frame left/right delta: max 10px
- parallel row top delta: max 8px
- parallel row bottom delta: max 12px
- minimum tap target: 44px x 44px
- floating overlap on important content: max 12%

If the page visually feels off, measure first before patching randomly.

## Colour And Contrast Rules

Use the brand tokens from `site/css/brand-tokens.css`.

Required:

- warm dark surfaces use ivory/champagne text
- light sections use sand/ivory, not harsh pure white
- gold/champagne is the main premium accent
- WhatsApp green is only for WhatsApp
- image/video backgrounds need enough overlay to make text and CTAs clear
- muted copy must stay readable

Failure examples:

- grey text on white that looks washed out
- saturated background image fighting the text
- random green panels outside WhatsApp
- date/dropdown controls using unrelated colours

## Button And CTA Rules

Buttons must belong to one family.

Required:

- CTA text in uppercase where it is a commercial/action button
- one dominant CTA per first viewport
- secondary CTAs visually de-emphasized
- buttons have consistent radius, height, padding and font
- mobile CTA groups stack cleanly when needed
- labels must not wrap awkwardly or overflow

Failure examples:

- two equally loud CTAs competing above the fold
- CTA looks like a default browser button
- mobile side-by-side buttons become cramped
- buttons touch card edges without padding

## Card Rules

Cards should feel related even when the content changes.

Required:

- same radius family
- same padding scale
- same title/body/action order
- same CTA rhythm
- same shadow/border logic
- enough contrast with the background

Mobile:

- card carousels are allowed for vehicle cards when they improve flow
- stacked action buttons must span available card width evenly
- no contact buttons inside vehicle cards if floating call/WhatsApp already
  owns that action for the page, unless the page pattern explicitly needs them

## Page Mother Rules

### Home

- first viewport must show the brand promise and booking/date path early
- Services and Locations sections should not be duplicated if nav already
  handles them and the page becomes too long
- feature cards must align to the same frame and not exceed the planner width
  without intent

### Fleet

- filters must work and look good across all breakpoints
- date/time controls open from the full control, not only the number text
- filter button labels use uppercase
- dropdown options use normal readable casing and correct spelling
- vehicle cards can become horizontal swipe on mobile
- desktop/laptop card grid can remain multi-column

### Brand Landings

- brand pages start by offering the cars/cards of that brand
- intro is compact and supports the cards, not the other way around
- model card and CTA must be visible early on tablet/laptop
- below the cards: useful brand explanation for SEO, not decorative filler

### Vehicle Landings

- first viewport desktop/laptop: photos on the left, availability panel on the
  right, key specs below/near the panel
- floating call/WhatsApp stays bottom-right
- content width aligns with header frame
- below first viewport: valuable SEO only, such as video, vehicle information,
  use cases, FAQ and related cars

### Service Landings

- service hub uses text in the upper half and service cards/actions in the
  lower half
- each service detail page must keep the same typography, colour and spacing
  system
- background image opacity/saturation should match Home's readability standard
- service cards should be directly clickable and not require redundant panels

### App Flow Pages

- Reserve, Contact and Find Booking are task pages
- the task form must start in the first viewport
- copy should explain safety, confirmation and support without sounding
  technical
- back behaviour and field persistence must be intentional

## SEO Rules

SEO must support the user, not fill space.

Required:

- one clear H1
- meaningful title and meta description
- ordered H2/H3 hierarchy
- canonical when part of the page pattern
- OG/Twitter copy when pattern supports it
- descriptive image alt text
- internal links to relevant cars, brands, services and booking
- copy aligned with Dubai intent and handover/reservation reality
- no fake guarantees or unverifiable promises

Avoid:

- generic filler paragraphs
- keyword stuffing
- technical customer-facing language
- duplicate copy across pages that should be distinct

## Responsive Audit Rules

Any layout change must be checked on:

- mobile: 320, 360, 390, 430 widths
- tablet: 768 portrait and 1024 landscape
- laptop: 1280x720 and 1366x768
- desktop: 1440x900, 1707x893 and 1920x1080

Laptop is not the same as desktop. Short laptop height catches fold problems;
large desktop catches weak composition and empty space.

## Agent Delivery Rules

Agents working in parallel must:

- use their assigned worktree
- use their assigned branch
- use their assigned port
- not touch `staging`
- not push unless explicitly asked
- write a report under `artifacts/<task-name>/report.md`
- include screenshots or metric evidence
- list changed files and tests run
- commit locally only when the task is complete

Integrator reviews the agent branch before anything is merged.

## Human Approval Gate

Before merging a visual phase, answer:

1. Does the first viewport look premium and useful?
2. Is text elegant rather than oversized?
3. Does the page clearly belong to Dynasty Prestige?
4. Are the main slots aligned to the header/content frame?
5. Does mobile avoid cramped buttons and broken text?
6. Does laptop avoid hiding the task below the fold?
7. Does desktop avoid huge empty or awkward areas?
8. Is SEO useful and believable?
9. Are contact/reserve actions obvious but not noisy?
10. Did the auditor produce evidence, not just opinion?

