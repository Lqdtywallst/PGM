# Server Structure

The server code is grouped by ownership so runtime code, admin tools and auditors do not live in one flat folder.

## Folders

- `apps/`: executable entrypoints for the Express backend and local static server.
- `admin/`: private CRM, admin auth, content editor and admin-only consistency checks.
- `reservations/`: reservation persistence and availability logic.
- `integrations/`: external services such as email, Google Reviews and Stripe verification.
- `renderers/`: data-to-HTML renderers for fleet cards, global header, services and locations.
- `audits/`: SEO, visual, navigation, functional and memory audit cores.
- `design-system/`: visual contract definitions and component-contract audits.
- `pricing/`: pricing-agent domain logic.
- `shared/`: small cross-domain utilities such as public route mapping and static-server helpers.
- `data/`: JSON source-of-truth files used by renderers, admin and pricing.

## Entry Points

- Production/Railway backend: `node server/apps/backend.js`
- Local static site server: `node server/apps/static-server.js`
- Smoke test: `node server/audits/test-server.js`

Keep new files inside the closest domain folder. Only use `shared/` for utilities that are genuinely reused by more than one domain.
