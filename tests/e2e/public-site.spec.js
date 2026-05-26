const { test, expect } = require('@playwright/test');
const axeSource = require.resolve('axe-core/axe.min.js');
const fleetCards = require('../../server/data/fleet-cards.json');

const sportsFleetCount = fleetCards.filter((card) => (
    Array.isArray(card.types) && card.types.includes('sports')
)).length;

const criticalPages = [
    { path: '/', name: 'home', expectsVisibleH1: true },
    { path: '/fleet.html', name: 'fleet', expectsVisibleH1: true },
    { path: '/locations.html', name: 'locations', expectsVisibleH1: true },
    { path: '/services.html', name: 'services', expectsVisibleH1: true },
    { path: '/luxury-car-rental-dubai.html', name: 'dubai-guide', expectsVisibleH1: true },
    { path: '/supercar-rental-dubai.html', name: 'seo-landing', expectsVisibleH1: true },
    { path: '/chauffeur-service-dubai.html', name: 'service-detail', expectsVisibleH1: true },
    { path: '/ferrari-296-gts-rental-dubai.html', name: 'vehicle-pdp', expectsVisibleH1: true },
    { path: '/mercedes-g63-amg-rental-dubai.html', name: 'vehicle-pdp-g63', expectsVisibleH1: true },
    { path: '/porsche-rental-dubai.html', name: 'vehicle-alias-porsche', expectsVisibleH1: true },
    { path: '/mercedes-rental-dubai.html', name: 'brand-page-mercedes', expectsVisibleH1: true },
    { path: '/contact.html', name: 'contact', expectsVisibleH1: true },
    { path: '/app/reserve/page.html', name: 'reserve', expectsVisibleH1: true, expectsModernShell: true }
];

function createConsoleTracker(page) {
    const errors = [];
    page.on('console', (message) => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });
    page.on('pageerror', (error) => {
        errors.push(error.message);
    });
    return errors;
}

function normalizeConsoleErrors(errors) {
    return errors.filter((entry) => entry && !/favicon\.ico/i.test(entry));
}

async function expectModernShell(page, pathname) {
    await expect(page.locator('body')).toHaveClass(/reserve-page|home-page|services-page|contact-page/);
    await expect(page.locator('.lab-header')).toHaveCount(1);
    await expect(page.locator('.site-v2-footer')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
}

async function expectNoConsoleErrors(errors, label) {
    await expect(normalizeConsoleErrors(errors), `${label} should render without console errors`).toEqual([]);
}

function formatDateInput(date) {
    return date.toISOString().slice(0, 10);
}

function futureDateInput(offsetDays) {
    const date = new Date();
    date.setUTCHours(12, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return formatDateInput(date);
}

async function mockFleetAvailability(page, overrides = {}) {
    await page.route('**/api/availability?**', async (route) => {
        const requestUrl = new URL(route.request().url());

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'ok',
                schedule: {
                    startDate: requestUrl.searchParams.get('startDate'),
                    endDate: requestUrl.searchParams.get('endDate'),
                    pickupTime: requestUrl.searchParams.get('pickupTime'),
                    dropoffTime: requestUrl.searchParams.get('dropoffTime')
                },
                vehicles: fleetCards.map((card) => ({
                    id: card.id,
                    brand: card.brand,
                    title: card.copy.title,
                    available: true,
                    ...overrides[card.id]
                }))
            })
        });
    });
}

async function fillVehicleAvailabilityWindow(page, bookingWindow) {
    await page.locator('input[name="startDate"]').fill(bookingWindow.startDate);
    await page.locator('input[name="endDate"]').fill(bookingWindow.endDate);
    await page.locator('input[name="pickupTime"]').fill(bookingWindow.pickupTime);
    await page.locator('input[name="dropoffTime"]').fill(bookingWindow.dropoffTime);
}

async function captureAuditScreenshot(page, testInfo, name) {
    const screenshotPath = testInfo.outputPath(`${name}.png`);

    try {
        await page.screenshot({
            path: screenshotPath,
            fullPage: true,
            animations: 'disabled',
            caret: 'hide'
        });
    } catch (error) {
        if (!/captureScreenshot|Unable to capture screenshot/i.test(String(error && error.message))) {
            throw error;
        }

        await testInfo.attach(`${name}-screenshot-fallback.txt`, {
            body: Buffer.from(`Full-page screenshot failed, falling back to viewport capture.\n${error.message}`),
            contentType: 'text/plain'
        });

        await page.screenshot({
            path: screenshotPath,
            fullPage: false,
            animations: 'disabled',
            caret: 'hide'
        });
    }
}

