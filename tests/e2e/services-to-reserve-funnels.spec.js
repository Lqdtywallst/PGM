const { test, expect } = require('@playwright/test');
const { reservationGuest } = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

async function advanceReserveSchedule(page, pickupLocation = reservationGuest.pickupLocation, schedule = {}) {
    const nextSchedule = {
        startDate: '2026-12-16',
        endDate: '2026-12-18',
        pickupTime: '10:00',
        dropoffTime: '18:00',
        ...schedule
    };

    await page.locator('#startDate').fill(nextSchedule.startDate);
    await page.locator('#endDate').fill(nextSchedule.endDate);
    await page.locator('#pickupTime').selectOption(nextSchedule.pickupTime);
    await page.locator('#dropoffTime').selectOption(nextSchedule.dropoffTime);
    await page.locator('#pickupLocation').fill(pickupLocation);
    await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
    await page.locator('#continueToPaymentBtn').click();
    await expect(page.locator('#step2')).toHaveClass(/active/);
}

test.describe('Services to reserve funnels', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'desktop-chromium',
            'This funnel audit targets desktop handoffs from service pages.'
        );
    });

    test('chauffeur service hands off into a usable reservation flow', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/chauffeur-service-dubai.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.getByRole('link', { name: /Open reservation/i }).first().click();

        await expect(page).toHaveURL(/\/app\/reserve\/page\.html$/i);
        await expect(page.locator('#step1')).toHaveClass(/active/);
        await advanceReserveSchedule(page, reservationGuest.pickupLocation, {
            startDate: '2026-12-16',
            endDate: '2026-12-18',
            pickupTime: '10:00',
            dropoffTime: '18:00'
        });

        await expect(page.locator('#step2')).toContainText('Who is booking?');
        await expectNoConsoleErrors(consoleErrors, 'chauffeur service reserve handoff');
    });

    test('monthly rental service can route through fleet into a concrete vehicle reservation', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/monthly-luxury-car-rental-dubai.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.getByRole('link', { name: /View the fleet/i }).first().click();

        await expect(page).toHaveURL(/\/fleet\.html$/i);
        await page.locator('#fleet-pickup-date').fill('2026-12-18');
        await page.locator('#fleet-return-date').fill('2026-12-21');
        await page.locator('#fleet-pickup-time').fill('10:00');
        await page.locator('#fleet-return-time').fill('18:00');
        await page.locator('.js-fleet-brand-select').selectOption('rolls-royce');
        await expect(page.locator('.js-fleet-results-count')).toContainText('1 model visible');

        await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().click();

        await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
        await expect(page.locator('#selectedCar')).toContainText('Cullinan Black Badge');
        await expect(page.locator('#startDate')).toHaveValue('2026-12-18');
        await expect(page.locator('#endDate')).toHaveValue('2026-12-21');
        await expect(page.locator('#pickupTime')).toHaveValue('10:00');
        await expect(page.locator('#dropoffTime')).toHaveValue('18:00');
        await advanceReserveSchedule(page, 'Bulgari Resort Dubai', {
            startDate: '2026-12-18',
            endDate: '2026-12-21',
            pickupTime: '10:00',
            dropoffTime: '18:00'
        });

        await expectNoConsoleErrors(consoleErrors, 'monthly service fleet to reserve funnel');
    });
});
