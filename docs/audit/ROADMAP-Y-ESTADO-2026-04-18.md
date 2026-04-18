# Roadmap y Estado 2026-04-18

## Estado general

La auditoria queda cerrada de extremo a extremo y documentada. El trabajo ya no esta en una zona intermedia: hay inventario, estructura objetivo, manifiesto de limpieza, cierres formales de limpieza, codigo, funcional y SEO, matriz final y checklist de mantenimiento.

## Estado por fase

- Fase 0. Inventario relacional completo: completada
  - entregables: `INVENTARIO-RELACIONAL-2026-04-18.json`, `INVENTARIO-RELACIONAL-2026-04-18.csv`, `INVENTARIO-RELACIONAL-RESUMEN-2026-04-18.md`
  - estado actual inventariado: 368 archivos escaneados, 217 `se queda`, 24 `se mueve/archiva`, 127 `se elimina`

- Fase 1. Estructuracion del proyecto: completada
  - entregable: `ESTRUCTURA-OBJETIVO-2026-04-18.md`
  - decision activa: `site/` es la unica frontera publica

- Fase 2. Limpieza critica del repo: completada y cerrada administrativamente
  - entregable: `MANIFIESTO-LIMPIEZA-2026-04-18.md`
  - resultado: previews, labs y artefactos locales fuera del arbol publico
  - cierre formal: `CIERRE-LIMPIEZA-2026-04-18.md`

- Fase 3. Auditoria de codigo: completada y cerrada administrativamente
  - quality gates activos en `server/test-server.js` y `server/audit-site.js`
  - utilidades comunes consolidadas en `server/site-audit-utils.js`
  - logs backend saneados en `server/backend-example.js`
  - cierre formal: `CIERRE-AUDITORIA-CODIGO-2026-04-18.md`

- Fase 4. Auditoria funcional: completada y cerrada administrativamente
  - suite Playwright activa en `tests/e2e/public-site.spec.js`
  - estado actual: `npm run test:e2e` verde con 26 pruebas pasadas y 2 `skip` esperados por viewport
  - mejora aplicada: fallback de screenshot para evitar falsos negativos en `locations.html`
  - cierre formal: `CIERRE-AUDITORIA-FUNCIONAL-2026-04-18.md`

- Fase 5. Auditoria SEO final: completada y cerrada administrativamente
  - entregables: `AUDITORIA-SEO-FINAL-2026-04-18.md`, `MATRIZ-SEO-FINAL-2026-04-18.md`
  - cierre formal: `CIERRE-AUDITORIA-SEO-2026-04-18.md`
  - resultado: 37 URLs auditadas, 0 fuera de sitemap, 0 titulos duplicados y 0 incidencias en la matriz final

- Fase 6. Cierre y mantenimiento: completada y operativa
  - checklist recurrente ya creado
  - cierre maestro: `CIERRE-AUDITORIAS-2026-04-18.md`
  - lo que queda vivo es backlog evolutivo y mantenimiento preventivo, no fases abiertas

## Documentos canonicos

- inventario relacional: `INVENTARIO-RELACIONAL-2026-04-18.json`
- resumen del inventario: `INVENTARIO-RELACIONAL-RESUMEN-2026-04-18.md`
- estructura objetivo: `ESTRUCTURA-OBJETIVO-2026-04-18.md`
- limpieza: `MANIFIESTO-LIMPIEZA-2026-04-18.md`
- cierre de limpieza: `CIERRE-LIMPIEZA-2026-04-18.md`
- cierre de auditoria de codigo: `CIERRE-AUDITORIA-CODIGO-2026-04-18.md`
- cierre de auditoria funcional: `CIERRE-AUDITORIA-FUNCIONAL-2026-04-18.md`
- auditoria SEO final: `AUDITORIA-SEO-FINAL-2026-04-18.md`
- matriz SEO final: `MATRIZ-SEO-FINAL-2026-04-18.md`
- cierre de auditoria SEO: `CIERRE-AUDITORIA-SEO-2026-04-18.md`
- cierre maestro de auditorias: `CIERRE-AUDITORIAS-2026-04-18.md`
- backlog tecnico y funcional: `BACKLOG-AUDITORIA-CODIGO-FUNCIONAL-2026-04-18.md`
- checklist recurrente: `CHECKLIST-MANTENIMIENTO-2026-04-18.md`

## Lectura rapida

Si alguien entra nuevo al repo y quiere entender el estado de la auditoria, el orden correcto es:

1. `ROADMAP-Y-ESTADO-2026-04-18.md`
2. `INVENTARIO-RELACIONAL-RESUMEN-2026-04-18.md`
3. `ESTRUCTURA-OBJETIVO-2026-04-18.md`
4. `MANIFIESTO-LIMPIEZA-2026-04-18.md`
5. `CIERRE-LIMPIEZA-2026-04-18.md`
6. `CIERRE-AUDITORIA-CODIGO-2026-04-18.md`
7. `CIERRE-AUDITORIA-FUNCIONAL-2026-04-18.md`
8. `AUDITORIA-SEO-FINAL-2026-04-18.md`
9. `MATRIZ-SEO-FINAL-2026-04-18.md`
10. `CIERRE-AUDITORIA-SEO-2026-04-18.md`
11. `CIERRE-AUDITORIAS-2026-04-18.md`
12. `BACKLOG-AUDITORIA-CODIGO-FUNCIONAL-2026-04-18.md`
13. `CHECKLIST-MANTENIMIENTO-2026-04-18.md`

## Siguientes pasos claros

- mantener como mejora posterior la extraccion de CSS inline, la consolidacion de shared layout, la performance de assets y la ampliacion E2E
- ejecutar `npm run audit:final` antes de publicar cambios amplios o nuevas URLs indexables
