# Reserva UX Benchmark - 2026-04-20

## Objetivo

Comparar la pagina de reserva actual con patrones de reserva/checkout respaldados por research para detectar que simplificar en desktop y movil.

## Resumen ejecutivo

La reserva actual transmite confianza visual y tiene estructura por pasos, pero hoy pide demasiada informacion demasiado pronto, duplica CTAs de soporte en movil, y bloquea el avance en algunos casos sin explicar claramente el motivo.

El mayor cambio recomendado no es "hacerla mas bonita", sino reorganizar la secuencia:

1. Primero: coche, fechas, lugar, precio estimado y disponibilidad.
2. Segundo: datos minimos del cliente.
3. Tercero: pago y confirmacion.

Esa secuencia reduce friccion, mejora la comprension del precio y funciona mejor tanto en desktop como en movil.

## Que dicen las referencias

### 1) Reducir campos visibles importa mas que reducir pasos

Baymard indica que lo relevante para el usuario no es tanto el numero total de pasos sino cuantos campos tiene que considerar en cada momento. Tambien recomienda ocultar campos poco usados y apoyarse en address lookup/autocomplete cuando sea posible.

Implicacion para nosotros:

- Pedir direccion completa, ciudad y pais antes de confirmar fechas mete friccion innecesaria.
- Muchos usuarios no deberian tener que pensar en toda su direccion antes de saber si la reserva les encaja.

Fuente:
- https://baymard.com/blog/checkout-flow-average-form-fields

### 2) En movil, labels arriba y sin inline labels

Baymard insiste en dos cosas para formularios moviles:

- labels encima del campo
- no usar inline labels como sustituto del label

La razon es simple: el usuario necesita ver el contexto del campo mientras escribe y corregir sin perder referencia.

Fuente:
- https://baymard.com/blog/mobile-checkout
- https://baymard.com/blog/mobile-form-usability-label-position
- https://baymard.com/blog/mobile-forms-avoid-inline-labels

### 3) Una sola columna para rellenar mejor

Baymard y web.dev convergen en que los formularios son mas faciles de seguir cuando el usuario recorre una unica direccion visual. En desktop se puede usar layout de dos columnas a nivel de pagina, pero el bloque de campos funciona mejor en una sola columna salvo parejas logicas como fecha/hora.

Fuentes:
- https://baymard.com/blog/avoid-multi-column-forms
- https://web.dev/learn/forms/design-basics/

### 4) Validar mientras el usuario avanza y mostrar el error donde ocurre

web.dev y Material Design recomiendan validar durante la entrada, mostrar el error junto al control afectado y, si hay incompatibilidades entre varios campos, tambien resumirlo arriba del formulario o del paso.

Fuente:
- https://web.dev/articles/payment-and-address-form-best-practices
- https://m1.material.io/patterns/errors.html

### 5) El checkout debe quitar distracciones y dejar claro el progreso

web.dev recomienda:

- mostrar progreso claro
- mantener visibles los detalles del pedido
- quitar distracciones y puntos de fuga
- no pedir datos innecesarios

Fuente:
- https://web.dev/articles/payment-and-address-form-best-practices

### 6) Address autocomplete y confirmacion visual reducen errores

Google documenta que el autocomplete reduce errores, pulsaciones y tiempo de relleno. Tambien recomienda una confirmacion visual del punto elegido para aumentar confianza y reducir fallos de entrega o recogida.

Fuente:
- https://developers.google.com/maps/solutions/checkout/best-practices

### 7) En pago, wallets y componentes nativos reducen friccion en movil

Stripe documenta dos mejoras potentes para checkout web:

- Express Checkout Element para Apple Pay, Google Pay, Link, PayPal, etc.
- Address Element / address collection para reducir errores y mejorar conversion

Fuente:
- https://docs.stripe.com/elements/express-checkout-element
- https://docs.stripe.com/payments/payment-element
- https://docs.stripe.com/elements/address-element

## Comparativa con nuestra pagina actual

Referencia local:
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html)
- [report.md](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\artifacts\mobile-pro-audit\2026-04-20T16-46-23-495Z\report.md)

### Lo que hoy hace bien

- Hay progresion por pasos.
- Hay feedback por campo en varios casos.
- Hay resumen del vehiculo y CTA movil persistente.
- Hay integracion de pago y tono de soporte humano.

### Lo que hoy penaliza usabilidad

#### A. Se piden demasiados datos antes de llegar al valor real de la reserva

En el paso 1 se solicitan nombre, documento, telefono, email, direccion, ciudad y pais. Luego en el paso 2 llegan fechas, horas y ubicacion.

Eso hace que el usuario entregue demasiada informacion antes de resolver las preguntas clave:

- para cuando
- donde
- cuanto cuesta
- si me cuadra

Referencias del codigo:
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html#L1886)
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html#L1913)
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html#L2028)
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html#L2113)

#### B. El avance se bloquea sin feedback suficientemente visible en casos de fechas incompatibles

