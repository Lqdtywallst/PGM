# PGM Image Asset Inventory

Operational inventory of real image and media assets currently present in the repo.

Scope reviewed:

- `site/images`
- `site/media`
- Image and media references found in `site`, `server` and `docs`
- CSS background images and JSON-driven assets where discoverable by local search

This document is documentation only. It does not change production HTML, CSS, JS or data.

## Executive Summary

PGM has enough imagery to keep the current site running, but not enough coherent imagery to support a premium, scalable visual system across Home, Fleet, Services, Locations, brand landings and Vehicle PDPs.

Main risks:

- P0: `site/images/fleet/porsche-992-gt3/01-exterior-front.jpg` is used as a primary Porsche exterior/card/hero asset, but visually reads as an interior/cockpit. This breaks semantics and comparison quality.
- P0: `site/images/locations-hero-temp.jpg` contains non-Dubai limousine/Las Vegas visual context and should not represent PGM locations.
- P1: Rolls-Royce assets, especially `06-exterior-front-open-doors.png`, are overused across Fleet, About, Services, Locations, brand and PDP contexts.
- P1: Fleet cards mix different image systems: garden daylight, industrial exterior, cockpit, grey studio, villa daylight and Dubai handover.
- P1: Home is now video-first with a neutral brand fallback, but still needs one final owned/licensed video family approved for desktop and mobile.

Priority summary:

| Priority | Action |
| --- | --- |
| P0 | Replace Porsche primary asset with true exterior; remove Las Vegas/location temp image from public storytelling use. |
| P1 | Normalize Fleet card image rules; reduce Rolls reuse; approve final Home video identity; create service-specific assets. |
| P2 | Upgrade category assets, add metadata conventions, automate image drift checks. |

## Classification Legend

Recommended use labels:

- `home-hero`
- `home-category`
- `fleet-card`
- `fleet-hero`
- `service-hero`
- `service-card`
- `location-hero`
- `brand-landing`
- `vehicle-pdp-hero`
- `vehicle-gallery`
- `admin/internal`
- `deprecated/no-usar`

Status labels:

- `Reusable now`: safe enough to keep in its recommended role.
- `Temporary`: can remain until a better owned/licensed asset is sourced.
- `Replace urgently`: should be removed from the relevant role as soon as possible.
- `Missing`: asset type needed but not currently represented well in repo.

## Core Brand And Logo Assets

| Asset | Dimensions | Recommended use | Current use found | Status | Problems / notes |
| --- | ---: | --- | --- | --- | --- |
| `site/images/dp-crest-cropped.png` | 552x615 | `admin/internal` plus global brand mark | Global header/footer/watermark across public pages and JS shells | Reusable now | Brand asset, not a content image. Do not use as substitute for page imagery. |
| `site/images/dynasty-prestige-logo.png` | 1536x1024 | `admin/internal` | Admin/content editor only | Reusable now | Keep internal unless a specific social/brand use is approved. |
| `site/images/brands/ferrari-mark.png` | 360x220 | `admin/internal` / brand navigation | Shared nav panels, brand rows, pages | Reusable now | Brand mark only; not page imagery. |
| `site/images/brands/lamborghini-mark.png` | 360x220 | `admin/internal` / brand navigation | Shared nav panels, brand rows, pages | Reusable now | Brand mark only. |
| `site/images/brands/mercedes-mark.png` | 360x220 | `admin/internal` / brand navigation | Shared nav panels, brand rows, pages | Reusable now | Brand mark only. |
| `site/images/brands/porsche-mark.png` | 360x220 | `admin/internal` / brand navigation | Shared nav panels, brand rows, pages | Reusable now | Brand mark only. |
| `site/images/brands/rolls-royce-mark.png` | 360x220 | `admin/internal` / brand navigation | Shared nav panels, brand rows, pages | Reusable now | Brand mark only. |

## Category Assets

