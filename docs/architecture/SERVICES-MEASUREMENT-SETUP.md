# Services Measurement Setup

## Objetivo

Dejar el cluster `services` listo para medir clicks de negocio sin bloquearse por no tener todavia un contenedor GTM o una propiedad GA4 cerrada en el repo.

El alcance actual cubre:

- `services.html`
- `chauffeur-service-dubai.html`
- `airport-concierge-dubai.html`
- `hotel-villa-airport-delivery-dubai.html`
- `wedding-event-car-rental-dubai.html`
- `business-car-rental-dubai.html`
- `monthly-luxury-car-rental-dubai.html`

## Que queda instrumentado

Los CTAs principales del cluster ahora emiten eventos front-end cuando el usuario hace click en:

- WhatsApp principal del hero
- WhatsApp del CTA final
- WhatsApp de private request en el hub
- apertura del flujo de reserva desde el cluster

No se instrumentan links de footer ni enlaces utilitarios para no mezclar ruido con conversion intent real.

## Alcance Cerrado Del Cluster

Solo estas 7 URLs pueden emitir eventos del cluster `services`.

Quedan fuera:

- paginas de ubicacion
- paginas de categoria
- paginas de marca
- paginas de modelo o mezclas `brand + area`

Si una URL no pertenece a ese contrato, no debe emitir `service_whatsapp_click` ni `service_reservation_click`.

## Eventos disponibles

### `service_whatsapp_click`

Se dispara al hacer click en un CTA principal hacia `wa.me` dentro del cluster `services`.

### `service_reservation_click`

Se dispara al hacer click en un CTA principal hacia `./app/reserve/page.html` dentro del cluster `services`.

## Parametros emitidos

Cada evento envia este contexto:

- `cluster_name`
- `service_name`
- `cta_placement`
- `cta_channel`
- `cta_label`
- `page_path`
- `page_title`
- `destination_path`
- `destination_host`

Valores esperados de `cta_placement` en esta fase:

- `hero`
- `private_request`
- `final_cta`

Valores esperados de `cta_channel`:

- `whatsapp`
- `reservation`

## Compatibilidad de integracion

La capa se comporta asi:

1. Si existe `window.google_tag_manager`, hace `dataLayer.push({ event: ... })`
2. Si no existe GTM pero si `window.gtag`, usa `gtag("event", ...)`
3. Si no existe ninguna de las dos, sigue empujando el evento a `window.dataLayer` para debug local y futura integracion

Esto permite conectar GTM o GA4 despues sin reabrir el HTML del cluster.

## Atribucion ligera para la reserva

Cuando el click es `service_reservation_click`, el navegador guarda una copia del ultimo contexto en:

- `sessionStorage["dynastyReservationAttribution"]`

Esto no implica persistencia de backend. Sirve para:

- depuracion local
- leer la atribucion en una futura iteracion del checkout
- validar que el ultimo salto a reserva salio del cluster `services`

## Como validar rapido

### Navegador local

Abrir cualquier URL del cluster con:

```text
?analyticsDebug=1
```

Despues hacer click en un CTA principal y revisar consola:

```text
[dynasty-analytics] service_whatsapp_click ...
[dynasty-analytics] service_reservation_click ...
```

### Con GTM Preview

1. Abrir preview de GTM
2. Entrar en una URL del cluster
3. Click en CTA de WhatsApp o reserva
4. Confirmar que aparece el evento custom con sus parametros

### Con GA4 DebugView

1. Entrar en DebugView
2. Navegar por una URL del cluster
3. Ejecutar el click
4. Verificar llegada de `service_whatsapp_click` o `service_reservation_click`

## Search Console: parte manual

Search Console no se puede configurar desde este repo. Lo que si queda preparado es la capa de pagina para luego leer mejor el cluster.

Rutina recomendada:

1. Filtrar por paginas del cluster `services`
2. Revisar impresiones, CTR y queries por URL
3. Separar el hub de las 6 detail pages
4. No abrir nuevas URLs `service x location` hasta que las 6 paginas tengan demanda diferenciada

## Limites de esta fase

- no se incluye `measurement_id` de GA4 en el repo
- no se crea persistencia server-side de eventos
- no se modifica el checkout para enviar la atribucion al backend
- no se automatiza Search Console

## Siguiente iteracion razonable

La siguiente mejora buena, cuando tengamos GTM o GA4 operativo, es:

1. crear custom dimensions para `service_name`, `cta_placement` y `cta_channel`
2. leer `dynastyReservationAttribution` en la pagina de reserva
3. emitir un evento adicional de llegada a checkout desde services
4. unir esa atribucion con la reserva confirmada
