# Locations GBP Alignment

## Objetivo

Fijar como debe alinearse la web local de Dynasty Prestige con Google Business Profile antes de abrir nuevas zonas o seguir creciendo la capa SEO local.

Fecha de validacion documental: `2026-04-18`

## Modelo recomendado hoy

Con la informacion visible en la web actual, el modelo mas coherente es:

- una base real unica en `Palm Jumeirah, Dubai UAE`
- servicio prestado en varias zonas y ciudades
- una sola entidad operativa
- paginas locales que explican handover y delivery logic, no sucursales separadas

Eso encaja mejor con una de estas dos opciones:

1. `service-area business` si la base no recibe clientes de forma presencial durante horario comercial
2. `hybrid business` si la base real esta atendida, puede recibir clientes y realmente funciona como punto presencial para el publico

Inferencia: con la web actual, `service-area business` parece el default mas conservador hasta que el negocio confirme una operativa presencial real y estable.

## Reglas oficiales que mandan

Google sigue manteniendo dos reglas clave para este caso:

1. un negocio de area de servicio debe trabajar desde una ubicacion real y no desde oficinas virtuales
2. si el negocio no atiende clientes en la direccion, la direccion debe ocultarse y el perfil debe mostrar solo area de servicio

Fuentes oficiales revisadas:

- https://support.google.com/business/answer/3038177
- https://support.google.com/business/answer/6279343

## Decision tree corto

### Elegir `service-area business`

Usar esta opcion si:

- los clientes no acuden normalmente a la base
- la entrega ocurre en hotel, villa, residencia, aeropuerto o punto acordado
- el negocio opera por reserva, coordinacion y desplazamiento
- no conviene exponer una direccion publica como si fuera showroom o sucursal abierta

### Elegir `hybrid business`

Usar esta opcion solo si:

- la base es real
- esta atendida en el horario declarado
- puede recibir clientes en persona
- esa realidad tambien se puede sostener en web, fotos, horario y atencion

## Lo que debe quedar alineado

### En Google Business Profile

- nombre exacto del negocio
- telefono principal
- URL principal del sitio
- categoria principal coherente
- horario real
- decision clara sobre mostrar u ocultar direccion
- service areas oficiales
- descripcion del negocio sin fingir multiple branches

### En la web

- [locations.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/locations.html) como hub geografico oficial
- una sola base visible en Palm Jumeirah
- copy consistente en footer y bloques operativos
- schema sin `LocalBusiness` por distrito
- landings locales entendidas como pages de service logic, no branch pages

### En schema

- `WebPage` + `BreadcrumbList` en el hub
- `Organization` y `ContactPoint` solo donde la informacion visible lo sostiene
- `Service` + `BreadcrumbList` en las guias locales
- `FAQPage` solo con FAQ visible en HTML
- nada de sucursales inventadas en Marina, Downtown, Palm, Yas o Saadiyat

## Service areas recomendadas para la fase actual

Mantener el area servida en una capa sobria y comprobable:

- Dubai
- Abu Dhabi
- DXB
- DWC

Las zonas como Palm Jumeirah, Dubai Marina, Downtown Dubai, Business Bay, JBR, Yas Island o Saadiyat deben vivir como contexto operativo dentro del contenido, no como oficinas o perfiles separados.

## Lo que no se debe hacer

- crear una ficha GBP por distrito
- usar oficinas virtuales, coworkings o direcciones prestadas
- mostrar una direccion publica si nadie atiende clientes alli
- prometer walk-ins si el negocio funciona por coordinacion previa
- abrir paginas locales nuevas solo para forzar coincidencia con mapas

## Checklist de cierre antes de crecer

1. confirmar si la base de Palm realmente recibe clientes o no
2. fijar el modo GBP: `service-area business` o `hybrid business`
3. unificar nombre, telefono, horario y URL
4. definir service areas oficiales
5. revisar fotos y descripcion del perfil para que no sugieran sucursales ficticias
6. verificar que la web repite la misma realidad operativa
7. medir 4-6 semanas antes de abrir zonas secundarias

## Relacion con SEO local

El objetivo no es parecer mas grande de lo que el negocio es.

El objetivo es que Google vea una entidad real, consistente y creible:

- una base real
- una cobertura real
- unas areas servidas reales
- y unas paginas locales que explican por que cambia la experiencia de reserva

Eso suele aguantar mejor a medio plazo que una estrategia de paginas masivas y senales locales infladas.

## Limites actuales

- esta decision no se puede ejecutar desde el repo; depende de acceso a Google Business Profile
- el repo si deja lista la parte que controla la web: copy, schema, enlaces internos y medicion
- no se debe abrir la segunda ola de zonas hasta cerrar esta decision y medir el rendimiento del primer bloque