test.describe('Public site quality gate', () => {
    for (const pageEntry of criticalPages) {
        test(`${pageEntry.name} renders cleanly`, async ({ page }, testInfo) => {
            const consoleErrors = createConsoleTracker(page);

            if (pageEntry.path === '/fleet.html') {
                await mockFleetAvailability(page);
            }

            await page.goto(pageEntry.path, { waitUntil: 'domcontentloaded' });
            if (pageEntry.expectsVisibleH1) {
                await expect(page.locator('h1')).toHaveCount(1);
                await expect(page.locator('h1')).toBeVisible();
            } else {
                expect(await page.locator('h1').count()).toBeLessThanOrEqual(1);
            }

            if (pageEntry.expectsModernShell) {
                await expectModernShell(page, pageEntry.path);
            }

            await captureAuditScreenshot(page, testInfo, pageEntry.name);

            await expectNoConsoleErrors(consoleErrors, pageEntry.path);
        });
    }

    test('desktop navigation exposes mega menu and booking surfaces', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only navigation audit');

        const consoleErrors = createConsoleTracker(page);
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await expect(page.locator('#home-booking')).toBeVisible();
        await expect(page.locator('#home-pickup-date')).toBeVisible();
        await expect(page.locator('#home-return-date')).toBeVisible();

        await page.getByRole('button', { name: /Cars?\s+Brands/i }).click();
        await expect(page.getByRole('link', { name: /Lamborghini/i }).first()).toBeVisible();

        await expect(page.getByRole('button', { name: /See available cars/i })).toBeVisible();

        await expectNoConsoleErrors(consoleErrors, 'home desktop interactions');
    });

    test('home desktop hydrates hero video', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only hero video audit');

        const consoleErrors = createConsoleTracker(page);
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await page.waitForFunction(() => {
            const video = document.querySelector('.js-hero-lab-video');
            return Boolean(
                video instanceof HTMLVideoElement
                    && video.getAttribute('src')
                    && (video.readyState > 0 || video.currentTime > 0)
            );
        });

        const heroVideoState = await page.evaluate(() => {
            const video = document.querySelector('.js-hero-lab-video');
            return {
                poster: video?.getAttribute('poster') || '',
                sourceSrc: video?.getAttribute('src') || '',
                currentSrc: video?.currentSrc || '',
                readyState: video?.readyState ?? -1,
                currentTime: video?.currentTime ?? -1
            };
        });

        expect(heroVideoState.poster).toBe('');
        expect(heroVideoState.sourceSrc).toContain('home-hero-city-streets.mp4');
        expect(heroVideoState.currentSrc).toContain('home-hero-city-streets.mp4');
        expect(heroVideoState.readyState > 0 || heroVideoState.currentTime > 0).toBeTruthy();

        await expectNoConsoleErrors(consoleErrors, 'home desktop hero video');
    });

    test('locations and contact expose primary actions', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/locations.html', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('link', { name: /Start reservation/i }).first()).toBeVisible();
        expect(await page.locator('a[href^="tel:"]').count()).toBeGreaterThan(0);
        expect(await page.locator('a[href*="wa.me/"]').count()).toBeGreaterThan(0);

        await page.goto('/contact.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#contactForm')).toBeVisible();
        await expect(page.locator('#contactName')).toBeVisible();
        await expect(page.locator('#contactEmail')).toBeVisible();

        await expectNoConsoleErrors(consoleErrors, 'locations/contact actions');
    });

    test('reserve page applies query prefills', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);
        const startDate = futureDateInput(21);
        const endDate = futureDateInput(23);
        await page.goto(`/app/reserve/page.html?car=Ferrari%20296%20GTS&price=3400&startDate=${startDate}&endDate=${endDate}&pickupTime=10:00&dropoffTime=18:00`, {
            waitUntil: 'domcontentloaded'
        });

        await expectModernShell(page, '/app/reserve/page.html');
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('h1')).toContainText(/booking|reservation/i);
        await expect(page.locator('#selectedCar')).toHaveText('Ferrari 296 GTS');
        await expect(page.locator('#selectedCarRate')).toContainText('3,400');
        await expect(page.locator('#startDate')).toHaveValue(startDate);
        await expect(page.locator('#endDate')).toHaveValue(endDate);
        await expect(page.locator('#pickupTime')).toHaveValue('10:00');
        await expect(page.locator('#dropoffTime')).toHaveValue('18:00');

        await expectNoConsoleErrors(consoleErrors, 'reserve prefills');
    });

    test('home date search applies CRM availability before reserve CTAs', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);
        const availabilityRequests = [];

        await page.route('**/api/availability?**', async (route) => {
            const requestUrl = new URL(route.request().url());
            availabilityRequests.push(requestUrl);

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    status: 'ok',
                    schedule: {
                        startDate: requestUrl.searchParams.get('startDate'),
                        endDate: requestUrl.searchParams.get('endDate'),
                        pickupTime: requestUrl.searchParams.get('pickupTime'),
                        dropoffTime: requestUrl.searchParams.get('dropoffTime')
                    },
                    vehicles: [
                        { id: 'lamborghini-huracan-evo-spyder', available: true },
                        { id: 'ferrari-296-gts', available: true },
                        { id: 'porsche-992-gt3', available: true },
                        { id: 'lamborghini-urus-sport', available: true },
                        { id: 'mercedes-g63-amg', available: false },
                        { id: 'rolls-royce-cullinan-black-badge', available: true }
                    ]
                })
            });
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.locator('#home-pickup-date').fill('2026-11-10');
        await page.locator('#home-return-date').fill('2026-11-12');
        await page.locator('#home-pickup-time').selectOption('10:00');
        await page.locator('#home-return-time').selectOption('18:00');
        await page.getByRole('button', { name: /See available cars/i }).click();

        await expect(page).toHaveURL(/\/fleet\.html\?/i);
        await expect.poll(() => availabilityRequests.length).toBeGreaterThan(0);
        expect(availabilityRequests[0].searchParams.get('startDate')).toBe('2026-11-10');
        expect(availabilityRequests[0].searchParams.get('endDate')).toBe('2026-11-12');
        expect(availabilityRequests[0].searchParams.get('pickupTime')).toBe('10:00');
        expect(availabilityRequests[0].searchParams.get('dropoffTime')).toBe('18:00');

        const unavailableCard = page.locator('.js-fleet-card[data-id="mercedes-g63-amg"]');
        await expect(unavailableCard.locator('.fleet-card__availability')).toHaveText('Unavailable for these dates');
        await expect(unavailableCard.locator('.fleet-card__reserve')).toHaveText('Unavailable');
        await expect(unavailableCard.locator('.fleet-card__reserve')).toHaveAttribute('aria-disabled', 'true');
        await expect(unavailableCard.locator('.fleet-card__reserve')).not.toHaveAttribute('href', /reserve/i);

        const availableCard = page.locator('.js-fleet-card[data-id="ferrari-296-gts"]');
        await expect(availableCard.locator('.fleet-card__availability')).toHaveText('Available for these dates');
        await expect(availableCard.locator('.fleet-card__reserve')).toHaveAttribute('href', /startDate=2026-11-10/i);

        await expectNoConsoleErrors(consoleErrors, 'home availability handoff');
    });

    test('home category cards open fleet with the chosen type filter and rental schedule', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);
        await mockFleetAvailability(page);

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.locator('#home-pickup-date').fill('2026-11-14');
        await page.locator('#home-return-date').fill('2026-11-17');
        await page.locator('#home-pickup-time').selectOption('11:00');
        await page.locator('#home-return-time').selectOption('19:00');
        await expect(page.locator('.fleet-category--electric')).toHaveCount(0);
        await expect(page.locator('.fleet-category[data-home-fleet-filter-key="type"]')).toHaveCount(4);
        await page.locator('.fleet-category--sports').click();

        await expect(page).toHaveURL(/\/fleet\.html\?/i);
        await expect(page).toHaveURL(/type=sports/i);
        await expect(page).toHaveURL(/startDate=2026-11-14/i);
        await expect(page).toHaveURL(/endDate=2026-11-17/i);
        await expect(page).toHaveURL(/pickupTime=11%3A00/i);
        await expect(page).toHaveURL(/dropoffTime=19%3A00/i);
        await expect(page.locator('.js-fleet-results-count')).toContainText(`${sportsFleetCount} models visible`);

        const visibleCards = page.locator('.js-fleet-card:not([hidden])');
        await expect(visibleCards).toHaveCount(sportsFleetCount);
        expect(await visibleCards.evaluateAll((cards) => cards.every((card) => (
            String(card.dataset.type || '').split(/\s+/).includes('sports')
        )))).toBe(true);

        await expect(visibleCards.first().locator('.fleet-card__reserve')).toHaveAttribute('href', /startDate=2026-11-14/i);
        await expectNoConsoleErrors(consoleErrors, 'home category fleet filter handoff');
    });

    test('home featured car cards open the exact vehicle landing', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.locator('#home-pickup-date').fill('2026-11-20');
        await page.locator('#home-return-date').fill('2026-11-22');
        await page.locator('#home-pickup-time').selectOption('10:00');
        await page.locator('#home-return-time').selectOption('18:00');
        await page.getByRole('link', { name: /View Ferrari 296 GTS/i }).click();

        await expect(page).toHaveURL(/\/ferrari-296-gts-rental-dubai\.html$/i);
        await expect(page.locator('h1')).toContainText(/296 GTS/i);
        await expect(page.locator('#vehicle-booking')).toBeVisible();
        await expect(page.locator('#vehicle-booking input[name="car"]')).toHaveValue('Ferrari 296 GTS');

        await expectNoConsoleErrors(consoleErrors, 'home featured vehicle landing handoff');
    });

    test('vehicle availability blocks unavailable cars before reserve', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);
        await mockFleetAvailability(page, {
            'ferrari-296-gts': { available: false }
        });

        await page.goto('/ferrari-296-gts-rental-dubai.html', { waitUntil: 'domcontentloaded' });
        await fillVehicleAvailabilityWindow(page, {
            startDate: '2026-11-20',
            endDate: '2026-11-22',
            pickupTime: '10:00',
            dropoffTime: '18:00'
        });

        await page.locator('#vehicle-booking').getByRole('button', { name: /Check availability/i }).click();

        await expect(page.locator('.vehicle-availability-toast')).toContainText('Not available for those dates');
        await expect(page).toHaveURL(/\/ferrari-296-gts-rental-dubai\.html$/i);
        await expectNoConsoleErrors(consoleErrors, 'vehicle unavailable availability guard');
    });

    test('vehicle availability confirms available cars before reserve handoff', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);
        await mockFleetAvailability(page, {
            'ferrari-296-gts': { available: true }
        });

        await page.goto('/ferrari-296-gts-rental-dubai.html', { waitUntil: 'domcontentloaded' });
        await fillVehicleAvailabilityWindow(page, {
            startDate: '2026-11-20',
            endDate: '2026-11-22',
            pickupTime: '10:00',
            dropoffTime: '18:00'
        });

        await page.locator('#vehicle-booking').getByRole('button', { name: /Check availability/i }).click();

        await expect(page.locator('.vehicle-availability-toast')).toContainText('Available for your selected window');
        await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
        await expect(page.locator('#selectedCar')).toHaveText('Ferrari 296 GTS');
        await expect(page.locator('#startDate')).toHaveValue('2026-11-20');
        await expectNoConsoleErrors(consoleErrors, 'vehicle available availability handoff');
    });

    test('critical pages pass a focused accessibility scan', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Run focused accessibility scan once on desktop');

        for (const pathname of ['/', '/contact.html', '/app/reserve/page.html', '/mercedes-g63-amg-rental-dubai.html', '/mercedes-rental-dubai.html']) {
            await page.goto(pathname, { waitUntil: 'domcontentloaded' });
            await page.addScriptTag({ path: axeSource });

            const results = await page.evaluate(async () => {
                return await window.axe.run(document, {
                    runOnly: {
                        type: 'tag',
                        values: ['wcag2a', 'wcag2aa']
                    },
                    rules: {
                        'color-contrast': { enabled: false }
                    }
                });
            });

            const blockingViolations = results.violations.filter((violation) => (
                violation.impact === 'serious' || violation.impact === 'critical'
            ));

            expect(
                blockingViolations,
                `${pathname} should have no serious or critical axe violations`
            ).toEqual([]);
        }
    });
});
