# Design System Component Inventory

Date: 2026-05-10

Scope: technical homogeneity inventory only. No production CSS, JS, HTML, data, package, or generated artifact was modified.

## Sources Reviewed

- `site/**/*.html`: public pages, reserve shell page, brand landings, vehicle PDPs, service detail pages, local guide pages, legal pages.
- `site/css/**/*.css`: global `site-v2.css`, cohort CSS files, reserve CSS, SEO landing CSS, admin overrides, preview CSS.
- `server/data/*.json`: `global-header.json`, `fleet-cards.json`, `services-editor.json`, `locations-editor.json`, pricing/style/appearance data.
- `server/renderers/render-fleet-cards.js`: fleet card data-to-HTML renderer and validation contract.
- Relevant audit/tooling scripts: `scripts/audits/run-homogeneity-agent.js`, `scripts/audits/run-header-homogeneity-guard.js`, `scripts/audits/audit-inventory.js`, `server/audits/homogeneity-audit-core.js`, `server/design-system/design-system-contract.js`.

Note: I inspected audit scripts but did not execute scripts that write reports/screenshots, because the allowed write scope is this document only.

## Classification Key

- `canonical candidate`: best current source of truth for future consolidation.
- `alias/migratable`: visually or structurally close enough to migrate behind shared tokens/classes later.
- `risky duplicate`: similar purpose but independent CSS/markup creates drift risk.
- `page-specific exception`: intentionally scoped to a page/cohort; keep isolated unless a migration plan exists.

## Headers And Navigation

| Family | Current evidence | Classification | Notes |
| --- | --- | --- | --- |
| `lab-header`, `lab-brand`, `lab-nav`, `lab-reserve`, `lab-mobile-*` | Present across most public HTML; `server/data/global-header.json` defines utility links, nav items, mega panels and primary button; `server/renderers/render-global-header.js` normalizes and renders it. | canonical candidate | This is the strongest current component contract. `server/design-system/design-system-contract.js` explicitly expects `lab_mega_utility` header variants and the homogeneity guard compares header layout, surface, CTA, dropdowns and navigation shift. |
| `site-header`, `.header-brand` legacy fallback selectors | Used as fallback selectors in homogeneity tooling and reserve/admin overrides. | risky duplicate | Keep only as compatibility surface until all pages/components are confirmed on `lab-header`. Do not refactor blindly because tooling still probes it. |
| Header overrides in `admin-style-overrides.css`, `reserve-shell.css`, `reserve-page.css` | Multiple page-scoped overrides for header, panels, reserve CTA, utility links. | alias/migratable | Likely accumulated to stabilize visual drift. Good target for token extraction after visual guard is green across templates. |
| Mobile drawer/action bar `lab-mobile-drawer`, `lab-mobile-action-bar`, `lab-floating-*` | Shared names in `site-v2.css`; mobile nav policy in `design-system-contract.js`. | canonical candidate | Treat as part of header system, not independent CTAs. Fragile because it interacts with body state classes and floating contact/back controls. |

## Buttons And CTAs

| Family | Current evidence | Classification | Notes |
| --- | --- | --- | --- |
| Header primary CTA `lab-reserve` | Data-driven primary button from `global-header.json`; styled in `site-v2.css`, reserve shell and overrides. | canonical candidate | Best source for global top-nav primary action. Keep visually stable before migrating other CTAs. |
| Home hero CTA `hero-lab__cta`, `hero-lab__cta--primary`, `hero-lab__cta--secondary` | Home first viewport in `site/index.html`; styles in `site-v2.css`; admin override groups primary with `.btn-primary` and `vehicle-booking__submit`. | canonical candidate for dark hero CTA | This is first-viewport critical. Secondary action should stay visually de-emphasized per AGENTS rules. |
| Generic SEO landing buttons `.btn`, `.btn-primary`, `.btn-outline`, `.btn-ghost` | Defined in `seo-landing.css`; used by brand and vehicle pages. | alias/migratable | Can become an alias to shared button tokens, but vehicle/brand pages rely on SEO layout and booking forms. |
| Hub/reserve generic buttons `.btn`, `.btn-secondary`, `.btn-home` | `hub-pages.css` and `reserve-page.css` define their own button systems. | risky duplicate | Same class names have different context-specific meanings. Avoid global edits to `.btn` until namespace and cascade are audited. |
| Page-specific CTA families `about-button`, `contact-button`, `locations-button`, `services-button` | Defined in their page CSS files with primary/secondary/ghost variants. | alias/migratable | Structurally similar: inline-flex, uppercase/letter-spaced, primary plus ghost/secondary variants. Good low-risk candidates for token-level migration, not class renaming first. |
| Fleet card actions `fleet-card__primary`, `fleet-card__secondary`, `fleet-card__secondary--wa` | Rendered from `server/renderers/render-fleet-cards.js`; governed by mobile card action policy in `design-system-contract.js`. | canonical candidate for fleet cards | Renderer is a strong contract. Do not change mobile stacking/contact behavior without browser validation across required viewports. |
| Home visual fleet actions `fleet-visual-card__primary`, `fleet-visual-card__contact-link` | Home feature cards in `site-v2.css`. | risky duplicate | Purpose overlaps with fleet cards, but markup and visual treatment differ. Do not merge into fleet cards until card roles are separated. |
| Reserve booking actions `reserve-page-action`, `.step-navigation .btn`, `reserve-mobile-bar__primary/secondary` | Reserve page has its own booking flow CTA system. | page-specific exception | Booking state, validation, mobile sticky bar and step navigation make this high risk. |
| Floating contact actions `lab-floating-contact__button--call/--wa`, `hero-floating-actions__link` | Shared floating contact in `site-v2.css`; hero floating actions appear as separate family. | risky duplicate | Both represent contact affordances. Consolidate behavior/visibility later, not visual CSS first. |

