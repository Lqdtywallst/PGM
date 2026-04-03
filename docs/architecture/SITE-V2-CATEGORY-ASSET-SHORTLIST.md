# Site V2 Category Asset Shortlist

## Goal

Replace the current category-strip vehicle cutouts with assets that feel more exclusive, less reused, and more visually consistent.

## Summary

There are three realistic routes:

1. Official manufacturer press assets.
   Best visual quality, strongest brand perception, but often limited to editorial use.
2. Paid stock assets with commercial licenses.
   Safer for a commercial site, but usually generic or AI-generated rather than iconic real models.
3. Custom-owned set derived from local fleet photography or brand-new generated renders.
   Best long-term route for originality and licensing control.

## Best current recommendation

For a live commercial website, the safest premium route is:

1. Use commercially licensed stock or custom-made renders for the five category cards.
2. Avoid relying on official press-room downloads unless legal use is confirmed for commercial marketing.
3. If we want a stronger brand-led look, recreate the same visual language ourselves instead of reusing recognizable OEM press shots.

## Route A: Official OEM references

These are strong visual references, but many press rooms explicitly label imagery for editorial use.

- Sports: Lamborghini Revuelto official model page
  https://www.lamborghini.com/en-en/models/revuelto
- Convertible: Ferrari 296 GTS official model page
  https://www.ferrari.com/en-EN/auto/296-gts
- Luxury: Rolls-Royce Ghost / Spectre press assets
  https://www.press.bmwgroup.com/global/photo/detail/P90597079/ROLLS-ROYCE-BLACK-BADGE-SPECTRE-FINISHED-IN-JUBILEE-SILVER
- SUV: Range Rover SV image pack
  https://media.landrover.com/image-packs/range-rover-sv-images
- Electric: Porsche Taycan press kit
  https://newsroom.porsche.com/en/press-kits/taycan.html

Notes:

- Rolls-Royce PressClub pages explicitly mention editorial-purpose availability on some assets.
- Land Rover and Porsche press resources are excellent reference sources, but usage still needs confirmation before commercial deployment.

## Route B: Commercial-safe stock references

These are examples of safer asset sources because they are sold under stock licenses, but the look is more generic.

- Sports generic side render
  https://stock.adobe.com/images/sports-car-isolated-on-transparent-background/584134264
- Convertible generic side render
  https://stock.adobe.com/images/white-generic-convertible-sports-car-isolated-on-transparent-background-side-view/1332562547
- Luxury sedan generic side render
  https://stock.adobe.com/images/black-luxury-limousine-car-side-view-isolated-on-white-transparent-background-png/1742807410
- SUV generic side render
  https://stock.adobe.com/images/black-suv-car-isolated-on-transparent-background-side-view/1237553575
- Electric generic side render
  https://stock.adobe.com/images/white-luxury-car-isolated-on-transparent-background-3d-rendering-illustration/590625157

Notes:

- Some Adobe Stock assets are AI-generated but still sold under standard/extended stock licenses.
- Some branded Adobe Stock vehicle cutouts exist, but several are marked editorial-only.
- Avoid branded cutouts on stock sites unless the page clearly allows commercial use beyond editorial.

## Local project material worth reusing

The repo already contains stronger premium fleet photography that could be repurposed into custom category cards:

- `site-v2/images/fleet/lamborghini-huracan/01-exterior-front.png`
- `site-v2/images/fleet/ferrari-296-gts/01-exterior-front.jpg`
- `site-v2/images/fleet/lamborghini-urus/01-exterior-front.png`

These are not side-profile transparent cutouts, but they could support a more editorial card design:

- dark cropped hero cards
- masked/studio-composited cards
- monochrome or desaturated luxury treatment
- category-specific hover motion without repeating the same side-cutout language

## Recommended next step

Short term:

- Keep the current strip functional, but replace the most recognizable reused cutouts.
- Start by swapping `Electric`, then `SUV`, then `Luxury`.

Better path:

- Build a custom five-image set with one visual system:
  same camera family, same background treatment, same light direction, same height and scale.

If we want the result to feel truly premium, the target should not be "find five nicer PNGs".
The target should be "create one coherent category art direction".
