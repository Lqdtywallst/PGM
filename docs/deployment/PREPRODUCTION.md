# Preproduction and Vercel-ready release setup

Goal: test the real customer flow online without touching production data,
production payments, or the live customer website.

This project should stay easy to move to Vercel production. The recommended
shape is:

- Frontend preview/preproduction: Vercel Preview when available.
- Temporary frontend fallback: Netlify static site if Vercel access is blocked.
- Backend/API: Railway staging service.
- Production frontend later: Vercel production.
- Production backend later: Railway production service.

The temporary Netlify path uses the same build command and the same public
runtime variables as Vercel, so migration back to Vercel is a URL/config switch,
not a code rewrite.

## Branches

- `main`: production branch. Merging here deploys the public site.
- `staging`: preproduction branch. Pushing here deploys the stable test site.
- Feature branches: short-lived work branches. Open a PR into `staging` first.

## Frontend Build

Use the same build command on Vercel and Netlify:

```bash
npm run build:site
```

This command renders fleet cards and writes `site/runtime-config.js` from safe
public environment variables. Never write secrets to `runtime-config.js`.

Vercel already has `buildCommand` set in `vercel.json`. Netlify has the same
command in `netlify.toml`.

## Public Runtime Variables

Set these in the frontend hosting provider. They are browser-visible by design.

```bash
APP_ENV=staging
PGM_PUBLIC_BACKEND_URL=https://your-railway-staging.up.railway.app
PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

For Vercel:

- Set the variables in Project Settings > Environment Variables.
- Scope staging values to Preview, ideally branch-scoped to `staging`.
- Set production values only in Production.

For Netlify fallback:

- Set the same variables in Site configuration > Environment variables.
- Build command: `npm run build:site`.
- Publish directory: `site`.

## Backend on Railway

Create a second Railway service for staging, for example:

- Production backend: `https://pgm-production.up.railway.app`
- Staging backend: `https://pgm-staging.up.railway.app`

The staging service must use separate variables:

```bash
NODE_ENV=staging
APP_ENV=staging
PORT=3000
DATABASE_URL=<staging PostgreSQL URL>
DATABASE_SSL=true
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_USER=<staging admin user>
ADMIN_PASSWORD_HASH=<hash generated with npm run admin:hash-password>
ADMIN_SESSION_SECRET=<different strong secret from production>
ADMIN_COOKIE_SECURE=true
RESERVATION_TELEGRAM_BOT_TOKEN=<staging Telegram bot token>
RESERVATION_TELEGRAM_CHAT_ID=<staging/private partner chat id>
GOOGLE_PLACES_API_KEY=<Google Places API key restricted to Places Details>
GOOGLE_PLACE_ID=<Dynasty Prestige Google Business place id>
GOOGLE_REVIEWS_URL=<official Google Maps review/profile URL>
GOOGLE_WRITE_REVIEW_URL=<official Google write-review URL, optional if place id is set>
ALLOWED_ORIGINS=https://your-vercel-preview.vercel.app,https://your-netlify-preprod.netlify.app,https://staging.prestigegoalmotion.com
```

Never reuse the production `DATABASE_URL`, live Stripe secret key, or admin
session secret in staging.

Before deploying the backend, validate the staging variables locally or in the
hosting shell:

```powershell
$env:APP_ENV="staging"
$env:NODE_ENV="production"
$env:DATABASE_URL="<staging PostgreSQL URL>"
$env:STRIPE_SECRET_KEY="sk_test_..."
$env:PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
$env:STRIPE_WEBHOOK_SECRET="whsec_..."
$env:ADMIN_USER="<staging admin user>"
$env:ADMIN_PASSWORD_HASH="<generated hash>"
$env:ADMIN_SESSION_SECRET="<strong random value>"
$env:ADMIN_COOKIE_SECURE="true"
$env:RESERVATION_TELEGRAM_BOT_TOKEN="<bot token>"
$env:RESERVATION_TELEGRAM_CHAT_ID="<chat id>"
$env:RESERVATION_CRM_URL="https://your-railway-staging.up.railway.app/crm"
$env:ALLOWED_ORIGINS="https://your-vercel-preview.vercel.app,https://staging.prestigegoalmotion.com"
npm run admin:crm:validate:staging
```

For production, run:

