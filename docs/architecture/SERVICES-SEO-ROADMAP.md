# Services SEO Roadmap

## Objetivo

Definir como debe evolucionar el cluster `services` de Dynasty Prestige para:

- convertir `services.html` en una pagina madre real de decision,
- reforzar las seis landings de servicio con mejor diferenciacion,
- mejorar conversion desde busquedas con intencion clara,
- y evitar solape, thin content y promesas que el negocio no pueda sostener.

Fecha de trabajo: `2026-04-18`

## Lectura Ejecutiva

La base actual ya va en la direccion correcta:

- `services.html` ya funciona como hub y enlaza a las seis landings principales
- las seis URLs ya existen, son canonicas y estan en sitemap
- el stack tecnico ya protege `title`, meta description, canonical y `h1`

El siguiente paso no es crear mas URLs. Es hacer que el cluster actual sea mas fuerte como sistema:

1. un hub madre claro
2. seis paginas detalle con roles distintos
3. breadcrumbs visibles y consistentes
4. mejor enlazado entre servicio, ubicacion, flota y reserva
5. trust signals y pruebas operativas de nivel medio

## Contrato Publico De URLs

Durante esta fase se mantienen sin cambios:

- `/services.html`
- `/chauffeur-service-dubai.html`
- `/airport-concierge-dubai.html`
- `/hotel-villa-airport-delivery-dubai.html`
- `/wedding-event-car-rental-dubai.html`
- `/business-car-rental-dubai.html`
- `/monthly-luxury-car-rental-dubai.html`

Reglas:

- no mover a `/services/`
- no cambiar slugs
- no hacer `301`
- no abrir variantes `service + location` hasta medir el cluster actual

## Limite Del Cluster

El cluster `services` queda definido solo por estas 7 URLs.

Queda fuera del cluster:

- landings de ubicacion como `luxury-car-rental-dubai.html`, `abu-dhabi-luxury-car-rental.html` o `palm-jumeirah-luxury-car-rental.html`
- landings de categoria como `supercar-rental-dubai.html`
- landings de marca como `lamborghini-rental-dubai.html`, `ferrari-rental-dubai.html`, `mercedes-rental-dubai.html`, `porsche-rental-dubai.html` y `rolls-royce-rental-dubai.html`
- landings de modelo o area mixta como `ferrari-rental-downtown-dubai.html`, `g63-rental-dubai-marina.html` o `lamborghini-rental-palm-jumeirah.html`

Regla operativa:

- no tratar estas URLs externas como detalles de servicio
- no medirlas como parte de `services`
- no usarlas para evaluar si el cluster `services` funciona o no
- no abrir mas URLs de servicio fuera del contrato de 7 paginas

## Mapa De Intencion Por URL

### `services.html`

- rol: pagina madre
- intencion principal: entender el catalogo de servicios y elegir el camino correcto
- objetivo: distribuir enlazado interno y mandar al usuario a una landing detalle o a reserva

### `chauffeur-service-dubai.html`

- intencion principal: chofer privado, transfers, movimiento por horas o por jornada
- diferenciacion: continuidad operativa y soporte conductor

### `airport-concierge-dubai.html`

- intencion principal: llegada al aeropuerto, meet and greet, transfer y primera coordinacion
- diferenciacion: terminal, vuelo, llegada y secuencia de entrada en ciudad

### `hotel-villa-airport-delivery-dubai.html`

- intencion principal: entrega y recogida del coche segun propiedad o punto de handover
- diferenciacion: hotel, villa, residencia, aeropuerto y logica de handover

### `wedding-event-car-rental-dubai.html`

- intencion principal: propuestas, bodas, eventos, shootings y llegadas de imagen
- diferenciacion: tono del evento, presencia visual y coordinacion de venue

### `business-car-rental-dubai.html`

- intencion principal: movilidad ejecutiva, delegaciones, family office, partners
- diferenciacion: puntualidad, discrecion y movimiento orientado a agenda

### `monthly-luxury-car-rental-dubai.html`

- intencion principal: estancias largas y movilidad premium retained
- diferenciacion: soporte estable, mejor fit de vehiculo y ritmo de varias semanas

## Inventario De Prueba Real Utilizable

Nivel acordado: prueba media.

Se puede sostener con:

- zonas reales de cobertura: Dubai, Abu Dhabi, DXB, DWC, Palm, Marina, Downtown y hoteles/residencias
- proceso real: consulta, confirmacion, handover, retorno, un punto de contacto
- formatos reales: self-drive, chauffeur, airport support, delivery y monthly planning
- ejemplos de guest profile: hotel stay, villa stay, executive visit, event arrival, long stay
- material visual propio ya disponible en `site/images/`

No asumir por defecto:

- ratings, estrellas o reviews marcadas con schema
- claims absolutos del tipo "best in Dubai"
- tiempos garantizados que el negocio no haya validado
- disponibilidad universal para cualquier lugar o ventana

## Claims Prohibidos O Delicados

- "numero 1"
- "guaranteed availability"
- "instant confirmation" si no aplica
- "free delivery everywhere" si depende del caso
- "VIP" como relleno sin explicar la operativa real
- markup de `Review`, `AggregateRating` o `FAQPage` como palanca SEO

## Arquitectura Objetivo Del Cluster

### Hub madre

`services.html` debe contener:

- breadcrumb visible
- H1 claro
- seis servicios nucleares
- guias por ubicacion relacionadas
- trust strip con claims verificables
- FAQ visible
- CTA a reserva y WhatsApp

### Landings detalle

Cada landing debe compartir este orden:

- breadcrumb visible
- hero con CTA principal
- who it suits
- what is included
- vehicle or service fit
- how it works
- service standards o trust block
- related services
- related locations
- FAQ visible
- CTA final

## Enlazado Interno Minimo

- `services.html` enlaza a las seis landings
- cada landing enlaza a `services.html`, reserva y 2-3 servicios relacionados
- cada landing enlaza a 1-3 landings de ubicacion relevantes
- `fleet.html` debe enlazar de forma visible al menos a chauffeur, airport concierge, tailored delivery y monthly rental
- `locations.html` debe enlazar de forma contextual al menos a airport concierge, tailored delivery y chauffeur o business mobility

## SEO Pack Minimo

### Para el hub y cada detail page

- `title` unico
- meta description unica
- canonical unico
- un solo `h1`
- Open Graph completo
- Twitter card completa
- breadcrumb visible
- `BreadcrumbList` en JSON-LD

### Para las detail pages

- mantener `Service` JSON-LD
- alinear `url` del schema con canonical
- no anadir `FAQPage`
- no anadir `Review` ni `AggregateRating`

## Medicion Y Criterio De Expansion

Antes de abrir nuevas URLs tipo `service + location`, revisar:

- impresiones por URL
- CTR por URL
- queries reales por landing
- clicks a WhatsApp y reserva desde el cluster
- cobertura de indexacion
- existencia de copy y prueba realmente distinta

Solo abrir una nueva URL si:

- hay demanda visible
- la intencion no queda bien resuelta por una landing actual
- existe contenido diferencial real
- y no crea canibalizacion clara con hub, servicio o local guide ya fuerte

## Checklist De Implementacion

- anadir roadmap maestro del cluster
- anadir OG y Twitter cards al hub y a las seis landings
- anadir breadcrumb visible al hub y a las seis landings
- anadir `BreadcrumbList` en hub y detalle
- reforzar trust y related locations en detalle
- reforzar links de `fleet.html` y `locations.html` hacia detalles de servicio
- ampliar smoke tests para cubrir metadata, breadcrumbs, schema y links del cluster
