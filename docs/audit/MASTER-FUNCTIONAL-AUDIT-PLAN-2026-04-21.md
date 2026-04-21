# Plan maestro de auditoría funcional seria

Fecha: 2026-04-21
Proyecto: PGM / Dynasty Prestige
Objetivo: auditar el producto como lo vive un cliente real, no solo como una colección de pantallas.

## Principio rector

La mejor práctica para esta web es una auditoría funcional por capas, pero con el peso principal en `misiones reales de cliente`.

Orden recomendado:

1. `Misiones de cliente`
2. `Contratos de estado`
3. `Recovery y resiliencia`
4. `Cross-browser y variantes`
5. `Adversarial y perturbación`

Esto sigue la filosofía recomendada por Playwright y Lighthouse:

- probar comportamiento visible para el usuario
- mantener tests aislados
- mockear solo fronteras externas
- medir también estados profundos del flujo, no solo la carga inicial

## Qué es cada capa

### 1. Misiones de cliente

Aquí comprobamos si un usuario logra su objetivo de negocio.

Ejemplos:

- `home -> fleet -> reserve -> pay`
- `services -> detail -> reserve`
- `fleet -> reserve -> back -> cambiar coche -> reserve`
- `mobile -> overlay -> fleet -> reserve`

Qué buscamos:

- continuidad de contexto
- consistencia entre páginas
- conversión real del funnel
- pérdida de intención al cambiar de pantalla

### 2. Contratos de estado

Aquí comprobamos que la app respeta invariantes críticos.

Ejemplos:

- el CTA refleja el estado real
- el contador de `fleet` coincide con las cards visibles
- el `href` de `Reserve` lleva las fechas correctas
- un error invalida el paso correcto
- un cambio válido reactiva el flow

Qué buscamos:

- sincronía entre UI visible y estado interno
- validación correcta
- navegación real
- no regresiones finas

### 3. Recovery y resiliencia

Aquí comprobamos qué pasa cuando el usuario interrumpe o algo falla.

Ejemplos:

- `reload` a mitad de checkout
- `back` desde `reserve` a `fleet`
- fallo en `/api/reserve`
- fallo en `/api/reserve/confirm`
- tarjeta rechazada
- retry tras error

Qué buscamos:

- si el usuario pierde progreso
- si el sistema comunica bien el fallo
- si puede recuperarse sin reiniciar todo

### 4. Adversarial y perturbación

Aquí intentamos romper comportamientos plausibles sin salirnos de lo que haría un cliente real.

Ejemplos:

- doble click en `Pay`
- doble submit en `contact`
- fallo transitorio y retry inmediato
- mutación rápida de filtros antes de reservar

Qué buscamos:

- duplicados silenciosos
- carrera entre estado visible y estado real
- recuperación con intención preservada
- protección contra acciones repetidas

## Regla de diseño de pruebas

### Qué sí hacer

- afirmar resultados de negocio
- comprobar datos clave entre pasos
- validar estados visibles al usuario
- introducir interrupciones reales:
  - `reload`
  - `back`
  - `forward`
  - cambio de coche
  - error backend
  - rechazo de pago

### Qué no hacer

- centrar la auditoría en clases CSS o detalles internos
- depender de terceros reales para validar negocio
- convertir toda la suite en mocks artificiales
- hacer una auditoría solo de “botones visibles”

## Fronteras que sí conviene mockear

Mock recomendados:

- Stripe
- endpoints de correo/confirmación
- APIs externas no controladas
- WhatsApp como destino externo

No conviene mockear:

- handoffs internos entre `home`, `fleet`, `reserve`, `services`
- persistencia propia
- validación del stepper
- sincronía entre filtros, URLs y pantalla

## Invariantes funcionales más importantes de PGM

En cada misión relevante conviene verificar al menos:

1. `vehicle`
2. `startDate`
3. `endDate`
4. `pickupTime`
5. `dropoffTime`
6. `pickupLocation`
7. `pricePerDay`
8. `summaryTotal`
9. `deposit`
10. `paso actual del flow`

Si cualquiera cambia sin motivo al cruzar una pantalla, hay bug de negocio.

## Estado actual de la auditoría reorganizada

### Capa 1: misiones

Script:

`npm run audit:functional:missions`

Incluye:

- [audit-customer-complete-flows.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/audit-customer-complete-flows.spec.js)
- [services-to-reserve-funnels.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/services-to-reserve-funnels.spec.js)
- [switch-car-mid-flow.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/switch-car-mid-flow.spec.js)

### Capa 2: contratos

Script:

`npm run audit:functional:contracts`

Incluye:

- [audit-functional-surfaces.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/audit-functional-surfaces.spec.js)
- [reserve-negative.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/reserve-negative.spec.js)
- [services-deep-links.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/services-deep-links.spec.js)

### Capa 3: recovery

Script:

`npm run audit:functional:recovery`

Incluye:

- [reserve-persistence.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/reserve-persistence.spec.js)
- [functional-resilience.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/functional-resilience.spec.js)
- [api-failure-states.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/api-failure-states.spec.js)
- [complete-flow-error-recovery.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/complete-flow-error-recovery.spec.js)
- [mobile-friction-points.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/mobile-friction-points.spec.js)

### Ejecución completa

Script maestro:

`npm run audit:functional:master`

### Capa 4: adversarial

Script:

`npm run audit:functional:adversarial`

Incluye:

- [adversarial-functional-audit.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/adversarial-functional-audit.spec.js)

## Cómo usar esto bien

### Para detectar regresiones de negocio

Ejecutar:

`npm run audit:functional:missions`

### Para revisar integridad del producto

Ejecutar:

`npm run audit:functional:contracts`

### Para cazar fallos serios de vida real

Ejecutar:

`npm run audit:functional:recovery`

### Para una pasada fuerte antes de release

Ejecutar:

`npm run audit:functional:master`

## Qué priorizar a partir de ahora

### Prioridad máxima

1. `services -> reserve`
2. `switch car mid-flow`
3. `reload/back/forward` en `reserve`
4. `payment success + confirm failure`
5. `mobile filter + reserve`
6. `double submit / rapid mutation / retry adversarial`

### Prioridad siguiente

1. Firefox
2. WebKit
3. warm vs cold flows
4. Lighthouse snapshots en estados profundos
5. timespans en interacciones críticas

## Mejor práctica final para este proyecto

La auditoría funcional de PGM debe parecerse más a una `simulación de comportamientos de cliente` que a un inventario de componentes.

Los tests de paneles, filtros y formularios siguen siendo valiosos, pero como `soporte de contratos`.

El corazón de la calidad aquí debe ser:

- misiones reales
- invariantes entre pasos
- recovery tras fallo o interrupción

## Fuentes oficiales consultadas

- Playwright Best Practices: https://playwright.dev/docs/best-practices
- Playwright Isolation: https://playwright.dev/docs/browser-contexts
- Playwright Network: https://playwright.dev/docs/network
- Playwright Emulation: https://playwright.dev/docs/emulation
- Playwright Projects: https://playwright.dev/docs/test-projects
- Playwright Assertions: https://playwright.dev/docs/test-assertions
- Lighthouse user flows: https://web.dev/articles/lighthouse-user-flows
- Lighthouse overview: https://developer.chrome.com/docs/lighthouse/overview/
