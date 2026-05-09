const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

const topLevelRoutes = [
    { label: 'Fleet', expectedPath: /\/fleet\.html$/i },
    { label: 'Services', expectedPath: /\/services\.html$/i },
    { label: 'Locations', expectedPath: /\/locations\.html$/i },
    { label: 'About Us', expectedPath: /\/about\.html$/i }
];

test('desktop top-level navigation routes open cleanly', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop header audit only');
    test.slow();

    await primeHomeAnimations(page);
    const consoleErrors = createConsoleTracker(page);

    for (const route of topLevelRoutes) {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.getByRole('link', { name: route.label }).first().click();
        await expect(page).toHaveURL(route.expectedPath);
        await expect(page.locator('h1')).toBeVisible();
    }

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settlePage(page);
    await page.getByRole('button', { name: 'Cars Brands' }).click();
    await expect(page.getByRole('link', { name: /Lamborghini/i }).first()).toBeVisible();

    await expectNoConsoleErrors(consoleErrors, 'desktop navigation');
});
