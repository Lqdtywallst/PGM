# Documentation Guide

This repository keeps only active working documentation under `docs/` so the product files stay easier to review.

## Folders

- `audit/`: current audit, remediation checklist, and technical review status
- `architecture/`: target site structure, migration decisions, and implementation backlog
- `previews/`: non-public HTML working previews and component references kept outside `site/`
- `archive/`: archived experiments removed from the public tree but preserved for reference

## Active Documents

- [ALCANCE-AUDITORIA-FRONTEND-2026-04-21.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/ALCANCE-AUDITORIA-FRONTEND-2026-04-21.md)
  - documented scope for the frontend cleanup pass: HTML, unused CSS pruning, JS optimization, and validation rules before edits
- [MAPA-AUDITORIA-FRONTEND-ASSETS-2026-04-21.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/MAPA-AUDITORIA-FRONTEND-ASSETS-2026-04-21.md)
  - route-to-asset map, CSS pruning candidates, JS optimization targets, and safe validation order
- [ESTRUCTURA-OBJETIVO-2026-04-18.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/ESTRUCTURA-OBJETIVO-2026-04-18.md)
  - target repository structure, ownership rules, and public boundary for `site/`
- [MANIFIESTO-LIMPIEZA-2026-04-18.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/MANIFIESTO-LIMPIEZA-2026-04-18.md)
  - closed keep, archive, and delete lists used for the April 2026 cleanup pass
- [BACKLOG-AUDITORIA-CODIGO-FUNCIONAL-2026-04-18.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/BACKLOG-AUDITORIA-CODIGO-FUNCIONAL-2026-04-18.md)
  - consolidated technical, functional, performance, and security follow-up after cleanup
- [CHECKLIST-MANTENIMIENTO-2026-04-18.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/CHECKLIST-MANTENIMIENTO-2026-04-18.md)
  - recurring release checklist to keep structure, SEO, tests, and artifact policy under control
- [AUDITORIA-INICIAL-2026-03-30.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/AUDITORIA-INICIAL-2026-03-30.md)
  - current state of the project, main findings, and pending validations
- [CHECKLIST-REMEDIACION-2026-03-30.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/CHECKLIST-REMEDIACION-2026-03-30.md)
  - ordered worklist for closing technical blockers before SEO
- [ARQUITECTURA-OBJETIVO-SITIO.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/ARQUITECTURA-OBJETIVO-SITIO.md)
  - future-state architecture for the professional brand site plus SEO support pages
- [BACKLOG-EVOLUCION-SITIO.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/BACKLOG-EVOLUCION-SITIO.md)
  - practical next steps to move from the current site to that target architecture
- [SERVICES-SEO-ROADMAP.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/SERVICES-SEO-ROADMAP.md)
  - roadmap, intent map, guardrails, and fixed scope for the official services cluster: the hub plus six detail pages
- [SERVICES-MEASUREMENT-SETUP.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/SERVICES-MEASUREMENT-SETUP.md)
  - event map, GTM or GA4-ready wiring, validation flow, and measurement limits for the official 7-page services scope
- [SERVICES-IMPLEMENTATION-STATUS.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/SERVICES-IMPLEMENTATION-STATUS.md)
  - current implementation status of the services cluster, completed work, local validation, and what remains outside the repo
- [LOCATIONS-SEO-ROADMAP.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/LOCATIONS-SEO-ROADMAP.md)
  - benchmark, architecture, roadmap, and guardrails for the locations hub and location landing strategy
- [LOCATIONS-MEASUREMENT-SETUP.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/LOCATIONS-MEASUREMENT-SETUP.md)
  - local CTA event map, attribution wiring, validation flow, and current analytics limits for the locations cluster
- [LOCATIONS-GBP-ALIGNMENT.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/LOCATIONS-GBP-ALIGNMENT.md)
  - operating decision framework and guardrails for aligning the web with one real Google Business Profile
- [PRESTIGE-HOME-BLUEPRINT.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/PRESTIGE-HOME-BLUEPRINT.md)
  - structural blueprint of the Prestige Dubai home adapted to Dynasty Prestige with a date-first booking dock
- [VEHICLE-PDP-DECISIONS-ROADMAP.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/VEHICLE-PDP-DECISIONS-ROADMAP.md)
  - working decisions, open questions, and phased roadmap for the premium vehicle detail page rollout
- [vehicle-page-template.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/vehicle-page-template.md)
  - structural rules for the premium vehicle page system, including common base, family variants, layout order, and SEO requirements
- [pricing-agent.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/pricing-agent.md)
  - safe pricing agent workflow: demand inputs, competitor snapshots, policy guardrails, apply mode, and automation path

## Cleanup Rules

- Keep the root focused on repo config and top-level folders such as `site/`, `server/`, `app/`, and `docs/`
- Keep public website files under `site/`
- Keep backend runtime and helper scripts under `server/`
- Keep audit findings and remediation state under `docs/audit/`
- Keep future-state site structure and migration plans under `docs/architecture/`
- Keep non-public previews under `docs/previews/`
- Keep retired experiments under `docs/archive/`
- Delete generic or superseded Markdown files instead of leaving them mixed with active working docs
