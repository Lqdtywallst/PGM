# Premium Vehicle Page Template

Reference direction:
- Rotana Star Purosangue page: https://www.rotanastar.ae/en/cars/purosangue-2025-green

Goal:
- Keep the white background from the current PGM style.
- Make the page feel media-first and premium before the booking logic starts.
- Give every family and every car its own narrative instead of repeating the same copy model to model.

## Template system

The agreed system is:
- one common mother base
- one variant layer by vehicle type
- one final page per car

Initial family set:
- supercars
- premium SUVs
- ultra-luxury / chauffeur-led

What stays common:
- the real Home/App header component (`lab-header`)
- section order
- grid logic
- booking card structure
- FAQ structure
- related block structure
- SEO standards

What can vary by family:
- media tone
- headline rhythm
- use-case emphasis
- support section weighting
- related-car logic

## Mobile strategy

Use one hybrid responsive template, not a separate mobile template.

That means:
- the underlying page system stays the same
- the mobile layout adapts the first-screen order when needed
- mobile should optimize clarity and composition, not mimic the desktop composition at all costs

Mobile first-screen order:
- hero image
- vehicle identity
- compact support media rail
- summary and booking

The right rail should become a compact mobile support block, not a long stack that pushes the title too far down.

## Canonical section order

1. Site header
   - Must stay present on every vehicle page.
   - Reuse the real Home/App header component, not a simplified substitute.
   - The active top-level state on vehicle pages should be `Fleet`.
   - Do not keep or re-style the previous `site-header` / quick-CTA shell for this template system.
   - Keep brand, full navigation and the same interaction model used in the rest of the site.
   - Adapt its visual integration to the white premium system without changing the component identity.

2. Breadcrumb
   - Quiet, compact, left-aligned.
   - No hero copy above the gallery.

3. Top gallery
   - One dominant main image on the left.
   - One vertical right rail with three support stills and one "view more" tile.
   - All media aligned to one top edge and one bottom edge.
   - Video does not live in this first block.

4. Vehicle identity
   - Brand line.
   - Model name.
   - One short subline.
   - One short lead paragraph.
   - Four concise tags max.

5. Summary plus booking
   - Left top: one compact vehicle-facts grid with 3-4 high-signal details only, such as seats, powertrain, service tone or best fit.
   - Those facts should sit beside the booking panel, not far below it, so the first practical read feels compact and aligned.
   - Below those facts, the mother base keeps one lower support strip in the same left column so the layout ends with purpose instead of dead white space.
   - That strip should not repeat specs. It should carry premium booking-confidence content: handover logic, key rental terms and the bespoke / concierge layer.
   - If the booking column is still much taller, add one car-details block below the support strip with an interior image plus 3 useful notes about comfort, access, cockpit or luggage logic.
   - Every card needs one job only: explain a use case, clarify an operational term or reduce booking friction.
   - If a card exists only to complete the grid visually, remove it.
   - Right: sticky booking card with rate, trust tags, dates and CTA.
   - This is the first practical block after the car has already sold itself visually.
   - Do not duplicate those same facts again below the summary.
   - Do not turn that compact fact grid into a long spec dump in the mother template.

6. Narrative video block
   - Full-width or dominant-width block below the first operational layer.
   - In the mother base, prefer one dominant video, one secondary video and one visual support panel.
   - That support panel should help answer real questions fast: rear comfort, cockpit, luggage access, doors, roof operation or cabin tone.
   - Purpose-led footage only: arrival, drive tone, cockpit, resort handover, night movement.
   - Never use a random filler clip or a text-only card just to occupy the third slot.

7. Why this car works
   - Three cards max.
   - Each card explains a use case or guest type.
   - One clear reason per card. Keep the copy tight.
   - Copy must change from car to car.

8. Guest reviews
   - Use 2-3 short, model-specific reviews only if they are real.
   - They should confirm delivery quality, comfort, tone or ease.
   - Do not use fake star ratings or borrowed third-party review widgets.

