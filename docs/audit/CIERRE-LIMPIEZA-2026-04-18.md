# Cierre de Limpieza 2026-04-18

## Decision

La fase de limpieza queda cerrada administrativamente.

No se deja como "pendiente de confirmar": la limpieza ya fue ejecutada, validada y separada del resto del trabajo posterior.

## Criterios cumplidos

- `output/`, `temp/` y `test-results/` no existen en el arbol actual
- `site-legacy/` ya no existe en el filesystem
- `.gitignore` ya bloquea artefactos locales de auditoria y pruebas
- `site/` ya no contiene los previews, labs y restos publicos marcados para salida
- los previews utiles viven en `docs/previews/`
- el laboratorio 3D retirado vive en `docs/archive/3d-lab/`

## Evidencia rapida

- archivos archivados en `docs/previews/`: 5
- archivos archivados en `docs/archive/3d-lab/`: 21
- borrados trackeados de `site-legacy/`: 88
- borrados trackeados de restos obsoletos dentro de `site/`: 39

## Como leer el worktree actual

El `git status` sigue mostrando muchos cambios, pero ya no significa que la limpieza siga abierta. Lo que significa es que el repo mezcla tres lotes distintos:

### Lote A. Limpieza y estructura

Esto si pertenece al cierre de limpieza:

- `.gitignore`
- `docs/audit/`
- `docs/previews/`
- `docs/archive/3d-lab/`
- `scripts/audit-inventory.js`
- borrados de `site-legacy/`
- borrados de `site/brands/`
- borrados de `site/css/home*`
- borrados de `site/css/hero-lab.css`
- borrados de `site/js/home*`
- borrados de `site/js/hero-lab.js`
- borrado de `site/js/site-v2-3d.js`
- borrados de `site/hero-lab*`
- borrados de `site/icons/favicon.ico`
- borrados de `site/media/models/`
- borrados de `site/vendor/three/`

### Lote B. Infraestructura de auditoria

Esto ya es trabajo posterior a la limpieza:

- `playwright.config.js`
- `tests/`
- `server/audit-site.js`
- `server/test-server.js`
- `server/site-audit-utils.js`
- cambios de `server/backend-example.js`
- cambios de `server/server-http.js`
- `package.json`
- `package-lock.json`

### Lote C. Trabajo funcional, SEO y contenido

Esto tampoco bloquea el cierre de limpieza:

- cambios en HTML publicos
- cambios en CSS y JS productivos
- nuevas PDPs y nuevas imagenes de fleet
- docs de arquitectura y roadmap de negocio/SEO
- helpers y datos nuevos en `server/`

## Conclusion operativa

La limpieza ya no debe tratarse como una fase abierta.

Lo correcto a partir de aqui es:

1. considerar la limpieza cerrada
2. consolidar el worktree por lotes logicos
3. seguir el backlog de auditoria de codigo, funcional y SEO final como fases siguientes
