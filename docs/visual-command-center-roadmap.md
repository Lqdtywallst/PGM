# Roadmap del Centro de Mandos Visual

## Objetivo

Convertir el editor visual en una herramienta segura para que una persona no tecnica pueda ajustar la web sin tocar codigo: mover botones, agrandar o reducir elementos, cambiar tipografias, ocultar o duplicar bloques y revisar el resultado por dispositivo antes de publicar.

## Principios

- El editor no debe romper la web publica mientras se esta probando.
- Los cambios visuales deben empezar como borrador y publicarse de forma intencional.
- Los controles deben depender del tipo de elemento seleccionado: boton, texto, card, formulario, media, layout o seccion.
- Los valores deben usar opciones seguras del sistema visual siempre que sea posible.
- La primera pantalla de cada pagina sigue siendo zona critica: cualquier cambio en hero, CTA principal o formulario debe validarse en movil, tablet, laptop y desktop.

## Fase 1: Inspector inteligente

Estado: en progreso.

Al seleccionar un elemento, el panel debe detectar su familia y mostrar controles utiles:

- Boton/CTA: tamano, ancho, padding, radio, color, jerarquia visual, mover arriba/abajo, alineacion.
- Texto/hero: fuente, tamano, peso, interlineado, tracking, ancho maximo, alineacion.
- Card/panel: padding, ancho, altura minima, radio, fondo, separacion interna, movimiento.
- Formulario: ancho, altura de campos, espaciado, orden visual, claridad de labels.
- Media/imagen: ancho, alto, radio, posicion, recorte futuro.
- Layout/contenedor: gap, grid/flex, alineacion, orden y espaciado general.

Entregable:

- Panel "Element family" con diagnostico y acciones rapidas.
- Presets seguros para hacer elementos mas grandes, mas compactos o moverlos sin escribir CSS.
- Guardado mediante `visual-overrides.json` y CSS generado.

## Fase 2: Edicion responsive real

Estado: siguiente.

El editor debe permitir definir reglas por viewport:

- Global: aplica a todos.
- Mobile: hasta 760px.
- Tablet: 761px a 1024px.
- Laptop: 1025px a 1440px.
- Desktop: mas de 1440px.

Entregable:

- Selector "aplicar a" por viewport.
- CSS generado con media queries.
- Avisos cuando un cambio mueve demasiado un CTA o crea riesgo de solape.

## Fase 3: Drag and drop controlado

Estado: siguiente.

No todos los elementos deben poder moverse libremente. El movimiento seguro debe empezar por contenedores conocidos:

- Grupos de CTAs.
- Cards dentro de grids.
- Bloques dentro de secciones.
- Items de navegacion o listas controladas.

Entregable:

- Drag para reordenar hermanos dentro del mismo contenedor.
- Botones "subir", "bajar", "primero", "ultimo".
- Guardado como orden semantico cuando el bloque venga de datos JSON; fallback como `order` CSS cuando sea solo visual.

## Fase 4: Crear, duplicar, ocultar y borrar

Estado: posterior.

El editor debe distinguir entre ocultar visualmente y borrar de verdad:

- Ocultar: seguro, reversible, CSS `display: none`.
- Duplicar: crear una copia desde plantilla o desde datos.
- Anadir: elegir bloques preaprobados.
- Borrar: solo para bloques gestionados por datos, con confirmacion.

Entregable:

- Biblioteca de bloques: CTA, card, feature, FAQ, trust chip, seccion simple.
- Papelera/recovery.
- Historial de acciones.

## Fase 5: Publicacion y seguridad

Estado: posterior.

Para que otra persona edite con tranquilidad:

- Borradores separados de publicado.
- Boton "Publicar cambios".
- Boton "Descartar cambios".
- Captura/preview antes y despues.
- Auditoria rapida antes de publicar.

Checks minimos antes de publicar:

- No hay overflow horizontal.
- Botones mantienen minimo 44px de alto.
- Texto mantiene contraste suficiente.
- El CTA principal no queda escondido en movil/laptop.
- No hay mas de un CTA dominante en la primera pantalla.

## Estrategia de ramas

Recomendacion:

1. Terminar o guardar los cambios actuales de `site/`.
2. Crear rama `feature/visual-command-center`.
3. Desarrollar el editor sin tocar contenido publico salvo CSS generado controlado.
4. Probar en admin y en `http://localhost:8080`.
5. Mergear a `staging` cuando el flujo de edicion sea estable.

No se recomienda desarrollar esta herramienta directamente sobre `staging` con la web publica cambiando al mismo tiempo.
