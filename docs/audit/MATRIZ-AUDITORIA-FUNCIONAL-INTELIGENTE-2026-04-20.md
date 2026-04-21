# Matriz de Auditoria Funcional Inteligente 2026-04-20

## Objetivo

Definir una auditoria funcional de alta cobertura para cada ruta publica del sitio.

La auditoria no debe limitarse a comprobar que la pagina carga. Debe validar:

- que cada pestana mantiene un formato correcto
- que cada boton, enlace, selector, overlay o acordeon visible hace algo coherente
- que no hay puntos muertos ni handoffs rotos
- que el primer viewport mantiene jerarquia visual clara
- que la experiencia aguanta en movil, tablet, laptop y desktop grande

## Matriz de dispositivos

Cada ruta auditada debe revisarse en:

- movil: `390x844`
- tablet: `768x1024`
- laptop: `1366x768`
- desktop grande: `1707x893`

## Regla de pase

Una ruta solo puede considerarse `aprobada` si cumple las cuatro capas:

1. integridad visual
2. interaccion visible
3. navegacion y handoff
4. higiene tecnica

Si falla cualquiera de estos bloqueos, la ruta queda `observada` o `fallida` aunque el resto puntue bien:

- CTA principal roto o ambiguo
- enlace visible que termina en error, vacio o destino incoherente
- boton visible que no hace nada sin justificacion
- solape, overflow horizontal o corte de texto relevante
- perdida de estado hacia `fleet` o `reserve`
- error de consola o error de red en recursos clave
- ausencia de `h1` visible donde deberia existir

## Sistema de puntuacion por ruta

Puntuar cada ruta sobre 100:

- 35 puntos: calidad visual y primer viewport
- 25 puntos: integridad de elementos interactivos visibles
- 15 puntos: navegacion interna y accesos secundarios
- 15 puntos: handoff y preservacion de estado
- 10 puntos: consola, red y estabilidad tecnica

Interpretacion:

- `90-100`: aprobada
- `75-89`: aprobada con observaciones
- `50-74`: riesgo funcional
- `<50`: fallida

## Checklist base para todas las rutas

Aplicar siempre esta lista antes de entrar en criterios especificos por familia:

- la ruta carga sin error
- existe un `title` coherente con la pagina
- existe un `h1` visible salvo excepciones deliberadas como `reserve`
- el `h1` funciona como titular principal real, no como texto perdido o secundario
- el primer viewport tiene una jerarquia clara y una lectura obvia en menos de unos segundos
- hay un CTA principal reconocible y perceptiblemente dominante
- los CTAs secundarios no compiten con el principal ni diluyen la decision
- el contenido principal del primer viewport cabe con aire y sin sensacion de bloque apretado
- la proporcion entre copy, media y accion se siente equilibrada para el breakpoint
- el viewport inicial no parece un bloque generico ni una composicion accidental
- la pagina deja claro que hacer a continuacion sin exigir relectura
- no hay overflow horizontal
- no hay textos cortados, solapados o fuera del viewport
- no hay saltos raros de alineacion, espaciado o escala entre breakpoints
- la densidad visual es consistente con una experiencia premium y limpia
- header y footer mantienen enlaces operativos
- no hay errores de consola relevantes
- no hay recursos criticos con `404`, `500` o `requestfailed`
- todos los botones visibles ejecutan una accion verificable
- todos los enlaces visibles llevan a un destino valido
- overlays, menus y acordeones abren y cierran correctamente
- formularios muestran feedback comprensible

## Tipos de interaccion a validar

Cada elemento visible debe clasificarse y auditarse segun su tipo:

### Navegacion

- enlaces del header
- mega menu de marcas
- enlaces del footer
- breadcrumbs si existen

Validacion:

- destino correcto
- `h1` visible en destino
- sin errores de consola nuevos

### CTA transaccional

- `Start with dates`
- `Reserve`
- `Book`
- `Check availability`
- `Open reservation flow`

Validacion:

- CTA dominante y entendible
- destino o overlay correcto
- conserva coche, fechas y horas cuando aplique
- no queda visualmente empatado con otros botones cercanos

### Controles de exploracion

- filtros de `fleet`
- tabs de servicios
- selects
- summaries
- acordeones

