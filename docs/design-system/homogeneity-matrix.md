# Dynasty Prestige Homogeneity Matrix

## Purpose

This matrix is the operating map for making the website feel like one premium
brand instead of a set of unrelated pages.

The rule is simple: every visible decision should come from a shared pattern
unless there is a documented exception.

This document defines:

- the global brand constants
- the reusable mother templates
- the page pattern matrix
- the component matrix
- the typography and spacing matrix
- the audit matrix that tells agents what to detect
- the implementation phases

## North Star

Dynasty Prestige should feel:

- premium without being loud
- operationally trustworthy
- easy to book from mobile and desktop
- visually consistent from page to page
- clear about reserve, WhatsApp, call, payment and handover

The first viewport is the highest-risk area. If the first visible screen feels
messy, oversized, misaligned, low-contrast or inconsistent, the page fails the
brand standard even if the rest of the page is acceptable.

## Global Constants

These rules apply everywhere.

| Area | Mother Rule | Never Allow | Auditor Signal |
| --- | --- | --- | --- |
| Header | One premium dark header family across public pages | Whitewashed headers, jumping header height, different logo treatment | header family drift, layout shift, dropdown drift |
| Colors | Use `--dp-*` tokens from `brand-tokens.css` | Random greens, neon accents, pale grey text on white | raw color, contrast failure |
| Typography | Shared display, sans and optional editorial serif roles | Page-specific font stacks that make pages feel unrelated | font family drift, size scale drift |
| Spacing | Shared section, grid and card spacing scale | Arbitrary gaps, cramped controls, isolated centered islands | frame delta, gap delta |
| Buttons | One `dp-button` family with approved variants | Multiple unrelated button systems competing | unknown button family |
| Cards | One `dp-card` base with approved variants | Different radius, padding, CTA order per page | card family drift |
| Floating Actions | Same bottom-right rhythm and overlap rules | Buttons covering forms/cards/text | overlap ratio failure |
| First Viewport | One main message, one main action, clear next step | CTA clutter, hidden task, horizontal scroll | first-viewport contract failure |

## Page Pattern Matrix

Every public page should declare one mother page pattern. The content changes;
the slot order, rhythm and first-viewport contract do not.

| Pattern | Pages | Required Slots | First Viewport Rule | Main Risks |
| --- | --- | --- | --- | --- |
| `MarketingLandingPage` | Home, major SEO landing pages | header, hero, primary CTA, trust proof, curated cards, support/FAQ, final CTA | emotional hero plus booking intent visible without clutter | hero too tall, too many CTAs, weak date planner alignment |
| `ListingPage` | Fleet, future filtered collections | header, compact hero, date/filter controls, result context, card grid, support CTA | user can start filtering or see vehicles quickly on laptop and mobile | decorative hero pushing results down, filters misaligned |
| `DetailPage` | Vehicle pages, service detail pages | header, media/detail hero, facts, booking panel, trust/process, gallery/details, related links | vehicle/service value and booking action visible early | white text on light areas, booking CTA buried, uneven split columns |
| `HubPage` | Services, locations, brand/type hubs | header, hub intro, priority choices, guide grid, process, final CTA | choices are visible and directly clickable without extra panel friction | circles/cards misaligned, intro not centered, dead preview panels |
| `AppFlowPage` | Reserve, Find Booking, future customer utilities | header, secure intro, form panel, result/summary, support fallback | the task form starts within the first viewport | oversized editorial heading, form cropped below fold |
| `AdminPage` | Private CRM/content admin | private header, filters, list/detail split, action bar, notes/status | dense but readable management view | oversized elements, weak table/list hierarchy |

## Page Route Assignment

This is the initial route-to-pattern assignment for the current site.

| Route Family | Pattern | Reference Pages |
| --- | --- | --- |
| `/` | `MarketingLandingPage` | `site/index.html` |
| `/fleet.html` | `ListingPage` | `site/pages/core/fleet.html` |
| `/services.html` | `HubPage` | `site/pages/core/services.html` |
| `/locations.html` | `HubPage` | `site/pages/core/locations.html` |
| `/about.html` | `MarketingLandingPage` or `HubPage` | Decide during Phase 1 |
| `/contact.html` | `AppFlowPage` with marketing support | Decide during Phase 1 |
| `/reservation-lookup.html` | `AppFlowPage` | `site/pages/core/reservation-lookup.html` |
| `/app/reserve/page.html` | `AppFlowPage` | reserve flow |
| brand pages | `HubPage` or `DetailPage` hybrid | Lamborghini, Ferrari, Mercedes, Porsche, Rolls-Royce |
| vehicle pages | `DetailPage` | Huracan, Urus, Ferrari 296, G63, GT3, Cullinan |
| service detail pages | `DetailPage` | chauffeur, airport, delivery, wedding, business, monthly |
| guide pages | `MarketingLandingPage` or `HubPage` | Dubai, Abu Dhabi, Airport, Palm, Marina, Supercar |