9. FAQ
   - Short, direct, booking-led questions.
   - Use FAQ for UX and long-tail relevance, not because you expect FAQ rich results on a normal commercial site.

10. Related cars
   - Optional below FAQ if the page still feels clean.
   - Compare by intention, not only by brand.

## Media rules

- The first screen needs one hero still that can carry the whole page.
- The right rail needs real supporting media, not empty decoration.
- Do not repeat the same image unless it is genuinely the same shot for a functional reason.
- The fourth tile can act as the "view more" entry point.
- Video sits below the first summary block, not inside the right rail.

## Copy rules

- The first paragraph must explain the role of the car, not list specs.
- Specs support the sale; they do not lead it.
- Tone should feel precise, calm and expensive.
- Avoid generic supercar copy that could belong to any model.
- Card copy must be functional, not decorative.
- Good card topics: body style, best-for logic, delivery, insurance, mileage, deposit, handover or one premium service note.
- Avoid internal template language in live cards.
- The mother preview should stay as close as possible to a real user-facing page.
- Architecture notes, rollout logic and template explanations belong in docs, not in the visible page body.

## SEO non-negotiables

- Every live vehicle page needs a unique title tag, meta description, canonical and H1.
- The core query has to be explicit in the URL, title, description and opening copy.
- Copy must be unique per model. No cloned paragraphs across Ferrari, Lamborghini, Porsche or Rolls-Royce pages.
- Each page should include structured data relevant to the page type: Organization, WebSite, WebPage, Product, Service, FAQPage and BreadcrumbList where applicable.
- Hero image and support media need descriptive alt text tied to the exact car and rental intent.
- FAQ must answer real booking questions that also help search intent: price logic, delivery, documents, mileage, deposit and use case.
- Internal linking must connect the page to fleet, brand, intent and related-model pages with meaningful anchor text.
- The page has to stay fast: compressed media, lazy-loaded secondary images, restrained scripts and stable layout.
- Template preview files stay `noindex`; real model pages should be indexable only when the page is complete.
- "Perfect SEO" in practice means technical cleanliness, unique relevance, strong internal linking, clear entity signals and no thin duplicated content.

## Layout rules

- White page background stays.
- Max corner radius: 8px.
- Large media left / narrow media rail right.
- Booking card must align with the facts grid and stay visually steady.
- Mobile version stacks in this order: main image, media rail, title, facts, booking.

## Visual review criteria

These checks are mandatory before approving a template or a real car page.

### 1. Distribution

The page must feel ordered and intentional.

Check:
- visual hierarchy is clear and the eye knows where to enter first
- the main image has more weight than the right rail
- vertical starts and endings align cleanly
- spacing rhythm feels even, not cramped in one area and empty in another
- the booking card is visible without dominating the whole composition
- summary areas must not leave dead white space below microcards when the opposite column is still visually active
- the first screen reads as one composition, not as unrelated blocks pasted together

### 2. Perspective

The media must make the car feel premium, planted and controlled.

Check:
- the hero angle gives the car presence instead of flattening it
- the crop leaves enough breathing room around the vehicle
- the car does not feel too small, too close or awkwardly cut
- background lines, horizon and floor help the car feel stable
- the right rail supports the hero instead of competing with it
- the combined gallery feels curated, not random

### 3. First-screen evaluation checklist

Before approving a first screen, review these points:
- focus: the eye lands on the car first
- balance: left and right columns feel intentional
- alignment: gallery, title and booking blocks sit in a controlled grid
- rhythm: spacing between major blocks feels calm and premium
- crop quality: the car image feels expensive and well framed
- depth: the hero image has enough visual perspective
- cohesion: the whole first screen feels like one premium layout

## Working file

Mother base preview:
- `docs/previews/vehicle-template-base.html`

Current supercar variant preview:
- `docs/previews/vehicle-template-premium.html`

Current pilot using the same system:
- `site/ferrari-rental-dubai.html`