Validacion:

- cambio de estado visible
- sin dejar la UI en estado inconsistente
- sin perder datos ya introducidos

### Formularios

- contacto
- booking en PDP
- reserva completa

Validacion:

- campos requeridos bloquean bien
- mensajes de error claros
- envio exitoso visible
- reseteo o continuidad correctos segun el flujo
- el formulario parece utilizable y prioritario, no escondido o accesorio

### Accesos externos

- telefono
- WhatsApp
- email

Validacion:

- formato correcto del enlace
- no apunta a vacio ni a placeholders
- es descubrible en el viewport esperado

## Capa visual inteligente

La auditoria visual no debe quedarse en "no se rompe". Debe juzgar si la pagina esta resuelta con criterio.

### 1. Jerarquia real

Preguntas:

- se entiende en 3 segundos que pagina es y que propone
- hay un unico foco dominante
- el titular principal manda de verdad
- el CTA principal destaca sin gritar

Senales de problema:

- varios bloques compiten por ser el primero
- el ojo no sabe donde caer
- el titular principal parece un texto mas
- el CTA principal esta empatado con botones secundarios

### 2. Claridad de accion

Preguntas:

- el siguiente paso esta claro sin releer
- la accion principal aparece pronto
- la pagina ayuda a decidir o solo muestra contenido

Senales de problema:

- demasiados caminos equivalentes
- CTA principal ambiguo
- hay que explorar demasiado para entender como avanzar

### 3. Balance compositivo

Preguntas:

- la relacion entre copy, media y accion se siente equilibrada
- el contenido cabe con aire
- la composicion llena bien el viewport sin quedarse pobre ni saturada

Senales de problema:

- demasiado vacio o demasiada densidad
- media dominante que hunde la accion
- tarjeta o panel demasiado pequeno, aislado o desalineado

### 4. Consistencia responsive

Preguntas:

- la idea visual de la pagina sobrevive al pasar de movil a desktop
- cambian las proporciones, pero no se pierde la jerarquia
- el CTA principal sigue siendo el CTA principal en todos los breakpoints

Senales de problema:

- desktop correcto pero movil torpe
- movil correcto pero laptop se vacia
- cambios de escala que rompen la sensacion premium

### 5. Sensacion de calidad

Preguntas:

- la pagina parece intencionada o ensamblada
- el primer viewport transmite confianza
- hay coherencia entre tipografia, espaciado, media y accion

Senales de problema:

- apariencia de bloque generico
- exceso de elementos compitiendo
- composicion sin tension visual ni direccion

## Escala de severidad visual

- `V0`: rotura visual critica, solape fuerte, CTA principal inutilizable o viewport inicial fallido
- `V1`: jerarquia confusa, CTA diluido, composicion pobre o handoff visualmente mal resuelto
- `V2`: desbalance moderado, densidad mejorable o inconsistencia entre breakpoints
- `V3`: ajuste fino, detalle cosmetico o mejora editorial

## Criterio minimo para considerar que un `h1` es visible

No basta con que el `h1` exista en el DOM.

Para marcarlo como valido debe:

- estar renderizado en pantalla
- no estar oculto por `display`, `visibility` u opacidad casi nula
- no quedar tapado por overlays o capas superiores
- no estar visualmente degradado hasta parecer texto secundario
- participar en la jerarquia real del primer viewport

Si hay `h1` tecnico pero no actua como titular principal percibido, debe marcarse como hallazgo visual.

## Matriz por familia de rutas

## 1. Home `/`

### Objetivo

Presentar la propuesta principal y llevar a navegacion, exploracion de marcas o inicio de reserva sin friccion.

### Validar

- un solo `h1` visible y dominante
- un CTA principal claro en el hero
- un unico foco dominante en el primer viewport
- la composicion superior se entiende de un vistazo
- mega menu `Cars Brands` visible, usable y cerrable
- overlay de fechas abre, cierra y envia a `fleet`
- handoff de fechas y horas a `fleet`
- accesos principales del header funcionan
- bloques destacados de marcas o categorias llevan a destino valido
- footer mantiene accesos utiles y coherentes

### Falla grave si

