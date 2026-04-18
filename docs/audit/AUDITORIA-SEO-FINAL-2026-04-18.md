# Auditoria SEO Final 2026-04-18

## Objetivo

Cerrar el proyecto con una comprobacion SEO final sobre la superficie publica real de `site/`, despues de estructura, limpieza, auditoria de codigo y auditoria funcional.

Esta fase no sustituye a las anteriores. Las usa como base y agrega el ultimo filtro SEO antes de considerar el sistema estable.

## Alcance

- solo URLs publicas, canonicas y activas
- solo archivos servidos desde `site/`
- incluye hubs, local guides, service pages, PDPs, contacto, home, fleet y reserva
- excluye previews, labs, plantillas archivadas y cualquier HTML fuera de produccion

## Checklist final SEO

### Indexacion y rastreo

- `robots.txt` coherente con la estrategia real
- `sitemap.xml` solo con URLs canonicas, publicas y activas
- ninguna URL publica importante queda fuera del sitemap
- ninguna preview, laboratorio o plantilla aparece en sitemap, navegacion o indexacion
- ninguna pagina publica relevante lleva `noindex` por error

### Canonicals y respuesta

- cada pagina publica devuelve `200` o la redireccion esperada
- cada pagina publica tiene canonical absoluta y correcta
- no hay canonicals cruzadas por error entre landings, guias o PDPs
- no hay referencias a localhost, staging o dominios antiguos en canonicals, OG o JSON-LD

### On-page

- una sola `h1` por pagina publica
- `title` unico y suficientemente especifico por URL
- meta description unica y alineada con la intencion de la pagina
- `og:title`, `og:description`, `og:image`, `twitter:title`, `twitter:description` y `twitter:image` presentes donde aplique
- `lang` y metadatos base coherentes en las plantillas publicas

### Enlazado interno

- home enlaza a hubs y paginas prioritarias
- fleet, locations y services empujan a las URLs que deben recibir autoridad interna
- cada nueva landing SEO o PDP tiene al menos una entrada interna clara
- no quedan enlaces internos rotos ni rutas locales antiguas

### Datos estructurados

- `BreadcrumbList` donde corresponda
- `Service` en service pages
- `FAQPage` donde la FAQ sea publica y visible
- cualquier schema presente refleja la canonical y el contenido real
- no hay JSON-LD duplicado o inconsistente entre bloques

### Media y snippet

- imagenes OG validas y publicas
- assets clave accesibles sin 404
- favicons, manifest y metadatos sociales coherentes con la marca final

## Criterios de salida

- 0 URLs publicas no canonicas dentro del sitemap
- 0 paginas publicas con mas de un `h1`
- 0 paginas publicas indexables con `noindex` accidental
- 0 referencias publicas a previews, labs, localhost o staging
- 0 enlaces internos rotos en la superficie publica
- 0 bloques JSON-LD criticos desalineados con la URL real

## Entregables esperados

- matriz SEO final por URL critica
- lista corta de incidencias SEO pendientes, si aparece alguna
- confirmacion explicita de que sitemap, canonical, indexacion y enlazado interno quedan cerrados

## Estado actual

- fase completada y cerrada administrativamente
- base ejecutada sobre `server/audit-seo.js` y apoyada por `server/test-server.js` y `server/audit-site.js`
- metadatos sociales sincronizados para la superficie del sitemap con `scripts/sync-social-meta.js`
- evidencia final en `MATRIZ-SEO-FINAL-2026-04-18.md`

## Resultado operativo

- `sitemap.xml` cubre 37 URLs publicas y activas
- 0 URLs publicas quedan fuera del sitemap
- 0 titulos duplicados
- 0 meta descriptions duplicadas
- 0 filas con incidencias en la matriz SEO final
- `npm run audit:seo` verde
- `npm run audit:final` verde
