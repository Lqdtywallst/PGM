# Functional Task Report

## Task 2026-05-09 13:58 - Header navigation, Brands cards and Cars Types filters

### Scope
Alejandro requested a functional QA pass of the site header, tab by tab, validating that every header navigation item goes to the correct destination. Scope also included opening the Cars Brands and Cars Types menu/cards and clicking every item to confirm the real customer outcome, not only link existence.

Desktop and mobile were tested because the header behavior changes from desktop mega menus to a mobile drawer.

Tested base URL: `http://localhost:8081`

### Tested Routes
- `http://localhost:8081/`
- `http://localhost:8081/fleet.html`
- `http://localhost:8081/services.html`
- `http://localhost:8081/locations.html`
- `http://localhost:8081/about.html`
- `http://localhost:8081/reservation-lookup.html`
- `http://localhost:8081/contact.html`
- `http://localhost:8081/app/reserve/page.html`
- `http://localhost:8081/lamborghini-rental-dubai.html`
- `http://localhost:8081/ferrari-rental-dubai.html`
- `http://localhost:8081/mercedes-rental-dubai.html`
- `http://localhost:8081/porsche-rental-dubai.html`
- `http://localhost:8081/rolls-royce-rental-dubai.html`
- `http://localhost:8081/fleet.html?type=luxury`
- `http://localhost:8081/fleet.html?type=convertible`
- `http://localhost:8081/fleet.html?type=sports`
- `http://localhost:8081/fleet.html?type=suv`

### Test Steps
- Started a local HTTP server from this audit workspace at `http://localhost:8081`.
- Desktop viewport `1440x920`: opened Home and verified header utility links for Call, Email and WhatsApp.
- Desktop viewport: clicked brand/logo, Home, Fleet, Services, Locations, About Us, Find Booking, Contact and Reserve from the header.
- Desktop viewport: opened Cars Brands mega menu and clicked Lamborghini, Ferrari, Mercedes, Porsche and Rolls-Royce.
- Desktop viewport: opened Cars Types mega menu and clicked Luxury Cars, Convertible Cars, Sports Cars and SUV Cars.
- Desktop viewport: for each Cars Types click, verified the destination was Fleet, the `type` URL param was present, the Fleet type select matched the type, and visible cards matched that type.
- Mobile viewport `393x852`: opened the mobile menu drawer and verified drawer utility links for Call, Email and WhatsApp.
- Mobile viewport: clicked drawer links Home, Fleet, Services, Locations, About Us, Find Booking, Contact and Reserve.
- Mobile viewport: opened drawer Brands disclosure and clicked Lamborghini, Ferrari, Mercedes, Porsche and Rolls-Royce.
- Mobile viewport: opened drawer Browse disclosure and clicked Luxury Cars, Convertible Cars, Sports Cars and SUV Cars.
- Mobile viewport: for each Browse/Cars Types click, verified the Fleet filter state matched the selected type.

### Findings
No functional findings found in this task.

### Passed Checks
- 68 total checks passed.
- 0 failed checks.
- 0 findings.
- No console errors were captured during the header navigation pass.
- Header top-level navigation reaches the expected route on desktop and mobile.
- Reserve reaches `/app/reserve/page.html` on desktop and mobile.
- Find Booking reaches `/reservation-lookup.html` on desktop and mobile.
- Cars Brands items open brand landing pages, not Fleet.
- Cars Types items open Fleet with the correct `type` query parameter and the visible Fleet cards are actually filtered.
- Header/drawer Call, Email and WhatsApp hrefs are present and point to the expected contact destinations.
- Every internal destination checked rendered a visible `h1`.

Evidence:
- `tests/e2e/navigation.spec.js`
- `artifacts/functional-task-audit/header-navigation-audit-results.json`
- `artifacts/functional-task-audit/header-navigation-audit.mjs`
- `artifacts/functional-task-audit/header-navigation-screenshots/desktop-header-initial.png`
- `artifacts/functional-task-audit/header-navigation-screenshots/desktop-cars-brands-open.png`
- `artifacts/functional-task-audit/header-navigation-screenshots/desktop-cars-types-open.png`
- `artifacts/functional-task-audit/header-navigation-screenshots/mobile-header-initial.png`
- `artifacts/functional-task-audit/header-navigation-screenshots/mobile-drawer-open.png`

### Notes For Implementer
No fix is required for this header task based on the tested behavior.

`tests/e2e/navigation.spec.js` has now been expanded to cover this header contract in desktop and mobile:
- every visible direct header/drawer link
- Reserve
- contact utility hrefs
- every Cars Brands card destination
- every Cars Types/Browse card destination plus real Fleet `type` filter state

Verification command:
- `PLAYWRIGHT_BASE_URL=http://localhost:8081 npx playwright test tests/e2e/navigation.spec.js --project=desktop-chromium --project=mobile-chromium`

Result:
- 2 passed
- 2 skipped as expected because each viewport-specific test skips on the other Playwright project

## Task 2026-05-09 14:46 - Fleet rental period, CRM availability and filters

### Scope
Alejandro requested a functional audit of Fleet filters with the QA focus on rental period behavior, real CRM availability, brand filters, car type filters and price filtering. The test had to prove that a car with an existing reservation is unavailable for overlapping dates and available for other dates.

Rama: `agent/functional-audit`
Carpeta: `C:\Users\aleja\Documents\GLOBALTECH\pagina-web-Santi\PGM-functional-audit`
Puerto: `8081`
URL exacta probada: `http://localhost:8081/fleet.html`
Backend/API probado: `http://localhost:3000`

