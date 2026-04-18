# Locations Measurement Setup

## Objetivo

Dejar el cluster `locations` listo para medir clicks de negocio local sin esperar a tener GTM o GA4 completamente cerrados en el repo.

El alcance actual cubre:

- `locations.html`
- `luxury-car-rental-dubai.html`
- `abu-dhabi-luxury-car-rental.html`
- `dubai-airport-luxury-car-rental.html`
- `palm-jumeirah-luxury-car-rental.html`
- `dubai-marina-luxury-car-rental.html`

## Que queda instrumentado

Los CTAs principales del cluster ahora emiten eventos front-end cuando el usuario hace click en:

- WhatsApp principal del hub
- reserva principal del hub
- CTAs de reserva o WhatsApp dentro de las tarjetas operativas del hub
- reserva del CTA final del hub
- reserva del hero de cada guia local
- reserva y WhatsApp del CTA final de cada guia local
- telefono principal del bloque de contacto de cada pagina local

No se instrumentan enlaces de footer social, breadcrumbs o enlaces editoriales a guias hermanas.

## Eventos disponibles

### `location_whatsapp_click`

Se dispara al hacer click en un CTA principal hacia `wa.me` dentro del cluster `locations`.

### `location_reservation_click`

Se dispara al hacer click en un CTA principal hacia `./app/reserve/page.html` dentro del cluster `locations`.

### `location_call_click`

Se dispara al hacer click en el telefono principal visible de cada pagina local.

## Parametros emitidos

Cada evento envia este contexto:

- `cluster_name`
- `location_name`
- `cta_placement`
- `cta_channel`
- `cta_label`
- `page_path`
- `page_title`
- `destination_path`
- `destination_host`

Valores esperados de `location_name` en esta fase:

- `locations_hub`
- `dubai_guide`
- `abu_dhabi_guide`
- `dubai_airport_guide`
- `palm_jumeirah_guide`
- `dubai_marina_guide`

Valores esperados de `cta_placement`:

- `hero`
- `operations`
- `zone_card`
- `final_cta`
- `footer_contact`

Valores esperados de `cta_channel`:

- `whatsapp`
- `reservation`
- `call`

## Compatibilidad de integracion

La capa se comporta asi:

1. Si existe `window.google_tag_manager`, hace `dataLayer.push({ event: ... })`
2. Si no existe GTM pero si `window.gtag`, usa `gtag("event", ...)`
3. Si no existe ninguna de las dos, sigue empujando el evento a `window.dataLayer` para debug local y futura integracion

Esto reutiliza la misma pasarela front-end ya usada por `services`.

## Atribucion ligera para la reserva

Cuando el click termina en cualquier evento con sufijo `_reservation_click`, el navegador guarda una copia del ultimo contexto en:

- `sessionStorage["dynastyReservationAttribution"]`

Esto deja preparada una siguiente iteracion del checkout sin reabrir el cluster local.

## Como validar rapido

### Navegador local

Abrir cualquier URL del cluster con:

```text
?analyticsDebug=1
```

Despues hacer click en un CTA y revisar consola:

```text
[dynasty-analytics] location_whatsapp_click ...
[dynasty-analytics] location_reservation_click ...
[dynasty-analytics] location_call_click ...
```

### Con GTM Preview

1. Abrir preview de GTM
2. Entrar en una URL del cluster
3. Click en reserva, WhatsApp o telefono
4. Confirmar que aparece el evento custom con sus parametros

### Con GA4 DebugView

1. Entrar en DebugView
2. Navegar por una URL del cluster
3. Ejecutar el click
4. Verificar llegada de `location_whatsapp_click`, `location_reservation_click` o `location_call_click`

## Search Console: parte manual

Search Console no se configura desde este repo, pero la lectura recomendada para este cluster queda asi:

1. Filtrar `locations.html` por separado de las cinco guias
2. Revisar queries de ciudad, aeropuerto y distrito
3. Medir CTR del hub contra CTR de las guias
4. Cruzar esa lectura con los clicks de reserva, WhatsApp y llamada
5. No abrir una nueva zona hasta ver una necesidad clara en impresiones, consultas o conversion

## Limites de esta fase

- no se incluye `measurement_id` de GA4 en el repo
- no se crea persistencia server-side de eventos
- no se envia todavia la atribucion al backend de reserva
- las llamadas se miden desde el bloque principal de contacto de cada pagina, no desde un modulo dedicado de call CTA

## Nota importante sobre FAQ

Google sigue documentando `FAQPage`, pero los rich results FAQ solo se muestran de forma muy restringida para sitios de gobierno y salud.

Para este proyecto, `FAQPage` se mantiene por orden estructural y coherencia semantica con el HTML visible, no como expectativa realista de ganar un rich result FAQ en este sector.

Referencia oficial revisada el `2026-04-18`:

- https://developers.google.com/search/blog/2023/08/howto-faq-changes
- https://developers.google.com/search/docs/appearance/structured-data/faqpage

## Siguiente iteracion razonable

La siguiente mejora buena, cuando GTM o GA4 esten operativos, es:

1. crear custom dimensions para `location_name`, `cta_placement` y `cta_channel`
2. leer `dynastyReservationAttribution` dentro del checkout
3. emitir un evento de llegada a reserva desde el cluster local
4. unir esa atribucion con la reserva confirmada
