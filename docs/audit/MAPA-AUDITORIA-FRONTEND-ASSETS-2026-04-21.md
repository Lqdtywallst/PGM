# Mapa de Auditoria Frontend y Assets 2026-04-21

## Proposito

Este documento muestra que se va a auditar antes de borrar CSS, mover JavaScript o limpiar HTML publico.

La regla base es: no se borra por intuicion. Primero se confirma si el archivo se carga, donde se carga, si tiene estados JS/responsive, y que pruebas deben pasar despues.

## Resumen actual

- URLs publicas auditadas desde `site/sitemap.xml`: `32`
- CSS locales bajo `site/css`: `12`
- JS locales bajo `site/js`: `5`
- CSS locales sin referencia directa desde las URLs del sitemap: `2`
- JS locales sin referencia directa desde las URLs del sitemap: `0`
- deuda HTML visible detectada en superficie publica: `54` estilos inline, `4` bloques `<style>`, `10` handlers inline

## CSS por ruta/familia

| Familia | Rutas | CSS cargado | Estado |
| --- | ---: | --- | --- |
| Home | 1 | `css/site-v2.css` | Auditar coste first viewport |
| Fleet | 1 | `css/site-v2.css`, `css/site-v2-fleet.css` | En uso |
| Services hub | 1 | `css/site-v2.css`, `css/site-v2-services.css` | En uso, revisar reglas historicas |
| Locations hub | 1 | `css/site-v2.css`, `css/site-v2-locations.css` | En uso, revisar bloques no renderizados |
| About | 1 | `css/site-v2.css`, `css/site-v2-about.css` | En uso |
| Contact | 1 | `css/site-v2.css`, `css/site-v2-contact.css` | En uso |
| Reserve | 1 | Font Awesome CDN, `css/site-v2.css`, CSS inline | Alto potencial de extraccion |
| Guias locales | 6 | `css/site-v2.css`, `css/site-v2-local-guide.css` | En uso |
| Servicios detalle | 6 | `css/site-v2.css`, `css/site-v2-service-detail.css` | En uso |
| Brand/PDP | 11 | `css/site-v2.css`, `css/seo-landing.css` | En uso, podar por componentes |
| Legal | 2 | Font Awesome CDN, `css/dp-bridge.css`, CSS inline | Replantear legal CSS |

## JS por ruta/familia

| Familia | Rutas | JS cargado | Estado |
| --- | ---: | --- | --- |
| Core publico | 30 | `js/site-v2.js` | En uso amplio, candidato a dividir por responsabilidades |
| Fleet | 1 | `js/site-v2.js`, `js/site-v2-fleet.js` | En uso, duplicacion de helpers |
| Services hub | 1 | `js/site-v2.js`, `js/services-selector.js` | En uso |
| Contact | 1 | `js/site-v2.js`, `config.js`, `js/contact-form.js` | En uso, queda `onsubmit` inline |
| Reserve | 1 | `js/site-v2.js`, `config.js`, JS inline | Alto potencial de extraccion |
| Brand/PDP | 9 de 11 con booking JS | `js/site-v2.js`, `js/seo-landing.js` | Revisar consistencia |
| Legal | 2 | Ningun JS local | Correcto si se mantiene simple |

## Candidatos directos a revisar para poda

## `site/css/hub-pages.css`

- Peso aproximado: `6.6 KB`
- Lineas: `381`
- No aparece cargado por ninguna URL del sitemap.
- Solo aparece en documentacion/inventario, en `server/test-server.js` como required file y en un test unitario como fixture legacy.
- Primera decision recomendada: archivar o borrar si ya no hay intencion de recuperar la familia `hub-pages`.
- Trabajo asociado: actualizar `server/test-server.js` si se elimina, porque hoy lo exige como archivo requerido.

## `site/css/site-v2-legal.css`

- Peso aproximado: `3.9 KB`
- Lineas: `206`
- No aparece cargado por ninguna URL del sitemap.
- Sus clases (`legal-page`, `legal-hero`, `legal-panel`, etc.) no aparecen en HTML publico actual.
- Las paginas legales usan actualmente `css/dp-bridge.css`, Font Awesome CDN y bloques `<style>` inline.
- Primera decision recomendada: elegir entre borrar el CSS no usado o migrar las paginas legales para usarlo. No conviene dejarlo huerfano.

## No borrar aunque el inventario viejo los haya marcado

El inventario relacional marca algunos CSS como candidatos por falta de evidencia estatica, pero el mapa por sitemap confirma que si se cargan:

- `site/css/dp-bridge.css`: usado por las 2 paginas legales.
- `site/css/site-v2-local-guide.css`: usado por 6 guias locales.
- `site/css/site-v2-service-detail.css`: usado por 6 paginas de servicios detalle.

Estos no son candidatos directos de borrado. Solo entran en poda interna de selectores si la auditoria visual confirma que sobran reglas concretas.

## CSS grande que no se debe borrar de golpe

## `site/css/site-v2.css`

- Peso aproximado: `142.2 KB`
- Se carga en `30` rutas publicas.
- Mezcla base visual, header, home, overlays, cards, footer y componentes compartidos.
- Riesgo: borrar selectores aqui puede afectar muchas familias y el primer viewport.
- Auditoria recomendada: separar mentalmente en `base`, `layout`, `nav`, `home`, `shared cards`, `footer`, `mobile` antes de tocar.

## `site/css/seo-landing.css`

