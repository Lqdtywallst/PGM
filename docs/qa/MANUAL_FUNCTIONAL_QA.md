# Manual functional QA environment

This is the environment Alejandro can run to test the website like a real
customer before production: reserve a car, confirm the reservation is stored,
check that the car is no longer available for the same dates, and verify call
and WhatsApp actions.

## Recommended Command

Use the database-backed command when validating a release:

```powershell
npm run qa:manual:db
```

This starts:

- Frontend: `http://localhost:8081`
- Backend/API: `http://localhost:3000`
- CRM/Admin: `http://localhost:3000/admin/login.html`

`qa:manual:db` requires `DATABASE_URL` in `.env`. If it is missing, the command
stops because the release check should use a real PostgreSQL database.

For a quick local-only demo without PostgreSQL:

```powershell
npm run qa:manual
```

That fallback stores reservations in ignored JSON files under
`output/runtime-reservations/`. It is useful for development, but it is not the
final preproduction proof.

## Required `.env` for Real Booking QA

Minimum for real DB availability checks:

```bash
DATABASE_URL=postgresql://...
DATABASE_SSL=false
ALLOWED_ORIGINS=http://localhost:8081,http://127.0.0.1:8081
```

For the full payment flow with Stripe test mode:

```bash
STRIPE_SECRET_KEY=sk_test_...
PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

For CRM login:

```bash
ADMIN_USER=owner
ADMIN_PASSWORD_HASH=<hash generated with npm run admin:hash-password -- "password">
ADMIN_SESSION_SECRET=<long random string>
```

Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.

## Manual Customer Story

1. Open `http://localhost:8081/fleet.html`.
2. Select a rental period, for example tomorrow plus two days.
3. Choose a car and click `Reserve`.
4. Fill pickup location and guest details.
5. Continue to payment and pay with a Stripe test card if test keys are set.
6. Open `http://localhost:3000/admin/login.html` and confirm the reservation appears in CRM.
7. Return to `http://localhost:8081/fleet.html`.
8. Select the exact same dates and times.
9. Confirm the reserved car does not appear.
10. Select different non-overlapping dates.
11. Confirm the same car appears again.
12. Click visible WhatsApp actions and confirm they open `wa.me/971586122568`.
13. Click visible call actions on a device/browser that supports calls and confirm they use `tel:+971586122568`.
14. Open `http://localhost:8081/reservation-lookup.html` and confirm the booking can be found with reservation ID plus email.

## Automated Check For This Environment

With `qa:manual` or `qa:manual:db` still running in one terminal, run this in a
second terminal:

```powershell
npm run qa:test:manual
```

The automated test:

- Creates a Mercedes G63 AMG reservation through the active backend.
- Verifies the reservation is readable through Find Booking lookup.
- Verifies `/api/availability` marks the car unavailable for overlapping dates.
- Opens Fleet on desktop and mobile.
- Confirms Mercedes G63 AMG is hidden for overlapping dates.
- Confirms Mercedes G63 AMG appears for clear dates.
- Confirms visible call links use `tel:+971586122568`.
- Confirms visible WhatsApp links use `https://wa.me/971586122568`.

This automated check does not click through a live external WhatsApp app or
place a phone call; it validates the exact links that the browser/device will
open. The manual story above is where you physically click those actions.

## Production-Style Rule

For client approval, do not accept a release based only on static navigation
tests. At minimum, pass:

```powershell
npm run qa:manual:db
npm run qa:test:manual
```

Then manually complete one Stripe test-card booking and verify the CRM plus
Fleet availability with the same dates.
