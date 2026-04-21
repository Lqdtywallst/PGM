# First Viewport Rubric

## Goal

Keep the opening screen composition stable across the app so the auditor protects layout quality instead of only catching breakage.

The auditor should learn from route families and approved reference pages, not require a hand-written judgment for every single URL.

## Principles

- One dominant zone, one support zone, one clear action layer.
- Desktop and laptop rules are locked independently.
- Mobile rules are evaluated separately and can evolve without changing desktop.
- Route-specific exceptions override cohort defaults.

## Screen distribution good practice

- The first useful action should stay comfortably inside the fold on desktop and laptop.
- The dominant block should feel deliberate, not tiny and not so tall that it drags trust copy below the viewport.
- Split layouts should read as one composition: same top line, strong combined width, no detached support card.
- Decorative media can own space, but not at the cost of hiding the primary path.
- Mobile can use a different composition, but desktop rules must never silently leak into it.

## Current composition checks

### `single_panel_fill`

Used for hero screens with one dominant editorial block.

- the main panel must occupy a meaningful share of the viewport width
- it must not become oversized
- it must not sink too low in the first viewport

### `hero_support_split`

Used when the first viewport is split between a dominant block and a support block.

- tops stay aligned within a small tolerance
- bottoms stay aligned within a small tolerance
- block heights stay reasonably close unless the template explicitly requires otherwise
- both columns keep a minimum width share
- both columns together fill most of the screen width

Examples:

- contact intro + form
- reserve main step + support rail
- vehicle hero media + booking card

### `service_tabs_split`

Used for the services hero.

- circles stay in the upper band
- feature panel stays in the lower band
- overlap between both bands stays minimal

### `two_column_alignment`

Used for the locations hero.

- left and right blocks align vertically
- left and right blocks should finish at roughly the same vertical level
- one side should not become visibly taller or shorter without an intentional template reason
- both columns keep strong width
- the split fills the screen cleanly

### `fleet_first_row_fill`

Used for the opening fleet grid.

- first visible row has enough cards for the breakpoint
- the row spans most of the viewport width
- card tops stay aligned

## Viewport tiers

- `mobile`
- `laptop`
- `desktop`

Each tier can have its own policy:

- `locked`: the auditor should protect this composition
- `research`: the auditor should not inherit desktop geometry rules here

## Intent

The auditor should raise its hand when:

- a first viewport under-fills the screen
- a support panel becomes too small or detached
- the opening split loses alignment
- the visible row of cards stops feeling like one row
- a desktop fix accidentally degrades mobile or vice versa
- a page in the same template family stops matching the shared first-viewport rhythm

## Mobile card guardrails

These rules are not first-viewport-only, but they should be treated as locked mobile composition checks for card-based route families:

- mobile card CTA groups stack vertically
- stacked buttons keep equal width and equal height
- labels remain centered and readable
- the card keeps visible inner padding around the CTA group
- button stacks do not dominate the card more than the title and main value
- no mobile card ships with cramped CTA spacing or misaligned action rows
