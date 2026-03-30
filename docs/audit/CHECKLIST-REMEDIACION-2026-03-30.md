# Checklist De Remediacion 2026-03-30

## Objetivo

Convertir la auditoria inicial en una lista de trabajo accionable, ordenada por prioridad y con validaciones concretas.

## Documentos Relacionados

- Arquitectura objetivo: [ARQUITECTURA-OBJETIVO-SITIO.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/ARQUITECTURA-OBJETIVO-SITIO.md)
- Backlog de evolucion: [BACKLOG-EVOLUCION-SITIO.md](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/docs/architecture/BACKLOG-EVOLUCION-SITIO.md)

## Regla De Trabajo

- No abrir la fase SEO fina hasta cerrar los bloqueadores tecnicos que afectan a indexacion, despliegue y pagos.

## Fase 1. Criticos

### 1. Corregir la configuracion de Vercel

- [x] Revisar [vercel.json](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/vercel.json)
- [x] Eliminar o limitar el rewrite global que manda casi todo a `index.html`
- [ ] Verificar que cada HTML publico del sitemap responde su propio contenido
- [ ] Confirmar que `/lamborghini-rental-dubai.html` no devuelve la home
- [ ] Confirmar que `/ferrari-rental-dubai.html` no devuelve la home
- [ ] Confirmar que `/palm-jumeirah-luxury-car-rental.html` no devuelve la home
- [x] Revisar si Netlify y Vercel tienen estrategias de routing coherentes
- [ ] Actualizar la auditoria con el resultado

### Validacion

- [ ] Abrir en entorno de despliegue varias URLs del sitemap
- [ ] Confirmar que `title`, `canonical` y `h1` corresponden a la landing pedida
- [ ] Confirmar en Vercel que las rutas estaticas existentes se sirven sin rewrite a `index.html`

## Fase 2. Altos

### 2. Corregir el webhook de Stripe

- [x] Revisar [backend-example.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/backend-example.js)
- [x] Mover el endpoint `/api/webhook` antes del parser JSON o excluirlo del parser global
- [x] Confirmar en codigo que `stripe.webhooks.constructEvent(...)` recibe body crudo
- [ ] Documentar la forma correcta de probar el webhook
- [ ] Actualizar la auditoria con el cambio aplicado

### Validacion

- [ ] Probar un evento firmado de Stripe en entorno controlado
- [ ] Confirmar respuesta 200 o el error esperado de firma invalida si la firma no coincide

### 3. Reducir PII en logs de reserva

- [x] Revisar [route.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/app/api/reserve/route.js)
- [x] Eliminar logs de `req.headers` completos
- [x] Eliminar logs del body completo de reserva
- [x] Sustituirlos por logs minimizados
- [x] Evitar registrar pasaporte, direccion y telefono completos
- [x] Mantener solo datos utiles para diagnostico tecnico

### Validacion

- [ ] Lanzar una reserva simulada
- [ ] Revisar logs y confirmar que no aparece PII sensible

## Fase 3. Medios Que Bloquean Operacion

### 4. Separar configuracion local y produccion

- [x] Revisar [config.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/config.js)
- [x] Eliminar fallback hardcodeado a clave live en [page.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/app/reserve/page.html)
- [x] Definir una estrategia de entorno clara para local, staging y produccion
- [x] Dejar desarrollo como modo por defecto fuera de despliegue
- [x] Confirmar que una prueba local no apunta a Stripe live

### Validacion

- [x] Abrir la reserva en local
- [x] Confirmar backend y clave de Stripe esperados para desarrollo

### 5. Alinear checkout y metodos de pago reales

- [x] Decidir si el producto soporta solo tarjeta o tambien wallets reales
- [x] Revisar `payment_method_types` del backend
- [x] Revisar el flujo de [page.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/app/reserve/page.html)
- [x] Eliminar reintentos innecesarios por configuracion inconsistente
- [x] Ajustar textos de la web para prometer solo lo que realmente funciona

### Validacion

- [ ] Crear un `PaymentIntent` sin error de primer intento
- [ ] Completar un flujo de pago de prueba de punta a punta

### 6. Arreglar la base minima de pruebas

- [x] Revisar [package.json](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/package.json)
- [x] Decidir si `npm test` debe ejecutar un smoke test o eliminarse temporalmente
- [x] Crear un test minimo para healthcheck y carga de servidor o retirar el script roto
- [x] Documentar como verificar backend y reserva

### Validacion

- [x] Ejecutar `npm test` sin error de archivo inexistente

### 7. Endurecer configuracion de seguridad backend

- [x] Revisar CORS en [backend-example.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/backend-example.js)
- [x] Restringir `origin` a dominios esperados
- [x] Revisar si `credentials: true` es realmente necesario
- [x] Eliminar `rejectUnauthorized: false` salvo justificacion tecnica real
- [x] Anotar cualquier excepcion necesaria para Railway o SMTP

### Validacion

- [ ] Confirmar que frontend legitimo puede hablar con la API
- [ ] Confirmar que orÃ­genes no deseados no son aceptados

## Fase 4. Calidad De Sitio Antes De SEO

### 8. Revisar coherencia de sitemap, robots y despliegue

- [x] Confirmar que cada URL del [sitemap.xml](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/sitemap.xml) existe y devuelve 200
- [x] Confirmar que [robots.txt](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/robots.txt) no bloquea contenido indexable
- [ ] Revisar que las URLs legales y de reserva sean coherentes con despliegue real

### 9. Revisar accesibilidad y UX minima

- [x] Probar home con teclado
- [x] Probar formulario de contacto con errores de validacion
- [x] Probar reserva con errores controlados
- [ ] Revisar contraste, labels y mensajes de estado

### 10. Revisar rendimiento base

- [ ] Ejecutar Lighthouse en home
- [ ] Ejecutar Lighthouse en una landing principal
- [ ] Revisar peso y carga de imagenes
- [ ] Revisar third-party scripts

## Fase 5. SEO Fino

### 11. SEO tecnico

- [ ] Validar `title`, `description`, `canonical`, `h1` y schema en home y landings
- [ ] Detectar canibalizacion entre landings parecidas
- [ ] Revisar enlazado interno
- [ ] Revisar consistencia entre sitemap y paginas reales

### 12. SEO de contenido

- [ ] Revisar si cada landing tiene una intencion clara
- [ ] Detectar contenido demasiado repetido
- [ ] Priorizar landings a conservar, fusionar o redirigir
- [ ] Definir mejoras por pagina

## Cierre

### Criterios Para Dar La Base Tecnica Por Cerrada

- [ ] Las URLs del sitemap sirven el HTML correcto
- [ ] El webhook de Stripe valida correctamente
- [ ] No hay PII sensible en logs
- [x] La configuracion local no apunta por defecto a produccion
- [x] `npm test` deja de estar roto
- [x] El backend tiene una configuracion de seguridad razonable

### Cuando Empezar SEO En Serio

- [ ] Solo cuando todos los puntos criticos y altos anteriores esten cerrados
