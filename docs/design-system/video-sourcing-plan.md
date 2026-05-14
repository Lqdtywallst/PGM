# Vehicle Video Sourcing Plan

Purpose: add motion to vehicle landings only when the footage is coherent, rights-safe and specific enough to strengthen the reservation decision.

## Rules

- Use owned footage first whenever possible.
- If using internet footage, use only assets with clear commercial-use licensing from stock sources.
- Do not use YouTube, TikTok, Instagram, competitor rental videos or manufacturer footage unless written permission/licensing allows it.
- Do not hotlink external files. Download the approved clip, trim it, compress it and serve it locally.
- Do not add `VideoObject` schema until the visible video is real, model-relevant and hosted by us.
- If the exact model is not available, use still imagery instead of forcing a generic video.

## Preferred Asset Spec

- Length: 5-10 seconds loop.
- Format: MP4 H.264, optional WebM if we add a second source.
- Resolution: 1080p source, delivered around 1280-1600px wide for web.
- File target: ideally below 3 MB per clip after compression.
- Visual style: warm Dubai/editorial, clean road or handover context, not noisy social-media footage.
- Storage path: `site/media/vehicles/<vehicle-slug>/<clip-name>.mp4`.

## Candidate Search Sources

- Pexels videos: commercial-use stock clips, but trademarks and identifiable brands still need review. License reference: `https://www.pexels.com/license/`.
- Pixabay videos: useful for generic luxury/motion context, but brand/logo/trademark use still needs review. Search pages can be useful for rarer exact models.
- Videvo / Coverr: possible backup sources, review each clip license before use.

## Vehicle Search Matrix

| Vehicle | Search intent | Accept if | Reject if |
| --- | --- | --- | --- |
| Lamborghini Huracan EVO Spyder | Huracan Spyder / Huracan convertible / Lamborghini Dubai | Blue/open-top/supercar footage matches the current stills and does not look like a different car story. | Generic sports road, coupe-only footage, obvious non-Dubai racing edit. |
| Lamborghini Urus | Lamborghini Urus / luxury SUV Dubai / Urus night | SUV presence, hotel/villa/arrival or city movement. | Generic Lamborghini supercar video or off-road footage unrelated to Dubai rental. |
| Ferrari 296 GTS | Ferrari 296 GTS / Ferrari convertible / Ferrari Dubai | Open-top Ferrari tone, resort/dinner/arrival movement. | Red generic Ferrari coupe if it changes the page promise too much. |
| Porsche 992 GT3 | Porsche GT3 / Porsche 911 GT3 / sports car Dubai | Driver-focused, clean road, low aggressive stance. | Luxury chauffeur/hotel footage that fights the GT3 intent. |
| Mercedes G63 AMG | Mercedes G Wagon / G63 Dubai / luxury SUV handover | SUV comfort, city/hotel/villa movement, premium but practical. | Desert/off-road macho content unless the page explicitly sells that use case. |
| Rolls-Royce Cullinan Black Badge | Rolls Royce Cullinan / luxury SUV chauffeur / Rolls Dubai | Chauffeur, quiet arrival, rear-seat comfort, airport/hotel tone. | Flashy sports-car edits or unrelated Rolls sedan footage. |

## Initial Candidate Links To Review

- Lamborghini Huracan: `https://www.pexels.com/pt-br/procurar/videos/lamborghini%20huracan/`
- Mercedes G Wagon / G63: `https://www.pexels.com/search/videos/Mercedes%20G%20Wagon/`
- Mercedes G Wagon backup: `https://pixabay.com/videos/search/mercedes%20g%20wagon/`
- Porsche / 911 / GT3: `https://www.pexels.com/search/videos/porsche/`
- Porsche 911 GT3 focused search: `https://www.pexels.com/fr-fr/chercher/videos/porsche%20911%20gt3/`
- Rolls-Royce: `https://www.pexels.com/search/videos/Rolls%20Royce/`
- Rolls-Royce Cullinan backup: `https://pixabay.com/videos/search/rolls%20royce%20cullinan/`

Ferrari 296 GTS is the weakest free-stock match in the first pass. If no exact 296/GTS candidate appears, use the current still gallery and skip video rather than showing a wrong Ferrari.

## Activation Workflow

1. Save candidate links and license notes.
2. Approve one primary clip per vehicle.
3. Download and compress locally.
4. Replace the hidden generic video section with the approved local clip.
5. Add `VideoObject` schema only for that approved local clip.
6. Run visual checks on mobile, tablet, laptop and desktop.
