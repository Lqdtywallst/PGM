# Arquitectura Objetivo Del Sitio

## Objetivo

Definir como pasar del sitio actual, muy apoyado en landings SEO, a una web mas profesional y de marca sin romper el valor organico ya existente.

## Principios De Trabajo

- La web principal debe convertirse en el centro de la marca.
- Las landings SEO deben pasar a ser paginas satelite de apoyo, no el corazon completo del sitio.
- No se elimina ninguna URL publica util sin una decision explicita y, si llega a retirarse, debe hacerse con redireccion `301`.
- La mejora de arquitectura debe reducir dispersion, no crear mas paginas parecidas.

## Base Actual Aprovechable

La home actual en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html) ya contiene piezas reutilizables para la futura web profesional:

- bloque hero y propuesta de valor en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L2936)
- seccion de flota en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L2986)
- seccion de experiencia en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L3259)
- bloque de reserva en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L3289)
- seccion de argumentos diferenciales en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L3333)
- seccion de delivery por zonas en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L3357)
- reviews en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L3411)
- about en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L3443)
- contact en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L3463)

Esto significa que la futura web profesional no parte de cero: parte de ordenar, profundizar y separar mejor lo que ya existe.

## Arquitectura Objetivo

### 1. Paginas troncales de marca

- `/`
  - rol: home premium de marca
  - objetivo: explicar valor, inspirar confianza, dirigir a flota, ubicaciones y reserva

- `/fleet/` o equivalente
  - rol: catalogo principal del negocio
  - objetivo: reunir modelos, precios orientativos, filtros por marca y acceso a reserva

- `/locations/`
  - rol: pagina madre de zonas de entrega
  - objetivo: ordenar Palm Jumeirah, Marina, Downtown, Airport y otras zonas relevantes

- `/services/`
  - rol: explicar tipos de servicio
  - objetivo: daily rental, airport delivery, long-term, event rentals, chauffeur on request

- `/about/`
  - rol: credibilidad de marca
  - objetivo: presentar empresa, proceso, estandares y confianza

- `/contact/`
  - rol: contacto limpio y profesional
  - objetivo: centralizar WhatsApp, telefono, email, formulario y respuesta rapida

- `/app/reserve/page.html`
  - rol: flujo de reserva
  - objetivo: conversion directa

- paginas legales
  - rol: soporte legal y confianza
  - objetivo: mantener condiciones claras y accesibles

### 2. Paginas satelite SEO

Estas paginas siguen vivas para captar busquedas concretas, pero dejan de ser el centro del sitio:

- categorias principales
- marcas
- zonas
- cruces marca + zona solo cuando de verdad aporten valor

## Navegacion Objetivo

La navegacion principal deberia girar alrededor de:

- Home
- Fleet
- Locations
- Services
- About
- Contact
- Reserve

Las landings SEO no tienen por que ir todas al menu principal. Muchas deben vivir desde:

- enlazado interno contextual
- modulos de related pages
- breadcrumbs
- paginas madre de categoria o ubicacion

## Rol De Cada Grupo De URLs Actuales

### Core del sitio

- [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html)
  - decision: mantener y reforzar
  - futuro rol: home premium de marca

- [page.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/app/reserve/page.html)
  - decision: mantener y mejorar
  - futuro rol: checkout principal

- [terms-and-conditions.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/terms-and-conditions.html)
  - decision: mantener
  - futuro rol: legal general

- [terms-and-conditions-uae.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/terms-and-conditions-uae.html)
  - decision: mantener
  - futuro rol: legal especifico UAE

### Landings que conviene mantener y subir de nivel

- [luxury-car-rental-dubai.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/luxury-car-rental-dubai.html)
  - decision: mantener y reescribir
  - futuro rol: landing categoria principal

- [supercar-rental-dubai.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/supercar-rental-dubai.html)
  - decision: mantener y reescribir
  - futuro rol: landing categoria secundaria, mas enfocada a performance

- [lamborghini-rental-dubai.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/lamborghini-rental-dubai.html)
  - decision: mantener y reescribir
  - futuro rol: landing principal de marca

