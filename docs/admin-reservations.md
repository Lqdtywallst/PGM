# Admin Reservations Desk

Private mini-CRM for Dynasty Prestige reservations. It is served by the Railway/Express backend, not by `server/server-http.js`.

## Routes

- `/admin/login.html`: private admin login.
- `/admin/reservations.html`: reservations desk after login.
- `/api/admin/reservations`: reservation list with quick filters and search.
- `/api/admin/reservations/:id`: reservation detail.
- `/api/admin/reservations.csv`: filtered CSV export.

## Required Environment

Set these variables in Railway before using the desk:

```bash
ADMIN_USER=owner
ADMIN_PASSWORD_HASH=pbkdf2_sha256$...
ADMIN_SESSION_SECRET=use-a-long-random-secret
```

Generate the password hash locally:

```bash
npm run admin:hash-password -- "your-strong-password"
```

The cookie is `HttpOnly`, `SameSite=Lax`, signed with `ADMIN_SESSION_SECRET`, and uses `Secure` automatically in production.

## Local Preview

The admin desk is served by the Express backend, not by `npm run http` / `server/server-http.js`.

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

## Railway Deployment Checklist

1. Add a PostgreSQL service in Railway.
2. Set `DATABASE_URL` on the web service from the PostgreSQL service variables.
3. Generate the admin password hash with `npm run admin:hash-password -- "your-strong-password"`.
4. Set `ADMIN_USER`, `ADMIN_PASSWORD_HASH` and a long random `ADMIN_SESSION_SECRET`.
5. Deploy the backend service.
6. Open `https://your-railway-domain/admin/login.html`.

## Safety Notes

- No public page links to the admin desk.
- Admin pages and APIs send `noindex, nofollow` and `no-store`.
- `/api/admin/*` never exposes reservation data without a valid admin session.
- Admin notes and workflow state are stored under `reservationData.admin`, so they work with the existing PostgreSQL JSONB schema and the local JSON fallback.
