# Test Plan

## Main Areas

- Home
- Fleet
- Services
- Locations
- About
- Contact
- Reserve flow
- Core SEO landings

## Top-Level Navigation

- Home: `/`
- Fleet: `/fleet.html`
- Services: `/services.html`
- Locations: `/locations.html`
- About Us: `/about.html`
- Contact: `/contact.html`

## Critical Flows

1. Open the homepage and confirm the hero loads with one visible H1 and one dominant CTA.
2. Open each top-level navigation route and confirm the main heading is visible.
3. Fill the home booking form, choose dates and times, and confirm the fleet page receives the schedule.
4. Open the contact page, submit the form with demo data, and confirm a success status appears.
5. Open the reserve page with query params and confirm the selected car, price, dates and times are prefilled.

## Customer Journeys

1. Browse the main tabs from the homepage, then open a brand page from the Cars Brands mega menu.
2. Compare Ferrari and Mercedes options from the fleet filters, keep the chosen dates, and open the reserve flow.
3. Start from a brand page, open a vehicle detail page, choose dates there, and confirm the reserve page inherits the car and schedule.
4. Complete the full reserve flow with mocked backend and Stripe responses so guest details, schedule, payment step and success redirect are all covered.

## Agentic Missions

- Mission catalog: `test-data/customer-missions.json`
- MCP support:
  - `list_customer_missions`
  - `build_agentic_prompt`
  - `score_customer_friction`
- Goal: let Codex explore the app like a real customer, then turn repeatable findings into stable Playwright coverage.

## First Viewport Checks

- one clear H1
- one dominant CTA
- no CTA overload
- visible nav presence
- hero media or strong visual anchor
- readable copy on mobile and desktop
- no horizontal overflow

## Device Matrix

- Mobile: `390x844`
- Tablet: `768x1024`
- Laptop: `1366x768`
- Large desktop: `1707x893`

## Demo Data

- Contact fixture: `test-data/users.json`
- Reserve prefill flow: query params on `/app/reserve/page.html`

## Stable Regression Command

```bash
npx playwright test tests/e2e/smoke.spec.js tests/e2e/navigation.spec.js tests/e2e/critical-flows.spec.js tests/e2e/customer-journeys.spec.js tests/e2e/visual-first-viewport.spec.js
```

## Broader Audit Commands

```bash
npm run test:e2e
npm run audit:responsive
npm run audit:agentic
```