| Asset | Dimensions | Recommended use | Current use found | Status | Problems / notes |
| --- | ---: | --- | --- | --- | --- |
| `site/images/categories/mock-fastpng/sports-stage.png` | 1200x420 | `home-category` | Home categories, shared nav/type panels, many public pages | Reusable now | Consistent and dark, but catalogue-like. Good for navigation, not editorial storytelling. |
| `site/images/categories/mock-fastpng/convertible-stage.png` | 1200x420 | `home-category` | Home categories, shared nav/type panels, many public pages | Reusable now | Same system as sports. Keep until richer category system exists. |
| `site/images/categories/mock-fastpng/luxury-stage.png` | 1200x420 | `home-category` | Home categories, shared nav/type panels, many public pages | Reusable now | Good consistency; weak premium story if used too prominently. |
| `site/images/categories/mock-fastpng/suv-stage.png` | 1200x420 | `home-category` | Home categories, shared nav/type panels, many public pages | Reusable now | Good consistency; not a replacement for Fleet cards. |
| `site/images/categories/mock-fastpng/electric-stage.png` | 1200x420 | `home-category` | Preview docs only | Temporary | Electric category appears inactive/preview-only; do not promote without business decision. |
| `site/images/categories/mock-fastpng/*-cutout.png` | 1408x768 | `admin/internal` | Mostly cleanup docs only | Temporary | Source/cutout variants; not currently primary public assets. |
| `site/images/categories/mock-fastpng/*.jpeg` | 1408x768 | `admin/internal` | No active public references found | Temporary | Raw/alternate category assets; keep internal unless needed. |
| `site/images/categories/sports.png` | 1000x667 | `deprecated/no-usar` | No active public references found | Temporary | Older category asset; avoid mixing with stage system. |
| `site/images/categories/convertible.png` | 1200x803 | `deprecated/no-usar` | No active public references found | Temporary | Older category asset; avoid unless category system is redesigned. |
| `site/images/categories/luxury.png` | 1200x800 | `deprecated/no-usar` | No active public references found | Temporary | Older category asset; low saturation but not part of current category language. |
| `site/images/categories/suv.png` | 1109x447 | `deprecated/no-usar` | No active public references found | Temporary | Older category asset with different ratio. |
| `site/images/categories/electric.png` | 1080x608 | `deprecated/no-usar` | No active public references found | Temporary | Inactive unless Electric returns as a category. |
| `site/images/categories/electric-real.jpg` | 4399x6158 | `deprecated/no-usar` | Cleanup docs only | Replace urgently if public | Portrait ratio, large file, not aligned with current public system. |
| `site/images/categories/electric-real-wide.jpg` | 6000x4000 | `deprecated/no-usar` | Cleanup docs only | Replace urgently if public | Very large file; no current public role. |
| `site/images/categories/electric-local-card.jpg` | 1400x959 | `deprecated/no-usar` | Cleanup docs only | Replace urgently if public | No current business/category role. |

## Fleet And Vehicle Assets

### Ferrari 296 GTS

| Asset | Dimensions | Recommended use | Current use found | Status | Problems / notes |
| --- | ---: | --- | --- | --- | --- |
| `site/images/fleet/ferrari-296-gts/01-exterior-front.jpg` | 1600x1066 | `fleet-card`, `brand-landing`, secondary `vehicle-gallery` | Home featured, Fleet, Ferrari brand, Ferrari PDP, guide/service pages, `server/data/fleet-cards.json` | Temporary | Usable product image but industrial/non-Dubai background. OK now; should be replaced with PGM-grade exterior later. |
| `site/images/fleet/ferrari-296-gts/02-exterior-side.jpg` | 977x1024 | `vehicle-gallery` | No active public references found | Temporary | Portrait-ish crop; not good for cards/heroes. |
| `site/images/fleet/ferrari-296-gts/03-exterior-rear.jpg` | 2560x1429 | `vehicle-gallery` | Ferrari PDP | Reusable now | Good gallery support, wide ratio. Brighter than current premium dark grade. |
| `site/images/fleet/ferrari-296-gts/04-interior-cabin.jpg` | 2560x1429 | `vehicle-gallery` | Cleanup docs only | Reusable now | Useful missing gallery candidate; not currently public. |
| `site/images/fleet/ferrari-296-gts/05-detail-wheel.jpg` | 2560x1428 | `vehicle-gallery` | No active public references found | Reusable now | Useful detail candidate. |
| `site/images/fleet/ferrari-296-gts/06-exterior-motion.jpg` | 1024x599 | `vehicle-gallery` | Ferrari PDP | Temporary | High saturation/sports energy; OK as support, not as global hero/card. |
| `site/images/fleet/ferrari-296-gts/07-hero-dubai.jpeg` | 1024x683 | `vehicle-pdp-hero` | Ferrari PDP and remaining Ferrari-specific references | Temporary | No longer used as Home fallback. Good Ferrari/Dubai mood but too model-specific for utility or brand-wide pages. |
| `site/images/fleet/ferrari-296-gts/08-front-profile.jpg` | 1572x1882 | `vehicle-gallery` | Ferrari PDP | Temporary | Portrait crop; not card/hero safe. |

Recommendation: use `07-hero-dubai.jpeg` for Ferrari PDP hero only until a stronger Ferrari-specific exterior exists. Use `01-exterior-front.jpg` for Ferrari fleet/brand temporarily, but it should be replaced with a Dubai-context exterior.

### Lamborghini Huracan