## Cards

| Family | Current evidence | Classification | Notes |
| --- | --- | --- | --- |
| Fleet listing cards `fleet-card*` | `server/data/fleet-cards.json` drives content; `server/renderers/render-fleet-cards.js` validates required fields and renders card markup into `fleet.html`; styles in `site-v2-fleet.css`. | canonical candidate | Best card contract in repo. It has data, renderer, selectors, and audit policy coverage for mobile actions. |
| Home fleet visual cards `fleet-visual-card*` | Home showcase cards in `site-v2.css`. | risky duplicate | Similar vehicle/purchase intent to `fleet-card`, but visual storytelling card, not a listing card. Should not be merged without preserving first-viewport/home composition. |
| Header mega menu cards `lab-nav__card*` | Rendered from `global-header.json`; styled in `site-v2.css` and reserve shell. | canonical candidate | Keep as part of header navigation contract. Card count/shape is inspected by homogeneity tooling. |
| Vehicle booking cards `vehicle-booking*` | Used on brand/vehicle SEO pages; includes form fields and submit/secondary actions. | page-specific exception | Revenue-critical booking surface. It is close to forms/cards but tied to vehicle intent and SEO landing layout. |
| Vehicle PDP content cards `vehicle-pdp-gallery-card`, `vehicle-pdp-use__card`, `vehicle-pdp-panel`, `vehicle-pdp-review` | Large PDP family in `seo-landing.css`. | page-specific exception | Many variants support media/lightbox/story layouts. High visual and functional coupling. |
| Local guide cards `local-guide-*`, `route-guide-card` | Guide pages share `site-v2-local-guide.css`; data also appears in locations/services JSON as guide routes/cards. | alias/migratable | Good candidate for a shared editorial/card token layer after fleet/header are stabilized. |
| Service cards `services-lane-card`, `services-private-card`, `services-local-card`, `service-detail-*` panels | Services hub and detail pages use lane/direct selector cards and detail panels. | alias/migratable | Services hub first viewport has a special direct-lane policy; migrate detail/support cards later. |
| Location cards `location-card`, `locations-zone-card`, `locations-guide-card`, `locations-map-card` | Locations page and data-driven zones/guides. | alias/migratable | Similar editorial/action-card patterns to local guides, but map card is a separate exception. |
| Contact/form cards `contact-form-card`, `info-card`, `schedule-card`, `delivery-card`, `reservation-summary` | Contact and reserve forms use independent card shells. | risky duplicate | Similar panel/card role but different page states and form semantics. Tokenize radius/shadow/spacing before class migration. |
| Generic hub cards `hero-card`, `form-card`, `cta-card` in `hub-pages.css` | Legacy/generic hub page system. | risky duplicate | Broad class names and generic styles could collide. Treat as legacy until usage is confirmed. |

## Heroes And First Viewports

