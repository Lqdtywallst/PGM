# Auditoría inteligente de flujos completos de cliente

Fecha: 2026-04-21
Ámbito: recorridos end-to-end reales desde intención hasta resultado

## Objetivo

Validar si un usuario real puede completar su objetivo de negocio sin fricción grave:

- encontrar vehículo
- reservarlo
- pagar
- o contactar con soporte

Aquí no auditamos un control aislado, sino el recorrido entero y la continuidad del contexto.

## Cobertura actual creada

Suite principal:
[audit-customer-complete-flows.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/audit-customer-complete-flows.spec.js)

Cobertura adicional útil:

- [customer-journeys.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/customer-journeys.spec.js)
- [critical-flows.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/critical-flows.spec.js)
- [services-deep-links.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/services-deep-links.spec.js)

## Qué cubre ya

### Desktop

1. `home overlay -> fleet -> reserve -> secure payment -> success`
2. `contact -> successful lead submission`

### Mobile

1. `home overlay -> fleet -> reserve -> secure payment -> success`

## Qué valor da esta capa

Sirve para responder preguntas de negocio, no solo técnicas:

- ¿se conserva el contexto entre páginas?
- ¿el usuario termina donde esperaba?
- ¿hay handoffs rotos entre marketing, selección y checkout?
- ¿hay pasos que hacen abandonar aunque cada pantalla “funcione” aislada?

## Dónde sacar más jugo

### Prioridad 1: flujo comercial principal

Ruta:
`home -> fleet -> reserve -> payment -> success`

Motivo:
- es el funnel central
- cualquier fuga aquí cuesta conversión directa

Qué explotar más:
- cambio de coche a mitad del flow
- volver de `reserve` a `fleet` y elegir otro modelo
- recarga en `step2` o `step3`
- confirmación backend degradada tras pago exitoso

Hipótesis de fallo:
- pago correcto pero confirmación rota
- cambio de coche deja pricing anterior
- el usuario vuelve atrás y termina pagando con datos mezclados

### Prioridad 2: flujo desde `services`

Ruta:
`services -> service detail -> reserve`

Motivo:
- conecta intención editorial/comercial con transacción
- ya salió un bug real de interceptación en desktop

Qué explotar más:
- cada servicio principal
- service detail con CTA superior e inferior
- handoff con agenda ya preseleccionada
- mobile y desktop por separado

Hipótesis de fallo:
- CTA visible correcto pero enlace real incorrecto
- service detail conserva branding pero no el contexto de reserva

### Prioridad 3: flujo de soporte

Ruta:
`contact -> retry -> success`

Motivo:
- es la red de seguridad cuando reserva directa no cuaja
- un formulario frágil aquí mata leads calientes

Qué explotar más:
- fallo transitorio y retry
- éxito después de error
- rutas de soporte desde WhatsApp y teléfono

Hipótesis de fallo:
- tras error, botón queda mal
- tras éxito, estado no se limpia
- el usuario pierde el texto del mensaje

### Prioridad 4: flujo móvil completo

Motivo:
- en móvil la fricción se multiplica
- overlays, drawers y stepper tienen más riesgo

Qué explotar más:
- overlay home
- filtros y selección de coche
- visibilidad de campos en `reserve`
- sticky action bar y CTA final

Hipótesis de fallo:
- una capa tapa un control
- un select no tiene opciones esperadas
- el paso avanza pero el foco o la visibilidad no acompañan

### Prioridad 5: flujo de error y recuperación

Motivo:
- no basta con que el happy path termine
- las apps serias se notan cuando fallan con dignidad

Qué explotar más:
- `/api/reserve` falla
- `/api/reserve/confirm` falla
- Stripe rechaza o no monta
- el backend tarda demasiado

Hipótesis de fallo:
- el usuario no entiende si debe reintentar
- el estado queda a medias
- el pago parece fallido cuando no lo es, o al revés

## Orden recomendado de explotación

1. `home -> fleet -> reserve -> pay`
2. `services -> detail -> reserve`
3. `contact recovery flow`
4. `mobile complete flow`
5. `error recovery complete flow`

## Señal de calidad que más valor da aquí

En flujos completos hay que observar:

- continuidad del contexto entre páginas
- consistencia del coche, fechas y precio
- éxito o error entendible para el usuario
- posibilidad real de recuperación

## Resultado actual

La capa de flujos completos ya está funcionando y validada en desktop y mobile. Ahora mismo permite afirmar que:

- el funnel principal puede completarse
- el funnel de soporte puede completarse
- el stack ya tiene base para auditar degradaciones futuras de negocio

## Siguiente fase recomendada

Abrir una ronda específica de:

- `complete-flow-error-recovery.spec.js`
- `services-to-reserve-funnels.spec.js`
- `switch-car-mid-flow.spec.js`
- `mobile-friction-points.spec.js`

La mejor inversión inmediata aquí es `services -> reserve` y `error recovery after payment`.
