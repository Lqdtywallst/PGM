const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectFleetResultCount,
    expectNoConsoleErrors,
    fleetCardsForBrand,
    mockFleetAvailability,
    settlePage
} = require('./support/site-helpers');

test.describe('Switch car mid-flow', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'desktop-chromium',
            'This funnel mutation audit targets desktop.'
        );
    });

    test('guest can switch from mercedes to lamborghini without carrying stale car or pricing state', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);
        await mockFleetAvailability(page);

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#fleet-pickup-date').fill('2026-12-22');
        await page.locator('#fleet-return-date').fill('2026-12-24');
        await page.locator('#fleet-pickup-time').fill('10:00');
        await page.locator('#fleet-return-time').fill('18:00');

        await page.locator('.js-fleet-brand-select').selectOption('mercedes');
        await expectFleetResultCount(page, fleetCardsForBrand('mercedes').length);
        const mercedesReserve = page.locator('.js-fleet-card:not([hidden])[data-id="mercedes-g63-amg"] .fleet-card__reserve');
        await expect(mercedesReserve).toBeVisible();
        await mercedesReserve.click();

        await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
        await expect(page.locator('#selectedCar')).toContainText('G63 AMG');
        await expect(page.locator('#summaryPricePerDay')).toContainText('1,990');

        await page.goBack({ waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-12-22');
        await expect(page.locator('#fleet-return-date')).toHaveValue('2026-12-24');
        await expect(page.locator('#fleet-pickup-time')).toHaveValue('10:00');
        await expect(page.locator('#fleet-return-time')).toHaveValue('18:00');

        await page.locator('.js-fleet-brand-select').selectOption('lamborghini');
        await expectFleetResultCount(page, fleetCardsForBrand('lamborghini').length);
        const lamborghiniReserve = page.locator('.js-fleet-card:not([hidden])[data-id="lamborghini-huracan-evo-spyder"] .fleet-card__reserve');
        await expect(lamborghiniReserve).toBeVisible();
        await lamborghiniReserve.click();

        await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
        await expect(page.locator('#selectedCar')).toContainText('Huracan EVO Spyder');
        await expect(page.locator('#summaryPricePerDay')).toContainText('3,200');
        await expect(page.locator('#startDate')).toHaveValue('2026-12-22');
        await expect(page.locator('#endDate')).toHaveValue('2026-12-24');
        await expect(page.locator('#pickupTime')).toHaveValue('10:00');
        await expect(page.locator('#dropoffTime')).toHaveValue('18:00');
        await expectNoConsoleErrors(consoleErrors, 'switch car mid-flow');
    });
});
