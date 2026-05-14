# Full Site Copy Audit

Date: 2026-05-14

## Scope

This audit covers the public website copy end to end: homepage, Fleet, Services, Locations, Contact, About, Find Booking, Reserve, brand landings, vehicle landings, service landings, location guides, legal pages, visible CTAs, SEO metadata, WhatsApp labels, form microcopy, reservation lookup messages and transactional reservation copy risk.

Private admin documentation and developer-only setup text are not customer-facing, but they are still mentioned when they create risk for future copy leakage.

## Checks Run

- `npm run audit:copy`: pass, 42 files scanned, no remaining automated copy risks.
- `npm run audit:seo`: pass, average score 90/100, 0 critical, 0 high, 45 medium, 47 low.
- Manual extraction of page titles, meta descriptions, H1s, visible word count, long paragraphs and repeated terms across all public HTML pages.

## Immediate Fixes Applied

- Fleet CTAs changed from generic `More information` to model-specific labels such as `View Huracan EVO Spyder` and `View Ferrari 296 GTS`.
- Copy auditor now detects `More information` as a generic CTA risk.
- Fleet fallback renderer now uses `View details` instead of `More information`.
- Replaced `Ultimate arrival tone` with `Flagship arrival tone`.
- Home meta description shortened and made more direct.
- Reserve title and meta description made clearer and more SEO-safe.
- Lamborghini brand metadata shortened and removed the unsafe `free Dubai delivery` promise.
- Rolls-Royce metadata shortened and made more direct.

## Main Findings

### 1. SEO exists, but some pages are too heavy

The strongest risk is not missing SEO. The risk is SEO density becoming tiring. Location guides are around 875-956 visible words and service landings are around 753-838 visible words. That can rank, but only if the page keeps the useful action path clear.

Priority pages:
- `site/pages/guides/dubai-airport-luxury-car-rental.html`: 956 words, 8 uses of `best`.
- `site/pages/guides/dubai-marina-luxury-car-rental.html`: 949 words, 9 uses of `best`.
- `site/pages/guides/palm-jumeirah-luxury-car-rental.html`: 931 words, 9 uses of `best`.
- `site/pages/guides/abu-dhabi-luxury-car-rental.html`: 928 words, 8 uses of `best`.
- `site/pages/guides/luxury-car-rental-dubai.html`: 875 words, 7 uses of `best`.

Rule: keep SEO, but make each block earn its place with a real route, guest-fit, handover, pricing or booking decision.

### 2. Brand words are overused in some areas

`Luxury`, `premium`, `best` and `VIP` appear naturally for SEO, but repeated too often they start to feel like padding. The copy should sound confident because it explains the operating model, not because it repeats luxury language.

Priority examples:
- `site/pages/core/about.html`: 723 words, 9 uses of `premium`, 6 of `luxury`.
- `site/pages/brands/rolls-royce-rental-dubai.html`: 5 uses of `VIP` in a short brand page.
- Location guides repeat `best` 7-9 times each.

Rewrite direction: replace repeated claims with concrete terms such as `hotel handover`, `villa delivery`, `flight-led timing`, `luggage profile`, `guest schedule`, `return window`, `WhatsApp confirmation`.

### 3. Metadata still has a backlog

SEO gate passes, but the SEO report still flags medium metadata issues, mainly long titles and descriptions in location guides and some brand pages.

Priority metadata backlog:
- Abu Dhabi guide title and description are long.
- Dubai Airport guide title and description are long.
- Palm Jumeirah guide title and description are long.
- Dubai Marina guide title and description are long.
- Ferrari brand description is slightly long.

Target: 30-68 characters for titles where possible, 70-170 characters for descriptions, no keyword stuffing.

### 4. First viewport copy is mostly improved, but should stay strict

The homepage, Fleet, Services, Locations, Reserve, Find Booking and Contact have clearer first-view intent than before. The rule now should be: no paragraph above the fold unless it helps the user decide the next action.

Good patterns:
- `Dubai luxury, delivered.`
- `Choose your rental dates.`
- `Talk to the booking team.`
- `Find your reservation.`

Needs caution:
- Long H1s in guide pages and service pages can feel heavy on mobile.
- About page must avoid sounding like a manifesto; it should explain trust, process and operating standards.

### 5. Transactional and error copy is safer than before

Reservation lookup and reserve flow customer-facing messages are generally safe: they avoid backend object names and give a WhatsApp recovery path. Keep this rule locked: customers should never see `PaymentIntent`, `server logs`, `backend URL`, `client_secret`, stack traces or raw Stripe language.

Next review should include rendered emails line by line, because emails are often where technical or duplicated language sneaks in.

## Rewrite Plan

### Phase 1: Quick Public Cleanup

- Finish metadata tightening for the flagged guide and brand pages.
- Remove remaining generic or weak CTA patterns from docs/templates that can leak into regenerated pages.
- Normalize `best` overuse in location guides.
- Add alt text backlog to the image audit because SEO shows missing alt text as the biggest pressure.

### Phase 2: Page Family Rewrites

- Core pages: Home, Fleet, Services, Locations, Contact, About, Find Booking, Reserve.
- Vehicle pages: one mother copy pattern, then six vehicle pages.
- Brand pages: one mother copy pattern, then Lamborghini, Ferrari, Mercedes, Porsche, Rolls-Royce.
- Service pages: one mother copy pattern, then six service pages.
- Location guides: keep SEO depth, but make sections shorter and more scannable.

### Phase 3: Transactional Copy

- Reservation flow states.
- Availability messages.
- Contact form success/failure.
- Reservation lookup success/failure.
- WhatsApp prefilled messages.
- Customer confirmation email.
- Internal booking email.

## Copy Contract Going Forward

- H1: specific, short enough to work on mobile, not stuffed with every keyword.
- Lead: one idea, maximum two lines where possible.
- CTA: action-specific and uppercase in UI.
- Paragraphs: no generic luxury filler; one practical insight per paragraph.
- SEO sections: useful, not repetitive; if a paragraph could appear on any luxury rental website, rewrite it.
- Claims: coordinate, confirm, plan, support. Avoid guaranteed, ultimate, flawless or free unless operationally verified.
- Tone: premium English, direct, calm and operational.
