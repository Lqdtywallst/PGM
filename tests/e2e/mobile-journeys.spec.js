const { test, expect } = require('@playwright/test');
const { reservationGuest } = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectFleetResultCount,
    expectNoConsoleErrors,
    fleetCardsForBrand,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

async function openReserve(page) {
    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2026-08-20&endDate=2026-08-22&pickupTime=10:00&dropoffTime=18:00',
        { waitUntil: 'domcontentloaded' }
    );
    await settlePage(page);
}

async function fillGuestDetails(page) {
    await page.locator('#fullName').fill(reservationGuest.name);
    await page.locator('#passport').fill(reservationGuest.passport);
    await page.locator('#phone').fill(reservationGuest.phone);
    await page.locator('#email').fill(reservationGuest.email);
}

async function goToGuestDetailsStep(page) {
    await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
    await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
    await page.locator('#continueToPaymentBtn').click();
    await expect(page.locator('#step2')).toHaveClass(/active/);
}

async function expectReservationPrefill(page, expected) {
    await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
    await expect(page.locator('#selectedCar')).toContainText(expected.car);
    await expect(page.locator('#startDate')).toHaveValue(expected.startDate);
    await expect(page.locator('#endDate')).toHaveValue(expected.endDate);
    await expect(page.locator('#pickupTime')).toHaveValue(expected.pickupTime);
    await expect(page.locator('#dropoffTime')).toHaveValue(expected.dropoffTime);
}

test.describe('Mobile customer journeys', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-only functional coverage.');
    });

    test('home overlay passes schedule into fleet on mobile', async ({ page }) => {
        await primeHomeAnimations(page);
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#home-pickup-date').fill('2026-09-03');
        await page.locator('#home-return-date').fill('2026-09-05');
        await page.locator('#home-pickup-time').selectOption('12:00');
        await page.locator('#home-return-time').selectOption('13:00');
        await page.getByRole('button', { name: /See available cars/i }).click();

        await expect(page).toHaveURL(/\/fleet\.html\?/i);
        await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-09-03');
        await expect(page.locator('#fleet-return-date')).toHaveValue('2026-09-05');
        await expect(page.locator('#fleet-pickup-time')).toHaveValue('12:00');
        await expect(page.locator('#fleet-return-time')).toHaveValue('13:00');

        await expectNoConsoleErrors(consoleErrors, 'mobile home overlay to fleet');
    });

    test('fleet reserve handoff keeps the schedule on mobile', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#fleet-pickup-date').fill('2026-09-10');
        await page.locator('#fleet-return-date').fill('2026-09-12');
        await page.locator('#fleet-pickup-time').fill('10:00');
        await page.locator('#fleet-return-time').fill('18:00');
        await page.locator('.js-fleet-brand-select').selectOption('mercedes');
        await expectFleetResultCount(page, fleetCardsForBrand('mercedes').length);

        const mercedesReserve = page.locator('.js-fleet-card:not([hidden])[data-id="mercedes-g63-amg"] .fleet-card__reserve');
        await expect(mercedesReserve).toBeVisible();
        await mercedesReserve.click();

        await expectReservationPrefill(page, {
            car: 'G63 AMG',
            startDate: '2026-09-10',
            endDate: '2026-09-12',
            pickupTime: '10:00',
            dropoffTime: '18:00'
        });

        await expectNoConsoleErrors(consoleErrors, 'mobile fleet reserve handoff');
    });

    test('reserve exposes the delivery field and reaches payment on mobile', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await openReserve(page);
        await expect(page.locator('#pickupLocation')).toBeVisible();
        await goToGuestDetailsStep(page);
        await fillGuestDetails(page);
        await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();

        await expect(page.locator('#step3')).toHaveClass(/active/);
        await expect(page.locator('#payButton')).toBeVisible();
        await expectNoConsoleErrors(consoleErrors, 'mobile reserve progression');
    });
});