- Peso aproximado: `66.6 KB`
- Se carga en `11` rutas brand/PDP.
- Tiene clases que parecen pertenecer a variantes de PDP no activas en el HTML actual.
- Auditoria recomendada: validar por todas las landings/PDP antes de podar, especialmente estados mobile, booking card y CTA sticky.

## CSS con candidatos internos de poda

Estos resultados son solo candidatos por analisis estatico. No autorizan borrado directo.

| CSS | Senal inicial | Riesgo |
| --- | --- | --- |
| `site/css/seo-landing.css` | clases `vehicle-pdp-film*`, `vehicle-pdp-motion*`, `vehicle-pdp-review*` no aparecen en HTML/JS actual | Podrian ser variantes futuras o baseline visual |
| `site/css/site-v2-fleet.css` | clases `fleet-page-hero*` y `fleet-filter-button` no aparecen en HTML/JS actual | Puede ser remanente de layout anterior |
| `site/css/site-v2-services.css` | clases `services-lane*`, `services-private*`, `services-editorial*` no aparecen en HTML/JS actual | Revisar contra `services.html` y estados selector |
| `site/css/site-v2-locations.css` | clases `locations-operations*`, `locations-scene*`, `locations-cluster*` no aparecen en HTML/JS actual | Revisar si fueron secciones retiradas |
| `site/css/site-v2-local-guide.css` | clases `local-guide-spotlight*` no aparecen en HTML/JS actual | Candidato pequeno tras revisar guias |

## HTML a auditar primero

## `site/app/reserve/page.html`

- Peso aproximado: `185.7 KB`
- Lineas actuales detectadas: `4768`
- Carga `css/site-v2.css`, Font Awesome CDN y `config.js`.
- Contiene CSS inline voluminoso, JS inline y `9` handlers inline.
- Accion recomendada: no optimizar comportamiento todavia; primero separar en archivos `reserve` dedicados y reemplazar handlers inline por listeners.

## `site/pages/brands/lamborghini-rental-dubai.html`

- Peso aproximado: `41 KB`
- Tiene `19` estilos inline.
- Mantiene bloques legacy ocultos con `hidden` + `display:none`.
- `npm run audit:seo` marca esta ruta con `page contains broken encoding markers`.
- Accion recomendada: corregir encoding y podar HTML legacy antes de tocar CSS comun.

## Guias locales comprimidas

Archivos como:

- `site/pages/guides/luxury-car-rental-dubai.html`
- `site/pages/guides/abu-dhabi-luxury-car-rental.html`
- `site/pages/guides/dubai-airport-luxury-car-rental.html`
- `site/pages/guides/palm-jumeirah-luxury-car-rental.html`
- `site/pages/guides/dubai-marina-luxury-car-rental.html`

Tienen mucho contenido en unas `66` lineas. No es necesariamente peor para el navegador, pero si empeora diffs, revision, mantenimiento y auditorias futuras.

## JavaScript a auditar primero

## `site/js/site-v2.js`

- Peso aproximado: `37.5 KB`
- Se carga en `30` rutas.
- Responsabilidades mezcladas: header, hero video, overlay, mobile drawer, mobile action bar, home booking, analytics y booking intent.
- Senal de deuda: anade piezas del header en runtime para normalizar paginas divergentes.
- Accion recomendada: documentar responsabilidades y extraer utilidades compartidas antes de dividirlo.

## `site/js/site-v2-fleet.js`

- Peso aproximado: `23 KB`
- Solo se carga en `fleet.html`.
- Duplica helpers de fecha, session storage y analytics con `site-v2.js` y `seo-landing.js`.
- Accion recomendada: conservar como script de ruta, pero mover helpers compartidos.

## `site/js/seo-landing.js`

- Peso aproximado: `8.3 KB`
- Se carga en 9 rutas brand/PDP.
- No se carga en todas las paginas que comparten `seo-landing.css`.
- Accion recomendada: revisar si `lamborghini-rental-dubai.html` y `mercedes-rental-dubai.html` deben usarlo o si su booking form necesita otro patron.

## Dependencias externas a revisar

- Font Awesome CDN en `reserve` y legal.
- Google Fonts con familias diferentes por pagina.
- `https://js.stripe.com/v3/` se inyecta desde el JS inline de `reserve`.

Objetivo: no eliminar por eliminar, sino reducir terceros en rutas donde no aportan valor visible.

## Orden de ejecucion recomendado

1. Corregir la ruta que rompe SEO: `site/pages/brands/lamborghini-rental-dubai.html`.
2. Resolver los CSS huerfanos: `hub-pages.css` y `site-v2-legal.css`.
3. Crear deuda controlada de `reserve`: extraer CSS inline a `site/css/site-v2-reserve.css` o equivalente.
4. Extraer JS inline de `reserve` a un script dedicado.
5. Consolidar helpers comunes de booking intent, fecha Dubai y analytics.
6. Auditar selectores internos por familia y borrar CSS en lotes pequenos.
7. Validar visualmente home, fleet, services, locations, PDP/brand y reserve.

## Validacion minima antes de borrar CSS

- `npm run audit:repo`
- `npm run audit:seo`
- Playwright first viewport para home y landings clave
- responsive matrix para rutas afectadas
- revision visual en browser antes/despues

## Decision de seguridad

Hasta que una regla CSS pase por esta matriz, se etiqueta como:

- `candidato directo`: archivo no cargado por sitemap y sin referencias publicas reales
- `candidato interno`: selector o bloque potencialmente muerto dentro de CSS cargado
- `en uso`: archivo cargado por rutas publicas, no borrar completo
- `pendiente de decision`: archivo no usado que podria estar esperando migracion futura
