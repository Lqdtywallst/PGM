# Homogeneity Rollout Roadmap

Last updated: 2026-05-13

## Purpose

This roadmap keeps the remaining Dynasty Prestige work focused on one goal:
every page can have its own content, but it must feel like the same premium
brand system.

The rollout must protect:

- first viewport quality
- shared header and frame width
- typography discipline
- button and card consistency
- image/video intent
- responsive behaviour on mobile, tablet, laptop and desktop
- functional booking, filtering, contact and navigation flows

## Current State

Done:

- `staging` is aligned with the remote branch.
- Old agent branches and worktrees were removed.
- Active worktrees remain for vehicle, brand and services work.
- Global audit rules exist in `docs/design-system/page-audit-rules.md`.
- Brand tokens exist in `site/css/brand-tokens.css`.
- The first vehicle mother pilot exists on the Huracan page.
- Brand and service mother agents completed local font-stability work in their own worktrees.
- Brand homogeneity and copy usefulness rules are documented.

Open:

- Vehicle mother first viewport needs final human approval before rollout.
- Brand mother pages need review, commit and merge before rollout.
- Service mother pages need review, commit and merge before rollout.
- Image and video usage needs a final placement matrix.
- All real pages need one consistent page-family pass.

## Execution Branch Map

Use one stable integration branch and short-lived work branches.

| Role | Worktree | Branch | Port | Owns |
| --- | --- | --- | --- | --- |
| Integration | `PGM` | `staging` | 8080 when integrating | reviewed, merged, shippable work only |
| Vehicle rollout | `PGM-vehicle-mother` | `work/vehicle-mother` | 8080 before merge | vehicle individual mother and rollout |
| Brand rollout | `PGM-brand-mother` | `agent/brand-mother-landing` | 8085 | brand mother and all brand pages |
| Services rollout | `PGM-services-mother` | `agent/services-mother-landing` | 8086 | services hub/detail pages |
| Backend | `PGM-backend` | `feature/reservations-backend` | 3000 | CRM, reservation storage and backend APIs |

Rules:

- `staging` is the source of truth.
- Agents never edit `staging` directly.
- Merge one branch at a time into `staging`.
- After every merge, update all active worktrees from the new `staging`.
- Do not start image replacement until the page templates are stable.
- Every agent must leave a report with changed files, URLs, viewport checks and remaining risks.

## Next Integration Order

1. Review and commit `work/vehicle-mother`.
2. Merge `work/vehicle-mother` into `staging`.
3. Review and commit `agent/brand-mother-landing`.
4. Merge brand work into `staging`.
5. Review and commit `agent/services-mother-landing`.
6. Merge services work into `staging`.
7. Push `staging`.
8. Rebase or recreate active agent branches from updated `staging`.

Validation after each merge:

- `git diff --check`
- `npm run audit:homogeneity:templates`
- `npm run audit:homogeneity:typography` when available
- targeted Playwright pass on mobile, tablet, laptop and desktop
- manual first-viewport screenshot review

## Non-Negotiable Rules

- The first viewport is the most important area.
- Header and page content must share the same frame logic.
- Parallel desktop blocks must align top and bottom unless documented.
- Mobile layouts can change structure, but cannot become cramped or oversized.
- CTAs must be clear, uppercase and visually ranked.
- Floating call and WhatsApp actions must never cover key content.
- Vehicle cards do not need duplicate call/WhatsApp actions when floating actions are present.
- Copy must stay premium English, precise and useful.
- SEO sections must earn their space; no filler content.

## Phase 1 - Vehicle Mother Landing

Status: active

Goal:

- Approve one mother layout for individual car pages.

First viewport target:

- left side: large vehicle image with supporting thumbnails
- right side: title, rate, date/time availability panel
- below the availability panel: compact vehicle characteristics in cards
- floating phone and WhatsApp stay in the lower right corner
- no duplicate contact buttons inside the vehicle card area
- the whole composition aligns to the header frame

Validation:

- mobile: 360x700 and 390x844
- tablet: 768x1024
- laptop: 1366x768
- desktop: 1440x900 and 1920x1080
- no horizontal overflow
- no giant text
- first task visible above the fold

