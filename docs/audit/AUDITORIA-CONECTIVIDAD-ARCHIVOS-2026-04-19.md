# Auditoria De Conectividad De Archivos

Fecha: 2026-04-19

Nota: este documento mezcla el estado auditado previo a la poda con el cierre aplicado al final. Las referencias a archivos retirados se conservan como traza de auditoria.

## Resumen Ejecutivo

No hay HTML publicas totalmente huerfanas dentro de `site/`.

Las paginas que hoy parecen mas candidatas a retirada por baja conectividad son:

- `ferrari-rental-downtown-dubai.html`
- `lamborghini-rental-palm-jumeirah.html`
- `g63-rental-dubai.html`
- `g63-rental-dubai-marina.html`

Pero `g63-rental-dubai.html` no se puede borrar directamente sin romper conectividad real. Sigue viva por:

- card de `fleet`
- enlaces cruzados entre landings
- sitemap
- smoke tests
- tests e2e
- auditoria SEO

## Metodologia

La auditoria cruza estas capas:

- enlaces `href` entre HTML de `site/`
- presencia en [sitemap.xml](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/sitemap.xml)
- referencias en [test-server.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/test-server.js)
- referencias en [public-site.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/public-site.spec.js)
- referencias en [audit-seo.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/audit-seo.js)
- referencias de navegacion de `fleet` en [fleet-cards.json](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/data/fleet-cards.json)

## Hallazgos

### 1. No hay vistas publicas completamente desconectadas

No he encontrado ningun `.html` publico en `site/` con conectividad cero. Todas las paginas tienen al menos una de estas rutas:

- enlace desde otra HTML
- inclusion en sitemap
- inclusion en tests o auditorias
- inclusion en datos de navegacion

Eso significa que una eliminacion directa requiere limpieza de referencias, no solo borrar el archivo.

### 2. `g63-rental-dubai.html` sigue conectada

Entradas HTML reales:

