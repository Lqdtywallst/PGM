const { test, expect } = require('@playwright/test');
const { reservationGuest } = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

test('reserve keeps schedule and pickup location after reload', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-09-14&endDate=2026-09-16&pickupTime=11:00&dropoffTime=17:00',
        { waitUntil: 'domcontentloaded' }
    );
    await settlePage(page);

    await page.locator('#pickupLocation').fill('Atlantis The Royal, Palm Jumeirah');
    await page.locator('#pickupTime').selectOption('12:00');
    await page.locator('#dropoffTime').selectOption('18:00');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await settlePage(page);

    await expect(page.locator('#startDate')).toHaveValue('2026-09-14');
    await expect(page.locator('#endDate')).toHaveValue('2026-09-16');
    await expect(page.locator('#pickupTime')).toHaveValue('12:00');
    await expect(page.locator('#dropoffTime')).toHaveValue('18:00');
    await expect(page.locator('#pickupLocation')).toHaveValue('Atlantis The Royal, Palm Jumeirah');
    await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();

    await expectNoConsoleErrors(consoleErrors, 'reserve reload persistence');
});

test('reserve keeps guest details and current step after reload mid-checkout', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-09-14&endDate=2026-09-16&pickupTime=11:00&dropoffTime=17:00',
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
    await expect(page.locator('#pickupLocation')).toHaveValue(reservationGuest.pickupLocation);
    await expect(page.locator('#fullName')).toHaveValue(reservationGuest.name);
    await expect(page.locator('#passport')).toHaveValue(reservationGuest.passport);
    await expect(page.locator('#phone')).toHaveValue(reservationGuest.phone);
    await expect(page.locator('#email')).toHaveValue(reservationGuest.email);

    await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();
    await expect(page.locator('#step3')).toHaveClass(/active/);
    await expectNoConsoleErrors(consoleErrors, 'reserve reload guest progress persistence');
});