```powershell
$env:APP_ENV="production"
$env:NODE_ENV="production"
$env:DATABASE_URL="<production PostgreSQL URL>"
$env:STRIPE_SECRET_KEY="sk_live_..."
$env:PGM_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
$env:STRIPE_WEBHOOK_SECRET="whsec_..."
$env:ADMIN_USER="<production admin user>"
$env:ADMIN_PASSWORD_HASH="<generated hash>"
$env:ADMIN_SESSION_SECRET="<different strong random value>"
$env:ADMIN_COOKIE_SECURE="true"
$env:RESERVATION_TELEGRAM_BOT_TOKEN="<production bot token>"
$env:RESERVATION_TELEGRAM_CHAT_ID="<production/private partner chat id>"
$env:RESERVATION_CRM_URL="https://your-production-backend/crm"
$env:ALLOWED_ORIGINS="https://prestigegoalmotion.com,https://www.prestigegoalmotion.com"
npm run admin:crm:validate:production
```

## Vercel Production Migration

When Vercel access is ready:

1. Connect the GitHub repository to Vercel.
2. Keep `main` as the Production Branch.
3. Use `staging` and PR branches as Preview deployments.
4. Keep build command as `npm run build:site`.
5. Set Preview variables to the Railway staging backend and Stripe test key.
6. Set Production variables to the Railway production backend and Stripe live publishable key.
7. Run the preproduction functional gate against the preview URL before promoting/merging.

The app detects Vercel preview URLs as staging, but `APP_ENV=staging` should
still be set explicitly so the environment is never ambiguous.

## Functional Gate

First run the readiness check against the public preproduction frontend and the
staging backend:

```powershell
$env:PREPROD_FRONTEND_URL="https://your-preprod-frontend.example"
$env:PREPROD_BACKEND_URL="https://your-railway-staging.up.railway.app"
npm run audit:staging:readiness
```

Mac/Linux:

```bash
PREPROD_FRONTEND_URL="https://your-preprod-frontend.example" \
PREPROD_BACKEND_URL="https://your-railway-staging.up.railway.app" \
npm run audit:staging:readiness
```

The readiness check verifies that:

- The backend health endpoint is reachable.
- The backend reports Stripe configured.
- Reservation storage is PostgreSQL, not local JSON fallback.
- Mobile reservation notifications are configured.
- The frontend resolves to `APP_ENV=staging`.
- The frontend points to the same staging backend URL.
- The browser-visible Stripe key is `pk_test_...`, not a live key.

After readiness passes, run the full functional gate:

```powershell
$env:PREPROD_FRONTEND_URL="https://your-preprod-frontend.example"
$env:PREPROD_BACKEND_URL="https://your-railway-staging.up.railway.app"
npm run audit:preprod:functional
```

Mac/Linux:

```bash
PREPROD_FRONTEND_URL="https://your-preprod-frontend.example" \
PREPROD_BACKEND_URL="https://your-railway-staging.up.railway.app" \
npm run audit:preprod:functional
```

The gate checks:

- Backend health is reachable.
- A staging reservation can be created in the CRM/API.
- Fleet calls the configured staging backend, not localhost or production.
- Reserved Mercedes G63 AMG disappears for overlapping dates.
- The same Mercedes G63 AMG appears again for clear dates.
- Find Booking retrieves the seeded reservation through the frontend.
- Desktop and mobile both pass.

The gate creates test reservations in the staging database. Periodically reset
or clean staging data; do not point this gate at production.

For local/manual customer-style testing before a public preview is available,
use `docs/qa/MANUAL_FUNCTIONAL_QA.md`. The important command is:

```powershell
npm run qa:manual:db
```

It starts the frontend on `http://localhost:8081`, the backend/API on
`http://localhost:3000`, and lets Alejandro perform the same reserve -> CRM ->
Fleet unavailable -> Find Booking -> WhatsApp/call checks manually.

## Manual Release Checklist

Before merging `staging` into `main`:

```bash
npm run test:smoke
npm run audit:copy
npm run audit:responsive
npm run audit:functional:contracts
npm run audit:preprod:functional
```

Then manually verify on staging/preproduction:

- Home, fleet, vehicle PDP, services, contact and reserve load on mobile and desktop.
- Fleet filters combine correctly: dates, brand, type, price, sort and reset.
- Reserved cars are hidden only for overlapping dates.
- Vehicle cards open the exact vehicle landing, not generic Fleet.
- Reserve creates a Stripe test payment intent.
- Payment uses Stripe test mode, not a real card.
- Reservation is stored in the staging PostgreSQL database.
- CRM admin shows the staging reservation.
- Find Booking finds the staging reservation only with matching email.
- Contact, WhatsApp and call links point to the intended business numbers.
- No browser console errors in the core customer journey.

Only merge `staging` into `main` after this passes.

## Fallback Hosting Options

If Vercel access is unavailable:

- Netlify + Railway: best temporary option because it supports static builds,
  branch deploys and env vars cleanly.
- Cloudflare Pages + Railway: also acceptable for static frontend previews.
- Local tunnel with Cloudflare Tunnel or ngrok: useful for a short demo, not a
  production-quality preproduction gate.

Do not use local tunnels as the final client approval environment.