El boton de continuar a pago nace deshabilitado y se actualiza segun el calculo. Existe un mensaje de validacion para step 2, pero el flujo puede dejar al usuario bloqueado sin que vea claramente por que no puede avanzar.

Referencias:
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html#L2010)
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html#L2134)
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html#L2816)
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html#L3105)

#### C. En movil hay redundancia de soporte

Hay CTA de WhatsApp en la zona superior y otro CTA persistente en la barra movil. Eso da sensacion de ruido y compite con la accion principal.

Referencias:
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html#L1816)
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html#L2299)

#### D. Falta aprovechar autofill de forma agresiva

En la auditoria del HTML no aparecen atributos `autocomplete` en los inputs principales de datos personales y direccion. Tampoco se explota una solucion de address autocomplete.

Implicacion:

- mas tecleo
- mas errores
- peor experiencia movil

Referencia local:
- [page.html](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\site\app\reserve\page.html)

#### E. La reserva movil tiene un problema de rendimiento que afecta la sensacion de facilidad

En la auditoria interna completa, la ruta de reserva salio con rendimiento movil bajo y LCP alto. Aunque esto no es "UX de formulario" puro, en la practica si la pagina tarda en asentarse o recalcular, la reserva se percibe menos fiable.

Referencia:
- [report.md](C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM\artifacts\mobile-pro-audit\2026-04-20T16-46-23-495Z\report.md)

## Recomendacion de estructura

### Version objetivo para desktop

Pagina a dos columnas:

- izquierda: flujo del formulario
- derecha: resumen sticky con coche, fechas, lugar, precio estimado, deposito y politicas clave

Pero dentro del formulario:

- una sola columna de campos
- solo pares logicos en la misma fila: fecha/hora, recogida/devolucion

Secuencia recomendada:

1. Paso 1: Fechas, horas, entrega/recogida, estimacion de precio
2. Paso 2: Nombre, telefono, email
3. Paso 3: Documento, direccion solo si realmente hace falta para contrato/factura
4. Paso 4: Pago y confirmacion

Inferencia desde las fuentes:

Para una reserva premium de coche, el usuario necesita primero encajar disponibilidad y precio antes de comprometer datos sensibles. Esto no lo dice una sola fuente en esos terminos, pero es la conclusion practica al combinar "no pedir datos que no necesitas todavia", "mostrar detalles completos del pedido" y "mantener el progreso hacia conversion".

### Version objetivo para movil

Una sola columna y una sola prioridad visible por pantalla.

Primer viewport ideal:

- nombre del coche
- precio base o estimado
- 3 bullets de confianza maximo
- indicador de paso
- primer campo o primer selector ya visible
- CTA principal sticky

La barra sticky movil deberia tener una unica accion principal:

- `Continuar`

Y el soporte quedar como texto/enlace secundario discreto, no como segundo CTA de igual peso.

## Cambios concretos de mas impacto

### Prioridad alta

1. Reordenar el flujo para pedir fechas/ubicacion antes que direccion completa.
2. Mostrar el motivo del bloqueo de Step 2 en tiempo real, sin obligar al usuario a adivinar.
3. Eliminar duplicidad de WhatsApp en movil y dejar un solo CTA principal.
4. Añadir `autocomplete`, `name` estables y tipos/inputmodes correctos en todos los campos.
5. Mantener el resumen de reserva visible y editable sin sacar al usuario del flujo.

### Prioridad media

1. Integrar address autocomplete para pickup/delivery y, si aplica, para direccion del cliente.
2. Añadir Apple Pay / Google Pay / Link con Express Checkout si el modelo de negocio lo permite.
3. Simplificar microcopy y labels para hacerlos mas escaneables.
4. Revisar el orden visual del checkout para quitar navegacion y ruido sobrante.

### Prioridad baja

1. Añadir confirmacion visual del punto de entrega/recogida.
2. Colapsar informacion secundaria hasta que haga falta.
3. Afinar estados vacios, loading y recalculo de precio.

## Propuesta minima viable

Si solo se pudiera tocar una ronda corta, haria esto:

1. Paso 1 = fechas + horas + ubicacion + precio
2. Paso 2 = nombre + telefono + email
3. Paso 3 = pago
4. Documento y direccion solo cuando:
   - sean obligatorios por operativa
   - o el pago ya este confirmado y se pase a contrato/entrega

## Como medir si mejora de verdad

Medir por desktop y movil:

- ratio de paso 1 -> paso 2
- ratio de paso 2 -> pago
- ratio de pago iniciado -> pago completado
- tiempo medio hasta ver precio final
- errores por campo
- abandonos en fechas/ubicacion
- uso de WhatsApp antes de pagar
- porcentaje de usuarios con autofill/wallet

## Conclusiones

La reserva actual no esta lejos, pero hoy se comporta mas como un formulario administrativo que como una reserva guiada. El benchmark externo empuja en una direccion bastante consistente:

- menos campos visibles
- valor antes que burocracia
- errores explicados en contexto
- progreso claro
- menos distracciones
- mas automatizacion de relleno

Traducido a producto: en desktop debe sentirse controlado y premium; en movil, rapido, obvio y con muy poco tecleo.
