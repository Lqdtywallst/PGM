# Fleet Card Mother Base

Goal:
- define one reusable mother card for all cars in `site/fleet.html`
- keep the existing visual language already present in the fleet
- keep the same structural logic, spacing rhythm, and CTA placement across the whole grid
- let each model change only its image, copy, specs, price, links, and slight tone

Source already in use:
- current card base: `site/fleet.html`
- current fleet card styles: `site/css/site-v2-fleet.css`
- current filtering logic: `site/js/site-v2-fleet.js`

Preview file:
- `docs/previews/fleet-card-preview.html`

## 1. Component logic

The fleet card should stay a single compact sales object, not become a mini vehicle page.

The card has one job:
- identify the car fast
- explain who it is best for
- show the entry price fast
- give one primary page CTA
- give two immediate contact actions

The base stays constant in all cases:
1. media
2. utility row
3. heading
4. body area
5. contact row

The body area keeps two logical zones:
- copy column
- booking column

In the current fleet grid, those zones can remain stacked vertically inside the card because the cards are narrow. The key is consistency of hierarchy, not forcing a side-by-side layout inside each card.

## 2. Non-negotiable structure

Every car card should keep this exact anatomy:

1. `media`
   - one image only
   - same crop logic
   - same aspect ratio

2. `utility row`
   - `badge`
   - `trust`

3. `heading`
   - `brand`
   - `accent`

4. `body`
   - `copy`
     - `title`
     - `description`
     - `salesLine`
     - `specs` with max 3 items
   - `booking`
     - `priceKicker`
     - `priceValue`
     - `priceNote`
     - `primaryCta`

5. `contact row`
   - `call`
   - `whatsapp`

## 3. Copy budgets

These limits keep the cards visually aligned and avoid dead space:

- `badge`: 2 to 4 words
- `trust`: 2 to 4 words
- `accent`: 2 to 5 words
- `title`: 1 line ideal, 2 lines max
- `description`: 1 short paragraph, around 18 to 30 words
- `salesLine`: 1 sentence, around 8 to 16 words, always use-case led
- `spec`: 1 to 2 words each, 3 items max
- `priceNote`: 2 to 4 words
- `primaryCta`: keep one common label across the fleet

Do:
- say what the car is for
- use real context such as airport arrivals, couples, long hotel stays, business movement, villa stays, or driver-first bookings

Do not:
- use filler luxury copy
- repeat the same idea in `description` and `salesLine`
- list specs in the paragraph
- let one model use a totally different sentence rhythm from the rest

## 4. Reusable HTML base

```html
<article
  class="fleet-card js-fleet-card"
  data-brand="lamborghini"
  data-type="convertible sports"
  data-price="3200"
  data-variant="experience-led"
>
  <a class="fleet-card__media" href="./lamborghini-rental-dubai.html">
    <img
      src="./images/fleet/lamborghini-huracan/01-exterior-front.png"
      alt="Lamborghini Huracan EVO Spyder in Dubai"
      loading="lazy"
    >
  </a>

  <div class="fleet-card__content">
    <div class="fleet-card__utility-row">
      <span class="fleet-card__badge">Open-air arrival</span>
      <span class="fleet-card__trust">Concierge handover</span>
    </div>

    <div class="fleet-card__heading">
      <span class="fleet-card__brand">Lamborghini</span>
      <span class="fleet-card__accent">V10 spyder</span>
    </div>

    <div class="fleet-card__body-grid">
      <div class="fleet-card__copy">
        <h3 class="fleet-card__title">
          <a href="./lamborghini-rental-dubai.html">Huracan EVO Spyder</a>
        </h3>

        <p class="fleet-card__description">
          Roof-down Lamborghini for short Dubai stays where the car needs to lead the memory from the first arrival.
        </p>

        <p class="fleet-card__sales-line">
          Best for Marina routes, couple stays and after-dark arrivals.
        </p>

        <div class="fleet-card__specs" aria-label="Vehicle highlights">
          <span class="fleet-card__spec">Convertible</span>
          <span class="fleet-card__spec">2 seats</span>
          <span class="fleet-card__spec">Short stays</span>
        </div>
      </div>

      <div class="fleet-card__booking">
        <div class="fleet-card__price-row">
          <div>
            <span class="fleet-card__price-kicker">From per day</span>
            <strong class="fleet-card__price-value">3,200 AED</strong>
          </div>
          <span class="fleet-card__price-note">Couple-led</span>
        </div>

        <a class="fleet-card__primary" href="./lamborghini-rental-dubai.html">
          More information
        </a>
      </div>
    </div>

    <div class="fleet-card__contact-row">
      <a class="fleet-card__secondary" href="tel:+971586122568">Call</a>
      <a
        class="fleet-card__secondary fleet-card__secondary--wa"
        href="https://wa.me/971586122568?text=Hi%2C%20I%27m%20interested%20in%20the%20Lamborghini%20Huracan%20EVO%20Spyder%20in%20Dubai."
        target="_blank"
        rel="noopener"
      >
        WhatsApp
      </a>
    </div>
  </div>
</article>
```