- [ferrari-rental-dubai.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/ferrari-rental-dubai.html)
  - decision: mantener y reescribir
  - futuro rol: landing principal de marca

- [g63-rental-dubai.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/g63-rental-dubai.html)
  - decision: mantener y reescribir
  - futuro rol: landing principal de modelo

- [mercedes-rental-dubai.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/mercedes-rental-dubai.html)
  - decision: mantener por ahora
  - futuro rol: landing de marca, pendiente diferenciar bien frente a G63

- [porsche-rental-dubai.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/porsche-rental-dubai.html)
  - decision: mantener y reescribir
  - futuro rol: landing principal de marca

- [rolls-royce-rental-dubai.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/rolls-royce-rental-dubai.html)
  - decision: mantener y reescribir
  - futuro rol: landing principal de marca

- [palm-jumeirah-luxury-car-rental.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/palm-jumeirah-luxury-car-rental.html)
  - decision: mantener y reescribir
  - futuro rol: landing principal de ubicacion

- [dubai-marina-luxury-car-rental.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/dubai-marina-luxury-car-rental.html)
  - decision: mantener y reescribir
  - futuro rol: landing principal de ubicacion

- [downtown-dubai-supercar-rental.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/downtown-dubai-supercar-rental.html)
  - decision: mantener y reescribir
  - futuro rol: landing principal de ubicacion/categoria

### Landings que conviene conservar de momento, pero revisar luego

- [lamborghini-rental-palm-jumeirah.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/lamborghini-rental-palm-jumeirah.html)
  - decision: conservar por ahora
  - futuro rol: candidata a fusion con Lamborghini Dubai o Palm Jumeirah si el contenido queda demasiado fino

- [ferrari-rental-downtown-dubai.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/ferrari-rental-downtown-dubai.html)
  - decision: conservar por ahora
  - futuro rol: candidata a fusion si no logra diferenciarse bien

- [g63-rental-dubai-marina.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/g63-rental-dubai-marina.html)
  - decision: conservar por ahora
  - futuro rol: candidata a fusion si repite demasiado contenido

## Regla De Decision Para Las Landings

- mantener
  - cuando ataca una busqueda clara y puede sostener contenido propio

- mantener y reescribir
  - cuando la URL es buena pero el contenido actual debe subir de nivel

- conservar provisionalmente
  - cuando no conviene borrar aun, pero puede acabar fusionada

- fusionar con `301`
  - solo despues de revisar canibalizacion, rendimiento organico y calidad real del contenido

## Fases De Evolucion Recomendadas

### Fase A. Consolidar la web de marca

- reforzar la home
- convertir fleet, locations, services, about y contact en paginas troncales reales o secciones mucho mas definidas
- mantener intactas las URLs SEO actuales

### Fase B. Reescribir landings clave

- primero categorias principales
- luego marcas principales
- despues ubicaciones principales

### Fase C. Revisar solapes

- detectar canibalizacion
- decidir si marca + zona aporta valor real
- fusionar solo las paginas que sobren de verdad

### Fase D. Orden final

- actualizar sitemap
- reforzar enlazado interno
- dejar breadcrumbs y related pages coherentes
- documentar redirects permanentes si los hubiera

## Reglas SEO Para No Perder Traccion

- no borrar URLs publicas utiles sin `301`
- no cambiar slugs buenos sin motivo fuerte
- no mover todo el peso SEO a una sola home
- mantener `title`, `canonical`, `h1` y contenido util por URL
- usar la web principal para reforzar la marca y las landings para reforzar intenciones concretas

## Decision Ejecutiva

La direccion recomendada no es elegir entre:

- una home bonita sin estructura SEO
- o un conjunto disperso de landings

La direccion correcta es un modelo hibrido:

- web principal premium de marca
- landings SEO de apoyo
- arquitectura clara
- menos dispersion

## Siguiente Paso Practico

Traducir esta arquitectura a un backlog de implementacion:

1. que paginas troncales creamos o separamos primero
2. que landings reescribimos primero
3. que landings quedan en observacion para futura fusion

Documento asociado:

- [BACKLOG-EVOLUCION-SITIO.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/BACKLOG-EVOLUCION-SITIO.md)