- el hero tiene demasiados CTAs compitiendo
- el overlay no abre o no envia bien
- el mega menu no se puede usar en movil o desktop
- el primer viewport parece generico o confuso
- no hay un foco dominante claro

## 2. Navegacion principal

### Rutas

- `/fleet.html`
- `/services.html`
- `/locations.html`
- `/about.html`
- `/contact.html`

### Validar

- cada una abre desde header sin ruptura
- cada una mantiene `h1` visible
- CTA principal reconocible en el primer viewport
- la pagina comunica su rol en un vistazo
- consistencia de header y footer
- estructura visual limpia en los cuatro dispositivos

### Falla grave si

- alguna ruta abre pero sin jerarquia clara
- la CTA principal queda escondida o diluida
- la maquetacion cambia de forma torpe entre breakpoints

## 3. Fleet `/fleet.html`

### Objetivo

Comparar inventario, filtrar y entrar en reserva con el estado correcto.

### Validar

- grid inicial con tarjetas visibles y alineadas
- el primer bloque de resultados se siente lleno y util, no raquitico
- filtros de marca actualizan resultados
- contador de resultados coherente
- fechas y horas no se pierden al filtrar
- CTA de reserva por tarjeta abre `reserve`
- el vehiculo elegido llega correcto a `reserve`
- cards sin imagen rota ni CTA roto

### Falla grave si

- filtros dejan la interfaz en blanco sin sentido
- el usuario no entiende cuantas opciones quedan
- el handoff a `reserve` pierde fechas, horas o modelo

## 4. Services hub `/services.html`

### Objetivo

Permitir entender servicios y entrar en paginas de detalle o reserva con un siguiente paso claro.

### Validar

- primer viewport con jerarquia clara
- tabs o paneles de servicio cambian bien
- una accion principal domina sobre exploracion secundaria
- cada tarjeta de servicio lleva a su landing correcta
- CTA principal no compite con demasiados secundarios
- enlaces a detalle y reserva funcionan

### Falla grave si

- el primer viewport parece un panel sin prioridad
- tabs o paneles cambian mal o rompen layout
- tarjetas de servicio no llevan a ninguna parte util

## 5. Service detail pages

### Rutas

- `/airport-concierge-dubai.html`
- `/chauffeur-service-dubai.html`
- `/hotel-villa-airport-delivery-dubai.html`
- `/wedding-event-car-rental-dubai.html`
- `/business-car-rental-dubai.html`
- `/monthly-luxury-car-rental-dubai.html`

### Validar

- `h1` especifico y entendible
- CTA principal claro en la parte alta
- el servicio se percibe como accionable, no como articulo
- bloque de valor y confianza visible antes del scroll profundo
- enlaces internos hacia reserva o contacto funcionan
- sin sensacion de pagina editorial muerta

### Falla grave si

- la pagina se lee como contenido pero no como servicio accionable
- el CTA de paso siguiente no esta claro

## 6. SEO guides

### Rutas

- `/luxury-car-rental-dubai.html`
- `/abu-dhabi-luxury-car-rental.html`
- `/dubai-airport-luxury-car-rental.html`
- `/palm-jumeirah-luxury-car-rental.html`
- `/dubai-marina-luxury-car-rental.html`
- `/supercar-rental-dubai.html`

### Validar

- primer viewport util para trafico frio
- el contenido SEO no entierra la accion principal
- CTA o puente hacia reserva visible sin releer media pagina
- enlaces internos hacia marcas, vehiculos o reserva operativos
- bloques informativos no desplazan la accion principal
- sin canibalizacion de CTAs en cabecera del contenido

### Falla grave si

- parece una landing SEO sin camino claro a conversion
- la accion principal queda enterrada

## 7. Brand pages

### Rutas

- `/lamborghini-rental-dubai.html`
- `/ferrari-rental-dubai.html`
- `/mercedes-rental-dubai.html`
- `/porsche-rental-dubai.html`
- `/rolls-royce-rental-dubai.html`

### Validar

- diferenciacion visual y textual suficiente por marca
- CTA principal claro en el primer viewport
- la pagina tiene identidad de marca, no plantilla apenas rellenada
- enlaces o cards hacia vehiculos de esa marca funcionan
- acceso a reserva no pierde contexto
- navegacion entre marcas no resulta confusa