| Family | Current evidence | Classification | Notes |
| --- | --- | --- | --- |
| Home `hero-lab*` | `site/index.html` plus `site-v2.css`; includes intro state classes, video/still/overlay, launcher, overlay form. | canonical candidate for home only | Above-the-fold priority is highest. Do not generalize until intro states, overlay form and mobile breakpoints are locked. |
| Fleet `fleet-browser__hero*` and older `fleet-page-hero*` | `fleet.html` uses browser hero; class inventory still shows `fleet-page-hero`. | canonical candidate for fleet page; old family is risky duplicate | Keep `fleet-browser__hero` as current fleet hero. Audit/remove/alias `fleet-page-hero` only after confirming no active markup depends on it. |
| Services `services-hero*`, `services-lane-*` | Services landing has direct lane selector and first viewport policy in `design-system-contract.js`. | page-specific exception | It intentionally differs from generic hero to keep service selection useful above the fold. |
| Locations `locations-hero*` | Two-column hero/summary/zone list with specific alignment contract. | page-specific exception | Design contract has route-specific two-column alignment policy. |
| Contact/lookup `contact-hero*`, `lookup-hero*` | Reservation lookup reuses contact page body/CSS with lookup-specific hero selectors. | alias/migratable | Strong candidate for shared light hero panel tokens, but contact form placement is first-viewport sensitive. |
| About `about-hero*` | Dedicated about hero CSS and actions. | alias/migratable | Similar to other light/content heroes; lower risk than fleet/reserve once visual parity is documented. |
| Local guide `local-guide-hero*` | Six guide pages share one hero family. | canonical candidate for guide cohort | Already homogeneous within guide pages. Can be a model for service detail/locations editorial cards. |
| Service detail `service-detail-hero*` | Six service detail pages share one hero family. | canonical candidate for service detail cohort | Good cohort-level canonical, but not a global hero. |
| Brand landing `vehicle-hero*` | Brand pages use `seo-landing.css` and `vehicle-hero`. | canonical candidate for brand landing cohort | Cohort contract allows different fonts/radius. Keep separate from PDP hero. |
| Vehicle PDP `vehicle-pdp-hero-shell`, gallery/support booking composition | Vehicle PDP pages use gallery-first shell and booking support. | page-specific exception | It is highly specialized and fragile due to gallery, lightbox, booking and first viewport composition. |
| Reserve intro `reserve-page-intro*` | Reserve page uses intro grid/panel, not `*hero*` naming. | page-specific exception | Booking intent and mobile reveal policies are route-specific. |

## Forms

| Family | Current evidence | Classification | Notes |
| --- | --- | --- | --- |
| Contact form `contact-form-card`, `contact-form-grid`, `contact-form-field`, `contact-form-actions` | `site-v2-contact.css`; audited by `contact_form_filled` interaction policy. | canonical candidate for simple contact forms | Best candidate for a future shared form-field visual baseline outside booking flows. |
| Reserve flow form `.reserve-container`, `.form-group`, `.field-label`, `.input`, `.schedule-grid`, `.delivery-card`, `.info-grid` | `reserve-page.css`; governed by `reserve_booking_intent`. | page-specific exception | Multi-step, validation-heavy, mobile sticky summary/bar. Do not merge with contact form yet. |
| Vehicle booking form `vehicle-booking__form`, `vehicle-booking__field`, `vehicle-booking__input`, `vehicle-booking__submit` | `seo-landing.css` for brand/PDP pages. | risky duplicate | Similar to reserve/contact but revenue-critical and embedded in vehicle hero/booking panels. Migrate tokens only after booking behavior is tested. |
| Hero overlay form `hero-lab-overlay__form`, `hero-lab-overlay__input`, `hero-lab-overlay__submit` | Home overlay booking launcher in `site-v2.css`. | page-specific exception | Tied to home intro/overlay state and first viewport. |
| Generic hub forms `form-card` and `hub-pages.css` inputs/buttons | Generic, broad names. | risky duplicate | Avoid global `.form-card`/`.btn` edits until active route usage is known. |

## Grids And Layout Shells

| Family | Current evidence | Classification | Notes |
| --- | --- | --- | --- |
| `lab-shell` | Shared shell class used in header/hero/page sections. | canonical candidate | Keep as spacing/frame token source. Changes affect many first viewports. |
| Hero split grids `hero-grid`, `*_hero__shell`, `reserve-page-intro__grid`, `vehicle-pdp-summary-grid` | Multiple cohorts use two-column first-viewport grids. | alias/migratable | Good future abstraction at token/mixin level, but each route has different useful-content thresholds. |
| Fleet grids `fleet-results__list js-fleet-grid`, `fleet-catalog__grid`, `fleet-sidebar*` | Fleet listing, category/catalog and filter layout. | page-specific exception | Fleet grid is tied to filtering JS and mobile filter sheet. |
| Service grids `services-lane-grid`, `services-directory__layout`, `services-flow__list`, service detail grids | Services hub/detail CSS. | alias/migratable | Can share spacing/radius tokens with guide/location editorial grids. |
| Guide/location grids `local-guide-*`, `locations-guides__grid`, `locations-zone-grid`, `locations-operations__grid` | Editorial card grids across guide/location pages. | alias/migratable | Reasonable medium-risk consolidation after CTA/button tokens. |
| Vehicle PDP grids/gallery rails | `vehicle-pdp-gallery__grid`, `vehicle-pdp-gallery-top__rail`, summary grids. | page-specific exception | Lightbox/media/story coupling makes this fragile. |
| Reserve form grids `schedule-grid`, `info-grid`, `step2-layout` | Reserve booking flow. | page-specific exception | Keep isolated until the booking flow has dedicated visual regression coverage. |

