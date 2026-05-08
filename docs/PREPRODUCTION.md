# Preproduction / staging setup

Goal: test the real customer flow online without touching production data,
production payments or the live customer website.

## Branches

- `main`: production branch. Merging here deploys the public site.
- `staging`: preproduction branch. Pushing here deploys the stable test site.
- Feature branches: short-lived work branches. Open a PR into `staging` first.

## Frontend on Vercel

Vercel creates Preview deployments for branches that are not the production
branch. Use one of these options:

- Fast path: push `staging` and use the generated Vercel preview URL.
- Cleaner path: assign `staging.prestigegoalmotion.com` to the `staging`
  branch in Vercel.

Recommended Vercel settings:

- Production Branch: `main`.
- Preview / staging branch: `staging`.
- Deployment Protection: enable Standard Protection for previews if the site
  should not be public while testing.

## Backend on Railway

Create a second Railway service for staging, for example:

- Production backend: `https://pgm-production.up.railway.app`
- Staging backend: `https://pgm-staging.up.railway.app`

The staging service must use separate variables:

- `NODE_ENV=staging`
- `APP_ENV=staging`
- `DATABASE_URL=<staging PostgreSQL URL>`
- `DATABASE_SSL=true`
- `STRIPE_SECRET_KEY=sk_test_...`
- `STRIPE_WEBHOOK_SECRET=whsec_...` for the Stripe test webhook
- `ADMIN_USER=<staging admin user>`
- `ADMIN_PASSWORD_HASH=<hash generated with npm run admin:hash-password>`
- `ADMIN_SESSION_SECRET=<different strong secret from production>`
- `ALLOWED_ORIGINS=https://staging.prestigegoalmotion.com,https://preprod.prestigegoalmotion.com,https://your-preview.vercel.app`

Never reuse the production `DATABASE_URL`, live Stripe secret key, or admin
session secret in staging.

## Frontend runtime config

`site/config.js` now has three modes:

- `development`: localhost and file URLs, backend `http://localhost:3000`.
- `staging`: Vercel preview URLs and hostnames containing `staging`,
  `preprod`, or `preview`, backend `https://pgm-staging.up.railway.app`.
- `production`: public domains, backend `https://pgm-production.up.railway.app`.

If the actual Railway staging URL is different, update
`STAGING_CONFIG_DUBAI.backendUrl` in `site/config.js`.

If the staging Stripe publishable key is known, update
`STAGING_CONFIG_DUBAI.publishableKey` in `site/config.js`.

## Test checklist before production

Run locally before pushing:

```bash
npm run test:smoke
npm run audit:copy
npm run audit:responsive
npm run audit:functional:contracts
```

Then test on staging:

- Home, fleet, vehicle PDP, services, contact and reserve load on mobile and desktop.
- Reserve creates a test Stripe payment intent.
- Payment uses a Stripe test card, not a real card.
- Reservation is stored in the staging PostgreSQL database.
- CRM admin shows the staging reservation.
- Find booking finds the staging reservation only with matching email.
- Contact/WhatsApp/call links point to the intended business numbers.

Only merge `staging` into `main` after this passes.
