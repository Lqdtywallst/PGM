# Roadmap SEO Google-first

Fecha: 2026-05-26

## Objetivo

Convertir Dynasty Prestige en una web que Google pueda rastrear, entender, confiar y medir para búsquedas comerciales de alquiler de coches de lujo en Dubái. La meta no es “meter keywords”; la meta es que cada búsqueda importante tenga una URL útil, una propuesta clara y señales reales de negocio.

## Diagnóstico Actual

La base técnica está fuerte: canonical, sitemap, `robots.txt`, landings por coche, landings por marca, páginas de servicio, datos estructurados honestos y auditoría SEO interna en `100/100`.

Lo que falta para pelear posiciones no es más decoración SEO. Falta producción, medición, confianza comercial, autoridad local y señales externas.

## Reglas De Trabajo

- Un cambio SEO debe tener hipótesis, URL objetivo y métrica.
- No juzgamos resultados por búsquedas manuales en Google; usamos Search Console.
- No forzamos keywords en títulos visuales si queda feo o poco premium.
- No usamos schema que no describa contenido visible y real.
- No prometemos precio, depósito, seguro, entrega, disponibilidad o chófer si negocio no lo confirma.
- No cambiamos veinte cosas a la vez: máximo tres movimientos SEO importantes por ciclo semanal.

## Ciclo Operativo

1. Elegir consulta o intención.
2. Confirmar URL objetivo.
3. Revisar si el usuario recibe una respuesta útil.
4. Aplicar un cambio pequeño y trazable.
5. Publicar solo si pasa QA.
6. Pedir indexación cuando sea prioritario.
7. Medir 2-4 semanas.
8. Mantener, ajustar o revertir según datos.

## Fase 0: Paquete De Producción

Estado: listo para decidir.

Objetivo: subir solo cambios validados, sin mezclar trabajo local accidental.

Acciones:

- Revisar qué entra desde `task/seo-keyword-battle` hacia `main`.
- Separar cambios locales no confirmados antes de publicar.
- Ejecutar gates: `build:templates`, `audit:seo`, `audit:copy`, `test:visual`, `audit:connectivity:views:strict`, `audit:responsive` y contratos funcionales.
- Si todo está verde, hacer merge controlado a `main`.
- Verificar producción después del despliegue: home, fleet, vehículo, services, reserve, sitemap y robots.

Resultado esperado: producción contiene la base SEO real y Google puede empezar a verla.

## Fase 1: Indexación Y Medición Inicial

Periodo recomendado: semana 0-1 tras publicación.

Acciones:

- Confirmar que `https://www.dynastyprestigecarrental.com/sitemap.xml` sirve las URLs correctas.
- Enviar o reenviar sitemap en Search Console.
- Pedir indexación de las URLs prioritarias: home, fleet, guía ciudad, marcas y modelos principales.
- Guardar captura inicial de Search Console: impresiones, clics, CTR y posición media.
- Crear primer informe con `npm run seo:gsc -- --csv "<ruta-csv>"`.

Resultado esperado: empezamos a medir la web real, no una intuición.

## Fase 2: Mapa De Intenciones

Periodo recomendado: semanas 1-2.

Acciones:

- Separar consultas por intención: marca propia, genérica comercial, marca de coche, modelo, servicio y ubicación.
- Confirmar una URL objetivo para cada intención importante.
- Detectar si Google muestra una URL equivocada para una consulta.
- Detectar canibalización: dos URLs compitiendo por la misma búsqueda.
- Priorizar oportunidades por impacto, no por ego.

Ejemplos de prioridad:

- `luxury car rental Dubai` debe tener una respuesta fuerte entre home, fleet y guía ciudad.
- `Ferrari 296 rental Dubai` debe empujar la landing del Ferrari 296, no solo la página genérica de Ferrari.
- `Dubai airport luxury car rental` debe empujar la guía de aeropuerto y los servicios relacionados.

Resultado esperado: sabemos dónde atacar sin inventar.

## Fase 3: Confianza Comercial En Landings

Periodo recomendado: semanas 2-4.

Objetivo: que cada landing responda preguntas reales antes de que el usuario pregunte por WhatsApp.

Acciones:

- Añadir bloques visibles y elegantes sobre edad mínima, depósito, seguro, kilometraje, pago, entrega y documentación, solo si están confirmados.
- Explicar entrega en hotel, villa, aeropuerto o residencia sin rellenar texto.
- Mantener precios como orientación si cambian por temporada o disponibilidad.
- En modelos premium, explicar uso real: resort, business, cena, aeropuerto, chófer o self-drive.
- Revisar que los CTAs estén claros: reserva, WhatsApp, llamada y fleet.

Resultado esperado: más confianza, mejor conversión y contenido útil para Google.

## Fase 4: Enlazado Interno Con Jerarquía

Periodo recomendado: semanas 3-5.

Acciones:

