# Dynasty Prestige Brand System

This document defines the global visual rules for PGM. The implementation source of truth is:

`site/css/brand-tokens.css`

## Colour Roles

- `--dp-color-obsidian`: main dark background.
- `--dp-color-carbon`: dark cards, nav, drawers and premium panels.
- `--dp-color-ivory`: primary text on dark surfaces.
- `--dp-color-sand`: warm light page background.
- `--dp-color-text`: primary text on light surfaces.
- `--dp-color-gold`: main brand accent for CTAs, borders and highlights.
- `--dp-color-gold-soft`: lighter gold for gradients and hover states.
- `--dp-color-champagne`: refined text accent and fine dividers.
- `--dp-color-whatsapp`: WhatsApp only.

## Usage Rules

- Do not use WhatsApp green outside WhatsApp buttons/icons.
- Do not use lime/neon as a general brand accent; it is a legacy attention token only.
- Primary CTAs should be champagne/gold or dark depending on surface.
- Vehicle cards should use warm gold/champagne accents, not green panels.
- Text over image/video must always sit on a dark overlay with strong contrast.
- Light sections should use warm ivory/sand backgrounds, not pure white.
- Muted text must stay readable; avoid pale grey on white.

## Typography

- Display: `--dp-font-display` for major hero headlines and premium editorial titles.
- UI/body: `--dp-font-sans` for navigation, forms, cards, labels and body copy.
- Serif: `--dp-font-serif` only when the page intentionally needs editorial luxury.

## Implementation Notes

- New CSS should use `--dp-*` tokens.
- Existing `--lab-*` variables are compatibility aliases and should not be expanded further.
- If the visual editor generates overrides, its defaults must stay aligned with these tokens.
