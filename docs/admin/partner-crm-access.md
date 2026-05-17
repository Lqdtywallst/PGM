# Partner CRM Access

Goal: give the operating partner one simple private place to manage real and
test reservations without mixing environments.

## URLs

Use the short protected CRM route:

```text
Production: https://<production-backend-domain>/crm
Staging/test: https://<staging-backend-domain>/crm
```

Both routes redirect to `/admin/reservations.html` after login. No public
website page links to these URLs.

## Environment Split

Production must use production-only values:

```bash
APP_ENV=production
NODE_ENV=production
DATABASE_URL=<production PostgreSQL URL>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_USER=<production admin user>
ADMIN_PASSWORD_HASH=<production password hash>
ADMIN_SESSION_SECRET=<production-only long random secret>
ADMIN_COOKIE_SECURE=true
```

Staging/preproduction must use test-only values:

```bash
APP_ENV=staging
NODE_ENV=staging
DATABASE_URL=<staging PostgreSQL URL>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ADMIN_USER=<staging admin user>
ADMIN_PASSWORD_HASH=<staging password hash>
ADMIN_SESSION_SECRET=<staging-only long random secret>
ADMIN_COOKIE_SECURE=true
```

Never reuse the production database, live Stripe key or session secret in
staging.

Before handing either CRM URL to the partner, run the matching validator in the
backend environment:

```bash
npm run admin:crm:validate:staging
npm run admin:crm:validate:production
```

Staging must pass with `sk_test_...` / `pk_test_...`. Production must pass with
`sk_live_...` / `pk_live_...`.

## Credentials

Generate a password hash locally:

```bash
npm run admin:hash-password -- "the-password-you-will-share-securely"
```

Put the generated hash in `ADMIN_PASSWORD_HASH`. Share the plain password with
the partner through a private password manager or secure channel, never in Git,
Slack screenshots or documentation.

## CRM Readiness

The reservations CRM now shows a `CRM readiness` panel at the top. Before using
it for real operations:

- Production must show `Production CRM`.
- Staging must show `Staging CRM`.
- Database must show `Postgres`, not `Local fallback`.
- Production Stripe must show `live`.
- Staging Stripe must show `test`.
- Webhook and admin access checks must be OK.
- Mobile notifications must be OK.

If the panel says `Needs setup`, do not trust the CRM for real reservations yet.

## Mobile Alerts

Every new reservation can notify the partner phone without blocking checkout.
The backend supports two channels:

```bash
# Telegram push notifications
RESERVATION_TELEGRAM_BOT_TOKEN=<bot token from BotFather>
RESERVATION_TELEGRAM_CHAT_ID=<private chat or group id>

# Optional webhook for Make/Zapier/Twilio/WhatsApp bridge
RESERVATION_NOTIFICATION_WEBHOOK_URL=<https webhook URL>
RESERVATION_NOTIFICATION_WEBHOOK_SECRET=<shared secret, optional>
```

Recommended first setup: Telegram. It is fast, easy to test on a phone, and
does not require paid SMS/WhatsApp infrastructure. Add the bot to a private
chat/group used by the partner and set the chat id in the backend environment.

The notification includes reservation ID, car, client name, phone, email,
dates, pickup location, amount and the `/crm` link. A separate
`payment_confirmed` alert is also emitted when Stripe confirms payment.

## Operational Flow

1. Open `/crm`.
2. Log in with the environment-specific credentials.
3. Use `Pending review` for new reservations that need follow-up.
4. Open a reservation and use WhatsApp, call or email actions.
5. Save private notes after each client contact.
6. Mark reviewed when the client or booking has been checked by the team.
7. Confirm handover only when the car handover is actually confirmed.
8. Use `New manual booking` for WhatsApp, phone or partner reservations that did not pass through checkout.
9. Use `Edit booking` for safe client, schedule, vehicle and price corrections.
10. Use `Cancel` or `Archive` to close records; do not hard-delete operational reservations.
11. Export CSV when operations needs a backup or handoff sheet.
