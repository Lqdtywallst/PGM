# Auditoria Inicial 2026-03-30

## Datos Del Proyecto

- Proyecto: Dynasty Prestige Web
- URL principal: `https://prestigegoalmotion.com/`
- Entorno revisado: codigo local en `C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM`
- Fecha: 2026-03-30
- Responsable: Alejandro

## Resumen Ejecutivo

- Estado actual:
  - La base tecnica local esta bastante mas ordenada que al inicio: routing acotado, webhook recolocado, logs reducidos, separacion de entornos y smoke tests funcionando.
- Riesgo critico pendiente:
  - Falta validar en despliegue real que las landings publicas siguen sirviendo su propio HTML tras el cambio de `vercel.json`.
- Riesgos altos pendientes:
  - Falta probar un webhook firmado de Stripe y un pago real de prueba en modo test.
  - Falta comprobar en ejecucion que los logs de reserva ya no exponen PII sensible.
- Quick wins siguientes:
  - Validacion en Vercel o entorno real
  - Prueba de webhook
  - Prueba de reserva con revision de logs
  - Lighthouse y contraste antes del SEO fino
- Bloqueadores para SEO:
  - No conviene entrar en SEO fino hasta validar routing publico en despliegue y cerrar pruebas runtime de pagos.

## Hallazgos

### [Critico] La validacion del routing publico en Vercel sigue pendiente

