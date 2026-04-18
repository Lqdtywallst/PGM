const { test, expect } = require('@playwright/test');
const axeSource = require.resolve('axe-core/axe.min.js');

const criticalPages = [
    { path: '/', name: 'home', expectsVisibleH1: true },
    { path: '/fleet.html', name: 'fleet', expectsVisibleH1: true },
    { path: '/locations.html', name: 'locations', expectsVisibleH1: true },
    { path: '/services.html', name: 'services', expectsVisibleH1: true },
    { path: '/luxury-car-rental-dubai.html', name: 'dubai-guide', expectsVisibleH1: true },
    { path: '/supercar-rental-dubai.html', name: 'seo-landing', expectsVisibleH1: true },
    { path: '/downtown-dubai-supercar-rental.html', name: 'seo-landing-downtown', expectsVisibleH1: true },
    { path: '/lamborghini-rental-palm-jumeirah.html', name: 'seo-landing-palm', expectsVisibleH1: true },
    { path: '/g63-rental-dubai-marina.html', name: 'seo-landing-marina', expectsVisibleH1: true },
    { path: '/chauffeur-service-dubai.html', name: 'service-detail', expectsVisibleH1: true },
    { path: '/ferrari-296-gts-rental-dubai.html', name: 'vehicle-pdp', expectsVisibleH1: true },
    { path: '/g63-rental-dubai.html', name: 'vehicle-alias-g63', expectsVisibleH1: true },
    { path: '/porsche-rental-dubai.html', name: 'vehicle-alias-porsche', expectsVisibleH1: true },
    { path: '/mercedes-rental-dubai.html', name: 'brand-page-mercedes', expectsVisibleH1: true },
    { path: '/contact.html', name: 'contact', expectsVisibleH1: true },
    { path: '/app/reserve/page.html', name: 'reserve', expectsVisibleH1: false }
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

async function expectNoConsoleErrors(errors, label) {
    await expect(normalizeConsoleErrors(errors), `${label} should render without console errors`).toEqual([]);
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

            await page.goto(pageEntry.path, { waitUntil: 'domcontentloaded' });
            if (pageEntry.expectsVisibleH1) {
                await expect(page.locator('h1')).toHaveCount(1);
                await expect(page.locator('h1')).toBeVisible();
            } else {
                expect(await page.locator('h1').count()).toBeLessThanOrEqual(1);
            }

            await captureAuditScreenshot(page, testInfo, pageEntry.name);

            await expectNoConsoleErrors(consoleErrors, pageEntry.path);
        });
    }

    test('desktop navigation exposes mega menu and booking overlay', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only navigation audit');

        const consoleErrors = createConsoleTracker(page);
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        await page.getByRole('button', { name: 'Cars Brands' }).click();
        await expect(page.getByRole('link', { name: /Lamborghini/i }).first()).toBeVisible();

        await page.getByRole('button', { name: 'Start with dates' }).click();
        await expect(page.locator('#hero-lab-overlay')).toHaveAttribute('aria-hidden', 'false');
        await expect(page.locator('#hero-lab-pickup-date')).toBeVisible();

        await expectNoConsoleErrors(consoleErrors, 'home desktop interactions');
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
        await page.goto('/app/reserve/page.html?car=Ferrari%20296%20GTS&price=3400&startDate=2026-04-20&endDate=2026-04-22&pickupTime=10:00&dropoffTime=18:00', {
            waitUntil: 'domcontentloaded'
        });

        await expect(page.locator('#selectedCar')).toHaveText('Ferrari 296 GTS');
        await expect(page.locator('#selectedCarRate')).toContainText('3,400');
        await expect(page.locator('#startDate')).toHaveValue('2026-04-20');
        await expect(page.locator('#endDate')).toHaveValue('2026-04-22');
        await expect(page.locator('#pickupTime')).toHaveValue('10:00');
        await expect(page.locator('#dropoffTime')).toHaveValue('18:00');

        await expectNoConsoleErrors(consoleErrors, 'reserve prefills');
    });

    test('critical pages pass a focused accessibility scan', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Run focused accessibility scan once on desktop');

        for (const pathname of ['/', '/contact.html', '/app/reserve/page.html', '/g63-rental-dubai-marina.html', '/mercedes-rental-dubai.html']) {
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
