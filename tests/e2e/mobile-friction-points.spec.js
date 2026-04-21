const { test, expect } = require('@playwright/test');
const { reservationGuest } = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

test.describe('Mobile friction points', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'mobile-chromium',
            'This audit targets mobile friction points.'
        );
    });

    test('mobile filter sheet can narrow the fleet and still hand the correct schedule into reserve', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#fleet-pickup-date').fill('2026-12-20');
        await page.locator('#fleet-return-date').fill('2026-12-22');
        await page.locator('#fleet-pickup-time').fill('12:00');
        await page.locator('#fleet-return-time').fill('13:00');

        await page.locator('.fleet-mobile-filter-toggle').click();
        await page.locator('.js-fleet-brand-select').selectOption('lamborghini');
        await expect(page.locator('.js-fleet-results-count')).toContainText('2 models visible');
        await page.locator('.fleet-filter-close').click();

        await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().click();

        await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
        await expect(page.locator('#selectedCar')).toContainText('Huracan EVO Spyder');
        await expect(page.locator('#startDate')).toHaveValue('2026-12-20');
        await expect(page.locator('#endDate')).toHaveValue('2026-12-22');
        await expect(page.locator('#pickupTime')).toHaveValue('12:00');
        await expect(page.locator('#dropoffTime')).toHaveValue('13:00');
        await expectNoConsoleErrors(consoleErrors, 'mobile fleet filter sheet handoff');
    });

    test('mobile reserve preserves guest progress after reload in step two and still reaches payment', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto(
            '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-12-30&endDate=2027-01-02&pickupTime=10:00&dropoffTime=18:00',
            { waitUntil: 'domcontentloaded' }
        );
        await settlePage(page);

        await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
        await page.locator('#continueToPaymentBtn').click();
        await expect(page.locator('#step2')).toHaveClass(/active/);

        await page.locator('#fullName').fill(reservationGuest.name);
        await page.locator('#passport').fill(reservationGuest.passport);
        await page.locator('#phone').fill(reservationGuest.phone);
        await page.locator('#email').fill(reservationGuest.email);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await expect(page.locator('#step2')).toHaveClass(/active/);
        await expect(page.locator('#fullName')).toHaveValue(reservationGuest.name);
        await expect(page.locator('#passport')).toHaveValue(reservationGuest.passport);
        await expect(page.locator('#phone')).toHaveValue(reservationGuest.phone);
        await expect(page.locator('#email')).toHaveValue(reservationGuest.email);

        await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();
        await expect(page.locator('#step3')).toHaveClass(/active/);
        await expect(page.locator('#payButton')).toBeVisible();
        await expectNoConsoleErrors(consoleErrors, 'mobile reserve reload recovery');
    });
});
