# Production Functional Rental Gate

Este gate existe para evitar el error que ya hemos visto: probar que "un boton navega" no basta. En PGM una accion critica solo pasa si completa la intencion real del cliente y conserva datos correctos hasta el siguiente punto del negocio.

## Fuentes profesionales usadas

- ISTQB define acceptance testing como validar necesidades de usuario, requisitos y procesos de negocio antes de aceptar un sistema: https://istqb-glossary.page/acceptance-testing/
- OWASP WSTG Business Logic Testing recomienda probar validacion de datos, forjado de requests, integridad, timing, saltos de workflow, abuso y pagos: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/10-Business_Logic_Testing/
- Playwright recomienda verificar comportamiento visible para el usuario, aislar tests, controlar datos externos y usar locators/respuestas estables: https://playwright.dev/docs/best-practices
- W3C WAI Easy Checks cubre checks basicos pero importantes en formularios, foco visible, titulos, headings, labels y campos requeridos: https://www.w3.org/WAI/test-evaluate/easy-checks/

## Regla de no envio

No se sube a produccion si falla cualquiera de estas categorias:

- Un CTA lleva al destino equivocado o pierde la intencion del usuario.
- Un filtro de categoria/marca genera una pagina vacia no intencional.
- Home o Fleet muestran disponibilidad que contradice CRM/reservas.
- Un coche concreto abre Fleet generico en vez de su landing/ficha.
- Reserve permite avanzar con datos incompletos, fechas imposibles o coche unavailable.
- Un doble click genera doble reserva, doble pago o doble lead.
- Un error de API borra datos utiles o deja al usuario sin recuperacion.
- Reservation lookup filtra informacion sensible, muestra resultados obsoletos o mezcla reservas.
- Mobile impide completar una accion critica por overlays, drawers, filtros o CTAs mal apilados.
- Hay console errors/request failures en flujos basicos de cliente.

## Fallos tipicos de alquiler/reserva que el auditor debe buscar

### 1. Discovery incorrecto

- Card de coche que abre Fleet en vez de la landing exacta.
- Categoria visible sin inventario real.
- Mega menu y cards con taxonomias distintas.
- URL con `type`, `brand` o `vehicle` que no coincide con el estado visible.

### 2. Disponibilidad falsa

- Fleet no consulta `/api/availability` al venir de Home con fechas.
- Solapes de reserva tratados como disponibles.
- Reservas canceladas/borradores bloqueando coches.
- Aliases de coche distintos entre CRM y frontend.
- CTA `Reserve` habilitado para unavailable.

### 3. Handoff roto entre paginas

- Fechas/horas se pierden al pasar Home -> Fleet -> landing -> Reserve.
- Precio/coche cambia al reservar desde card, landing o SEO page.
- Back/reload deja schedule viejo o detalles personales obsoletos.
- Switch car conserva datos que pertenecen a otro coche.

### 4. Reserva y pago debiles

- Se puede saltar pasos con URL o parametros manipulados.
- Fechas de retorno anteriores al pickup no se bloquean.
- Campos requeridos permiten avanzar vacios.
- Email/telefono invalidos pasan a checkout.
- Doble submit crea dos reservas o dos intents.
- Fallo temporal del backend no permite reintentar limpio.

### 5. Contacto y lookup inseguros

- WhatsApp/tel usan numero incorrecto o no llevan contexto.
- Contact form acepta parciales, duplica envios o pierde datos al fallar.
- Lookup muestra resultado anterior despues de una busqueda fallida.
- Lookup expone PII completa o permite buscar sin datos suficientes.

### 6. Mobile funcional, no solo responsive

- Drawer o floating buttons tapan CTAs.
- Filtros moviles quedan cortados.
- Botones de card se ven bonitos pero no se pueden pulsar bien.
- Teclado/foco rompe formularios.
- CTA principal queda por debajo del fold sin alternativa clara.

## Comando de cierre

Ejecutar antes de entregar al socio o subir a produccion:

```bash
npm run audit:functional:production
```

Si solo quieres ver que cubre sin ejecutarlo:

```bash
node scripts/qa/run-production-functional-gate.js --list
```

Si el run completo es demasiado largo durante desarrollo, se puede saltar el agente exploratorio final, pero no para cierre real:

```bash
node scripts/qa/run-production-functional-gate.js --skip-agent
```

## Evidencia esperada

Un run valido debe cubrir:

- Home availability con CRM mocked/controlado.
- Home category cards a Fleet con filtro real y resultados no vacios.
- Home featured cars a landings exactas.
- Fleet comparacion, filtros y reserve handoff.
- Services deep links y funnels a reserve.
- Reserve validaciones negativas, persistencia, recuperacion y doble submit.
- Reservation lookup seguro.
- Functional agent en Home, Fleet, Reserve, Lookup y Contact para desktop/mobile.

Si aparece un bug nuevo, se convierte en test o en memoria de auditoria. No se acepta como "ya lo miramos manualmente".