| Asset | Dimensions | Recommended use | Current use found | Status | Problems / notes |
| --- | ---: | --- | --- | --- | --- |
| `site/images/fleet/lamborghini-huracan/01-exterior-front.png` | 1024x682 | `fleet-card`, `brand-landing`, `vehicle-pdp-hero` | Home featured, Fleet, Lamborghini brand, Huracan PDP, `server/data/fleet-cards.json`, previews | Temporary | Strong color and Dubai greenery; usable but high saturation and garden background drift from premium dark system. |
| `site/images/fleet/lamborghini-huracan/02-center-console.png` | 1024x682 | `vehicle-gallery` | Huracan PDP | Reusable now | Support-only interior/detail. |
| `site/images/fleet/lamborghini-huracan/03-exterior-rear.png` | 1024x682 | `vehicle-gallery` | Huracan PDP, previews | Reusable now | Good support; same scene family as hero. |
| `site/images/fleet/lamborghini-huracan/04-interior-cockpit.png` | 1024x682 | `vehicle-gallery`, limited `service-card` if service is driving/cockpit | Huracan PDP, previews | Temporary | Dark and saturated; not a service default. |
| `site/images/fleet/lamborghini-huracan/05-seat-detail.png` | 1024x682 | `vehicle-gallery` | Huracan PDP, previews | Reusable now | Good detail support. |
| `site/images/fleet/lamborghini-huracan/06-steering-wheel-detail.png` | 1024x682 | `vehicle-gallery` | Preview docs only | Temporary | Appears visually similar to `01`; verify before public use. |

Recommendation: keep `01-exterior-front.png` as temporary Huracan card/PDP hero. Replace later with a cleaner Dubai night/dusk exterior that matches the wider fleet grade.

### Lamborghini Urus

| Asset | Dimensions | Recommended use | Current use found | Status | Problems / notes |
| --- | ---: | --- | --- | --- | --- |
| `site/images/fleet/lamborghini-urus/01-exterior-front.png` | 1024x682 | `fleet-card`, `brand-landing`, `vehicle-pdp-hero` | Home featured, Fleet, Lamborghini brand, Urus PDP, `server/data/fleet-cards.json` | Temporary | Studio/garage grey background differs strongly from outdoor fleet assets. |
| `site/images/fleet/lamborghini-urus/02-interior-cockpit.png` | 1024x682 | `vehicle-gallery` | Urus PDP | Reusable now | Good gallery/support. |
| `site/images/fleet/lamborghini-urus/03-interior-dashboard.png` | 1024x682 | `vehicle-gallery` | Urus PDP | Reusable now | Good detail support. |
| `site/images/fleet/lamborghini-urus/04-interior-front-seats.png` | 1024x682 | `vehicle-gallery` | Urus PDP | Reusable now | Support only. |
| `site/images/fleet/lamborghini-urus/05-interior-rear-seats.png` | 1024x682 | `vehicle-gallery`, possible monthly/support service | Urus PDP | Reusable now | Good cabin support, not primary card. |
| `site/images/fleet/lamborghini-urus/06-exterior-rear.png` | 1024x682 | `vehicle-gallery` | Urus PDP | Reusable now | Support only. |

Recommendation: Urus needs a new exterior card image in a real Dubai/hotel/arrival environment. Current `01` is acceptable only as temporary product clarity.

### Mercedes G63 AMG

| Asset | Dimensions | Recommended use | Current use found | Status | Problems / notes |
| --- | ---: | --- | --- | --- | --- |
| `site/images/fleet/mercedes-g63-amg/01-exterior-front.jpg` | 1600x1067 | `fleet-card`, `brand-landing`, `vehicle-pdp-hero` | Fleet, Mercedes brand, About, G63 PDP, `server/data/fleet-cards.json` | Temporary | Good exterior clarity; daylight villa/greenery differs from darker premium grade. |
| `site/images/fleet/mercedes-g63-amg/02-exterior-angle.jpg` | 1600x1067 | `vehicle-gallery` | G63 PDP | Reusable now | Good support. |
| `site/images/fleet/mercedes-g63-amg/03-exterior-side.jpg` | 1600x1067 | `vehicle-gallery` | G63 PDP | Reusable now | Support; brighter/lighter crop. |
| `site/images/fleet/mercedes-g63-amg/04-interior-front.jpg` | 1600x1067 | `vehicle-gallery` | G63 PDP | Reusable now | Support only. |
| `site/images/fleet/mercedes-g63-amg/05-interior-rear.jpg` | 1600x1067 | `vehicle-gallery`, possible service-card for comfort/chauffeur | G63 PDP | Reusable now | Good comfort support, not primary fleet card. |
| `site/images/fleet/mercedes-g63-amg/06-exterior-rear.jpg` | 1600x1067 | `vehicle-gallery` | No active public references found | Reusable now | Useful missing PDP gallery candidate. |

Recommendation: keep Mercedes exterior as temporary primary. Future replacement should keep authority but reduce garden/daylight mismatch.

### Porsche 992 GT3