## Component Matrix

Each component family needs one source of truth. Variants are allowed; new
families are not allowed without review.

| Component | Canonical Family | Variants | Must Keep | Audit Checks |
| --- | --- | --- | --- | --- |
| Header | `GlobalHeader` / `.site-header` migrating to `.dp-header` | public, drawer, admin | same logo, spacing, height, dropdown surface | height delta, nav signature, dropdown color |
| Button | `.dp-button` | primary, secondary, ghost, call, WhatsApp, danger | min height, centered label, token colors | unknown class, tap target, contrast |
| CTA Group | `.dp-cta-group` | horizontal, stacked, split contact bar | hierarchy: one dominant action | CTA overload, unequal width |
| Card | `.dp-card` | vehicle, service, guide, feature, booking, result | radius, padding, title/body/action order | radius/padding drift |
| Fleet Card | `.dp-card--vehicle` | desktop, mobile | price, main view CTA, call/WhatsApp actions | contact bar width, CTA dominance |
| Service Choice | `.dp-service-choice` | circle, card | direct click behavior, no redundant preview panel | indirect click friction |
| Hero | `.dp-hero` | home, listing, detail, hub, form | one headline, strong overlay, clear next step | fold depth, text balance |
| Date Planner | `.dp-date-planner` | home, fleet, reserve | aligned controls, valid date state | stale dates, label/control alignment |
| Form Panel | `.dp-form-panel` | reserve, lookup, contact, admin | readable fields, safe errors, same control height | cropped first view, technical errors |
| Floating Contact | `.dp-floating-actions` | public, reserve | fixed rhythm, no content obstruction | overlap ratio, viewport bounds |
| Trust Strip | `.dp-trust-strip` | chips, stats, badges | useful proof without overpowering CTA | chip clutter |
| FAQ | `.dp-faq` | simple, rich answer | consistent question/answer rhythm | heading hierarchy |

## Typography Matrix

Typography should be consistent by role, not by page mood.

| Role | Token | Usage | Guardrail |
| --- | --- | --- | --- |
| Display headline | `--dp-font-display` | hero H1, major editorial titles | max two display blocks in first viewport |
| Body/UI | `--dp-font-sans` | paragraphs, nav, forms, cards, CTAs | default for most text |
| Editorial serif | `--dp-font-serif` | selected luxury storytelling sections | not for forms/nav/buttons |
| Kicker/label | sans uppercase tracking | section labels, card labels | readable contrast, no tiny grey on white |
| Price/metric | sans or display numeric style | vehicle price, stats | strong contrast, consistent units |
| Error/help | sans | validation and support states | human language, no technical internals |

Audit checks:

- font family drift by route group
- title scale outside expected viewport range
- body copy too pale on light backgrounds
- uppercase labels below readable size
- inconsistent CTA typography

## Spacing And Geometry Matrix

This is where homogeneity becomes measurable.

| Geometry Rule | Target | Failure Example |
| --- | --- | --- |
| Shared frame alignment | left/right delta max 10px | intro text starts wider than cards below |
| Row top alignment | max 8px delta | two desktop panels start at visibly different heights |
| Row bottom alignment | max 12px delta | card row looks jagged without intent |
| Horizontal overflow | max 2px | laptop shows bottom scrollbar |
| Primary task depth | starts before 82% viewport height on task pages | Find Booking form cropped below fold |
| CTA target size | min 44px height | mobile buttons too short or cramped |
| Floating overlap | max 12% of important element | WhatsApp button covers date/filter/card CTA |
| Text contrast | WCAG 4.5:1 normal, 3:1 large | pale grey text on white |
| Card internal padding | tokenized per variant | buttons touch card edge |
| Section spacing | tokenized scale | random giant gaps or cramped content |

## Audit Matrix

The auditors should produce findings that map to this matrix.

| Auditor | What It Owns | Must Detect | Output |
| --- | --- | --- | --- |
| Homogeneity auditor | cross-page consistency | header drift, font drift, dropdown drift, pattern mismatch | page/component findings |
| Visual auditor | human visual quality | first viewport balance, contrast, alignment, overlap, card rhythm | screenshots plus severity |
| Functional auditor | user flows | buttons go to right destination, back returns correctly, forms persist where intended | route/action evidence |
| SEO auditor | indexability and SERP trust | titles, descriptions, canonicals, schema, internal links, content intent | SEO report |
| Cleanup auditor | repo hygiene | orphan files, unclassified docs/scripts, root clutter, stale assets | cleanup report |

