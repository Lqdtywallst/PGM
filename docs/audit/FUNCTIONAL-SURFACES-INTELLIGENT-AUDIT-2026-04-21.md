# Auditoría inteligente de superficies funcionales

Fecha: 2026-04-21
Ámbito: controles, paneles, filtros, formularios, stepper, persistencia y estados intermedios

## Objetivo

Encontrar fricción y fallos finos en las superficies donde el usuario:

- elige fechas
- filtra coches
- rellena datos
- avanza o retrocede entre pasos
- recarga o vuelve atrás
- espera que la UI visible coincida con el estado real

Esta auditoría no se centra en “si el flujo completo termina”, sino en si cada superficie crítica responde bien, conserva estado y evita inconsistencias silenciosas.

## Cobertura actual creada

Suite principal:
[audit-functional-surfaces.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/audit-functional-surfaces.spec.js)

Cobertura complementaria ya existente:

- [reserve-negative.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/reserve-negative.spec.js)
- [reserve-persistence.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/reserve-persistence.spec.js)
- [functional-resilience.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/functional-resilience.spec.js)
- [mobile-journeys.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/mobile-journeys.spec.js)
- [api-failure-states.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/api-failure-states.spec.js)

## Qué ya se ha demostrado útil

Esta capa ya ha sacado bugs reales:

1. `services` desktop interceptaba clicks y rompía navegación real.
2. `fleet` mostraba un filtro visual restaurado al volver atrás, pero el grid seguía en estado interno incorrecto.
3. `reserve` perdía paso actual y datos del invitado al recargar a mitad del checkout.

Conclusión: esta auditoría sí encuentra fallos de producto de verdad, no solo errores cosméticos.

## Dónde sacar más jugo

### Prioridad 1: paneles de fechas

Motivo:
- afectan `home`, `fleet` y `reserve`
- condicionan precios, disponibilidad aparente y CTAs
- cualquier inconsistencia contamina todo el funnel

Qué explotar más:
- misma fecha con hora válida e inválida
- cambio rápido de fecha ida/vuelta
- edición manual tras prefill
- recarga con query params + session state distintos
- back/forward después de editar horario
- coherencia entre fechas visibles y `href` de `Reserve`

Hipótesis de fallo:
- el panel visible cambia pero el enlace conserva un horario viejo
- el total se recalcula tarde y deja un CTA activo cuando no debería
- el reload prioriza query params antiguos sobre edición más reciente

### Prioridad 2: filtros de `fleet`

Motivo:
- son una superficie de exploración de alto uso
- la UI puede aparentar un estado correcto aunque el grid no lo esté
- impactan la confianza del usuario antes de reservar

Qué explotar más:
- marca + tipo + precio + sort en combinación
- reset tras filtros múltiples
- back/forward con filtros activos
- filtros activos + cambio de fechas
- recarga con filtros en query
- consistencia entre contador, cards visibles y CTA

Hipótesis de fallo:
- contador correcto pero cards incorrectas
- select restaurado por el navegador, estado JS desincronizado
- reset limpia controles visibles pero no el grid o viceversa

### Prioridad 3: formularios y rellenado

Motivo:
- aquí vive mucha fricción silenciosa
- fallos de validación, retry y preservación de datos hacen abandonar

Qué explotar más:
- pegar datos completos vs escribir
- campos obligatorios y opcionales mezclados
- errores y corrección sin perder lo ya escrito
- submit repetido
- retry tras 500 o timeout
- estado del botón durante envío

Hipótesis de fallo:
- error visible correcto pero campos se vacían
- submit se queda bloqueado tras fallo
- un cambio menor limpia validaciones que no debería

### Prioridad 4: stepper de `reserve`

Motivo:
- es la superficie más sensible de la transacción
- combina persistencia, pricing, validación y pago

Qué explotar más:
- `step1 -> step2 -> back -> step2`
- cambios de agenda estando en `step2`
- reload en `step2` y `step3`
- pricing antes y después de cambios rápidos
- CTA móvil vs CTA desktop

Hipótesis de fallo:
- el paso visible no coincide con el estado de datos
- el quote se recalcula pero el depósito no
- al volver atrás se pierden campos del guest

### Prioridad 5: recuperación de estado

Motivo:
- aquí salen bugs que no se ven en happy paths
- son los que hacen que la app “se sienta frágil”

Qué explotar más:
- `reload`
- `goBack`
- `goForward`
- navegación entre páginas con historial
- sesión parcial abandonada y retomada

Hipótesis de fallo:
- parte de los datos se guarda y parte no
- al volver se restaura la UI pero no el estado interno
- una función de inicialización pisa el storage al arrancar

## Orden recomendado de explotación

1. `dates-panels-deep`
2. `fleet-filters-state-sync`
3. `reserve-stepper-recovery`
4. `form-retry-and-preservation`
5. `history-navigation-and-persistence`

## Señal de calidad que más valor da aquí

No basta con comprobar “visible”.

Hay que comprobar siempre:

- valor visible del control
- estado del CTA
- URL o `href` real
- contador o resumen asociado
- persistencia tras `reload` o `back`

## Resultado actual

La capa de superficies ya es útil y seria. No solo cubre validaciones básicas, sino que ya ha demostrado capacidad para detectar:

- desincronización UI/estado
- pérdida de progreso
- navegación interceptada
- recuperación defectuosa tras historial o recarga

## Siguiente fase recomendada

Crear una subcapa específica para:

- `dates-panels-deep.spec.js`
- `fleet-filters-state.spec.js`
- `reserve-stepper-recovery.spec.js`
- `form-retry-recovery.spec.js`

La mejor inversión inmediata sigue siendo `fleet + reserve`.