| Asset | Dimensions | Recommended use | Current use found | Status | Problems / notes |
| --- | ---: | --- | --- | --- | --- |
| `site/images/fleet/porsche-992-gt3/01-exterior-front.jpg` | 1576x950 | `vehicle-gallery` only | Porsche brand, Fleet, Porsche PDP, `server/data/fleet-cards.json` | Replace urgently | Interior/cockpit image used as exterior/front/card hero. Incorrect semantics and first impression. |
| `site/images/fleet/porsche-992-gt3/02-exterior-side.jpg` | 1707x2000 | `vehicle-pdp-hero` temporary, `brand-landing` temporary | Porsche PDP | Temporary | True exterior but portrait ratio; usable in PDP with controlled crop, weak for Fleet card. |
| `site/images/fleet/porsche-992-gt3/03-exterior-rear.jpg` | 1706x1975 | `vehicle-gallery` | Porsche PDP | Reusable now | True exterior support but portrait ratio. |
| `site/images/fleet/porsche-992-gt3/04-interior-cockpit.jpeg` | 1705x2194 | `vehicle-gallery` | Porsche PDP | Reusable now | Interior support only. |
| `site/images/fleet/porsche-992-gt3/05-detail-seat.jpeg` | 2560x1348 | `vehicle-gallery` | No active public references found | Temporary | High saturation; detail support only. |
| `site/images/fleet/porsche-992-gt3/06-track-rear.jpeg` | 2560x1707 | `vehicle-gallery` | Porsche PDP | Temporary | High saturation/track mood; support only, not brand/fleet hero. |

Recommendation: P0 replace Porsche primary card/brand/PDP hero with a true landscape exterior. Until then, `02-exterior-side.jpg` is semantically better but crop-risky.

### Rolls-Royce Cullinan Black Badge

| Asset | Dimensions | Recommended use | Current use found | Status | Problems / notes |
| --- | ---: | --- | --- | --- | --- |
| `site/images/fleet/rolls-royce-cullinan-black-badge/01-exterior-rear.png` | 1024x683 | `vehicle-gallery` | Rolls PDP, previews | Temporary | High saturation/blue tone; support only. |
| `site/images/fleet/rolls-royce-cullinan-black-badge/02-exterior-front.png` | 1024x683 | `service-hero` temporary, `vehicle-gallery` | Services, Rolls PDP, Home/service sections, `server/data/services-editor.json` | Temporary | Usable but overused; bright pavement/buildings can fight text. |
| `site/images/fleet/rolls-royce-cullinan-black-badge/03-interior-front-seats.png` | 1024x683 | `vehicle-gallery` | Rolls PDP, previews | Reusable now | Support only. |
| `site/images/fleet/rolls-royce-cullinan-black-badge/04-interior-cockpit.png` | 1024x683 | `vehicle-gallery` | About, Rolls PDP, previews | Temporary | Blue/high saturation; avoid broad service/About reuse. |
| `site/images/fleet/rolls-royce-cullinan-black-badge/05-interior-rear-seats.png` | 1024x683 | `vehicle-gallery`, limited `service-card` for chauffeur/monthly comfort | About, Services, monthly service, Rolls PDP, `server/data/services-editor.json` | Temporary | High saturation/blue tone; repeated beyond ideal role. |
| `site/images/fleet/rolls-royce-cullinan-black-badge/06-exterior-front-open-doors.png` | 1024x683 | `fleet-hero`, `fleet-card`, `brand-landing`, `vehicle-pdp-hero` temporary | Home, Fleet, About CSS, Locations, chauffeur service, Rolls brand/PDP, `server/data/fleet-cards.json` | Temporary | Strong PGM/Dubai handover cue, but excessive reuse across page families. |

Recommendation: keep `06` as the temporary flagship/fleet Rolls asset, but stop expanding its usage. Source separate assets for About, Services and Locations.

## Service And Location Standalone Assets

| Asset | Dimensions | Recommended use | Current use found | Status | Problems / notes |
| --- | ---: | --- | --- | --- | --- |
| `site/images/service-handover.png` | 1024x683 | `service-card`, temporary `service-hero` for airport/handover | Services hub, airport concierge page, `server/data/services-editor.json` | Temporary | Duplicate visual of Rolls open-doors; good handover cue but contributes to Rolls overuse. |
| `site/images/service-detail.png` | 1024x682 | `service-card`, `vehicle-gallery` support only | Services hub, Locations feature/card backgrounds, hotel/villa delivery page, About, admin defaults | Temporary | Lamborghini cockpit/detail is too driving-focused and orange for broad delivery/location service use. |
| `site/images/service-cockpit.png` | 1024x682 | `service-card` for business/driver focus only | Business service page | Temporary | Same Urus cockpit family; saturated orange. Use narrowly. |
| `site/images/locations-hero-temp.jpg` | 2400x3593 | `deprecated/no-usar` | Historical cleanup docs / legacy references only | Replace urgently | Removed from visible core page storytelling. Non-Dubai/Las Vegas limousine context, visible external brand text, portrait ratio, high saturation. |

Recommendation: service and location imagery is the largest missing set. Do not keep solving services with product images. Produce/source service-specific scenes and Dubai place imagery.