### Falla grave si

- las paginas parecen intercambiables
- el CTA existe pero no domina
- se pierde la intencion al saltar de marca a reserva

## 8. Vehicle PDPs

### Rutas

- `/lamborghini-huracan-evo-spyder-rental-dubai.html`
- `/lamborghini-urus-rental-dubai.html`
- `/ferrari-296-gts-rental-dubai.html`
- `/mercedes-g63-amg-rental-dubai.html`
- `/porsche-992-gt3-rental-dubai.html`
- `/rolls-royce-cullinan-black-badge-rental-dubai.html`

### Validar

- hero con sensacion transaccional, no solo editorial
- galeria o media visible sin romper el layout
- booking form visible y util
- el booking form compite bien frente a la media y no queda diluido
- `Check availability` lleva a `reserve`
- modelo, fechas y horas llegan intactos
- especificaciones y copy no empujan el form fuera de la prioridad

### Falla grave si

- el formulario parece secundario
- cambia el nombre del coche entre PDP y `reserve`
- el handoff pierde algun dato clave

## 9. Contact `/contact.html`

### Objetivo

Resolver soporte y captacion de lead sin pedir esfuerzo innecesario.

### Validar

- canal de contacto rapido visible pronto
- formulario usable y comprensible
- el canal prioritario se entiende rapido
- validacion de obligatorios
- envio exitoso con feedback claro
- canales alternativos como telefono o WhatsApp operativos

### Falla grave si

- no se sabe cual es el canal recomendado
- el formulario no explica bien el error
- el exito queda debil o ambiguo

## 10. Locations `/locations.html`

### Objetivo

Explicar cobertura geografica y facilitar una accion inmediata.

### Validar

- layout equilibrado en el primer viewport
- CTA visible y operativo
- la composicion en dos bloques mantiene alineacion y peso visual
- mapa, bloques de zonas o accesos relacionados no rompen la maquetacion
- enlaces a reserva o contacto mantienen coherencia

### Falla grave si

- el layout queda desalineado en desktop o movil
- la accion principal no destaca

## 11. About `/about.html`

### Objetivo

Reforzar confianza sin romper la continuidad hacia accion.

### Validar

- relato claro y bien jerarquizado
- CTA secundaria razonable hacia `fleet`, `contact` o `reserve`
- la confianza construida arriba no deja la pagina sin salida
- la pagina no queda huera ni sin salida

### Falla grave si

- la pagina corta el flujo del usuario
- no hay siguiente paso legible

## 12. Legal pages

### Rutas

- `/terms-and-conditions.html`
- `/terms-and-conditions-uae.html`

### Validar

- contenido legible en todos los viewports
- sin overflow ni bloques rotos
- header y footer no inducen a error
- enlaces legales y de navegacion funcionales

### Falla grave si

- la lectura se rompe en movil
- enlaces legales visibles fallan

## 13. Reserve `/app/reserve/page.html`

### Objetivo

Completar el flujo de reserva sin dudas ni bloqueos.

### Validar

- datos de coche, precio, fechas y horas llegan bien cuando vienen prefill
- paso 1 bloquea obligatorios con mensaje claro
- paso 2 bloquea horarios imposibles
- `Continue` y `Pay` reflejan bien el estado
- Stripe o mock monta correctamente
- exito final visible y coherente

### Falla grave si

- el usuario no entiende por que no puede continuar
- el pago parece roto o medio cargado
- el exito final no confirma la accion

## Inventario minimo de rutas a revisar

El barrido inteligente debe cubrir como minimo todas las rutas publicas mapeadas en `server/public-page-map.js`.

- `home`: 1 ruta
- `top level`: 5 rutas principales contando `home`
- `guides SEO`: 6 rutas
- `services detail`: 6 rutas
- `brands`: 5 rutas
- `vehicles`: 6 rutas
- `legal`: 2 rutas
- `reserve`: 1 ruta

## Salida esperada del auditor por ruta

Cada ruta debe devolver un registro con este esquema:

