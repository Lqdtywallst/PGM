const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

const serviceViewports = [
    { name: 'mobile-modern', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    { name: 'tablet-portrait', width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    { name: 'desktop-wide', width: 1366, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }
];

const serviceDetails = [
    '/airport-concierge-dubai.html',
    '/chauffeur-service-dubai.html',
    '/hotel-villa-airport-delivery-dubai.html',
    '/wedding-event-car-rental-dubai.html',
    '/business-car-rental-dubai.html',
    '/monthly-luxury-car-rental-dubai.html'
];

function buildContextOptions(viewport) {
    return {
        viewport: {
            width: viewport.width,
            height: viewport.height
        },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        deviceScaleFactor: viewport.deviceScaleFactor,
        reducedMotion: 'reduce'
    };
}

test.describe('Services hub deep links', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'desktop-chromium',
            'This matrix manages its own viewport contexts.'
        );
    });

    test('services preview panel updates on desktop hover before navigation', async ({ browser }) => {
        const context = await browser.newContext(buildContextOptions(serviceViewports[2]));
        const page = await context.newPage();

        try {
            await page.goto('/services.html', { waitUntil: 'domcontentloaded' });
            await settlePage(page);

            await expect(page.locator('h1[data-service-title]')).toContainText('Airport concierge');
            await page.locator('#services-lane-tab-chauffeur').hover();
            await expect(page.locator('h1[data-service-title]')).toContainText('VIP chauffeur');
            await expect(page.locator('[data-service-primary]')).toHaveAttribute('href', './chauffeur-service-dubai.html');
        } finally {
            await context.close();
        }
    });

    for (const viewport of serviceViewports) {
        for (const detailPath of serviceDetails) {
            const hrefSuffix = detailPath.replace(/^\//, '');
            const detailName = hrefSuffix.replace(/\.html$/, '');

            test(`services opens ${detailName} in ${viewport.name}`, async ({ browser }) => {
                const context = await browser.newContext(buildContextOptions(viewport));
                const page = await context.newPage();
                const consoleErrors = createConsoleTracker(page);

                try {
                    await page.goto('/services.html', { waitUntil: 'domcontentloaded' });
                    await settlePage(page);

                    const link = page.locator(`a[href$="${hrefSuffix}"]:visible`).first();
                    await expect(link).toBeVisible();
                    await link.click();

                    await expect(page).toHaveURL(new RegExp(`${detailPath.replace('.', '\\.')}$`, 'i'));
                    await expect(page.locator('h1')).toBeVisible();
                    await expectNoConsoleErrors(consoleErrors, `services deep link ${detailName} ${viewport.name}`);
                } finally {
                    await context.close();
                }
            });
        }
    }
});
