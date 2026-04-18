# Backlog de Auditoria de Codigo y Funcional 2026-04-18

Este backlog ya no representa fases abiertas de codigo o funcional. Representa mejoras posteriores al cierre de ambas auditorias.

## Cerrado en esta fase

- inventario relacional completo generado en `docs/audit/`
- previews publicas retiradas de `site/`
- experimento 3D separado del arbol publico
- limpieza de artefactos locales y politica de `.gitignore`
- base de quality gate ampliada con auditoria estructural y suite E2E
- logs del backend normalizados para evitar texto corrupto en consola
- utilidades duplicadas de auditoria consolidadas en `server/site-audit-utils.js`
- captura E2E endurecida con fallback para evitar falsos negativos en `locations.html`

## Codigo

- revisar `site/app/reserve/page.html` para extraer el CSS inline mas voluminoso a una hoja compartida si el flujo se estabiliza
- seguir consolidando patrones repetidos de cabecera y footer en paginas publicas para reducir divergencias

## Performance

- medir peso real de imagenes hero y galerias de PDP nuevas
- revisar politica de cache de `sw.js` y su coherencia con despliegue y versionado de assets
- validar el coste real del CSS compartido por familia de paginas

## Seguridad

- verificar en despliegue real la entrega de CSP y cabeceras de seguridad
- revisar `connect-src` y `frame-src` si cambia la integracion de Stripe o analytics
- comprobar formularios y endpoints publicos frente a abuso basico y errores de configuracion

## Funcional

- mantener la matriz E2E minima en desktop y movil para home, fleet, locations, services, local guide, service page, PDP, contact y reserve
- ampliar cobertura si entran nuevas landings SEO o nuevos PDPs al sitemap
- revisar periodicamente errores de consola y recursos de terceros

## SEO de mantenimiento

- reejecutar `npm run audit:seo` cuando entren nuevas URLs al sitemap
- validar enlazado interno minimo hacia nuevas landings SEO y nuevos PDPs
- revisar unicidad y especificidad de `title` y meta description cuando cambie una familia de paginas
- mantener coherencia de `BreadcrumbList`, `Service`, `FAQPage` y OG/Twitter en nuevas publicaciones
- confirmar que ninguna URL nueva reintroduce previews, labs, localhost o staging en superficie indexable

## Decision pendiente

- si el laboratorio 3D vuelve, debe entrar como feature nueva y no como restauracion automatica del archivo archivado