## Home Media Assets

| Asset | Type / dimensions | Recommended use | Current use found | Status | Problems / notes |
| --- | ---: | --- | --- | --- | --- |
| `site/media/home-hero-city-streets.mp4` | video, 9.0 MB | `home-hero` desktop | Home | Temporary | Best current Home direction if it communicates Dubai movement. Home now uses a neutral brand gradient until video readiness instead of a photo poster/fallback. |
| `site/media/hero-sports-road.mp4` | video, 2.8 MB | `home-hero` mobile temporary, `vehicle-gallery` video support | Home, all vehicle PDP video sections, tests/docs | Temporary | Repeated across many PDPs; generic sports-road tone can dilute vehicle specificity. |
| `site/media/hero-dubai-sunset.mp4` | video, 11.9 MB | `vehicle-gallery` / atmospheric support | Brand/PDP video sections, previews/docs | Temporary | Large and repeated. Avoid using as every vehicle's unique story. |
| `site/images/home-hero-video-poster.jpg` | 2560x1440 | `home-hero` poster candidate if a poster is reintroduced | Docs only | Reusable now | Good Dubai skyline poster candidate, but public Home intentionally avoids a photo fallback so the video entrance feels fluid. |

Recommendation: align Home to one family: `home-hero-city-streets.mp4` plus a matching owned/licensed Dubai poster. Avoid fallbacking to Ferrari PDP imagery as the Home identity.

## Recommended Image Per Main Page

| Page / family | Current best asset to use now | Future target asset | Notes |
| --- | --- | --- | --- |
| Home | `site/media/home-hero-city-streets.mp4` with neutral brand-gradient fallback | Owned/licensed Dubai concierge mobility video with optional matching poster only if it does not create a visible photo-to-video jump | Ferrari PDP fallback has been removed from Home identity. |
| Fleet | `site/images/fleet/rolls-royce-cullinan-black-badge/06-exterior-front-open-doors.png` for temporary hero | Wide fleet/arrival image with Dubai context and safe text area | Keep hero distinct from card repetition if possible. |
| Services | `site/images/service-handover.png` only as temporary airport/handover cue | Service shoot: airport, chauffeur, hotel/villa, monthly, business, event | Product-only images do not communicate service lanes clearly enough. |
| Locations | No current approved image | Dubai/Palm/Marina/airport/Abu Dhabi place imagery | `locations-hero-temp.jpg` should be retired from public use. |
| About | Dark brand-gradient hero with subtle DP watermark; `service-handover.png` only as support imagery | Team/process/handover/concierge scene | Avoid using a vehicle hero as the primary About identity. |
| Contact | Prefer no major photo; subtle brand/desk texture if needed | Concierge desk/contact detail | Keep forms/actions dominant. |
| Reserve | Prefer no major photo; controlled dark background | Booking-safe abstract/vehicle detail if needed | Avoid high-energy vehicle imagery. |
| Find Booking / reservation lookup | Secure/quiet brand texture | Secure/quiet task background or subtle texture | Ferrari background has been removed so the page feels more private and task-led. |

## Recommended Image Per Brand Landing

| Brand landing | Current best asset to use now | Future target asset | Notes |
| --- | --- | --- | --- |
| Ferrari | `site/images/fleet/ferrari-296-gts/01-exterior-front.jpg` or `07-hero-dubai.jpeg` depending layout | Refined Ferrari exterior in Dubai/hotel/dinner context | Avoid overusing `07` as global Home/lookup image. |
| Lamborghini | `site/images/fleet/lamborghini-huracan/01-exterior-front.png` | Theatrical but premium Lamborghini exterior, preferably dusk/night Dubai | Current garden/tropical tone is loud but usable. |
| Mercedes | `site/images/fleet/mercedes-g63-amg/01-exterior-front.jpg` | Authoritative G63 at hotel/villa/business arrival | Good temporary clarity. |
| Porsche | `site/images/fleet/porsche-992-gt3/02-exterior-side.jpg` only as temporary semantic fix | Landscape Porsche exterior, clean precision-led setting | P0: do not use `01-exterior-front.jpg` as brand hero/card. |
| Rolls-Royce | `site/images/fleet/rolls-royce-cullinan-black-badge/06-exterior-front-open-doors.png` | Ceremonial Rolls handover with Dubai luxury context | Current asset is strong but overused. |

## Recommended Image Per Vehicle PDP

