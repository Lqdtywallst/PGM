const { test, expect } = require('@playwright/test');
const { reservationGuest } = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

async function openReserve(page) {
    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2026-07-10&endDate=2026-07-12&pickupTime=10:00&dropoffTime=18:00',
        { waitUntil: 'domcontentloaded' }
    );
    await settlePage(page);
}

async function fillGuestDetails(page, overrides = {}) {
    const guest = { ...reservationGuest, ...overrides };

    await page.locator('#fullName').fill(guest.name);
    await page.locator('#passport').fill(guest.passport);
    await page.locator('#phone').fill(guest.phone);
    await page.locator('#email').fill(guest.email);

    return guest;
}

async function goToGuestDetailsStep(page, overrides = {}) {
    const schedule = {
        pickupLocation: reservationGuest.pickupLocation,
        startDate: '2026-07-10',
        endDate: '2026-07-12',
        pickupTime: '10:00',
        dropoffTime: '18:00',
        ...overrides
    };

    await page.locator('#pickupLocation').fill(schedule.pickupLocation);
    await page.locator('#startDate').fill(schedule.startDate);
    await page.locator('#endDate').fill(schedule.endDate);
    await page.locator('#pickupTime').selectOption(schedule.pickupTime);
    await page.locator('#dropoffTime').selectOption(schedule.dropoffTime);
    await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
    await page.locator('#continueToPaymentBtn').click();
    await expect(page.locator('#step2')).toHaveClass(/active/);
}

test('reserve keeps the next CTA disabled until delivery details are complete', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await openReserve(page);
    await expect(page.locator('#pickupLocation')).toBeVisible();
    await expect(page.locator('#continueToPaymentBtn')).toBeDisabled();

    await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
    await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
    await expectNoConsoleErrors(consoleErrors, 'reserve required delivery details');
});

test('reserve blocks an empty guest-details submit', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await openReserve(page);
    await goToGuestDetailsStep(page);
    await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();

    await expect(page.locator('#step2Validation')).toContainText(
        'Please complete all required fields before continuing.'
    );
    await expectNoConsoleErrors(consoleErrors, 'reserve empty guest details');
});

test('reserve keeps the guest-details step on invalid email and phone values', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await openReserve(page);
    await goToGuestDetailsStep(page);
    await fillGuestDetails(page, {
        phone: '123',
        email: 'not-an-email'
    });

    await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();

    await expect(page.locator('#email-error')).toContainText('Please enter a valid email address.');
    await expect(page.locator('#phone-error')).toContainText('Please enter a valid phone number.');
    await expect(page.locator('#step2Validation')).toContainText(
        'Please complete all required fields before continuing.'
    );
    await expectNoConsoleErrors(consoleErrors, 'reserve guest detail field validation');
});

test('reserve rejects a return schedule that lands before delivery', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await openReserve(page);
    await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
    await page.locator('#startDate').fill('2026-07-10');
    await page.locator('#endDate').fill('2026-07-10');
    await page.locator('#pickupTime').selectOption('18:00');
    await page.locator('#dropoffTime').selectOption('10:00');

    await expect(page.locator('#step1Validation')).toContainText(
        'Return date/time must be after delivery date/time.'
    );
    await expect(page.locator('#continueToPaymentBtn')).toBeDisabled();
    await expectNoConsoleErrors(consoleErrors, 'reserve invalid delivery schedule');
});