- [g63-rental-dubai-marina.html:122](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/g63-rental-dubai-marina.html#L122)
- [rolls-royce-rental-dubai.html:319](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/rolls-royce-rental-dubai.html#L319)

Entradas de sistema:

- [fleet-cards.json:145](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/data/fleet-cards.json#L145)
- [sitemap.xml:148](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/sitemap.xml#L148)
- [test-server.js:54](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/test-server.js#L54)
- [test-server.js:119](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/test-server.js#L119)
- [public-site.spec.js:16](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/public-site.spec.js#L16)
- [audit-seo.js:45](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/audit-seo.js#L45)

Conclusión:

`g63-rental-dubai.html` esta baja en conectividad, pero no obsoleta a nivel tecnico. Si se elimina, hay que migrar antes su trafico y limpiar esos puntos.

### 3. `g63-rental-dubai-marina.html` forma un microcluster con G63 y Mercedes

Entradas HTML reales:

- [g63-rental-dubai.html:333](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/g63-rental-dubai.html#L333)
- [mercedes-rental-dubai.html:139](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/mercedes-rental-dubai.html#L139)

Entradas de sistema:

- [sitemap.xml:153](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/sitemap.xml#L153)
- [test-server.js:126](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/test-server.js#L126)
- [public-site.spec.js:13](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/public-site.spec.js#L13)
- [public-site.spec.js:143](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/public-site.spec.js#L143)
- [audit-seo.js:57](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/audit-seo.js#L57)

Conclusión:

No esta aislada. Si cae `g63-rental-dubai.html`, esta pagina tambien necesita decision coordinada.

### 4. Candidata mas clara de retirada: `ferrari-rental-downtown-dubai.html`

Entrada HTML real:

- [downtown-dubai-supercar-rental.html:122](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/downtown-dubai-supercar-rental.html#L122)

Entradas de sistema:

- [sitemap.xml:132](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/sitemap.xml#L132)
- [test-server.js:124](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/test-server.js#L124)
- [audit-seo.js:55](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/audit-seo.js#L55)

Conclusión:

Es una candidata fuerte a eliminacion o redireccion, porque solo depende de una landing hermana y de la capa de soporte.

### 5. Candidata clara de retirada: `lamborghini-rental-palm-jumeirah.html`

Entradas HTML reales:

- [lamborghini-rental-dubai.html:291](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/lamborghini-rental-dubai.html#L291)
- [lamborghini-rental-dubai.html:423](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/lamborghini-rental-dubai.html#L423)

Entradas de sistema:

- [sitemap.xml:117](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/sitemap.xml#L117)
- [test-server.js:127](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/test-server.js#L127)
- [public-site.spec.js:12](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/public-site.spec.js#L12)
- [audit-seo.js:56](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/audit-seo.js#L56)

Conclusión:

Tambien es una candidata fuerte a retirada, siempre que se redirija o se sustituya su enlace por una pagina objetivo valida.

## Tabla De Prioridad

| URL | Entradas HTML | Entradas de soporte | Estado recomendado |
| --- | --- | --- | --- |
| `ferrari-rental-downtown-dubai.html` | 1 | sitemap + smoke + audit SEO | retirar primero |
| `lamborghini-rental-palm-jumeirah.html` | 1 pagina madre | sitemap + smoke + e2e + audit SEO | retirar primero |
| `g63-rental-dubai.html` | 2 + fleet cards | sitemap + smoke + e2e + audit SEO | revisar y migrar |
| `g63-rental-dubai-marina.html` | 2 | sitemap + smoke + e2e + audit SEO | revisar junto a G63 |

## Recomendacion Funcional

### Onda 1: retirada facil

Retirar primero:

- `ferrari-rental-downtown-dubai.html`
- `lamborghini-rental-palm-jumeirah.html`

Estas dos tienen baja conectividad y una sustitucion natural clara desde sus paginas madre.

### Onda 2: cluster G63

No borrar `g63-rental-dubai.html` en seco.

Antes hay que decidir si:

- se fusiona hacia `mercedes-g63-amg-rental-dubai.html`
- se fusiona la variante Marina hacia `dubai-marina-luxury-car-rental.html`
- o se mantiene el cluster G63 como landings SEO separadas

## Checklist De Eliminacion Segura

Para cualquier URL publica que se elimine:

1. quitar enlaces entrantes HTML
2. quitarla de [sitemap.xml](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/sitemap.xml)
3. quitarla de [test-server.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/test-server.js)
4. quitarla de [public-site.spec.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/tests/e2e/public-site.spec.js) si aplica
5. quitarla de [audit-seo.js](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/audit-seo.js)
6. revisar datos indirectos como [fleet-cards.json](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/server/data/fleet-cards.json)
7. solo entonces borrar el archivo HTML

## Conclusión

Si tu objetivo es empezar a limpiar ya, el orden mas seguro hoy es:

1. `ferrari-rental-downtown-dubai.html`
2. `lamborghini-rental-palm-jumeirah.html`
3. despues decidir el cluster `g63-rental-dubai.html` + `g63-rental-dubai-marina.html`

`g63-rental-dubai.html` parece obsoleta por negocio, pero tecnicamente todavia esta conectada.

## Criterio Simple Segun `fleet.html`

Si aplicamos solo tu regla:

> conservar lo que este enlazado directamente desde `fleet.html`

Entonces las HTML publicas que **no** salen enlazadas desde [fleet.html](C:/Users/aleja/Documents/GLOBALTECH/pagina-web-Santi/PGM/site/fleet.html) son:

- `abu-dhabi-luxury-car-rental.html`
- `business-car-rental-dubai.html`
- `downtown-dubai-supercar-rental.html`
- `ferrari-rental-downtown-dubai.html`
- `g63-rental-dubai-marina.html`
- `g63-rental-dubai.html`
- `lamborghini-rental-palm-jumeirah.html`
- `terms-and-conditions-uae.html`
- `wedding-event-car-rental-dubai.html`

La lectura directa de ese criterio es:

- `g63-rental-dubai.html` entra en tu lista de poda
- `g63-rental-dubai-marina.html` tambien entra
- las candidatas mas claras siguen siendo `ferrari-rental-downtown-dubai.html` y `lamborghini-rental-palm-jumeirah.html`

Ojo:

Que no esten enlazadas desde `fleet.html` no significa automaticamente que esten muertas. Algunas siguen enlazadas desde `services`, `locations`, otras landings o el sitemap.

## Aplicado En Esta Limpieza

Se ha ejecutado una poda controlada sobre las landings satelite que no salen desde `fleet.html` y no forman parte del tronco principal de negocio o legal.

Retiradas:

- `downtown-dubai-supercar-rental.html`
- `ferrari-rental-downtown-dubai.html`
- `g63-rental-dubai.html`
- `g63-rental-dubai-marina.html`
- `lamborghini-rental-palm-jumeirah.html`

Conservadas aunque no salgan directamente desde `fleet.html`:

- `abu-dhabi-luxury-car-rental.html`
- `business-car-rental-dubai.html`
- `terms-and-conditions-uae.html`
- `wedding-event-car-rental-dubai.html`

Tambien se han actualizado enlaces internos, sitemap, tests y redirects para que las URLs retiradas aterricen en paginas vivas.