Recommended new audit modes:

- `npm run audit:homogeneity:layouts`: page pattern and slot geometry.
- `npm run audit:homogeneity:components`: component family and variant contracts.
- `npm run audit:visual:first-viewport`: viewport-first visual pass for mobile, tablet, laptop and desktop.

## Severity Model

High severity:

- header changes family between pages
- text/background contrast makes content hard to read
- horizontal scroll appears on common laptop/mobile sizes
- first viewport hides the primary task on task pages
- CTA or contact button overlaps important content
- booking/reserve button is visually broken or impossible to tap

Medium severity:

- cards use different radius/padding/CTA rhythm across similar pages
- dropdown menu changes visual style between routes
- typography scale differs enough to make pages feel unrelated
- desktop split blocks are visibly misaligned
- repeated sections use similar content but different structure

Low severity:

- small naming inconsistency
- minor spacing drift that does not harm comprehension
- legacy class still present behind a correct visual alias

## Implementation Phases

### Phase 0: Freeze The Map

Goal:

- agree page pattern assignment
- agree component families and variants
- agree what exceptions are allowed

Deliverables:

- this matrix approved
- one route-to-pattern manifest
- one component manifest

### Phase 1: Header, Tokens And Typography

Goal:

- every public page uses the same header behavior
- no page feels like a different brand because of fonts or colors

Work:

- lock `brand-tokens.css`
- define/normalize header classes
- enforce typography roles
- remove random pale grey text and whitewashed dark-premium surfaces

Validation:

- `npm run agent:homogeneity`
- `npm run audit:homogeneity:headers`
- `npm run test:visual`

### Phase 2: Buttons, CTA Groups And Floating Actions

Goal:

- every button has a known role and visual hierarchy
- WhatsApp/call are consistent and never obstruct content

Work:

- add or complete `dp-button` aliases
- normalize split contact bars
- normalize floating contact rhythm
- enforce mobile stacked CTA rules

Validation:

- component contract audit
- visual scan on home, fleet, reserve, contact, services
- functional click checks for Call, WhatsApp, Email, Reserve and Find Booking

### Phase 3: Cards And Listing Rhythm

Goal:

- fleet cards, service cards and guide cards feel related
- desktop rows align; mobile cards breathe

Work:

- normalize `dp-card` base
- migrate vehicle, guide and service variants
- align price/contact/action areas
- keep mobile card action groups vertical and readable

Validation:

- fleet mobile and desktop screenshots
- component contract audit
- functional reserve handoff from every vehicle card

### Phase 4: Page Templates And First Viewports

Goal:

- every page starts with a clear, professional first viewport
- page patterns define slot order and layout distribution

Work:

- normalize Home, Fleet, Services, Locations, Contact, Reserve and Lookup first
- then brand, vehicle, service detail and guide pages
- document any intentional exceptions

Validation:

- first viewport audit across mobile, tablet, laptop, desktop
- no horizontal overflow
- primary task visible on task pages

### Phase 5: Copy And Trust Layer

Goal:

- text feels premium, safe and operationally clear across the whole site

Work:

- normalize CTAs
- improve validation/error text
- clarify payment, handover, WhatsApp and data safety
- remove technical language from customer-facing surfaces

Validation:

- `npm run audit:copy`
- manual review of reserve, lookup, contact and CRM emails

### Phase 6: Final Regression Memory

Goal:

- once visually approved, auditors remember the approved state

Work:

- approve visual baselines only after human review
- approve functional memory only after real journeys pass
- keep reports in current docs; archive old evidence

Validation:

- `npm run audit:quick`
- `npm run audit:strict`
- final manual pass before production

## Agent Working Rules

Functional agent:

- may report and test flows
- should not change CSS or layout
- should produce action evidence and broken-flow reports

Visual agent:

- may change CSS/HTML for visual consistency only inside agreed visual scopes
- must not alter APIs, reservation logic, payment logic or storage
- must validate mobile, tablet, laptop and desktop when changing layouts

Integrator:

- reviews reports from both agents
- owns risky structural changes
- resolves conflicts
- runs final validation before merge

If two agents need to edit the same file family, stop and split by route or by
component before continuing.

## Tomorrow Review Checklist

Use this checklist before starting implementation phases:

- Is the route-to-pattern assignment correct?
- Which page is the best reference for each pattern?
- Are Home and Services still the approved header/hero references?
- Which button/card families should be migrated first?
- Do we accept `dp-components.css` as the next shared CSS layer?
- Which pages are Phase 1 critical: Home, Fleet, Services, Reserve, Lookup?
- Which old docs should be archived after the new matrix is approved?
