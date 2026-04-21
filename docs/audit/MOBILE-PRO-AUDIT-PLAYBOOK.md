# Mobile Pro Audit Playbook

## Goal

Audit the mobile experience with one repeatable system that combines:

- responsive regression checks
- visual drift detection
- customer-like functional coverage
- sampled Lighthouse evidence
- manual notes with a severity rubric

This pack is meant to answer:

- what is broken
- what is visually weak
- what feels heavy or confusing
- what should be fixed first

## Commands

Core sweep:

```bash
npm run audit:mobile:pro
```

Cross-viewport visual sweep:

```bash
npm run audit:visual:robust
```

Full route map:

```bash
npm run audit:mobile:full
```

Single route:

```bash
node scripts/run-mobile-pro-audit.js --route /services.html --route /app/reserve/page.html
```

Skip heavy layers while iterating:

```bash
node scripts/run-mobile-pro-audit.js --skip-lighthouse
node scripts/run-mobile-pro-audit.js --skip-functional
```

## What The Pack Runs

1. `responsive-audit.spec.js` filtered to mobile-focused titles
2. `run-visual-agent.js` on `mobile-modern`
3. `run-functional-agent.js` on `mobile-modern`
4. Lighthouse sample across route families
5. A merged report with route priorities

The stricter visual pass for mobile + laptop + desktop lives in:

1. `run-visual-robust-audit.js`
2. `run-visual-agent.js` on `mobile-small`, `mobile-modern`, `tablet-portrait`, `laptop`, `desktop-wide`
3. `visual-first-viewport.spec.js`
4. `visual-route-entrypoints.spec.js`

## Read Order

Always read the output in this order:

1. `routePriorities`
2. responsive failures
3. visual findings
4. functional failures
5. Lighthouse sample

Do not start with Lighthouse. Most mobile UX problems are hierarchy and interaction issues before they are metric issues.

## Severity Rubric

### High

- user cannot complete the next step
- key CTA is missing or unreachable
- sticky UI blocks form progress
- route breaks only on mobile
- visual regression harms the booking path

### Medium

- page is usable but crowded
- hero is too tall and delays the first useful action
- CTA hierarchy is unclear
- contact or reserve flows feel heavier than needed
- performance slows down understanding but does not block it

### Low

- polish issues
- spacing rhythm feels uneven
- minor card inconsistency
- baseline changed for a non-critical visual reason

## Manual Mobile Pass

After the command finishes, do one human pass on:

- home
- services
- fleet
- reserve
- one brand page
- one vehicle PDP

### Mobile card CTA rules

Apply these checks specifically to vehicle cards, fleet cards, and any mobile card with contact or booking actions:

1. Card CTA rows must collapse to one column on mobile.
2. Each button in the stack must keep the same visual width.
3. Each button in the same stack must keep the same height.
4. Labels must stay centered and fully readable.
5. No clipped icons, cropped text, or uneven vertical centering.
6. Keep only the most useful two actions in the immediate stack when space is tight.
7. Preserve clear inner card padding around the CTA group.
8. Keep enough gap between buttons so the actions read as separate taps.
9. The CTA block must not overpower the card title, price, or core vehicle info.
10. If one label wraps and the other does not, rewrite or resize before approving.

For each route ask:

1. Is the first viewport obvious in under 2 seconds?
2. Is there one dominant action?
3. Is the next step visible without scrolling too much?
4. Does the sticky bar help more than it competes?
5. Can I move forward and back without losing intent?
6. Do mobile card CTA stacks look balanced, centered, and easy to tap?

## Smart Note Template

Write findings in this format:

```text
Route:
Severity:
Evidence:
Impact:
Fix direction:
```

Example:

```text
Route: /services.html
Severity: medium
Evidence: first viewport stacks service chooser, feature card and secondary CTA too tightly
Impact: the page reads slower and the next step is less obvious
Fix direction: reduce top-band height, keep one dominant CTA above the fold, delay the secondary action
```

## Output

Each run writes to `artifacts/mobile-pro-audit/<timestamp>/`:

- `report.json`
- `report.md`
- `responsive-mobile-playwright.json`
- `visual-agent/`
- `functional-agent/`
- `lighthouse/`

## Recommended Loop

1. Run `npm run audit:mobile:pro`
2. Fix the top 1-3 routes only
3. Re-run the same command
4. Approve new visual baselines only after the route is clearly healthier

For visual hardening across mobile and desktop:

1. Run `npm run audit:visual:robust`
2. Fix missing baselines on critical routes before trusting diffs
3. Read the viewport matrix before reading Lighthouse
4. Keep mobile and laptop healthy before approving desktop-only baselines
