# Admin Reservations Desk

Private mini-CRM for Dynasty Prestige reservations. It is served by the Railway/Express backend, not by `server/apps/static-server.js`.

## Routes

- `/admin/login.html`: private admin login.
- `/crm`: short protected CRM link for partners; redirects to reservations after login.
- `/admin/reservations.html`: reservations desk after login.
- `/api/admin/reservations`: reservation list with quick filters and search.
- `/api/admin/reservations/storage`: active storage diagnostics for the authenticated admin.
- `/api/admin/reservations/:id`: reservation detail.
- `/api/admin/reservations.csv`: filtered CSV export.

## Required Environment

Set these variables in Railway before using the desk:

```bash
ADMIN_USER=owner
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...
ADMIN_SESSION_SECRET=use-a-long-random-secret
ADMIN_COOKIE_SECURE=true
RESERVATION_TELEGRAM_BOT_TOKEN=123456:telegram-bot-token
RESERVATION_TELEGRAM_CHAT_ID=123456789
```

Generate the password hash locally:

```bash
npm run admin:hash-password -- "your-strong-password"
```

The cookie is `HttpOnly`, `SameSite=Lax`, signed with `ADMIN_SESSION_SECRET`,
and uses `Secure` automatically in staging and production.

## Local Preview

The admin desk is served by the Express backend, not by `npm run http` / `server/apps/static-server.js`.

For a local preview:

```powershell
$env:ADMIN_USER="owner"
$env:ADMIN_PASSWORD_HASH="<hash-from-admin-hash-password>"
$env:ADMIN_SESSION_SECRET="<long-random-secret>"
$env:PORT="3000"
npm run dev
```

Then open:

```text
http://localhost:3000/admin/login.html
```

Without `DATABASE_URL`, local reservations are read from ignored JSON files under `output/runtime-reservations/`.

Seed a demo reservation into the active storage:

```powershell
npm run admin:seed-demo
```

If `DATABASE_URL` is set, the seed goes to PostgreSQL. Without it, the seed goes to local JSON.

Check active storage from the admin API:

```text
GET /api/admin/reservations/storage
```

It returns the current storage mode (`local-json` or `postgres`), reservation count and schema readiness without exposing `DATABASE_URL`.

Check full CRM readiness from the admin API:

```text
GET /api/admin/reservations/operations
```

It returns the CRM environment label, storage mode, Stripe mode, webhook setup
and admin credential checks without exposing secrets. In staging and production,
the reservations desk should not be trusted until this status is OK or the
visible `CRM readiness` panel is clean.

You can also validate the environment from the command line before deploying:

```powershell
npm run admin:crm:validate:staging
npm run admin:crm:validate:production
```

The validator blocks common dangerous mixes, such as production Stripe keys in
staging, a staging-looking database in production, missing mobile alerts, or an
insecure CRM admin cookie.

## Mobile Reservation Notifications

The backend can notify a partner phone when a new reservation is received and
again when payment is confirmed. Telegram is the recommended first channel:

```bash
RESERVATION_TELEGRAM_BOT_TOKEN=<bot token>
RESERVATION_TELEGRAM_CHAT_ID=<private chat or group id>
```

For SMS, WhatsApp or other tools, use a webhook bridge:

```bash
RESERVATION_NOTIFICATION_WEBHOOK_URL=<Make/Zapier/Twilio webhook>
RESERVATION_NOTIFICATION_WEBHOOK_SECRET=<optional shared secret>
```

Notification attempts are stored under `reservationData.admin.mobileNotifications`
so the CRM can avoid duplicate alerts and show operational history later.

## Local PostgreSQL Check

If Docker Desktop is running, a local PostgreSQL test database can be started with:

```powershell
docker run --name pgm-postgres-test -e POSTGRES_USER=pgm -e POSTGRES_PASSWORD=pgm -e POSTGRES_DB=pgm_test -p 55432:5432 -d postgres:16
```

Then run:

```powershell
$env:DATABASE_URL="postgresql://pgm:pgm@localhost:55432/pgm_test"
$env:DATABASE_SSL="false"
npm run admin:seed-demo
```

And start the backend with the same `DATABASE_URL` to see PostgreSQL-backed reservations in the CRM.

Run the PostgreSQL integration test with:

```powershell
$env:TEST_DATABASE_URL="postgresql://pgm:pgm@localhost:55432/pgm_test"
$env:TEST_DATABASE_SSL="false"
npm run test:db
```

## Migrating Local Reservations To PostgreSQL

Local development writes ignored JSON records under `output/runtime-reservations/`. When a real database is ready, preview the migration first:

```powershell
npm run admin:migrate-reservations -- --dry-run
```

Then set the production/staging database variables and run the migration:

```powershell
$env:DATABASE_URL="postgresql://user:password@host:5432/database"
$env:DATABASE_SSL="true"
npm run admin:migrate-reservations
```

The script reads local JSON records and writes them through the same reservation store used by the app, so it keeps IDs, payment state, customer data, admin notes and booking dates consistent.

## Railway Deployment Checklist

1. Add a PostgreSQL service in Railway.
2. Set `DATABASE_URL` on the web service from the PostgreSQL service variables.
3. Generate the admin password hash with `npm run admin:hash-password -- "your-strong-password"`.
4. Set `ADMIN_USER`, `ADMIN_PASSWORD_HASH` and a long random `ADMIN_SESSION_SECRET`.
5. Deploy the backend service.
6. Open `https://your-railway-domain/crm`.

## Safety Notes

- No public page links to the admin desk.
- Admin pages and APIs send `noindex, nofollow` and `no-store`.
- `/api/admin/*` never exposes reservation data without a valid admin session.
- Admin notes and workflow state are stored under `reservationData.admin`, so they work with the existing PostgreSQL JSONB schema and the local JSON fallback.