- ruta
- familia
- viewport
- estado final
- puntuacion total
- CTA principal detectado
- lista de interacciones revisadas
- interacciones aprobadas
- interacciones fallidas
- hallazgos visuales
- severidad visual
- hallazgos funcionales
- errores de consola
- errores de red
- evidencia visual
- recomendacion

## Prioridad de hallazgos

- `P0`: rompe reserva, contacto o acceso principal
- `P1`: CTA ambiguo, handoff roto, bug visible o formato muy degradado
- `P2`: incoherencia menor, friccion o jerarquia mejorable
- `P3`: detalle cosmetico o mejora editorial

## Orden recomendado de ejecucion

1. `home`
2. `fleet`
3. `services`
4. `contact`
5. `reserve`
6. `brand pages`
7. `vehicle PDPs`
8. `SEO guides`
9. `locations`
10. `about`
11. `legal`

## Uso operativo

Esta matriz sirve para dos cosas:

- auditar manualmente con criterio estable
- convertir hallazgos repetibles en Playwright y en el agente funcional

La siguiente fase natural es conectar esta matriz con una salida automatizada por ruta para que el auditor no solo visite elementos visibles, sino que tambien clasifique gravedad, formato y handoff en un solo informe.

## Conexion con el auditor movil pro

Esta conexion ya existe en el repo mediante:

- `npm run audit:mobile:pro`
- `npm run audit:mobile:full`
- `docs/audit/MOBILE-PRO-AUDIT-PLAYBOOK.md`
- `scripts/run-mobile-pro-audit.js`

La salida consolidada queda en:

- `artifacts/mobile-pro-audit/<timestamp>/report.json`
- `artifacts/mobile-pro-audit/<timestamp>/report.md`

Cada corrida mezcla cuatro capas:

1. responsive audit
2. visual agent en `mobile-modern`
3. functional agent en `mobile-modern`
4. Lighthouse por muestra de familias

## Primera corrida automatizada completa

Referencia:

- `artifacts/mobile-pro-audit/2026-04-20T16-46-23-495Z/report.md`

Resumen:

- rutas cubiertas: `32`
- checks responsive moviles: `14` pasados / `3` fallidos
- visual mobile: `18 good` / `13 review` / `1 bad`
- functional mobile: `23` acciones / `1` fallo
- Lighthouse muestra: `8` paginas
- medias Lighthouse: `performance 67`, `accessibility 98`, `best-practices 100`, `seo 100`

## Prioridades detectadas en la primera corrida

### Prioridad media

- `/`
  - responsive mobile failure
  - mobile performance `60`
- `/app/reserve/page.html`
  - review gate visual
  - deriva de contrato visual de la familia
  - fallo en feedback de validacion del paso 2
  - mobile performance `60`
- `/supercar-rental-dubai.html`
  - fallo responsive en movil
- `/services.html`
  - regresion visual en el viewport movil
- `/lamborghini-rental-dubai.html`
  - review gate visual
  - mobile performance `60`
- `/lamborghini-huracan-evo-spyder-rental-dubai.html`
  - review gate visual
  - mobile performance `50`

### Prioridad baja

- `/mercedes-rental-dubai.html`
- `/rolls-royce-rental-dubai.html`
- `/porsche-992-gt3-rental-dubai.html`
- `/fleet.html`
- `/ferrari-rental-dubai.html`
- `/porsche-rental-dubai.html`

Estas rutas no rompen la experiencia, pero muestran drift respecto a la familia visual o quedan en `review` en la capa movil.

## Fallos responsive concretos detectados

- `seo-landing fits mobile-small (360x640)`
- `seo-landing fits mobile-modern (390x844)`
- `home booking overlay stays usable on mobile-small (360x640)`

## Lectura operativa de esta corrida

- `home` y `reserve` deben entrar siempre en el top de revision movil
- `services` sigue siendo el punto visual mas fragil
- las landings SEO necesitan revisar CTA principal y primer viewport en movil
- varias brand pages y vehicle PDPs no estan rotas, pero si se estan alejando del patron compartido

## Siguiente ciclo recomendado

1. corregir `services.html`
2. resolver feedback y claridad de validacion en `reserve`
3. estabilizar `home` en `360x640`
4. revisar `supercar-rental-dubai.html`
5. volver a ejecutar `npm run audit:mobile:full`
