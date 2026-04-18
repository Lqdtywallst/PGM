# Estructura Objetivo 2026-04-18

## Fronteras

- `site/`: unica superficie publica del proyecto
- `server/`: servidor local, helpers runtime y quality gates
- `app/`: rutas backend integradas con el flujo de reserva
- `scripts/`: automatizacion e inventario
- `docs/`: documentacion activa, previews no publicas y archivo tecnico

## Regla principal

Todo HTML, CSS, JS o asset que no sea parte de produccion debe salir de `site/`.

## Estructura objetivo

- `site/`
  - paginas HTML publicas
  - `css/`, `js/`, `images/`, `icons/`, `media/`
  - metadata publica: `robots.txt`, `sitemap.xml`, `manifest.json`, `sw.js`, `_redirects`, `favicon.ico`
- `server/`
  - `backend-example.js`
  - `server-http.js`
  - tests y auditorias (`test-server.js`, `audit-site.js`)
- `app/`
  - `api/reserve/route.js`
- `scripts/`
  - scripts de inventario y soporte
- `docs/audit/`
  - inventario relacional, manifiesto de limpieza, backlog y checklist
- `docs/architecture/`
  - decisiones estructurales y roadmap
- `docs/previews/`
  - previews HTML no publicas y referencias de componentes
- `docs/archive/`
  - experimentos retirados del arbol publico pero conservados como referencia

## Ownership canonico

- logos y marcas: `site/images/brands/`
- iconos PWA y favicon raiz: `site/icons/` y `site/favicon.ico`
- CSS compartido: `site/css/`
- JS compartido: `site/js/`
- capturas, logs, salidas de test y pruebas visuales: fuera del repo versionado

## Politica de artefactos

- `output/`, `temp/`, `test-results/` y logs locales no se versionan
- cualquier archivo nuevo debe justificar su carpeta, uso y relacion con el sitio publicado
