const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');
const { getViewportCoverageMatrix } = require('../../server/design-system/design-system-contract');

const serviceViewports = ['mobile-modern', 'tablet-portrait', 'laptop']
    .map((name) => getViewportCoverageMatrix('functional').find((viewport) => viewport.name === name))
    .filter(Boolean);

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

    test('primary service circles navigate directly without a preview panel', async ({ browser }) => {
        const context = await browser.newContext(buildContextOptions(serviceViewports[2]));
        const page = await context.newPage();

        try {
            await page.goto('/services.html', { waitUntil: 'domcontentloaded' });
            await settlePage(page);

            await expect(page.locator('[data-service-panel]')).toHaveCount(0);
            await expect(page.locator('h1')).toContainText('Choose the service around the stay');

            const chauffeurCircle = page.locator('#services-lane-tab-chauffeur');
            await expect(chauffeurCircle).toHaveAttribute('href', './chauffeur-service-dubai.html');
            await chauffeurCircle.click();
            await expect(page).toHaveURL(/\/chauffeur-service-dubai\.html$/i);
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
