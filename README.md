# Dynasty Prestige Web

Website and reservation stack for Dynasty Prestige, focused on luxury car rental in Dubai.

## Project Areas

- `site/`: public website, home, SEO landings, assets, sitemap, robots, manifest, and legal pages
- `site/app/reserve/page.html`: reservation and payment flow
- `server/`: backend entrypoint, local static server, smoke tests, and Stripe verification helpers
- `app/api/reserve/route.js`: reservation routes mounted by the backend
- `docs/`: active project documentation, audit work, and target architecture

## Structure

- `site/index.html`: main brand website
- `site/config.js`: frontend runtime environment detection
- `server/backend-example.js`: backend entrypoint used by `npm start`
- `server/server-http.js`: local static server for previewing `site/`
- `server/test-server.js`: smoke test covering syntax, routes, sitemap, and key markup
- `server/verificar-stripe.js`: Stripe configuration verification helper

## Commands

- `npm install`: install dependencies
- `npm start`: start the backend
- `npm run http`: serve the public site locally
- `npm run audit:quick`: fast local confidence check for auditor contracts, navigation sanity and visual smoke on Home, Fleet and Contact
- `npm run audit:strict`: deeper pre-merge gate for navigation, visual robustness and functional journeys
- `npm run audit:ci`: full CI audit suite, alias of `npm run audit`
- `npm test`: run the full audit suite
- `npm run verify`: run Stripe configuration checks

## Audit Command Levels

- `test:*`: deterministic test suites and Playwright specs.
- `agent:*`: exploratory or report-generating auditors.
- `audit:*`: human-facing gates. Prefer `audit:quick`, `audit:strict` or `audit:ci` before reaching for specialist commands.

## Environment

1. Copy `.env.example` to `.env`
2. Set `STRIPE_SECRET_KEY`
3. Optionally set `STRIPE_WEBHOOK_SECRET`
4. Set mail delivery using either `EMAIL_*` or generic `SMTP_*` variables
5. Optionally extend `ALLOWED_ORIGINS`
6. Only enable `SMTP_ALLOW_SELF_SIGNED=true` if your mail setup truly needs it
7. Use `CONTACT_FORM_LOG_ONLY=true` only for local previews where you want contact submissions logged instead of sent

## Contact Form Notes

- `site/index.html` and `site/contact.html` now share the same contact form runtime helper in `site/js/contact-form.js`
- the backend contact route lives in `server/backend-example.js` at `/api/contact`
- the backend can now boot without Stripe so the contact flow can still be tested locally
- production contact delivery still requires valid mail credentials in `.env` or Railway variables

## Active Documentation

- [AUDITORIA-INICIAL-2026-03-30.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/AUDITORIA-INICIAL-2026-03-30.md)
- [CHECKLIST-REMEDIACION-2026-03-30.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/CHECKLIST-REMEDIACION-2026-03-30.md)
- [ARQUITECTURA-OBJETIVO-SITIO.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/ARQUITECTURA-OBJETIVO-SITIO.md)
- [BACKLOG-EVOLUCION-SITIO.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/BACKLOG-EVOLUCION-SITIO.md)

## Current Focus

- validate deployed routing so public landings serve their own HTML in production
- validate Stripe webhook and a full test payment flow
- keep growing the site from a landing-heavy structure into a more professional brand website without losing SEO traction

## Notes

- `npm test` covers the local technical baseline before SEO work
- the next product layer lives in `docs/architecture/`, not in ad-hoc Markdown files at the repo root

## License

Copyright 2025 Dynasty Prestige. All rights reserved.
