# Image Audit - 2026-05-14

Purpose: keep Dynasty Prestige imagery premium, coherent and page-specific across Home, Fleet, Services, Locations, brand pages and vehicle landings.

## Decisions Applied

- Home keeps the hero video as the only video-led first impression; the Google reviews band no longer reuses `hero-sports-road.mp4` as a decorative background.
- Locations no longer uses `service-detail.png` as a process/background image. That asset is a Lamborghini cockpit/detail and does not communicate location, map, airport or route planning.
- The main Locations guide feature now uses a designed map/routing visual instead of a random vehicle cockpit photo.
- Porsche Fleet and Porsche brand card media now use `porsche-992-gt3/02-exterior-side.jpg` as the temporary exterior asset. `porsche-992-gt3/01-exterior-front.jpg` is allowed only as cockpit/interior support.
- Services social preview uses `service-handover.png`, which is service-relevant. Contact, Locations and Find Booking use the neutral DP logo rather than model-specific Ferrari/Rolls images.
- Tailored delivery now uses the Mercedes exterior/villa-style handover image instead of the Lamborghini cockpit detail.
- Vehicle PDP generic video sections are hidden until we have vehicle-specific footage. Repeating the same two generic clips across every car weakens the premium model story.

## Current Remaining Gaps

- Services still needs a real service-specific image set: airport concierge, chauffeur movement, hotel/villa delivery, monthly rental, business mobility and wedding/event support. Current substitutions are semantically safer, but not yet final-shoot quality.
- Locations still needs real Dubai/UAE place imagery: Palm, Marina, airport, Abu Dhabi and hotel/villa handover environments.
- Fleet still relies on mixed vehicle image families. The current assets are acceptable temporarily, but they do not yet feel like one unified premium shoot.
- Vehicle PDP video sections need model-specific, rights-cleared footage. Use free/stock/owned videos only after approval, compression and local hosting.

## Hard Rules For Future Media

- Do not use a vehicle interior/cockpit as a Fleet card, brand hero, location hero or generic service background.
- Do not use a model-specific car image for Contact, Find Booking, Reserve or other task-led utility pages unless the selected vehicle is part of the task context.
- Do not reuse the same flagship Rolls image as the answer for every page family. One strong image can anchor Fleet or Rolls, but it cannot carry About, Services and Locations at the same time.
- Location pages must be place-led or map-led. If no proper location image exists, use a designed map/route texture rather than an unrelated car photo.
- Services pages must be service-led. Handover, airport, chauffeur, concierge, delivery and monthly comfort cues matter more than showing another generic car.
- Home should not flash from one photo identity into a different video identity. If video is the identity, fallback must be neutral and not visually compete.
- Vehicle video must be model-specific or intentionally page-family-specific. Do not label generic Dubai/sports-road footage as Ferrari, Lamborghini, Porsche, Mercedes or Rolls model footage.
- Do not hotlink external video files. Download/approve, compress and serve locally from `site/media/vehicles/<vehicle-slug>/`.

## Audit Checks To Keep Running

- Check repeated assets by page family and flag any non-logo image used as primary media in more than two families.
- Check semantic mismatch between file, alt text and context, especially `interior`, `cockpit`, `exterior`, `location`, `service` and `handover`.
- Check first viewport text safe areas over images/videos on mobile, tablet, laptop and large desktop.
- Check social images: utility pages should not inherit vehicle-specific car photos.
- Check that every background image answers the page intent before it is judged visually pretty.
