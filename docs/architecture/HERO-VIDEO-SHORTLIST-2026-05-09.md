# Hero Video Shortlist

Fecha: 2026-05-09

## Lo que ya tiene PGM

- `site/media/hero-dubai-sunset.mp4`
  Uso actual: hero desktop de `Home`
  Peso aprox.: 11.9 MB
- `site/media/hero-sports-road.mp4`
  Uso actual: hero mobile de `Home` y varios bloques ambientales
  Peso aprox.: 2.77 MB
- `site/images/home-hero-video-poster.jpg`
  Uso actual: poster del hero de `Home`
- `site/pages/core/fleet.html`
  Estado actual: hero de `Fleet` con imagen fija
- `site/images/fleet/rolls-royce-cullinan-black-badge/06-exterior-front-open-doors.png`
  Uso actual: imagen del hero de `Fleet`

## Lectura rapida

- `Home` ya tiene un mood premium correcto: skyline oscuro, luz calida, ritmo lento.
- `Home` depende demasiado de solo dos clips y el clip de carretera ya se reutiliza demasiado en otras zonas.
- `Fleet` no tiene video en hero. Visualmente funciona, pero se siente mas catalogo que entrada premium.
- A nivel de primer viewport, `Fleet` necesita un clip mas calmado que `Home`, porque el H1 ya ocupa muchisimo peso visual.

## Criterio de seleccion

- `Home`: video editorial, Dubai-first, horizonte, golden hour, ritmo lento, poco detalle de marca.
- `Fleet`: video de coche en movimiento o detalle premium, pero con fondo limpio y movimiento controlado para no pelearse con el H1.
- Evitar clips donde la marca del coche sea demasiado protagonista si no queremos rozar problemas de uso comercial por trademarks.

## Recomendacion principal

### Home

Opcion 1, mejor encaje:
- `Stunning Skyline of Downtown Dubai at Sunset`
  https://www.pexels.com/video/stunning-skyline-of-downtown-dubai-at-sunset-29153186/
  Por que encaja: mantiene la direccion Dubai + sunset + premium y refuerza el imaginario local sin meter demasiada friccion visual.

Opcion 2, alternativa con mas energia:
- `Dynamic Dubai Skyline at Sunset Timelapse`
  https://www.pexels.com/video/dynamic-dubai-skyline-at-sunset-timelapse-32200806/
  Por que encaja: sirve si queremos una home un poco mas viva, pero hay que vigilar que el timelapse no le robe calma al copy.

Opcion 3, para combinar skyline con conduccion:
- `Luxury Car Drives on Dubai Highway`
  https://www.pexels.com/video/luxury-car-drives-on-dubai-highway-31789665/
  Por que encaja: da contexto de coche real en Dubai, pero conviene usarlo con overlay mas oscuro por la actividad del fondo.

### Fleet

Opcion 1, mejor encaje:
- `Car Driving in Dubai`
  https://www.pexels.com/video/car-driving-in-dubai-10358942/
  Por que encaja: conecta directamente con la promesa de flota en Dubai sin sentirse generico.

Opcion 2, mas editorial y limpia:
- `Sleek Luxury Car Driving Through City Streets`
  https://www.pexels.com/video/sleek-luxury-car-driving-through-city-streets-30254179/
  Por que encaja: tiene lenguaje premium y deja mejor respirar un titular grande.

Opcion 3, como clip de apoyo o loop corto:
- `Close-up of Luxury Sports Car Wheel Rim`
  https://www.pexels.com/video/close-up-of-luxury-sports-car-wheel-rim-31220508/
  Por que encaja: muy buena pieza secundaria para bloques de support, featured fleet o transiciones visuales.

## Combinaciones que recomiendo

### Combinacion A

- `Home`: `Stunning Skyline of Downtown Dubai at Sunset`
- `Fleet`: `Car Driving in Dubai`

Es la combinacion mas coherente si queremos que `Home` venda destino y `Fleet` venda movimiento.

### Combinacion B

- `Home`: `Dynamic Dubai Skyline at Sunset Timelapse`
- `Fleet`: `Sleek Luxury Car Driving Through City Streets`

Mejor si queremos un tono un poco mas editorial-fashion y menos "tourism skyline".

## Licencia y riesgo

- Pexels indica que sus fotos y videos se pueden usar gratis y tambien en proyectos comerciales:
  https://www.pexels.com/license/
- Pexels tambien aclara uso comercial, pero recuerda que marcas, logos o elementos reconocibles pueden seguir teniendo derechos de terceros:
  https://help.pexels.com/hc/en-us/articles/360042295214-Can-I-use-the-photos-and-videos-for-a-commercial-project
- Pixabay tiene una logica similar y tambien advierte sobre marcas reconocibles:
  https://pixabay.com/service/license-summary/

## Mi recomendacion final

- Si manana mismo hay que mover esto:
  usa `29153186` para `Home` y `10358942` para `Fleet`.
- Si queremos una lectura mas sobria y premium:
  usa `29153186` para `Home` y `30254179` para `Fleet`.

## Siguiente paso sensato

- Descargar 2 candidatos finales.
- Preparar versiones comprimidas para desktop y mobile.
- Integrarlos con `poster` propio y fallback estatico.
- Validar visualmente `Home` y `Fleet` en mobile, tablet, laptop y desktop antes de dejarlo fijo.
