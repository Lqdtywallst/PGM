# Audit Memory

La memoria de auditoria guarda garantias que ya fueron aprobadas en un run limpio. En runs posteriores, si una garantia que antes pasaba vuelve a fallar o desaparece dentro del mismo scope auditado, el auditor lo marca como regresion.

La metodologia funcional viva esta en `docs/audit/PROFESSIONAL-FUNCTIONAL-AUDIT-PLAYBOOK.md`: el auditor debe probar misiones de cliente completas, no clicks aislados.

## Flujo

1. Arreglar el problema.
2. Ejecutar el auditor serio hasta que quede limpio.
3. Aprobar la memoria de ese auditor.
4. En futuros cambios, ejecutar el auditor normalmente.

## Tests de regresion

Todo lo que se detecta y se corrige debe acabar en una de estas dos capas:
- un test unitario de contrato, cuando la regla se puede reproducir con datos medidos
- una memoria aprobada, cuando depende de abrir la web real, capturar estados y comparar contra lo ya aceptado

Para cambios normales:

```bash
npm test
```

`npm test` ejecuta el audit completo del proyecto, incluyendo la memoria visual responsive. Para una comprobacion mas enfocada en regresiones visuales y reglas del auditor:

```bash
npm run test:regression
```

Ese comando ejecuta los tests unitarios del auditor y despues el guardia visual con memoria.

## Gate funcional pre-produccion

Antes de entregar al socio o subir a produccion, el cierre funcional de alquiler/reserva debe ejecutarse con:

```bash
npm run audit:functional:production
```

Este gate cubre discovery, disponibilidad real, filtros, landings exactas de coche, reserva, recuperacion, doble submit, mobile friction, lookup y el agente funcional en rutas criticas. Su metodologia esta documentada en `docs/audit/PRODUCTION-FUNCTIONAL-RENTAL-GATE.md`.

## Funcional: Home -> Fleet

El auditor debe tratar Home como una entrada real de booking, no como una pagina de enlaces. Cada CTA importante de Home tiene que demostrar que conserva la intencion del cliente hasta Fleet:

- `See available cars` rellena fechas y horas, abre Fleet, conserva esos campos y obliga a consultar `/api/availability`
- si el CRM marca un coche como no disponible, Fleet debe mostrarlo como unavailable y bloquear su `Reserve`
- las tarjetas de categoria de Home abren Fleet con el filtro `type` correcto y las fechas/horas elegidas
- los coches destacados de Home abren la landing/ficha exacta del coche, no Fleet
- la landing del coche debe mostrar el heading correcto y su panel de booking

Acciones obligatorias del auditor funcional:

- `home-booking-bar-availability`
- `home-category-filter`
- `home-cars-types-filter-menu`
- `home-featured-vehicle-landing`

La pestaña `Cars Types` es una entrada de categoria, no de coche concreto: cada tarjeta debe abrir `Fleet` con `type=<categoria>` y resultados reales. El auditor debe fallar si aparece una categoria sin inventario real, por ejemplo un tipo que aterrice en `0 models visible`.

Pruebas enfocadas para esta zona:

```bash
npx playwright test tests/e2e/public-site.spec.js tests/e2e/customer-journeys.spec.js --grep "home category cards|home featured car cards|home date search applies CRM availability|Cars Types card"
node scripts/run-functional-agent.js --route / --viewport laptop --viewport mobile-modern
```

## Navegacion

```bash
npm run audit:navigation
npm run audit:memory:approve:navigation
```

Desde ese momento `npm run audit:navigation` compara contra `tests/audit-memory/navigation.json`.

La memoria de navegacion protege, entre otras cosas:
- carga de ruta por viewport
- rutas de recuperacion visibles
- drawer movil
- mega menus
- salidas locales, como filtros o retorno desde ficha de coche
- handoffs de enlaces/botones y vuelta del navegador

## Visual

```bash
npm run audit:visual:memory
npm run audit:visual:memory:responsive
npm run audit:visual:memory:full
npm run audit:visual:memory:approve
```

`npm run audit:visual:memory` ejecuta el auditor visual y despues compara el resultado contra `tests/audit-memory/visual.json`. Si la memoria visual no existe, el guardia falla. Esto es intencional: obliga a aprobar una foto limpia antes de aceptar cambios nuevos.

El audit general tambien ejecuta la memoria visual responsive:

```bash
npm run audit
```

Ese comando pasa por `npm run audit:visual:memory:responsive`, asi que un cambio visual que mueva algo aprobado no queda fuera del flujo normal.

La memoria visual protege, entre otras cosas:
- cambios de estado `good` a `review` o `bad`
- diffs contra baselines visuales aprobados
- findings visuales `high` o `hardFail`
- regiones de baseline que desaparecen
- regresiones de layout movil, como filtros recortados, drawers desalineados y grupos de botones con anchuras distintas
- regresiones de homogeneidad del header, incluyendo dropdowns y CTAs que cambian de superficie, contraste, posicion o tratamiento visual entre paginas

Para crear o actualizar la memoria visual, primero deja el run limpio y despues ejecuta:

```bash
npm run audit:visual:memory:approve
```

Si el run tiene errores visuales, reviews estrictas o baselines pendientes, la aprobacion se rechaza. No se debe usar `--force` salvo que el cambio visual sea intencional y ya revisado.

## Check manual

```bash
npm run audit:memory:check:navigation
npm run audit:memory:check:functional
npm run audit:memory:check:visual
```

## Aprobacion

La aprobacion se rechaza si el reporte esta sucio. Para navegacion, por ejemplo, no aprueba si hay `hardFails`, findings `high` o estado distinto de `good`.

No se debe aprobar memoria para tapar una regresion. Primero se arregla o se decide conscientemente que el nuevo comportamiento es el correcto, y solo despues se aprueba.