| Vehicle PDP | Current best hero asset now | Gallery assets to keep | Future target |
| --- | --- | --- | --- |
| Ferrari 296 GTS | `site/images/fleet/ferrari-296-gts/07-hero-dubai.jpeg` | `01`, `03`, `04`, `05`, `06`, `08` as curated support | New Ferrari exterior hero with Dubai/Premium handover and cleaner safe crop. |
| Lamborghini Huracan EVO Spyder | `site/images/fleet/lamborghini-huracan/01-exterior-front.png` | `02`, `03`, `04`, `05`; verify `06` before use | New exterior with controlled saturation and stronger premium Dubai mood. |
| Lamborghini Urus | `site/images/fleet/lamborghini-urus/01-exterior-front.png` | `02`, `03`, `04`, `05`, `06` | New exterior in real Dubai/hotel/airport setting. |
| Mercedes G63 AMG | `site/images/fleet/mercedes-g63-amg/01-exterior-front.jpg` | `02`, `03`, `04`, `05`, `06` | New exterior with less garden/green drift, stronger executive arrival tone. |
| Porsche 992 GT3 | `site/images/fleet/porsche-992-gt3/02-exterior-side.jpg` as temporary only | `01` as cockpit support, `03`, `04`, `05`, `06` | P0: true landscape exterior hero/card. |
| Rolls-Royce Cullinan Black Badge | `site/images/fleet/rolls-royce-cullinan-black-badge/06-exterior-front-open-doors.png` | `01`, `02`, `03`, `04`, `05` | New Rolls hero or alternate crop to reduce repeated public use. |

## Mother Vehicle Landing Template Classification

Updated direction: vehicle landings should be evaluated for a desktop first view with:

- Left column: main photo/gallery.
- Right column: check availability panel.
- Below the panel: vehicle feature boxes.

This makes the image role stricter than a generic hero. The main image must sell the exact vehicle immediately without stealing attention from the availability panel.

### Template Slot Rules

| Slot | What it needs | Good fit | Bad fit |
| --- | --- | --- | --- |
| Main gallery image, left desktop | Exact vehicle, exterior, premium crop, enough visual calm around subject. | Landscape or near-landscape exterior three-quarter/side, car complete, clean background. | Interior/cockpit, portrait crop, noisy background, excessive saturation, unclear vehicle identity. |
| Thumbnail 1 | Alternate exterior angle. | Rear/side/front support image that confirms model. | Duplicate of main image or unrelated scene. |
| Thumbnail 2 | Interior/cockpit confidence. | Steering/cockpit/cabin image, readable detail, controlled color. | Over-saturated orange/blue if it dominates the set. |
| Thumbnail 3 | Comfort/detail proof. | Seats, wheel, cabin detail, rear seats for SUVs/chauffeur-relevant cars. | Random close-up with no booking value. |
| Fleet/Home card | Quick comparison, not full storytelling. | Exterior car complete, consistent card crop, same grade as fleet. | Interior, portrait, studio mixed with street unless whole fleet matches. |
| Page background | Atmosphere only, never core product proof. | Dubai, handover, abstract premium texture, dark safe area. | Vehicle-specific card image repeated as background, bright/noisy image behind text. |

### Vehicle-Specific Slot Classification

| Vehicle | Main gallery image, left | Miniatures | Fleet/Home card | Background use | Not fit / caution |
| --- | --- | --- | --- | --- | --- |
| Ferrari 296 GTS | `ferrari-296-gts/07-hero-dubai.jpeg` is the best current PDP main because it has Dubai/premium context and exact vehicle presence. `01-exterior-front.jpg` is acceptable if product clarity is preferred over atmosphere. | Use `01-exterior-front.jpg`, `03-exterior-rear.jpg`, `04-interior-cabin.jpg`, `05-detail-wheel.jpg`, `06-exterior-motion.jpg`, `08-front-profile.jpg` as a curated set. | `01-exterior-front.jpg` is currently the better card asset because it shows the vehicle clearly, but its industrial background is not ideal. | `07-hero-dubai.jpeg` can be Ferrari-specific background only; avoid using it as global Home/Reserve/Find Booking identity. | `06-exterior-motion.jpg` has high saturation and sports energy; keep as thumbnail/support, not main template image. `08-front-profile.jpg` is portrait and weak for left-column desktop main. |
| Lamborghini Huracan EVO Spyder | `lamborghini-huracan/01-exterior-front.png` is the current best main image because it shows the exact vehicle exterior clearly. | Use `03-exterior-rear.png`, `04-interior-cockpit.png`, `05-seat-detail.png`, `02-center-console.png`; verify `06-steering-wheel-detail.png` before public use because it appears visually redundant. | `01-exterior-front.png` is usable for Fleet/Home cards but should be color-graded carefully; blue body and green garden are visually loud. | Not recommended as page background except Lamborghini-specific sections with strong overlay. | The image family is saturated and garden-led; premium coherence is weaker than a controlled Dubai dusk/hotel exterior. |
| Lamborghini Urus | `lamborghini-urus/01-exterior-front.png` is the current best main image for clarity, but it reads as studio/garage rather than PGM Dubai. | Use `06-exterior-rear.png`, `02-interior-cockpit.png`, `03-interior-dashboard.png`, `04-interior-front-seats.png`, `05-interior-rear-seats.png`. | `01-exterior-front.png` works temporarily for cards because the car is complete and clean. | Avoid as page background; grey studio context does not sell Dubai service. | Studio setting breaks coherence against outdoor fleet cards. Needs replacement for premium template maturity. |
| Mercedes G63 AMG | `mercedes-g63-amg/01-exterior-front.jpg` is current best main and card image. | Use `02-exterior-angle.jpg`, `03-exterior-side.jpg`, `06-exterior-rear.jpg`, `04-interior-front.jpg`, `05-interior-rear.jpg`. | `01-exterior-front.jpg` is usable now; strong vehicle recognition. | Not ideal as general background because daylight greenery can compete with text and feels less editorial. | Green/villa daylight tone differs from dark premium PGM grade; replace later with executive hotel/arrival imagery. |
| Porsche 992 GT3 | No ideal current main image. `porsche-992-gt3/02-exterior-side.jpg` is the best semantic temporary choice because it is a real exterior, but it is portrait and risky for the left desktop gallery crop. | Use `03-exterior-rear.jpg`, `04-interior-cockpit.jpeg`, `05-detail-seat.jpeg`, `06-track-rear.jpeg`, and `01-exterior-front.jpg` only as cockpit/interior support. | No current asset is good enough for Fleet/Home card. Do not use `01-exterior-front.jpg` as a card. | Avoid Porsche assets as page backgrounds until a correct exterior set exists. | P0 issue: `01-exterior-front.jpg` is mislabeled/used like exterior but is cockpit/interior. `05` and `06` have high saturation/track tone; support only. |
| Rolls-Royce Cullinan Black Badge | `rolls-royce-cullinan-black-badge/06-exterior-front-open-doors.png` is the best current main image and strongest handover cue. | Use `02-exterior-front.png`, `01-exterior-rear.png`, `03-interior-front-seats.png`, `04-interior-cockpit.png`, `05-interior-rear-seats.png`. | `06-exterior-front-open-doors.png` is usable as Fleet card, but repeated too widely. | Can support Fleet/About/Services temporarily with overlay, but should not be universal background. | `04` and `05` skew blue/high saturation. `06` is overused across page families and needs alternate assets. |

