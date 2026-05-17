# CRM Data and AI Roadmap

Goal: make the reservations CRM useful for operations today and clean enough
to support AI assistance later without training on messy or unsafe data.

## Principle

Do not start with a custom model. Start with reliable business data:

- Who the client is.
- What they wanted.
- Where they came from.
- What the team did next.
- Whether the reservation was won, lost, paid, canceled or delivered.
- Why it ended that way.

AI should first assist the team with summaries, triage and recommendations.
Custom model training only makes sense after the CRM has enough labeled,
high-quality historical data.

## Data Layer Added

PostgreSQL now keeps the existing `reservations` table and adds CRM-ready
shadow tables:

| Table | Purpose |
| --- | --- |
| `crm_customers` | Stable customer identity built from normalized email, phone or Stripe customer. |
| `crm_reservation_intelligence` | Clean operational classification per reservation. |
| `crm_interaction_events` | Deterministic system events that create the start of a timeline. |

The reservation row remains the source of truth. The CRM tables are derived
from it on every `saveReservationRecord` call, so old flows keep working.

## Current Classifications

Each reservation is mapped into separate operational dimensions:

| Dimension | Examples |
| --- | --- |
| `lead_stage` | `new`, `qualified`, `payment_pending`, `recovery`, `booked`, `lost`, `closed`, `review` |
| `payment_status` | `not_started`, `checkout_started`, `intent_created`, `requires_action`, `deposit_paid`, `failed` |
| `handover_status` | `not_ready`, `to_schedule`, `completed` |
| `reservation_status` | `active`, `canceled`, `archived` |

This is intentional. A lead can be active, payment can be pending and handover
can be not ready at the same time. One single status cannot explain that cleanly.

## Data Quality Score

Every reservation gets a CRM data-quality profile:

- Customer name.
- Customer email.
- Customer phone.
- Vehicle.
- Start date.
- End date.
- Pickup time.
- Return time.
- Pickup location.
- Total amount.

The CRM readiness panel exposes:

- Customer count.
- AI-ready reservation count.
- Average data-quality score.

This helps operations see whether the CRM is becoming a useful dataset or only
a pile of incomplete bookings.

## Attribution Captured

Checkout now sends non-card, non-password context:

- Page path.
- Landing URL.
- Referrer.
- UTM source, medium and campaign.
- Viewport.
- Browser language.
- Timezone.

This is used to understand demand and conversion. It must not be used to store
card data, passwords or private messages.

## Next Operational Fields To Add

These fields should become first-class CRM controls, not loose notes:

- Assigned owner.
- Next action date.
- Contact channel.
- Contact outcome.
- Quote sent date.
- Lost reason.
- Cancel reason category.
- Handover issue category.
- Client segment: tourist, resident, corporate, hotel/villa, repeat, VIP.
- Passenger count and luggage count.
- Preferred service: self-drive, chauffeur, airport, delivery, monthly.
- Consent flags: contact, marketing, privacy accepted.

## AI Use Cases Worth Building First

1. Reservation summary for the team.
2. Daily priority list: who needs attention now.
3. WhatsApp draft by stage and client context.
4. Vehicle recommendation by passengers, route, luggage, occasion and budget.
5. Lead scoring once enough outcomes exist.
6. Risk detection: weak contact data, tight timing, payment issue, missing handover info.
7. Demand analytics by source, vehicle, service, value band and location.

## What Not To Do Yet

- Do not fine-tune a model on raw reservations.
- Do not feed passports, payment data or private notes into AI by default.
- Do not let AI send client messages without human approval.
- Do not treat generated summaries as truth unless they link back to CRM facts.

## Suggested Build Order

1. Make the CRM data layer visible and stable.
2. Add structured interaction logging and follow-up tasks.
3. Add outcome labels and loss/cancel reasons.
4. Add consent and retention controls.
5. Build AI summaries and WhatsApp drafts with human approval.
6. Build lead scoring only after enough labeled outcomes exist.