- Area: despliegue, indexacion, SEO tecnico
- Evidencia:
  - [vercel.json](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/vercel.json#L27) ahora reescribe `"/"` a `"/site/index.html"` y las rutas publicas hacia `"/site/$1"`.
  - [sitemap.xml](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/sitemap.xml#L13) sigue publicando varias landings indexables que deben devolver su HTML especifico.
- Impacto:
  - Si el despliegue no refleja correctamente esta nueva configuracion, Google y usuarios pueden seguir pidiendo una landing y recibir otra cosa.
  - Eso generaria soft-404, canibalizacion de indexacion y perdida directa de trafico SEO.
- Como reproducirlo:
  - Abrir en entorno real una URL del sitemap distinta de `/` o `/app/...` y comparar `title`, `canonical` y `h1` con la landing esperada.
- Recomendacion:
  - Mantener la configuracion actual y validar en despliegue que cada URL publica sirve su archivo correcto.
  - Cerrar esta validacion antes de abrir la auditoria SEO fina.
- Estado: corregido en codigo, pendiente validar en despliegue

### [Alto] El webhook de Stripe probablemente falle al verificar firmas

- Area: pagos, backend, seguridad
- Evidencia:
  - [backend-example.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/backend-example.js#L76) registra `express.json()` globalmente antes del webhook.
  - [backend-example.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/backend-example.js#L351) intenta usar `express.raw({ type: 'application/json' })` en `/api/webhook`.
- Impacto:
  - Stripe necesita el body crudo para validar la firma del evento.
  - Con el body ya parseado, los eventos reales pueden fallar aunque el pago exista.
- Como reproducirlo:
  - Enviar un webhook firmado de Stripe contra `/api/webhook` con la app tal como esta.
- Recomendacion:
  - Excluir `/api/webhook` del `express.json()` global o registrar el webhook antes del parser JSON.
- Estado: corregido en codigo, pendiente validar con prueba de webhook

### [Alto] La API de reserva guarda PII sensible en logs

- Area: seguridad, privacidad, cumplimiento
- Evidencia:
  - [route.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/app/api/reserve/route.js#L347) registra headers completos.
  - [route.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/app/api/reserve/route.js#L351) registra el body entero de la reserva.
- Impacto:
  - En esos logs viajan nombre, email, telefono, direccion y documento identificativo del cliente.
  - En plataformas como Railway esos datos quedan persistidos en logs operativos.
- Como reproducirlo:
  - Hacer un `POST /api/reserve` con una reserva real o simulada y revisar logs.
- Recomendacion:
  - Sustituir logs completos por logs minimizados y redactados.
  - No registrar pasaporte, direccion ni payloads completos.
- Estado: corregido en codigo, pendiente validar con prueba de reserva y revision de logs

### [Medio] La configuracion frontend mezclaba local y produccion por defecto

- Area: configuracion, pagos, operacion
- Evidencia:
  - [config.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/config.js#L32) ya documenta una estrategia explicita para local, staging y produccion.
  - [config.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/config.js#L51) permite override con `window.__APP_ENV__`.
  - [config.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/config.js#L56) detecta `file:` y `localhost` como desarrollo.
  - [page.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/app/reserve/page.html#L1593) ya no usa un fallback directo a `pk_live_...`.
  - [page.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/app/reserve/page.html#L2096) y [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L4217) resuelven el backend desde la configuracion central.
- Impacto:
  - Cualquier prueba local mal planteada apunta por defecto al entorno real.
  - Se mezclan pruebas, reservas y objetos reales de Stripe con trabajo de desarrollo.
- Como reproducirlo:
  - Abrir la reserva localmente sin cambiar `site/config.js`.
- Recomendacion:
  - Mover la configuracion a variables por entorno y eliminar el fallback hardcodeado live.
  - Dejar `development` como valor por defecto en local.
- Estado: corregido en codigo y validado en local, pendiente validar en despliegue si se quiere cubrir staging/produccion

### [Medio] El flujo de pago y los metodos anunciados no estan alineados

- Area: funcional, checkout, producto
- Evidencia:
  - [route.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/app/api/reserve/route.js#L621) ya crea el `PaymentIntent` solo con `['card']`, alineado con el checkout actual.
  - [page.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/app/reserve/page.html#L2375) confirma el pago con `stripe.confirmCardPayment(...)`, lo que mantiene el flujo centrado en tarjeta.
  - [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html#L4883) ya presenta el pago online como tarjeta para reservas web.
  - [terms-and-conditions.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/terms-and-conditions.html#L165) y [terms-and-conditions-uae.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/terms-and-conditions-uae.html#L127) ya no prometen Apple Pay, Google Pay ni Stripe Link para este checkout.
- Impacto:
  - El backend arranca cada intento de pago con una configuracion propensa a error.
  - La promesa funcional de wallets modernas no coincide con la implementacion del frontend.
- Como reproducirlo:
  - Iniciar una reserva y revisar logs de creacion del `PaymentIntent`.
- Recomendacion:
  - Elegir una estrategia consistente:
  - O se implementa realmente un flujo con wallets/Payment Element.
  - O se simplifica el backend a metodos realmente soportados por la UI actual.
- Estado: corregido en codigo, pendiente validar con un pago de prueba de punta a punta

### [Medio] La red de verificacion automatizada esta rota

- Area: calidad, mantenibilidad
- Evidencia:
  - [package.json](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/package.json#L10) apunta `npm test` a `node server/test-server.js`.
  - [test-server.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/test-server.js) ya comprueba archivos clave, sintaxis, `vercel.json`, config local, sitemap, respuestas `200` del sitio, paginas clave y checkout card-only.
- Impacto:
  - No hay una comprobacion minima automatizada para detectar regresiones antes de desplegar.
- Como reproducirlo:
  - Ejecutar `npm test`.
- Recomendacion:
  - O bien crear `test-server.js` y un smoke test real.
  - O bien retirar el script hasta tener un test valido.
- Estado: corregido en codigo y validado con `npm test` en este checkout

### [Medio] La configuracion de seguridad del backend sigue demasiado laxa

- Area: seguridad, hardening
- Evidencia:
  - [backend-example.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/backend-example.js#L51) y [route.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/app/api/reserve/route.js#L196) ahora solo permiten `rejectUnauthorized: false` mediante `SMTP_ALLOW_SELF_SIGNED=true`.
  - [backend-example.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/backend-example.js#L95) define una allowlist de orÃ­genes esperados y acepta `localhost` y previews de Vercel.
  - [backend-example.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/backend-example.js#L153) ya no usa `origin: '*'` ni `credentials: true`.
- Impacto:
  - Se relaja la validacion TLS del correo sin una necesidad documentada.
  - La politica CORS queda incoherente y mas permisiva de lo necesario.
- Como reproducirlo:
  - Revisar la configuracion del backend.
- Recomendacion:
  - Restringir CORS a dominios esperados.
  - Eliminar `rejectUnauthorized: false` salvo caso justificado y documentado.
- Estado: corregido en codigo y validado con smoke test, pendiente validacion runtime con `.env` real

## Estado De La Limpieza Del Repo

- La raiz ya esta mucho mas centrada en configuracion de repo y carpetas principales (`site/`, `server/`, `app/`, `docs/`).
- Se eliminaron carpetas y assets muertos confirmados.
- Queda documentacion minima de auditoria en `docs/audit/`.

## Validacion Local Previa Al SEO

- `npm test` ya confirma que todas las URLs publicadas en [sitemap.xml](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/sitemap.xml) existen fisicamente, responden `200` en el servidor estatico local y mantienen `title`, `meta description`, `canonical` y un solo `h1` en home y landings clave.
- [robots.txt](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/robots.txt) ya apunta al sitemap publico y no bloquea las paginas indexables principales.
- En navegacion manual con teclado, la home en [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html) permite recorrer logo, menu principal y CTA inicial sin quedar atrapado en el primer bloque.
- El formulario de contacto de [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html) ya muestra un mensaje de estado claro al intentar enviar vacio (`Please complete all required fields.`).
- La reserva en [page.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/app/reserve/page.html) ya bloquea el avance al siguiente paso con errores de validacion por campo cuando faltan datos obligatorios.
- [index.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/index.html) ya no intenta cargar reviews de Google con credenciales placeholder y tampoco lanza healthchecks automaticos al backend cuando solo se esta previsualizando el frontend en local; eso deja la consola mucho mas limpia para QA.

## Pendientes Antes Del SEO Fino

- Validar en despliegue real que Vercel sirve cada landing publica con su HTML correcto.
- Ejecutar un webhook firmado de Stripe y un pago de prueba de punta a punta.
- Lanzar una reserva simulada para comprobar en logs que no aparece PII sensible.
- Hacer una pasada especifica de contraste/labels y una medicion de rendimiento con Lighthouse.

## Proximos Pasos Recomendados

1. Validar en despliegue que las URLs del sitemap sirven su HTML correcto tras el cambio de `vercel.json`.
2. Probar un webhook firmado de Stripe y confirmar que responde como se espera.
3. Lanzar una reserva simulada y revisar logs para confirmar que no sale PII sensible.
4. Abrir la reserva en local y comprobar que ya no apunta por defecto a Stripe live.
5. Definir la estrategia real del checkout antes de auditar SEO fino.

## Documento De Trabajo

- Checklist accionable: [CHECKLIST-REMEDIACION-2026-03-30.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/audit/CHECKLIST-REMEDIACION-2026-03-30.md)
- Arquitectura objetivo: [ARQUITECTURA-OBJETIVO-SITIO.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/ARQUITECTURA-OBJETIVO-SITIO.md)
- Backlog de evolucion: [BACKLOG-EVOLUCION-SITIO.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/BACKLOG-EVOLUCION-SITIO.md)
