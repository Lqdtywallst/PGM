# Auditor funcional humano

Fecha: 2026-04-21
Proyecto: PGM / Dynasty Prestige

## Objetivo

El auditor funcional debe comportarse como un cliente serio, no como un robot que solo comprueba botones.

Su trabajo es detectar si una persona puede completar intenciones reales:

- descubrir una marca o coche
- comparar fleet y filtros
- llevar fechas, horas, coche y precio hacia reserve
- completar contacto
- completar reserve con pago mockeado
- recuperarse de validaciones, errores, reload, back y retry
- usar la web en mobile sin quedar atrapada

## Que audita

### 1. Continuidad de intencion

Comprueba que el contexto de negocio no se pierde entre pantallas:

- `vehicle`
- `startDate`
- `endDate`
- `pickupTime`
- `dropoffTime`
- `pickupLocation`
- `pricePerDay`
- resumen, deposito y paso actual

Si una CTA cambia pantalla pero pierde esos datos, no es un pase real.

### 2. Validacion y recuperacion

Comprueba que el usuario entiende por que algo esta bloqueado y puede corregirlo:

- campos requeridos
- fechas invalidas
- submit incompleto
- fallo de API
- fallo de confirmacion
- retry despues de error
- persistencia tras reload

### 3. Navegacion y CTAs

Comprueba que las rutas importantes llevan a destino correcto:

- home -> fleet
- fleet -> reserve
- brand landing -> model/detail/reserve
- vehicle PDP -> reserve
- services -> detail/contact/reserve
- contact -> success

Tambien detecta enlaces rotos, hashes que no funcionan y destinos externos mal formados.

### 4. Mobile funcional

Comprueba que mobile no solo se ve bien, sino que se puede usar:

- menu abre y no bloquea la tarea
- filtros siguen siendo tocables
- CTAs no quedan ocultas
- formularios mantienen valores
- acciones principales siguen disponibles en pantallas cortas

### 5. Confianza tecnica

Comprueba que no hay ruido que erosione la confianza funcional:

- errores de consola
- scripts rotos
- CSS roto
- documentos rotos
- fetch/XHR rotos
- acciones que parecen pasar pero dejan errores detras

## Estados

- `good`: no hay findings funcionales.
- `review`: hay cobertura parcial o señales que un humano debe revisar.
- `bad`: hay hard fails, errores de consola/red graves o una mision real bloqueada.

Importante: `good` no significa "la web es perfecta".

Solo significa "no hay findings dentro del alcance realmente recorrido".

Por eso el auditor registra ahora el alcance:

- rutas publicas recorridas frente al mapa total
- viewports funcionales recorridos frente al contrato total
- limites de links, botones, summaries, selects y opciones de selects
- targets interactivos encontrados pero no ejecutados

Si el alcance es limitado, el estado correcto debe ser `review`, aunque no haya bugs.

## Evidencia generada

El comando principal es:

```bash
npm run agent:functional
```

Salida:

- `artifacts/functional-agent/<timestamp>/report.json`
- `artifacts/functional-agent/<timestamp>/report.md`
- screenshots de acciones fallidas cuando Playwright puede capturarlas

El reporte contiene ahora:

- resumen de acciones
- cobertura de customer journeys
- `Human Functional Review`
- findings con severidad, gate, ubicacion, accion y evidencia
- scope de cobertura para evitar falsos "todo perfecto"

## Modo profundo

Para una auditoria mas agresiva:

```bash
npm run audit:functional:deep
```

Este modo:

- recorre todas las rutas de `PUBLIC_PAGE_FILE_MAP`
- usa todos los viewports funcionales del contrato
- elimina los limites normales de links, botones, summaries, selects y opciones de selects
- ejecuta cada opcion disponible de cada select como una accion independiente
- marca cualquier target no ejecutado como `interaction_coverage_gap`

Esto no prueba infinitas combinaciones posibles, porque eso no existe en una web real con formularios, tiempos, red y estados.

Lo que si hace es una exploracion exhaustiva acotada: todo lo que el DOM declara como interactivo en las rutas publicas y viewports funcionales conocidos.

## Capas de uso

```bash
npm run audit:customer:journeys
```

Sirve para misiones de negocio. Si sale limpio pero con scope limitado, debe quedar en `review`, no en `good`.

```bash
npm run audit:functional:deep
```

Sirve para una pasada amplia sobre toda la web publica. Este es el unico modo que puede aspirar a `good` sin vender una falsa seguridad.

## Comandos relacionados

```bash
npm run audit:customer:journeys
npm run audit:functional:missions
npm run audit:functional:contracts
npm run audit:functional:recovery
npm run audit:functional:adversarial
npm run audit:functional:master
```

## Regla final

Un flujo no se considera sano solo porque carga o porque el click responde.

Se considera sano cuando el cliente conserva su intencion, entiende el siguiente paso, puede recuperarse si algo falla y llega a un destino de negocio sin errores ocultos.
