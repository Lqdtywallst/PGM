# Roadmap SEO Google-first

Fecha: 2026-05-26

## Objetivo

Construir una estrategia SEO para Dynasty Prestige basada en señales que Google puede rastrear, entender y medir: indexación limpia, contenido útil, autoridad local, experiencia de página, datos estructurados honestos y seguimiento en Search Console. No perseguimos trucos ni schema decorativo.

## Principios

- Primero personas, después buscador: cada cambio debe ayudar a un cliente real a elegir, comparar o reservar.
- Nada de keyword stuffing: las keywords viven en lugares naturales, no forzadas en títulos visuales.
- Nada de schema inútil: solo datos estructurados que describan contenido real y visible.
- Nada de promesas falsas: precios, disponibilidad, entrega, depósito o chófer solo si el negocio lo puede sostener.
- Todo cambio debe poder medirse: impresiones, CTR, posición media, conversiones o rendimiento.

## Fase 1: Base técnica e indexación

Estado: en marcha.

- Mantener `robots.txt`, sitemap, canonical y `index,follow` alineados con producción.
- Revisar que cada página importante exista en sitemap y tenga una URL canónica única.
- Evitar páginas duplicadas, huérfanas o con canonical incorrecto.
- Mantener `BreadcrumbList` donde ayude a entender jerarquía.
- Verificar en Search Console las páginas prioritarias después de cada subida.

Resultado esperado: Google puede rastrear, indexar y entender la arquitectura sin señales contradictorias.

## Fase 2: Landings por intención comercial

Estado: en marcha.

- Reforzar páginas por coche: modelo, precio diario orientativo, entrega en Dubái, encaje de uso, imágenes y enlace de reserva.
- Reforzar páginas por marca: Lamborghini, Ferrari, Mercedes, Porsche y Rolls-Royce como hubs que reparten autoridad a modelos.
- Reforzar páginas por ubicación: Dubai, DXB/DWC, Palm Jumeirah, Dubai Marina y Abu Dhabi con contexto operativo real.
- Evitar contenido genérico repetido: cada landing debe justificar por qué existe.

Resultado esperado: cada búsqueda importante tiene una URL objetivo clara y útil.

## Fase 3: Datos estructurados útiles

Estado: primera tanda aplicada.

- Usar `AutoRental`/`LocalBusiness` para la entidad de alquiler.
- Usar `Product` + `Car` + `Offer` cuando la página presenta un coche concreto y una tarifa diaria orientativa.
- Usar `Service` para describir el servicio de alquiler en Dubái.
- Usar `BreadcrumbList` para jerarquía.
- No usar `FAQPage` en landings de coche como táctica SEO: Google ya no muestra FAQ rich results y no debe ser la base de la estrategia.
- No usar `VehicleListing` como apuesta SEO: Google retiró esa experiencia de resultados.

Resultado esperado: Google entiende la entidad, el coche, la oferta diaria y el servicio sin señales artificiales.

## Fase 4: Experiencia de página e imágenes

Estado: siguiente bloque de trabajo.

- Añadir `width` y `height` a imágenes de contenido para reducir layout shift.
- Mantener `loading="eager"` solo en imágenes realmente críticas above-the-fold.
- Usar `loading="lazy"` en galerías, tarjetas relacionadas, menús visuales y bloques secundarios.
- Revisar `alt` de imágenes para que describa coche, servicio o ubicación sin repetir keywords de forma mecánica.
- Vigilar móvil: sin overflow, sin botones tapando texto importante, sin saltos visuales.

Resultado esperado: mejor estabilidad visual, mejor experiencia móvil y menos presión de auditoría media/performance.

## Fase 5: Autoridad local real

Estado: pendiente de acceso y coordinación.

- Revisar Google Business Profile: categoría, nombre, teléfono, web, zona de servicio, horarios y fotos.
- Subir fotos reales y coherentes con la flota y las entregas.
- Conseguir reseñas reales y responderlas con naturalidad.
- Alinear NAP: nombre, dirección/zona de servicio y teléfono en web, GBP y directorios relevantes.
- Buscar menciones externas de calidad: partners, hoteles, directorios serios, medios locales o colaboraciones reales.

Resultado esperado: más prominencia local y más confianza para búsquedas con intención comercial en Dubái.

## Fase 6: Medición y aprendizaje

Estado: primera rutina creada.

- Search Console semanal: consultas, páginas, impresiones, CTR y posición media.
- Separar consultas por grupo: genéricas, marca, modelo, ubicación y servicio.
- Detectar canibalización: dos URLs compitiendo por la misma consulta.
- Pedir reindexación solo en páginas prioritarias tras cambios importantes.
- Registrar cada cambio SEO con fecha para poder comparar antes/después.
- Usar `npm run seo:gsc -- --csv "<ruta-csv>"` para generar informe de oportunidades desde Search Console.

Resultado esperado: dejamos de adivinar y empezamos a decidir por datos.

Guía operativa: `docs/seo/search-console-gbp-playbook.md`.

## Prioridad inmediata

1. Corregir imágenes sin dimensiones y carga eager innecesaria.
2. Mantener landings de coche limpias tras el nuevo schema semántico.
3. Revisar Search Console y definir la lista real de consultas por las que ya estamos apareciendo.
4. Alinear Google Business Profile con la estrategia local.
5. Reforzar contenido solo donde haya intención clara y oportunidad medible.

## Fuentes de referencia

- Google Search Essentials: https://developers.google.com/search/docs/essentials
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Helpful content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Structured data policies: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Google Images best practices: https://developers.google.com/search/docs/appearance/google-images
- Page experience: https://developers.google.com/search/docs/appearance/page-experience
- Google Business Profile local ranking: https://support.google.com/business/answer/7091
