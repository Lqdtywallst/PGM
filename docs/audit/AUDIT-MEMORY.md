# Audit Memory

La memoria de auditoria guarda garantias que ya fueron aprobadas en un run limpio. En runs posteriores, si una garantia que antes pasaba vuelve a fallar o desaparece dentro del mismo scope auditado, el auditor lo marca como regresion.

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