Deliverable:

- approved Huracan pilot page
- reusable rules for the rest of the vehicle pages

Rollout pages:

- `lamborghini-huracan-evo-spyder-rental-dubai.html`
- `lamborghini-urus-rental-dubai.html`
- `ferrari-296-gts-rental-dubai.html`
- `mercedes-g63-amg-rental-dubai.html`
- `porsche-992-gt3-rental-dubai.html`
- `rolls-royce-cullinan-black-badge-rental-dubai.html`

Do not rollout until the Huracan pilot is approved.

## Phase 2 - Brand Mother Landing

Status: next

Goal:

- Brand pages start with the cars of that brand, then explain the brand.

Structure:

- header
- concise brand hero
- model cards visible early
- short brand explanation and SEO value below
- related internal links only where useful

Validation:

- Lamborghini first, then Ferrari, Porsche, Mercedes and Rolls-Royce.

Rollout pages:

- `lamborghini-rental-dubai.html`
- `ferrari-rental-dubai.html`
- `mercedes-rental-dubai.html`
- `porsche-rental-dubai.html`
- `rolls-royce-rental-dubai.html`

## Phase 3 - Services Mother Landing

Status: next

Goal:

- Service pages feel like the same brand system while staying task-led.

Structure:

- first viewport must explain the service and expose the next action quickly
- service choice cards/buttons should occupy meaningful space, not tiny dots
- image backgrounds use Home-level overlay discipline
- mobile service choices must remain tappable and not hidden by floating contact

Validation:

- services index
- airport concierge
- chauffeur
- delivery
- monthly
- event/wedding pages

Rollout pages:

- `services.html`
- `airport-concierge-dubai.html`
- `chauffeur-service-dubai.html`
- `hotel-villa-airport-delivery-dubai.html`
- `monthly-luxury-car-rental-dubai.html`
- `wedding-event-car-rental-dubai.html`
- `business-car-rental-dubai.html`

## Phase 4 - Image And Video Matrix

Status: next

Goal:

- Decide what visual asset type belongs to each page family.

Rules:

- Home: atmosphere and brand promise.
- Fleet: clear model recognition and comparison, with the top image allowed to fade to mid-page like the current Fleet treatment when it improves hierarchy.
- Vehicle landing: model-specific exterior, interior and detail stills.
- Vehicle lower SEO: useful motion/video only when it explains the car.
- Brand landing: brand/model cards first, lifestyle secondary.
- Services: service context, not random car glamour; background image treatment should follow the Home/Fleet overlay discipline when readable.
- Locations: area/handover context.

Image consistency rules:

- Reuse the Fleet half-fade image treatment for image-led pages only when it supports the first task.
- Every image must have a role: atmosphere, model recognition, interior proof, service context, location context or SEO explanation.
- Avoid random car glamour if it does not support the page intent.
- Do not change image sets before the mother layout for that page family is approved.
- Keep image tone consistent: premium, controlled contrast, not oversaturated, not washed out.

Deliverable:

- final image matrix for page family, asset role, ratio, tone and reuse rules.

## Phase 5 - Rollout To Real Pages

Status: later

Order:

1. Huracan pilot approval.
2. Remaining individual vehicle pages.
3. Lamborghini brand page.
4. Remaining brand pages.
5. Services pages.
6. Locations/guides.
7. Home polish pass.
8. Fleet polish pass.

Every rollout page must pass:

- header consistency
- frame consistency
- typography consistency
- CTA hierarchy
- mobile/tablet/laptop/desktop visual check
- functional navigation check
- SEO metadata/schema/internal links check

## Phase 6 - Final Release Gate

Status: later

Run before merging to production:

- `npm run test:visual`
- `npm run audit:homogeneity:templates`
- relevant functional reservation/contact audits
- manual browser pass on mobile, tablet, laptop and desktop

Release is not ready if:

- first viewport feels cluttered
- header changes between pages
- text contrast is weak
- filter/date/reserve interactions break
- vehicle/media cards feel from different websites
- SEO content is duplicated or filler