### Tested Routes
- `http://localhost:8081/fleet.html`
- `http://localhost:3000/api/reserve`
- `http://localhost:3000/api/availability`

### Test Steps
- Confirmed frontend was live at `http://localhost:8081/fleet.html`.
- Confirmed backend was live at `http://localhost:3000/health`.
- Created a temporary reservation through the real backend API at `http://localhost:3000/api/reserve`.
- Seeded reservation: Mercedes G63 AMG, `2026-11-10 10:00` to `2026-11-12 18:00`.
- Called real backend availability for overlapping dates: `2026-11-11 12:00` to `2026-11-13 12:00`.
- Opened Fleet in desktop and selected the overlapping rental period.
- Verified Mercedes G63 AMG becomes unavailable, Reserve changes to `Unavailable`, `aria-disabled=true`, and reserve href is removed.
- Changed to non-overlapping dates: `2026-11-20 12:00` to `2026-11-22 12:00`.
- Verified Mercedes G63 AMG becomes available again and Reserve href includes the new rental period.
- Tested desktop brand filter Lamborghini: 2 visible cards.
- Tested desktop brand + type intersection Lamborghini + SUV: only Lamborghini Urus remains.
- Tested desktop price max AED 2,000 with SUV type: only Mercedes G63 remains.
- Tested impossible desktop combination Ferrari + SUV + max AED 2,000: empty state appears.
- Tested reset filters: all 6 cards return, brand/type reset to `all`, price range resets, rental period remains.
- Tested mobile rental date chip opens filter sheet, applies overlapping rental period, and keeps unavailable status after applying.
- Tested mobile filter sheet brand + type intersection: Lamborghini + SUV returns Lamborghini Urus.
- Cleaned up the temporary reservation JSON after the audit.

### Findings
- ID: FLEET-FILTER-001
- Severity: Medium
- Route: `http://localhost:8081/fleet.html`
- Viewport: Desktop verified; likely shared with mobile because the same Fleet date inputs/backing logic are used.
- Steps to reproduce: Open Fleet. Enter pickup `2026-11-11`, return `2026-11-13`, pickup time `12:00`, return time `12:00`. After availability resolves, change only pickup date to `2026-11-20`.
- Actual result: Fleet calls `http://localhost:3000/api/availability?startDate=2026-11-20&endDate=2026-11-13&pickupTime=12%3A00&dropoffTime=12%3A00`, backend returns 400, browser logs failed resource errors, and cards show `Availability check unavailable. The team will confirm.`
- Expected result: Fleet should not call availability with `startDate > endDate`. It should either auto-adjust return date before the request or show a clear inline validation such as `Return date must be after pickup date`.
- Evidence: `artifacts/functional-task-audit/fleet-filter-availability-screenshots/desktop-transient-invalid-date-400.png`
- Suggested owner: functional

### Passed Checks
- Real backend reservation blocks the matching car on overlapping dates.
- Same car becomes available on non-overlapping dates.
- Fleet sends exact rental period query params to backend availability.
- Unavailable car cannot be reserved from Fleet.
- Available car reserve href carries selected rental period.
- Brand filter works.
- Type filter works.
- Brand + type intersection works.
- Price max filter works.
- Impossible filter combinations show empty state.
- Reset filters restores all 6 cars and keeps the rental period.
- Mobile date chip opens rental period controls and applies the same availability state.
- Mobile filter sheet applies brand + type intersection correctly.

Evidence:
- `artifacts/functional-task-audit/fleet-filter-availability-audit-results.json`
- `artifacts/functional-task-audit/fleet-filter-availability-audit.mjs`
- `artifacts/functional-task-audit/fleet-filter-availability-screenshots/desktop-overlap-mercedes-unavailable.png`
- `artifacts/functional-task-audit/fleet-filter-availability-screenshots/desktop-empty-state-ferrari-suv-price.png`
- `artifacts/functional-task-audit/fleet-filter-availability-screenshots/mobile-overlap-date-chip-unavailable.png`
- `artifacts/functional-task-audit/fleet-filter-availability-screenshots/mobile-brand-type-filter-urus.png`
- `artifacts/functional-task-audit/fleet-filter-availability-screenshots/desktop-transient-invalid-date-400.png`

Automated regression added:
- `tests/e2e/fleet-filters-availability.spec.js`

Verification command:
- `PLAYWRIGHT_BASE_URL=http://localhost:8081 npx playwright test tests/e2e/fleet-filters-availability.spec.js --project=desktop-chromium --project=mobile-chromium`

Result:
- 2 passed
- 2 skipped as expected because each viewport-specific test skips on the other Playwright project

### Notes For Implementer
The main Fleet availability contract is working: stored reservations are read by backend availability, overlapping schedules block the correct car, and filters combine correctly.

The only functional issue found is the invalid intermediate rental period request when pickup is moved beyond the current return date. Recommended fix: when pickup date changes, either clamp return date before `refreshAvailability()` runs or block the availability call until the range is valid and show a date validation message.

Additional useful follow-up tests after the fix:
- Same-day rental with return time after pickup time should be valid.
- Same-day rental with return time equal/before pickup time should show validation and not call availability.
- Boundary check: new pickup exactly at previous reservation dropoff time should be available.
- Cancelled/failed reservations should remain non-blocking in the UI, not only in unit tests.
- Mobile version of `FLEET-FILTER-001` should be explicitly retested after the fix.
