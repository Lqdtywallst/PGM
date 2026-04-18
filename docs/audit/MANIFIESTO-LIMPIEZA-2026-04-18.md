# Manifiesto de Limpieza 2026-04-18

## Se queda

- `site/` como frontera publica real
- paginas publicas, assets usados, metadata SEO y flujo de reserva
- `server/`, `app/`, `scripts/` y `docs/` activos
- `docs/audit/` con inventario relacional y backlog

## Se mueve/archiva

- `site/fleet-card-preview.html` -> `docs/previews/fleet-card-preview.html`
- `site/css/fleet-card-preview.css` -> `docs/previews/fleet-card-preview.css`
- `site/vehicle-template-base.html` -> `docs/previews/vehicle-template-base.html`
- `site/vehicle-template-premium.html` -> `docs/previews/vehicle-template-premium.html`
- `site/js/site-v2-3d.js` -> `docs/archive/3d-lab/site-v2-3d.js`
- `site/vendor/three/` -> `docs/archive/3d-lab/vendor/three/`
- `site/media/models/` -> `docs/archive/3d-lab/media/models/`

## Se elimina

- artefactos de raiz:
  - `app.lnk`
  - `filter_review_focus.png`
  - `analytics-http.err.log`
  - `analytics-http.out.log`
  - `server-http.err.log`
  - `server-http.out.log`
  - `services-redesign-http.err.log`
  - `services-redesign-http.out.log`
- carpetas efimeras:
  - `output/`
  - `temp/`
  - `test-results/`
- previews y labs obsoletos:
  - `site/font-preview-options.html`
  - `site/hero-lab.html`
  - `site/hero-lab-layout.svg`
  - `site/css/hero-lab.css`
  - `site/js/hero-lab.js`
- duplicados o restos sin uso:
  - `site/brands/`
  - `site/icons/favicon.ico`
  - `site/css/home.css`
  - `site/css/home/`
  - `site/js/home.js`
  - `site/js/home-booking.js`

## Resultado esperado

- `site/` queda libre de previews, labs y experimentos no publicos
- los artefactos locales dejan de contaminar el repo
- los recursos duplicados vuelven a tener una ubicacion canonica