## Canonical Candidates

- Global header/nav/drawer: `lab-header`, `lab-brand`, `lab-nav`, `lab-reserve`, `lab-mobile-*`.
- Home dark hero CTA style: `hero-lab__cta--primary/secondary` for dark first viewport use only.
- Fleet listing card contract: `fleet-card*` plus `server/data/fleet-cards.json` and `server/renderers/render-fleet-cards.js`.
- Header mega menu cards: `lab-nav__card*`.
- Contact form visual baseline: `contact-form-*` for non-booking forms.
- Cohort-level heroes: `local-guide-hero*`, `service-detail-hero*`, `vehicle-hero*` within their own cohorts.
- Shared frame tokens: `lab-shell` and existing design contract viewport matrix.

## Alias Or Migratable Families

- Page CTA aliases: `about-button`, `contact-button`, `locations-button`, `services-button`.
- SEO `.btn-primary/.btn-outline/.btn-ghost` once cascade is isolated.
- Contact/lookup light hero shell tokens.
- Guide, service-detail, locations editorial card and grid tokens.
- Header/reserve override declarations after homogeneity guard confirms no drift.

## Risky Duplicates

- Broad `.btn` and `.btn-secondary` definitions across `hub-pages.css`, `reserve-page.css`, and `seo-landing.css`.
- `fleet-card*` versus `fleet-visual-card*`: same domain, different component role.
- `site-header` fallback versus `lab-header`.
- `vehicle-booking*` versus reserve/contact forms.
- Floating contact families: `lab-floating-contact*` and `hero-floating-actions*`.
- Generic `hero-card`, `form-card`, `cta-card` from `hub-pages.css`.
- Old/current fleet hero naming: `fleet-page-hero*` versus `fleet-browser__hero*`.

## Page-Specific Exceptions

- Home `hero-lab*` intro, video, launcher and overlay form.
- Services landing direct-lane hero/selector.
- Locations two-column hero with zone summary/map-related surfaces.
- Reserve page intro, booking form, step navigation, mobile summary/bar.
- Vehicle PDP gallery/booking/lightbox composition.
- Vehicle booking cards/forms until booking behavior is covered end-to-end.
- Legal pages: mostly content surfaces; do not force marketing hero/cards onto them.

## Suggested Low-Risk Migration Order

1. Document and freeze canonical names/tokens without changing markup: header/nav, fleet card, contact form, page CTA variants.
2. Normalize design tokens only: colors, radius ranges, typography scale, focus states and button heights across `about-button`, `contact-button`, `locations-button`, `services-button`.
3. Create alias mapping for page CTA families to a shared semantic model: primary, secondary/ghost, WhatsApp/contact. Keep existing class names during this step.
4. Consolidate non-booking form field tokens using contact form as baseline. Exclude reserve and vehicle booking forms.
5. Align guide/service/location editorial card tokens: radius, border, surface, action row spacing. Do not merge map/media/gallery variants.
6. Reduce header overrides after running header homogeneity guard across desktop-wide, desktop-standard, laptop, tablet-portrait and mobile-modern.
7. Evaluate fleet visual/home cards separately from fleet listing cards. Migrate only shared tokens, not markup.
8. Only after visual regression coverage is green, consider class-level migrations for broad `.btn`, old fleet hero names, and legacy `site-header` fallbacks.

## Do Not Touch Yet

- `site/css/reserve-page.css` booking flow CTAs, form fields, sticky/mobile summary and step navigation.
- `vehicle-pdp-*` gallery, lightbox, booking panel and hero shell in `seo-landing.css`.
- `server/renderers/render-fleet-cards.js` output structure and `fleet-card__contact-row` behavior without full mobile card validation.
- `server/renderers/render-global-header.js`, `server/data/global-header.json`, and `lab-nav__panel` markup without header guard plus dropdown screenshots.
- Home `hero-lab*` intro/launcher/overlay states, because it owns the highest-priority above-the-fold experience.
- Broad `.btn` selectors in `hub-pages.css`, `reserve-page.css`, and `seo-landing.css` until cascade ownership is mapped.
- `admin-style-overrides.css` header/card/button overrides until each override is traced to a specific current visual defect or editor requirement.
- Mobile drawer and floating contact/back controls, because body state classes can alter overlap with cards, filters and booking bars.

## Verification Notes

- Static inspection was performed with read-only searches and file reads.
- I did not run Playwright, Lighthouse, audit_engine or the homogeneity scripts because their normal workflows can create artifacts outside the allowed write scope.
- Before any future production CSS/HTML migration, validate at minimum: mobile, tablet, laptop, large desktop; include first viewport and mobile card/contact action checks.
