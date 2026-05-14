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

### Public support first viewport rule

Services, Locations, Contact, About Us and Find Booking belong to the same
public support page family.

On laptop and monitor viewports, these pages must start at the same visual
height below the shared header and use the same first-viewport structure:

- two filled columns inside the shared brand frame
- left column: page headline, short useful context and the main navigation or trust cue
- right column: the page task, proof panel, map, form, contact block or support action
- both columns align at the top and should end in the same visual band unless a documented exception exists
- content length must be trimmed or redistributed instead of changing the first-viewport height from page to page

On tablet and mobile, the same content may stack, but the order and hierarchy
must remain consistent: headline/context first, useful task/action immediately
after, no decorative filler before the page purpose.

## Brand homogeneity rules

Every public page must feel like the same Dynasty Prestige product, even when
the page type changes.

- Use the same header family, logo treatment, navigation rhythm and dropdown style
- Use the same brand frame width logic for header, hero, cards, forms and main sections
- Use the same typography contract: display titles use the brand display font, body/UI/buttons use the brand sans font
- Use the same premium color language: obsidian, warm ivory, champagne gold and controlled neutral surfaces
- Use the same CTA grammar: one dominant action, uppercase button labels, secondary actions visually quieter
- Use the same card grammar: consistent radius, borders, padding, shadow and internal hierarchy
- Use the same floating contact rhythm on public pages and never let it cover key content
- Do not introduce page-specific fonts, random colors, unrelated button systems or different header moods
- If a page intentionally breaks a shared rule, document the exception before implementing it

## Copy usefulness rules

Every visible text block must earn its place.

- Keep first-viewport copy short, specific and easy to scan
- Every heading, paragraph, card label and SEO block must help the guest reserve, trust, compare, understand, navigate or rank
- Cut or rewrite generic luxury filler, repeated paragraphs and SEO padding that does not add real value
- Do not let copy length push the useful task, form, cards or CTA below the fold
- Customer-facing text must be premium English, clear and operationally believable
- Do not expose technical internals such as server logs, backend URLs or payment object names to customers

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