## 5. Dataset shape per car

Use one normalized object per model.

```json
{
  "id": "lamborghini-huracan-evo-spyder",
  "variant": "experience-led",
  "filters": {
    "brand": "lamborghini",
    "type": ["convertible", "sports"],
    "pricePerDay": 3200
  },
  "media": {
    "href": "./lamborghini-rental-dubai.html",
    "src": "./images/fleet/lamborghini-huracan/01-exterior-front.png",
    "alt": "Lamborghini Huracan EVO Spyder in Dubai",
    "loading": "lazy"
  },
  "utility": {
    "badge": "Open-air arrival",
    "trust": "Concierge handover"
  },
  "heading": {
    "brand": "Lamborghini",
    "accent": "V10 spyder"
  },
  "copy": {
    "title": "Huracan EVO Spyder",
    "description": "Roof-down Lamborghini for short Dubai stays where the car needs to lead the memory from the first arrival.",
    "salesLine": "Best for Marina routes, couple stays and after-dark arrivals.",
    "specs": ["Convertible", "2 seats", "Short stays"]
  },
  "booking": {
    "priceKicker": "From per day",
    "priceValue": "3,200 AED",
    "priceValueRaw": 3200,
    "priceNote": "Couple-led",
    "primaryCta": {
      "label": "More information",
      "href": "./lamborghini-rental-dubai.html"
    }
  },
  "contact": {
    "call": {
      "label": "Call",
      "href": "tel:+971586122568"
    },
    "whatsapp": {
      "label": "WhatsApp",
      "href": "https://wa.me/971586122568?text=Hi%2C%20I%27m%20interested%20in%20the%20Lamborghini%20Huracan%20EVO%20Spyder%20in%20Dubai.",
      "target": "_blank",
      "rel": "noopener"
    }
  }
}
```

## 6. Required vs optional fields

Required:
- `id`
- `filters.brand`
- `filters.type`
- `filters.pricePerDay`
- `media.href`
- `media.src`
- `media.alt`
- `utility.badge`
- `utility.trust`
- `heading.brand`
- `heading.accent`
- `copy.title`
- `copy.description`
- `copy.salesLine`
- `copy.specs`
- `booking.priceKicker`
- `booking.priceValue`
- `booking.priceValueRaw`
- `booking.priceNote`
- `booking.primaryCta.label`
- `booking.primaryCta.href`
- `contact.call.href`
- `contact.whatsapp.href`

Optional:
- `variant`
- `media.loading`
- `contact.call.label`
- `contact.whatsapp.label`
- `contact.whatsapp.target`
- `contact.whatsapp.rel`

Rules:
- `copy.specs` must contain 1 to 3 items
- `filters.type` can be rendered as a space-joined string for current filtering logic
- `priceValueRaw` should stay numeric for sort/filter support
- `priceValue` stays formatted for visible UI
- `priceNote` should always be present in the mother base because it helps stabilize the booking block rhythm

## 7. Small variants without breaking the base

These are copy and emphasis variants only. The HTML structure does not change.

### A. Experience-led

Best for:
- convertibles
- showpiece supercars
- short celebratory bookings

Tone:
- arrival-led
- visible
- social
- moment-driven

Spec angle:
- body style
- seats
- route or stay type

### B. Driver-led

Best for:
- Porsche-style performance cars
- cleaner enthusiast bookings

Tone:
- precise
- technical
- road-first
- less theatrical

Spec angle:
- body style
- seats
- driving character

### C. Premium utility-led

Best for:
- SUVs
- longer stays
- hotel, villa, airport, executive or family-friendly use cases

Tone:
- access
- comfort
- luggage logic
- service fit

Spec angle:
- cabin capacity
- luggage or access
- stay pattern

## 8. Fleet-wide repetition rules

To repeat this across the whole fleet:

1. Keep the same class structure for every card.
2. Keep the same DOM order for every card.
3. Keep the same CTA label for every card.
4. Keep the same contact row for every card.
5. Keep one image only in the media area.
6. Keep one description paragraph only.
7. Keep one sales line only.
8. Keep max 3 specs only.
9. Keep the booking block in the same position.
10. Keep the badge, trust, accent, and price note short.
11. Do not add extra metadata rows or support blocks inside a single card.
12. Do not let any single model introduce a different internal layout.

## 9. Practical implementation note

If the current fleet card is refined later in live files:
- preserve `js-fleet-card`
- preserve `data-brand`
- preserve `data-type`
- preserve `data-price`
- preserve the same contact-row pattern

That keeps the existing filtering and sorting behavior intact while making the content model reusable.