- Home y fleet deben empujar a marcas y modelos principales.
- Las páginas de marca deben funcionar como hubs: Ferrari hacia 296/F8, Lamborghini hacia Huracan/Urus, Mercedes hacia G63/Maybach/SL63.
- Los modelos deben enlazar a alternativas naturales: Urus vs G63, Cullinan vs Maybach, Ferrari vs Lamborghini, GT3 vs GT3 RS.
- Las páginas de ubicación deben enlazar a servicios reales: airport, hotel/villa delivery, chauffeur y monthly.
- Evitar anchors robóticos; usar texto natural.

Resultado esperado: Google entiende qué URL debe posicionar para cada búsqueda.

## Fase 5: Google Business Profile

Periodo recomendado: semanas 1-6.

Objetivo: ganar relevancia local, confianza y prominencia.

Acciones:

- Revisar categoría, nombre, teléfono, web, zona de servicio y horarios.
- Añadir servicios coherentes: luxury car rental, chauffeur service, airport delivery, monthly rental.
- Subir fotos reales de flota, interiores, entregas y detalles premium.
- Pedir reseñas reales después de entregas buenas.
- Responder reseñas con naturalidad.
- Alinear NAP: nombre, teléfono y web en la web, perfil de Google y directorios serios.
- No crear ubicaciones falsas.

Resultado esperado: más fuerza para búsquedas locales y más confianza de marca.

## Fase 6: Autoridad Externa

Periodo recomendado: meses 2-3.

Acciones:

- Buscar menciones en partners reales: hoteles, concierge, eventos, empresas locales o medios.
- Revisar directorios de alquiler de coches de calidad, no granjas de enlaces.
- Crear activos útiles: guía de entrega en aeropuerto, guía por zonas, comparativas premium y contenido visual propio.
- Evitar backlinks baratos, automatizados o irrelevantes.

Resultado esperado: Google no solo ve una web correcta; ve una marca citada fuera de su propia web.

## Fase 7: Tracking De Conversión

Periodo recomendado: paralelo a medición.

Acciones:

- Medir clics en WhatsApp, llamada, reserva y formularios.
- Separar eventos por página y tipo de intención.
- Cruzar Search Console con conversiones: una keyword con menos volumen puede valer más si genera reservas.
- Preparar un dashboard simple: consulta, URL, posición, CTR, clics y acción comercial.

Resultado esperado: optimizamos para clientes, no solo para rankings.

## Métricas Que Importan

- Impresiones por intención.
- CTR por consulta y URL.
- Posición media por consulta, usando tendencia, no obsesión diaria.
- URL correcta apareciendo para cada búsqueda.
- Clics a reserva, WhatsApp y llamada.
- Consultas nuevas descubiertas por Search Console.
- Reseñas, fotos y actividad en Google Business Profile.

## Qué No Hacemos

- No crear FAQ inútil para intentar rascar rich results.
- No usar `VehicleListing` como apuesta SEO.
- No repetir `rental in Dubai` en títulos visuales si rompe diseño.
- No publicar texto genérico que podría valer para cualquier empresa.
- No perseguir una keyword ambigua si no sabemos qué quiere el usuario.
- No comprar enlaces basura.

## Backlog Priorizado

### P0: Antes De Producción

- Confirmar paquete exacto de la rama SEO.
- Resolver o aislar cambios locales no relacionados.
- Pasar gates finales.
- Publicar en `main` solo si todo está verde.

### P1: Primera Semana Tras Producción

- Enviar sitemap en Search Console.
- Pedir indexación de páginas prioritarias.
- Generar primer informe Search Console.
- Confirmar que producción no tiene errores de canonical, sitemap o robots.

### P2: Primer Mes

- Mejorar confianza comercial en landings de modelos y guía ciudad.
- Reforzar enlaces internos entre hubs, modelos, servicios y ubicaciones.
- Revisar snippets de páginas con impresiones y CTR bajo.
- Trabajar Google Business Profile con fotos, servicios y reseñas.

### P3: Meses 2-3

- Crear activos de autoridad y guías útiles.
- Conseguir menciones externas reales.
- Refinar landings según Search Console.
- Revisar si hace falta contenido nuevo para consultas que ya aparecen.

## Decisión Actual Recomendada

Subir la base SEO validada a producción cuando el paquete esté limpio. Después, medir 2-4 semanas en Search Console y priorizar el siguiente sprint con datos reales.

No tiene sentido seguir acumulando cambios SEO en local si Google todavía no puede rastrear la versión nueva.

## Documentos Relacionados

- `docs/seo/keyword-battle-plan.md`: mapa de keywords y URLs objetivo.
- `docs/seo/search-console-gbp-playbook.md`: rutina de Search Console y Google Business Profile.
- `docs/seo/vehicle-keyword-matrix.md`: matriz de intención por coche.

## Fuentes Oficiales

- Google Search Essentials: https://developers.google.com/search/docs/essentials
- Google SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Contenido útil y fiable: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Políticas de datos estructurados: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Buenas prácticas de imágenes: https://developers.google.com/search/docs/appearance/google-images
- Experiencia de página: https://developers.google.com/search/docs/appearance/page-experience
- Informe de rendimiento de Search Console: https://support.google.com/webmasters/answer/7576553
- Ranking local en Google Business Profile: https://support.google.com/business/answer/7091
