# Sistema de plantillas madre

Este proyecto ya no debe tratar cada página como una pieza aislada. La regla base es: primero se cambia el dato o el renderer madre, después se regenera el HTML.

## Fuentes Madre Activas

- `server/data/global-header.json`: navegación, megamenús, enlaces rápidos y botón principal del header.
- `server/data/global-footer.json`: columnas, legales, contacto y bloque de soporte del footer.
- `server/data/fleet-cards.json`: cards de flota, cards destacadas de home y contenido común de páginas individuales de vehículos.
- `server/data/services-editor.json`: carriles principales y rutas auxiliares de `services.html`.
- `server/data/locations-editor.json`: zonas, guías, tarjetas y proceso de `locations.html`.

## Renderers

- `server/renderers/render-site-templates.js`: orquestador general de plantillas madre.
- `server/renderers/render-global-header.js`: sincroniza el header real en las páginas HTML.
- `server/renderers/render-global-footer.js`: sincroniza el footer real, incluyendo footers antiguos `page-foot`.
- `server/renderers/render-fleet-cards.js`: genera cards de fleet y cards destacadas de home.
- `server/renderers/render-vehicle-pages.js`: genera el bloque común de páginas individuales de vehículos con marcadores `VEHICLE_MOTHER_CONTENT_START` y `VEHICLE_MOTHER_CONTENT_END`.
- `server/renderers/render-services-page.js`: genera los bloques editables de servicios.
- `server/renderers/render-locations-page.js`: genera los bloques editables de ubicaciones.

## Comandos

```bash
npm run build:templates
```

Regenera todas las plantillas madre públicas. Una segunda ejecución sin cambios debe terminar con `changedCount: 0`.

```bash
npm run build:vehicles
```

Regenera solo el contenido común de páginas individuales de vehículos.

## Contrato De Vehículos

La página individual de cada coche conserva su hero y su bloque de reserva. El contenido común posterior debe ser deliberadamente corto:

- Bloque visual con foto actual del coche, preparado para sustituirse por vídeo real cuando exista material propio o licenciado.
- Relacionados con imagen para comparar alternativas cercanas.
- Sin chips, galería, casos de uso, detalle interior ni bloques de texto largos dentro de la madre.
- Sin FAQ visible ni `FAQPage` en el JSON-LD si no se renderiza FAQ en la página.

## Qué Queda Prohibido

- Copiar a mano un header o footer entre páginas.
- Crear una card de coche directamente en `fleet.html` o `index.html`.
- Añadir una sección común de vehículo fuera del bloque generado si pertenece al bloque cinematográfico o a relacionados.
- Cambiar `services.html` o `locations.html` dentro de bloques con marcadores sin mover primero el dato a su JSON correspondiente.

## Pendiente

- Centralizar también el `head`, schema SEO y primera ficha hero de cada vehículo.
- Separar datos específicos de vehículo que no deben vivir dentro de `fleet-cards.json` cuando el contenido individual crezca.
- Añadir una auditoría que falle si una página pública pierde header, footer o marcadores de bloques generados.
