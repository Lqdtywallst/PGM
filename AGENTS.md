# AGENTS.md

## Project priorities

The first viewport (above the fold) is the highest-priority UX area of this website.

When working on landing pages, homepage, or hero sections, always optimize the first visible screen first.

## Visual rules

- Prioritize strong visual hierarchy in the first viewport
- One main headline, one main CTA
- Secondary CTAs must be visually de-emphasized
- Avoid clutter above the fold
- Keep spacing generous and consistent
- Preserve a premium, clean, visually balanced aesthetic
- Do not make the hero feel like a generic SaaS block
- Keep the design elegant across mobile, tablet, laptop, and desktop
- When two parallel blocks share a row on desktop, align their top and bottom edges unless the layout has an intentional documented exception

## Responsive rules

Any layout change must be validated across:
- mobile
- tablet
- laptop
- large desktop

Avoid:
- overlapping elements
- oversized text on small screens
- weak text/image balance
- CTA overload
- cramped spacing
- broken alignment

### Mobile card rules

When auditing or changing fleet cards, vehicle cards, guide cards, or any card with contact actions on mobile:

- stacked action buttons must read as one clean vertical group
- each action must span the available card width evenly
- use one column for card CTAs on mobile, not side-by-side button rows
- keep button labels centered and fully visible
- keep equal button height across the same action group
- allow at most two primary contact actions in the visible mobile card action area unless a third action is clearly secondary and separated
- preserve enough spacing between stacked buttons so they do not feel merged or cramped
- never let card buttons touch the card edge without consistent inner padding
- avoid text wrapping that makes one button visibly taller than the other in the same group
- do not let CTA groups become the visual focus over the vehicle name, price, or main booking intent

## Implementation rules

When modifying first-viewport sections:
1. inspect current structure and layout
2. identify hierarchy, spacing, and responsiveness issues
3. refactor HTML/CSS/structure where needed
4. verify visually in browser
5. summarize changes and tradeoffs

## Tooling rules

When auditing or improving UI:
- use Playwright for browser validation
- use DevTools for DOM/layout inspection
- use Lighthouse for performance/accessibility/SEO
- use audit_engine for structure and quality checks
