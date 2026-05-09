# Global change needed: Locations map helper in site-v2.js

## Context

The visual implementation for `locations.html` now uses a page-level OpenStreetMap embed plus CSS-positioned location markers. It no longer requires `data-locations-map` or the global map projection helper.

## Global file involved

- `site/js/site-v2.js`

## Proposed change for Codex

Review the existing `initLocationsMap()` helper in `site/js/site-v2.js`. If it is not used by another page, remove it from the global bundle or move it to a page-specific script owned by Locations.

## Pages affected

- `locations.html`

## Risk

- Visual risk: low if removed after confirming no page still uses `data-locations-map`.
- Functional risk: low for reservations, navigation, contact CTAs and forms, because the helper only drives visual map tiles/markers.
- Performance risk: positive if removed, because it avoids global map logic on every page load.

## Current visual-agent action

No global code was changed in this task. The Locations page was adjusted to avoid relying on the global helper.