### Cross-Surface Priority For Existing Assets

| Priority role | Use these now | Avoid / replace |
| --- | --- | --- |
| Vehicle landing main gallery | Ferrari `07`; Huracan `01`; Urus `01`; Mercedes `01`; Porsche `02` temporary; Rolls `06`. | Porsche `01` as main/card; Ferrari `08`; portrait crops as main; interiors as main unless the vehicle page intentionally leads with cabin. |
| Vehicle landing thumbnails | Use exterior alternate, cockpit, seats/detail, and rear angle per model. | Repeated duplicate-like thumbnails; detail images with no booking value; high-saturation images as first thumbnail. |
| Fleet/Home cards | Ferrari `01`; Huracan `01`; Urus `01`; Mercedes `01`; Rolls `06`; Porsche needs new asset. | Porsche `01`; interior-only images; portrait images; high-saturation track/detail shots. |
| Brand landings | Ferrari `07` or `01`; Lamborghini Huracan `01` plus Urus support; Mercedes `01`; Rolls `06`; Porsche needs new landscape exterior. | Generic gallery interiors as brand hero; using the same visual treatment for every marque. |
| Page backgrounds | Home city video/poster, abstract/dark Dubai atmosphere, service/location-specific future assets. | `locations-hero-temp.jpg`; overusing Rolls `06`; Ferrari `07` as global background; any card image behind text without strong overlay. |

### Assets That Do Not Fit The Mother Template

| Asset | Why it does not fit as main/gallery principal | Allowed role |
| --- | --- | --- |
| `site/images/fleet/porsche-992-gt3/01-exterior-front.jpg` | It is an interior/cockpit image despite the exterior-like name and current usage. | Thumbnail/interior support only after relabeling usage. |
| `site/images/locations-hero-temp.jpg` | Non-Dubai/Las Vegas limousine context, portrait ratio, visible external text. | `deprecated/no-usar`. |
| `site/images/fleet/ferrari-296-gts/08-front-profile.jpg` | Portrait crop weak for left desktop main gallery; can feel cropped/vertical. | PDP thumbnail/support. |
| `site/images/fleet/porsche-992-gt3/02-exterior-side.jpg` | Correct exterior but portrait ratio creates crop risk in a landscape left gallery. | Temporary Porsche main only until replacement; better as thumbnail if a landscape hero exists. |
| `site/images/fleet/porsche-992-gt3/05-detail-seat.jpeg` | High saturation/detail image, not enough whole-car proof. | Thumbnail/detail only. |
| `site/images/fleet/porsche-992-gt3/06-track-rear.jpeg` | High saturation and track/showroom mood; too aggressive for main card/hero. | Thumbnail/support only. |
| `site/images/fleet/rolls-royce-cullinan-black-badge/04-interior-cockpit.png` | Blue/saturated cockpit does not fit premium calm as primary image. | Thumbnail/interior support. |
| `site/images/fleet/rolls-royce-cullinan-black-badge/05-interior-rear-seats.png` | Strong blue tone, repeated in services/about; not a main exterior proof. | Comfort thumbnail or chauffeur/monthly support. |
| `site/images/service-detail.png` | Lamborghini cockpit/orange detail; too specific and saturated for broad service/location background. | Narrow service-card/support only. |
| `site/images/service-cockpit.png` | Similar orange cockpit issue; not general service visual. | Business/driver-focused support only. |
| `site/images/categories/mock-fastpng/*.jpeg` | Raw/cutout-style sources do not match premium landing photography. | Internal/source only. |

