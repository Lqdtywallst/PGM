# Professional Functional Audit Playbook

Este playbook convierte el auditor funcional de PGM en un auditor de cliente real. La regla principal es simple: no probamos botones aislados, probamos misiones completas con intencion, datos, APIs, errores y recuperacion.

## Base profesional

Fuentes usadas como referencia:

- ISTQB Acceptance Testing: criterios de aceptacion medibles, tests derivados de historias de usuario y colaboracion negocio/testing.
- Playwright Best Practices: localizar controles como los ve un usuario y usar contratos explicitos resistentes.
- W3C WCAG 2.2 y WAI Easy Checks: foco visible, labels, campos requeridos, mensajes de estado y evaluacion humana junto a automatizacion.
- OWASP Web Security Testing Guide y OWASP input validation: validar entradas, errores, logica de negocio, APIs y flujos cliente-servidor.
- Google Core Web Vitals: experiencia real de carga, interaccion y estabilidad visual.

## Regla De Oro

Cada accion critica debe responder a estas preguntas:

- Quien es el cliente?
- Que intenta conseguir?
- Que datos realistas introduce?
- Que pagina/estado/API debe producirse?
- Que informacion debe sobrevivir al handoff?
- Que pasa si hay error, recarga, back o API lenta?
- Como se ve en movil, desktop y con teclado?

Si una prueba solo dice "hice click y cambio la URL", no es una prueba funcional suficiente.

## Misiones Realistas PGM

### 1. Cliente con fechas claras desde Home

Intencion: "Necesito coche disponible del viernes al domingo".

Debe probar:

- rellena pickup/return date y horas en Home
- `See available cars` abre Fleet con esos datos
- Fleet llama a `/api/availability`
- coches no disponibles se muestran como unavailable
- `Reserve` de unavailable queda bloqueado
- coches disponibles conservan fechas/horas en su CTA

### 2. Cliente que empieza por categoria

Intencion: "Quiero ver deportivos/SUV/lujo, pero ya se mis fechas".

Debe probar:

- tarjeta de categoria de Home abre Fleet
- URL lleva `type`
- solo quedan visibles coches de esa categoria
- fechas/horas elegidas siguen vivas
- reset filters devuelve resultados utiles

### 3. Cliente atraido por un coche concreto

Intencion: "Quiero saber mas de este Ferrari/Huracan/Urus/Cullinan".

Debe probar:

- imagen, titulo y boton de la card abren la landing exacta del coche
- no abre Fleet generico
- heading de la landing coincide con el coche clicado
- panel de booking del coche esta visible
- el formulario de la ficha envia ese coche exacto a reserva

### 4. Cliente comparando en Fleet

Intencion: "Comparo marcas y luego reservo el primer coche que encaja".

Debe probar:

- filtros de marca/tipo/precio no dejan estados vacios inutiles
- contador de resultados cambia correctamente
- estado de disponibilidad no contradice el CRM
- Reserve de un coche disponible abre reserva con coche/precio/fechas
- back/switch car no deja datos obsoletos

### 5. Cliente que entra por SEO landing

Intencion: "He llegado desde Google buscando Lamborghini/Ferrari/G63".

Debe probar:

- hero responde a esa busqueda
- CTAs llevan a ficha/reserva/contacto correctos
- tarjetas relacionadas no mandan al coche equivocado
- formulario de ficha conserva coche, precio y schedule
- breadcrumbs/back to fleet no rompen contexto

### 6. Cliente que quiere concierge antes de reservar

Intencion: "Prefiero hablar por WhatsApp o mandar un lead".

Debe probar:

- tel y WhatsApp usan numero aprobado
- mensaje WhatsApp contiene contexto del coche/servicio cuando aplica
- contact form valida campos requeridos
- API failure muestra recuperacion sin borrar datos
- exito es visible y no duplica envios

### 7. Cliente listo para pagar

Intencion: "Completo reserva con datos reales y pago mock".

Debe probar:

- step 1 bloquea datos incompletos
- horarios invalidos generan error claro
- reload conserva progreso
- checkout mock monta Stripe
- confirmacion redirige a success/lookup correcto
- CRM guarda reserva y lookup la encuentra

### 8. Cliente movil con prisa

Intencion: "Reservo desde el movil, con una mano, sin perderme".

Debe probar:

- drawer abre/cierra y no tapa el flujo
- filtros moviles son alcanzables y legibles
- CTAs no se pisan con floating buttons
- cards tienen botones apilados limpios
- teclado/foco permite completar formularios

## Checks Transversales

### Aceptacion y negocio

- cada mision tiene persona, intencion y criterios true/false
- cada test guarda evidencia: URL, estado visual, campos, API, mensaje
- cada bug se asigna a la mision del cliente afectada

### Accesibilidad funcional

- foco visible en links, botones, inputs y drawers
- labels asociados a inputs
- required fields identificables
- errores descritos en texto
- mensajes dinamicos anunciables como status
- flujo usable con teclado en formularios y menus

### Seguridad y logica de negocio

- inputs de contacto/reserva rechazan datos invalidos
- el frontend no puede reservar coche marcado unavailable
- APIs de contacto/reserva/availability tienen errores manejados
- no se exponen secretos ni stack traces al usuario
- acciones de pago/reserva no se duplican con doble click

### Rendimiento percibido

- primera vista carga sin layout shift fuerte
- hero y CTAs son interactivos pronto
- filtros y botones responden sin bloqueo perceptible
- imagenes criticas no rompen la experiencia movil

## Evidencia Minima Por Run

Un run serio debe generar:

- lista de escenarios cubiertos, parciales y fallidos
- screenshots de fallos
- console errors y request failures
- acciones ejecutadas por viewport
- APIs interceptadas o llamadas reales relevantes
- diferencia entre scope acotado y auditoria profunda

## Orden Recomendado De Ejecucion

Para trabajar por zonas:

```bash
npx playwright test tests/e2e/public-site.spec.js --grep "home category cards|home featured car cards|home date search applies CRM availability"
node scripts/audits/run-functional-agent.js --route / --viewport laptop --viewport mobile-modern
```

Para misiones funcionales:

```bash
npm run audit:functional:missions
npm run audit:functional:contracts
npm run audit:functional:recovery
npm run audit:functional:adversarial
```

Para cierre profundo:

```bash
npm run audit:functional:deep
npm run audit:memory:check:functional
```

