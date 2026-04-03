# AGENTS.md

## Project Goals
- Build a premium luxury car rental website for Dubai.
- Prioritize clarity, trust, booking intent, and SEO-ready structure.
- Use the existing project stack and file structure instead of introducing a new framework unless explicitly requested.

## Current Stack
- Static HTML in `site/`
- Modular CSS in `site/css/`
- Vanilla JS in `site/js/`
- Backend routes in `server/` and `app/api/`

## Repo Structure
- `site/index.html`: home page
- `site/css/home.css`: home CSS entrypoint
- `site/css/home/`: modular CSS partials for the home page
- `site/js/home.js`: home JS entrypoint
- `site/js/home-booking.js`: home booking intent logic
- `site/app/reserve/page.html`: reservation page
- `site/fleet.html`, `site/locations.html`, `site/services.html`, `site/about.html`, `site/contact.html`: trunk pages
- `docs/architecture/`: architecture notes and visual reference docs
- `server/test-server.js`: smoke test runner

## Constraints
- Do not copy third-party code, copy, branding, images, or videos verbatim.
- It is acceptable to follow third-party structural logic and UX sequencing.
- Keep edits modular and localized.
- Prefer improving the existing stack over rewriting into React, Tailwind, or another framework unless explicitly requested.
- Preserve SEO-critical URLs unless the task explicitly includes a migration plan.
- Keep semantic HTML intact and SEO-ready.

## Visual Direction
- Premium luxury aesthetic
- Dark, restrained palette with lime accent already established in the repo
- High whitespace, clean spacing rhythm, controlled typography
- One clear visual priority per section
- Strong booking CTA without turning the page into a noisy marketplace
- Editorial tone, but practical conversion flow

## Home Page Rules
- Desktop first, then laptop, then tablet/mobile
- Validate the first viewport visually before touching deeper sections
- The home page must be built in phases:
  1. Structure
  2. Layout
  3. Visual styling
  4. Interaction/behavior
  5. Responsive refinement
  6. SEO and polish

## Required Workflow For Visual Work
- Never redesign the entire page in one pass.
- Touch one major block at a time.
- For any home-page redesign, start with:
  1. `header`
  2. `hero`
  3. booking selector
- Only after that is approved, continue to:
  1. featured cars
  2. supporting sections
  3. footer

## Hero / Booking Workflow
- First decide structure:
  - hero text
  - booking selector placement
  - viewport composition
- Then implement layout only.
- Then style the block.
- Then validate in real screenshots at:
  - `1707x893` or similar wide desktop
  - `1366x768` laptop
- Only after those screenshots look correct should mobile/tablet begin.

## Copy Rules
- Do not use placeholder copy that sounds generic or exaggerated.
- Keep hero copy short, premium, and useful.
- Avoid duplicated headings and repeated labels inside the same block.
- Prefer simple English that supports booking intent.

## Booking Selector Rules
- Booking UI must feel lighter than a traditional form.
- Inputs must be readable and visually aligned.
- Avoid oversized cards when a cleaner band or compact dock would work better.
- If Chrome date inputs show ugly native placeholder text, hide or replace it with custom placeholder treatment.
- Preserve booking intent logic:
  - selected dates carry into fleet interactions
  - selected dates carry into checkout/reservation links

## Third-Party Inspiration Policy
- Allowed:
  - structural inspiration
  - section order
  - spacing logic
  - rhythm and composition ideas
- Not allowed:
  - literal HTML/CSS/JS copying
  - brand wording reuse
  - asset reuse
  - close imitation of proprietary visual identity

## Validation Rules
- After meaningful UI edits:
  - run `npm test`
  - inspect the page in real screenshots
- Do not claim visual fixes without checking a fresh render.
- If something still looks off, say so plainly.

## Editing Rules
- Prefer editing existing files over creating unnecessary new ones.
- Use modular CSS partials instead of adding large inline styles.
- Keep JS split by behavior, not by arbitrary file count.
- Avoid duplicating markup or styles when the same pattern can be reused.

## Default Commands
- Run smoke tests:
  - `npm test`
- Local static preview:
  - `http://127.0.0.1:8080/`

## Decision Rule
- If the task is large or ambiguous, break it into explicit phases before implementing.
- If layout direction is unclear and the choice would materially change UX, ask before proceeding.
