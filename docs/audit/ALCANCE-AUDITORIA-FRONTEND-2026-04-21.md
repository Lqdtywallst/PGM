# Alcance de Auditoria Frontend 2026-04-21

## Objetivo

Documentar antes de intervenir que se va a auditar en `HTML`, `CSS` y `JavaScript` del arbol publico `site/`, con foco en:

- limpiar y simplificar el codigo entregado al navegador
- podar CSS no utilizado con una metodologia segura
- optimizar JavaScript sin romper UX critica ni SEO tecnico
- mejorar legibilidad, mantenimiento y velocidad de revision del codigo

## Lo que si se va a auditar

## HTML

- paginas publicas bajo `site/`
- duplicacion estructural de `header`, `footer`, navegacion y bloques repetidos
- estilos inline, handlers inline y bloques ocultos que ya no aportan valor
- archivos con markup dificil de revisar por compresion o formato inconsistente
- restos legacy dentro de paginas ya migradas al sistema actual
- problemas de encoding o texto corrupto que afecten calidad o SEO

## CSS

- hojas compartidas y hojas por familia de pagina
- selectores aparentemente no usados, siempre validados contra estados JS, responsive y variantes
- reglas duplicadas entre `site-v2.css` y hojas de familia
- CSS inline que convenga extraer
- carga de fuentes y dependencias CSS externas repetidas
- coste real del CSS cargado por ruta, no solo el peso total del repo

## JavaScript

- utilidades duplicadas entre scripts publicos
- JS inline dentro de paginas grandes, especialmente `reserve`
- listeners y flujos que hoy dependen de `onclick`, `onchange` o `onsubmit`
- codigo que "corrige" en runtime estructura que deberia salir bien desde HTML
- carga de terceros y helpers globales que puedan diferirse o aislarse mejor

## Documentacion previa

Antes de borrar o refactorizar, esta auditoria dejara documentado:

- mapa de rutas y assets por familia
- backlog de deuda por archivo
- lista de candidatos a poda segura
- reglas de validacion antes de borrar CSS o mover JS
- orden recomendado de ejecucion

## Archivos y familias en alcance

## Core compartido

- `site/css/site-v2.css`
- `site/js/site-v2.js`
- shell comun que aparece en home, fleet, services, locations, about, contact y reserve

## Home y hubs

- `site/index.html`
- `site/fleet.html`
- `site/services.html`
- `site/locations.html`
- `site/about.html`
- `site/contact.html`

## Reserva

- `site/app/reserve/page.html`
- `site/config.js`

## Landings comerciales y PDP

- `site/css/seo-landing.css`
- `site/js/seo-landing.js`
- `site/pages/brands/*.html`
- `site/pages/vehicles/*.html`

## Guias locales y servicios

- `site/css/site-v2-local-guide.css`
- `site/css/site-v2-service-detail.css`
- `site/js/services-selector.js`
- `site/pages/guides/*.html`
- `site/pages/services/*.html`

## Legal y puente legacy

- `site/css/dp-bridge.css`
- `site/pages/legal/*.html`

## Hallazgos iniciales que justifican la auditoria

- `site/app/reserve/page.html` pesa aprox. `185.7 KB` y tiene `4309` lineas.
- `site/css/site-v2.css` pesa aprox. `142.2 KB` y `site/css/seo-landing.css` aprox. `66.6 KB`.
- `site/js/site-v2.js`, `site/js/site-v2-fleet.js` y `site/js/seo-landing.js` duplican helpers como `getDubaiDateString`, `getStoredBookingIntent`, `storeBookingIntent` y `emitAnalyticsEvent`.
- en el arbol publico hay al menos `52` usos de `style=` inline, `4` bloques `<style>` y `10` handlers inline (`onclick`, `onchange`, `onsubmit`, `onload`).
- `site/pages/brands/lamborghini-rental-dubai.html` contiene texto con encoding roto y hoy hace fallar `npm run audit:seo`.
- esa misma landing mantiene bloques ocultos legacy que parecen candidatos a poda.
- varias guias locales tienen HTML muy comprimido en muy pocas lineas, lo que dificulta revision, diff y mantenimiento.
- `site/js/site-v2.js` anade o corrige piezas del header en runtime, senal de que parte de la estructura compartida sigue divergente.

## Riesgos a controlar

- CSS que parece muerto pero en realidad se activa por JS, `:hover`, `:focus`, responsive o estados de overlay
- selectores usados solo en mobile o solo en desktop
- reglas compartidas entre familias que no deben borrarse por revisar solo una ruta
- JS inline de `reserve` con dependencias funcionales, validacion y Stripe
- cambios de limpieza que alteren el primer viewport o la ruta de reserva

## Metodologia de poda de CSS

No se borrara CSS solo por grep o intuicion.

Cada candidato se validara con esta secuencia:

1. mapear en que rutas se carga la hoja
2. comprobar uso visible y estados activados por JS
3. revisar responsive en mobile, tablet, laptop y desktop
4. contrastar con pruebas visuales y de viewport
5. borrar en lotes pequenos y volver a validar

## Metodologia de optimizacion JS

- extraer utilidades repetidas a un modulo compartido pequeno
- mover handlers inline a listeners en scripts dedicados
- separar `reserve` en piezas mas legibles antes de optimizar comportamiento
- evitar que el JS compense markup inconsistente si esa correccion puede resolverse en HTML
- mantener cualquier cambio compatible con la reserva, overlays, mobile bars y analitica actual

## Verificacion obligatoria tras cambios

- `npm run audit:repo`
- `npm run audit:seo`
- Playwright para primer viewport y responsive de rutas afectadas
- comprobacion visual del home por ser la zona de mayor prioridad UX
- validacion manual de `reserve` si se toca `site/app/reserve/page.html`

## Orden recomendado de trabajo

1. documentar mapa de deuda y propiedad por archivos
2. corregir encoding roto y restos HTML claramente legacy
3. extraer CSS y JS inline de `reserve`
4. consolidar utilidades JS compartidas
5. auditar y podar CSS por familias de ruta
6. cerrar con verificacion visual, responsive y SEO

## Fuera de alcance en esta primera pasada

- redisenar la identidad visual del sitio
- cambiar copys o estrategia SEO salvo errores tecnicos claros
- introducir un bundler o framework nuevo sin decidirlo antes
- tocar backend o Stripe mas alla de lo necesario para mantener `reserve` estable

## Resultado esperado

- menos deuda visible en HTML publico
- menos CSS cargado sin necesidad real
- JS mas pequeno y menos repetido
- mejor legibilidad del codigo para futuras iteraciones
- una base mas segura para optimizar rendimiento del primer viewport y del flujo de reserva