### Missing For The Mother Template

- One approved landscape exterior main image per vehicle, same grade, same crop discipline.
- One Porsche exterior landscape hero/card asset immediately.
- One card-safe exterior per vehicle, preferably separate from PDP main image to reduce repetition.
- One thumbnail sequence standard per PDP: exterior alternate, rear/side, cockpit, seats/detail.
- One neutral/dark background image family for non-PDP pages so vehicle photos are not overused as page atmosphere.

## Asset Buckets

### Reusable Now

- Brand marks: `site/images/brands/*-mark.png`
- Global crest: `site/images/dp-crest-cropped.png`
- Category stage assets: `site/images/categories/mock-fastpng/*-stage.png` for category/nav use
- Vehicle gallery supports: Ferrari `03`, `04`, `05`; Huracan `02`, `03`, `05`; Urus `02`-`06`; Mercedes `02`-`06`; Rolls `03`; Porsche `03`, `04`
- Home poster candidate: `site/images/home-hero-video-poster.jpg`

### Temporary

- Ferrari `01-exterior-front.jpg`, `07-hero-dubai.jpeg`
- Huracan `01-exterior-front.png`
- Urus `01-exterior-front.png`
- Mercedes `01-exterior-front.jpg`
- Rolls `02-exterior-front.png`, `05-interior-rear-seats.png`, `06-exterior-front-open-doors.png`
- Service assets: `service-handover.png`, `service-detail.png`, `service-cockpit.png`
- Videos: all current `site/media/*.mp4`

### Replace Urgently

- `site/images/fleet/porsche-992-gt3/01-exterior-front.jpg` as primary/card/hero usage
- `site/images/locations-hero-temp.jpg`
- Any public use of `site/images/categories/electric-real*.jpg` before compression/role approval
- Any use of raw `mock-fastpng/*.jpeg` as public page media

### Missing Assets

- Stable Home hero poster/video family with PGM/Dubai concierge identity
- Fleet card exterior set with unified crop and color grade
- Porsche landscape exterior hero/card asset
- Dubai/Palm/Marina/airport/Abu Dhabi location imagery
- Services image set: airport concierge, chauffeur, hotel/villa delivery, monthly rental, business mobility, wedding/event
- About/team/process/concierge trust image
- Reserve / Find Booking subtle operational background if image-led design is desired

## Automated Auditor Rules To Add

The future visual auditor should inspect both assets and page usage.

- `asset-exists`: every referenced image/video exists in `site/images` or `site/media`.
- `role-match`: file/alt/page intent should not conflict, e.g. cockpit used as exterior.
- `ratio-card`: primary fleet cards should use landscape assets near 1.45-1.8.
- `ratio-hero`: page heroes should have usable 16:9 or wider crop, or explicit responsive crop notes.
- `saturation-warning`: warn above mean saturation `0.45` for hero/card unless role-approved.
- `location-risk`: flag visible third-party city/brand text and non-Dubai cues in location assets.
- `repeat-primary`: warn if the same asset is primary media in more than two page families.
- `mobile-crop`: verify no clipped wheels/roof/nose/person head at mobile and tablet.
- `text-safe-zone`: sample headline/CTA region for brightness/edge density behind text.
- `admin-only-leak`: flag raw, preview, cleanup or admin assets if used in public pages.
- `media-weight`: warn for large hero videos/images without clear first-viewport value.

## Approval Checklist For Adding A New Asset

Before a new image enters production:

- Assign exactly one primary role: hero, card, gallery, category, service, location or internal.
- Confirm legal status: owned, licensed or otherwise safe for commercial use.
- Confirm no watermark, third-party rental brand, unrelated city, misleading landmark or unwanted plate detail.
- Validate crop at mobile, tablet, laptop and large desktop.
- Confirm text safe area if it will sit behind copy.
- Confirm color grade matches PGM: warm, premium, controlled saturation, consistent blacks.
- Confirm the asset does not duplicate an already overused primary visual.
- Confirm alt text accurately describes what is visible.
- Confirm the image helps the page decision: choose fleet, choose service, choose location, trust team, reserve, or inspect vehicle.
- If inspired by competitor/premium references, record it as inspiration only, not as a direct asset source.
