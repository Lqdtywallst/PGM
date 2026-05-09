# Dynasty Prestige Web

Website and reservation stack for Dynasty Prestige, focused on luxury car rental in Dubai.

## Project Areas

- `site/`: public website, landing pages, assets, sitemap, robots, manifest and legal pages.
- `site/app/reserve/page.html`: reservation and payment flow.
- `server/`: backend entrypoint, local static server, smoke tests and helpers.
- `app/api/reserve/route.js`: reservation routes mounted by the backend.
- `docs/`: active project documentation only.

## Core Commands

- `npm install`: install dependencies.
- `npm start`: start the backend/API on `PORT` or `3000`.
- `npm run http`: serve the static site locally.
- `npm run qa:manual:db`: run the manual QA environment with required `DATABASE_URL`.
- `npm run qa:test:manual`: test the running manual QA environment.
- `npm run build:site`: render fleet cards and public runtime config.
- `npm run test:smoke`: run the repo smoke baseline.
- `npm test`: run the full configured audit/test suite.

## Release QA

Use [docs/MANUAL_FUNCTIONAL_QA.md](docs/MANUAL_FUNCTIONAL_QA.md) when you need to test like a real customer:

1. Reserve a car.
2. Confirm it is stored in the active backend storage/CRM.
3. Check the same car is hidden in Fleet for overlapping dates.
4. Check it appears for non-overlapping dates.
5. Verify Find Booking, WhatsApp and call actions.

Use [docs/PREPRODUCTION.md](docs/PREPRODUCTION.md) for Vercel-ready staging and production migration.

## Environment

Copy `.env.example` to `.env` and set the variables needed for the task:

- `STRIPE_SECRET_KEY`: backend Stripe secret, test key for QA/staging.
- `PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY`: browser-visible Stripe publishable key.
- `DATABASE_URL`: PostgreSQL reservation storage.
- `DATABASE_SSL`: set `false` for local Postgres.
- `ALLOWED_ORIGINS`: frontend origins allowed to call the backend.
- `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`: CRM/admin login.
- `CONTACT_FORM_LOG_ONLY=true`: local contact-form testing without email delivery.

## Active Documentation

- [docs/README.md](docs/README.md): documentation map and cleanup policy.
- [docs/audit/README.md](docs/audit/README.md): active audit docs.
- [docs/architecture/README.md](docs/architecture/README.md): architecture map.
- [docs/admin-reservations.md](docs/admin-reservations.md): CRM setup.
- [docs/MANUAL-EDITING-GUIDE.md](docs/MANUAL-EDITING-GUIDE.md): safe manual edits.

## Documentation Policy

Keep docs current and lean. Old closed audit reports, stale screenshots and superseded checklists should be deleted, not archived. Git history keeps the record.

## License

Copyright 2025 Dynasty Prestige. All rights reserved.
