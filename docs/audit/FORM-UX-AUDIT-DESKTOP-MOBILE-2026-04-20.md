# Form UX Audit - Desktop and Mobile - 2026-04-20

## Scope

Audit of every user-facing data-entry surface found in the current site build, reviewed in desktop and mobile with a live local server.

## Method

- Code inventory with `rg` across `site/` and `server/`
- Browser review with real rendering on `http://127.0.0.1:8096`
- Mobile viewport around `390x844`
- Desktop viewport around `1366x900` to `1440x960`

## Input Surface Inventory

### Family 1: Homepage booking form

- `site/index.html:312`
- Inputs: pickup date, return date, pickup time, return time

### Family 2: Homepage date overlay dialog

- `site/index.html:997`
- Inputs: pickup date, pickup time, return date, return time

### Family 3: Fleet filters

- `site/fleet.html:511`
- Inputs: sort, pickup date, pickup time, return date, return time, brand, car type, min price, max price

### Family 4: Contact form

- `site/contact.html:174`
- Inputs: full name, email, phone, subject, message

### Family 5: Brand and vehicle booking forms

Representative files:

- `site/pages/brands/mercedes-rental-dubai.html:305`
- `site/pages/vehicles/lamborghini-huracan-evo-spyder-rental-dubai.html:405`

Shared inputs:

- hidden car
- hidden price
- start date
- pickup time
- end date
- dropoff time

### Family 6: Reservation flow

- `site/app/reserve/page.html:2637`
- Step 1: delivery address, start date, pickup time, end date, dropoff time
- Step 2: full name, passport or ID, phone, email, optional billing address, city, country
- Step 3: Stripe payment field

## Executive Summary

The site is much better than before in structure, but the form system is still uneven across families.

What is working:

- the reservation flow now has the right step order
- contact is visually calm and understandable
- homepage booking is simple and low-friction
- brand and vehicle booking forms are compact and route directly into reservation

What still hurts:

- the same booking logic is implemented in multiple visual patterns
- fleet mobile has too many competing controls near the bottom of the viewport
- reserve step 1 still shows a contradictory quote state before the address is entered
- some surfaces still feel longer than they need to on mobile
- sticky actions occasionally compete with nearby controls instead of supporting them

## Findings by Severity

## High

### 1. Reserve step 1 shows contradictory pricing before completion

Surface:

- `site/app/reserve/page.html`

Observed:

- on step 1, `Total reservation` showed `AED 0.00`
- at the same time `Pay now (50%)` and `Remaining balance` showed valid non-zero amounts

Impact:

- this damages trust at the most sensitive point of the flow
- users can interpret it as a bug, hidden fee logic, or unstable pricing

Priority:

- immediate

Recommendation:

- either compute all summary values together from the start
- or hide the total block until the required delivery field is present
- never show `0.00` next to a non-zero deposit

### 2. Fleet mobile has stacked decision layers fighting for the same space

Surface:

- `site/fleet.html`

Observed:

- filter chips, vehicle cards, and the sticky bottom CTA bar all compete inside a short mobile viewport
- the bottom sticky bar visually dominates the lower area and can distract from card CTAs
- the filters row feels like one more navigation system on top of the hero, cards, and sticky actions

Impact:

- users can hesitate between filtering, opening dates, using the sticky CTA, or tapping a car card
- the screen feels busy exactly where selection should feel clean

Priority:

- high

Recommendation:

- reduce the persistent bottom bar when in browse mode
- show the sticky CTA only after an explicit action such as opening dates or starting a reservation
- keep one primary mobile action visible, not two competing routes

### 3. Fleet filter drawer is too long for mobile scanning

Surface:

- `site/fleet.html`

Observed:

- once filters are open, the user faces sort, reset, close, rental period, brand, type, and price in one long stack
- this is powerful, but not lightweight

Impact:

- too much vertical decision work before the user sees a result
- mobile filtering feels operational rather than elegant

Priority:

- high

Recommendation:

- collapse sections by default
- keep only `dates` and maybe `brand` immediately visible
- move advanced filtering like price into a secondary accordion

## Medium

### 4. Homepage has two different date-entry patterns for the same intent

Surfaces:

- main booking form in `site/index.html:312`
- overlay booking dialog in `site/index.html:997`

Observed:

- users can enter dates in the hero card
- they can also enter dates again in the overlay dialog
- the overlay uses a shorter time list than other booking surfaces

Impact:

- duplicated mental model
- slight inconsistency in expectations around time granularity

Priority:

- medium

Recommendation:

- keep one canonical date-entry pattern
- if the overlay stays, match the same time increments and labels used elsewhere

### 5. Brand and vehicle forms are compact, but still repeated in many files

Surfaces:

- all brand pages
- all vehicle detail pages

Observed:

- the same booking block is repeated family-wide
- behavior is mostly good, but any UX issue here multiplies across many routes

Impact:

- maintenance risk
- small inconsistencies can spread easily

Priority:

- medium

Recommendation:

- centralize the booking partial or template if possible
- keep the same labels, help text, defaults, and validation rules everywhere

### 6. Contact form starts with an already-invalid subject state

Surface:

- `site/contact.html`

Observed:

- the subject select appears invalid before the user has interacted

Impact:

- subtle but unhelpful first impression
- form can feel like it is already complaining

Priority:

- medium

Recommendation:

- reserve validation styling for submit or post-interaction state

### 7. Contact mobile is visually clean, but still a bit top-heavy before the form begins

Surface:

- `site/contact.html`

Observed:

- mobile shows hero heading, explanatory copy, and two CTAs before the form starts
- this is understandable, but slightly long for users who arrived specifically to type

Impact:

- extra scroll before action

Priority:

- medium

Recommendation:

- compress the hero vertically on mobile
- keep the form start visible sooner

## Low

### 8. Vehicle detail booking forms are generally strong

Surface:

- vehicle and brand booking modules

Observed:

- date and time are near the price
- CTA is clear
- WhatsApp fallback is visible
- the form is short and focused

Risk:

- low

Recommendation:

- keep this family as the reference for short pre-booking forms

### 9. Homepage primary booking form is simple and usable

Surface:

- `site/index.html`

Observed:

- compact field count
- native date and time controls
- single clear CTA

Risk:

- low

Recommendation:

- keep simplicity, but unify it with the overlay behavior

## Best Current Patterns

### Best for focused booking start

- vehicle and brand booking blocks

Why:

- short
- obvious
- directly tied to a car

### Best for full reservation completion

- reservation step 2 and step 3

Why:

- required fields are minimal
- optional billing is collapsed
- payment is isolated into its own step

### Best general contact form

- contact page

Why:

- labels are clear
- field count is reasonable
- alternative contact routes are visible

## Priority Order

1. Fix reserve step 1 price-state inconsistency
2. Simplify fleet mobile action hierarchy
3. Collapse or reduce fleet mobile filters
4. Unify homepage booking logic and time options
5. Delay contact invalid styling until interaction
6. Shorten mobile hero spacing before forms where possible

## Practical Conclusion

The weakest input experience right now is not the contact form and not the PDP booking block. It is the mobile fleet decision layer, followed by the remaining trust issue in reservation step 1.

If the goal is to make the whole site feel easy to use, the next UX pass should focus on:

- `fleet mobile`
- `reserve step 1`
- `form family consistency across homepage, PDP, and reservation`
