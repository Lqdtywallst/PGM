# Playbook Search Console y Google Business Profile

Fecha: 2026-05-26

## Objetivo

Dejar de hacer SEO a ciegas. Cada cambio debe salir de una consulta real, una URL objetivo clara y una hipótesis medible: más impresiones, mejor CTR, mejor posición media o más reservas cualificadas.

## Qué datos miramos

- `Consultas`: qué busca la gente cuando Dynasty Prestige aparece en Google.
- `Páginas`: qué URL está apareciendo y recibiendo clics.
- `Impresiones`: demanda visible; Google ya está mostrando la web.
- `CTR`: si la gente ve el resultado pero no entra, hay que revisar title, meta description, intención y confianza del snippet.
- `Posición media`: útil para detectar tendencia, pero no hay que obsesionarse con una búsqueda manual porque cambia por ubicación, historial, dispositivo y formato de resultado.

## Export básico desde Search Console

1. Entrar en Search Console.
2. Ir a `Rendimiento` > `Resultados de búsqueda`.
3. Seleccionar los últimos `28 días`.
4. Activar `Clics`, `Impresiones`, `CTR` y `Posición media`.
5. Exportar la pestaña `Consultas` en CSV.
6. Repetir con los últimos `3 meses` para ver tendencia más estable.
7. Si queremos investigar una consulta concreta, filtrar esa consulta y revisar la pestaña `Páginas`.

Importante: en la interfaz de Search Console no siempre tendremos `consulta + página` en una sola tabla. El script acepta columna `Page` si la tenemos por cruce, API o export avanzado. Si el CSV solo trae consultas, sirve para clasificar intención y oportunidades, pero no para confirmar canibalización.

## Cómo ejecutar el analizador

```powershell
npm run seo:gsc -- --csv "C:\ruta\search-console.csv"
```

Salida esperada:

- `artifacts/search-console/<fecha>/search-console-opportunities.json`
- `artifacts/search-console/<fecha>/search-console-opportunities.md`

El informe separa las búsquedas por intención:

- `marca propia`: búsquedas de Dynasty Prestige.
- `modelo`: Ferrari 296, Ferrari F8, Urus, G63, Cullinan, Maybach, GT3, etc.
- `marca`: Ferrari rental Dubai, Lamborghini rental Dubai, Mercedes rental Dubai.
- `servicio`: chauffeur, airport, monthly, business, wedding/event.
- `ubicacion`: Dubai Marina, Palm Jumeirah, Abu Dhabi, airport.
- `generica comercial`: luxury car rental Dubai, exotic car rental Dubai y similares.

## Cómo decidir qué tocar

- Si una consulta está en posición `4-10` y tiene CTR bajo, primero probar title/meta más claros, no meter keywords en el diseño visual a martillazos.
- Si una consulta está en posición `11-20`, reforzar contenido visible, enlaces internos y coherencia de la URL objetivo.
- Si aparece una URL equivocada para una consulta de modelo, revisar enlaces internos desde marca/flota hacia la landing correcta.
- Si una consulta tiene muchas impresiones y posición débil, decidir si falta una sección real o una landing específica.
- Si una URL ya está fuerte en top 3 y con buen CTR, protegerla: no tocar por tocar.

## Rutina semanal

- Lunes: exportar últimos 28 días y generar informe.
- Revisar top 10 oportunidades por score.
- Elegir máximo 3 cambios semanales para no mezclar demasiadas señales.
- Registrar fecha, consulta, URL, cambio y motivo.
- Tras publicar, pedir indexación solo en URLs prioritarias.
- A las 2-4 semanas, comparar contra el periodo anterior.

## Google Business Profile

Google dice que el ranking local se basa principalmente en relevancia, distancia y prominencia. Para nosotros eso significa:

- Categoría principal coherente con alquiler de coches de lujo.
- Nombre, teléfono, web y zona de servicio consistentes con la web.
- Servicios bien descritos: luxury car rental, chauffeur, airport delivery, monthly rental.
- Fotos reales de coches, entregas, interiores y detalles premium.
- Reseñas reales, nunca inventadas ni incentivadas de forma agresiva.
- Responder reseñas con naturalidad, mencionando contexto operativo cuando sea real.
- No crear ubicaciones falsas para intentar rankear en zonas donde no existe presencia real.

## Qué no vamos a hacer

- No vamos a meter `rental in Dubai` en todos los títulos visuales si queda feo o artificial.
- No vamos a crear FAQ inútil solo para rellenar schema.
- No vamos a prometer precio, disponibilidad, entrega o chófer si no está soportado por negocio.
- No vamos a cambiar 20 cosas a la vez y luego no saber qué funcionó.

## Próximo nivel

Cuando Search Console tenga suficiente volumen, el siguiente salto es usar API para sacar `query + page + country + device` y detectar canibalización de forma más limpia. Hasta entonces, el CSV nos sirve para priorizar batalla sin improvisar.

## Fuentes oficiales

- Informe de rendimiento de Search Console: https://support.google.com/webmasters/answer/7576553
- Exportar datos desde Search Console: https://support.google.com/webmasters/answer/12919797
- Impresiones, clics, CTR y posición: https://support.google.com/webmasters/answer/7042828
- Ranking local en Google Business Profile: https://support.google.com/business/answer/7091
- Datos estructurados `LocalBusiness`: https://developers.google.com/search/docs/appearance/structured-data/local-business
