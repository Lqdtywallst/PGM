# Public Pages

This folder contains public HTML pages grouped by customer intent.

- `core/`: main navigation pages served at root URLs such as `/fleet.html` and `/services.html`.
- `vehicles/`: individual vehicle landing pages.
- `brands/`: brand landing pages.
- `services/`: service detail landing pages.
- `guides/`: location and SEO guide pages.
- `legal/`: legal and terms pages.

Public URLs are preserved by `server/public-page-map.js` plus hosting rewrites in `vercel.json`, `netlify.toml`, `site/_redirects`, and `site/.htaccess`.
