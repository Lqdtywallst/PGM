# Reserve Redesign Comparison - 2026-04-20

## What the better booking flows do

### Turo

Starts with location and trip dates first, then lets the guest confirm the trip details before the rest of the booking work.

Source:
- https://turo.com/us/en/car-rental/united-kingdom/free-delivery

### Airbnb

Makes the reservation and payment schedule clear, including pay-now/pay-later logic, instead of front-loading every administrative detail.

Source:
- https://www.airbnb.com/help/article/2143

### Baymard research

The number of visible form fields matters more than the number of steps. Most checkout flows can be much shorter than what teams usually ship.

Sources:
- https://baymard.com/blog/checkout-flow-average-form-fields
- https://baymard.com/blog/mobile-checkout

### web.dev

Recommends removing distractions, using autocomplete, and hiding billing-address complexity behind a simpler edit pattern instead of showing every field immediately.

Source:
- https://web.dev/articles/payment-and-address-form-best-practices

## What we changed in our reserve page

1. Dates and delivery now come first.
2. Guest details moved to step 2.
3. Billing details are now optional and collapsed.
4. The long intro block was removed.
5. Mobile now starts with compact summary + step buttons + native date/time inputs.
6. The mobile calendar grid is hidden to keep the first screen short.

## Product rule going forward

The reserve page should feel like:

- choose
- confirm
- pay

Not:

- read
- read
- fill admin data
- try to understand
- maybe book
