# Auditoria Responsive

## Objetivo

Tener una auditoria reproducible para detectar rapido si la web se rompe en los templates mas importantes antes de revisar visualmente a mano.

## Comando

```bash
npm run audit:responsive
```

## Que revisa

- plantillas criticas:
  - home
  - fleet
  - locations
  - services
  - contact
  - reserve
  - vehicle PDP
  - una SEO landing
- viewports representativos:
  - `360x640`
  - `390x844`
  - `768x1024`
  - `1024x768`
  - `1366x768`
  - `1707x893`
- checks automaticos:
  - carga sin errores de consola
  - elemento principal visible por pagina
  - `h1` visible en paginas de contenido
  - ausencia de overflow horizontal real
  - deteccion de contenido textual o interactivo empujado fuera del viewport
  - usabilidad del overlay de fechas de la home en movil, tablet y laptop

## Donde vive

- test principal: `tests/e2e/responsive-audit.spec.js`
- comando npm: `package.json`

## Como usarlo bien

1. Ejecuta `npm run audit:responsive`.
2. Si falla, abre el screenshot y el trace que deja Playwright para ese caso.
3. Corrige el layout en la plantilla o CSS correspondiente.
4. Repite el comando hasta dejarlo limpio.

## Revision manual recomendada

Aunque el test pase, conviene hacer una pasada visual corta en:

- home hero
- menu/header
- formularios
- cards con imagen
- CTA finales
- reservation flow

Para una revision visual mas comoda:

```bash
npx playwright test tests/e2e/responsive-audit.spec.js --project=desktop-chromium --reporter=html
```

## Siguiente ampliacion util

Si se anaden nuevas plantillas madre, meterlas en la matriz del spec para que entren automaticamente en la auditoria responsive.
