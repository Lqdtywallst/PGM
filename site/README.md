# Site V2

Base nueva para reconstruir la home de Dynasty Prestige sin seguir parcheando `site/`.

## Que hay aqui

- `index.html`
  Punto de arranque de la nueva home.
- `css/site-v2.css`
  Estilos base trasladados desde el hero validado.
- `js/site-v2.js`
  Intro por capas + overlay de fechas.
- `images/`
  Assets propios de esta V2.
- `media/`
  Video base del hero.

## Filosofia

- Empezar desde una base limpia
- Aprobar bloques aislados antes de integrarlos
- Reutilizar solo los assets y logica que de verdad merecen la pena
- Evitar ensuciar la home antigua mientras se construye la nueva

## Orden recomendado

1. cerrar `header + hero + intro + overlay`
2. construir `featured fleet`
3. construir `trust / service layer`
4. construir `locations teaser`
5. decidir integracion con la reserva real

## Regla importante

Mientras `site-v2` no este cerrada, la home antigua de `site/` no deberia recibir mas cambios visuales grandes.
