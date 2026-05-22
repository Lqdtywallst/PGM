const { test, expect } = require('@playwright/test');
const { reservationGuest } = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

async function installStripeMock(page) {
    await page.addInitScript(() => {
        window.Stripe = function StripeMock() {
            return {
                elements() {
                    return {
                        create() {
                            return {
                                mount(selector) {
                                    const container = document.querySelector(selector);
                                    if (container) {
                                        container.setAttribute('data-mock-stripe', 'mounted');
                                    }
                                },
                                on() {}
                            };
                        }
                    };
                },
                async confirmCardPayment() {
                    return {
                        error: null,
                        paymentIntent: {
                            id: 'pi_mock_persistence',
                            status: 'succeeded',
                            amount: 199000
                        }
                    };
                }
            };
        };
    });
}

test('reserve keeps URL schedule but clears typed delivery details after reload', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2026-09-14&endDate=2026-09-16&pickupTime=11:00&dropoffTime=17:00',
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
    await expect(page.locator('#pickupTime')).toHaveValue('11:00');
    await expect(page.locator('#dropoffTime')).toHaveValue('17:00');
    await expect(page.locator('#pickupLocation')).toHaveValue('');
    await expect(page.locator('#continueToPaymentBtn')).toBeDisabled();

    await expectNoConsoleErrors(consoleErrors, 'reserve reload privacy reset');
});

test('reserve clears guest details and returns to the schedule step after reload mid-checkout', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2026-09-14&endDate=2026-09-16&pickupTime=11:00&dropoffTime=17:00',
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

    await expect(page.locator('#step1')).toHaveClass(/active/);
    await expect(page.locator('#pickupLocation')).toHaveValue('');
    await expect(page.locator('#fullName')).toHaveValue('');
    await expect(page.locator('#passport')).toHaveValue('');
    await expect(page.locator('#phone')).toHaveValue('');
    await expect(page.locator('#email')).toHaveValue('');
    await expect(page.locator('#continueToPaymentBtn')).toBeDisabled();

    await expectNoConsoleErrors(consoleErrors, 'reserve reload guest privacy reset');
});

test('reserve browser back moves between steps without losing in-page details', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);
    await installStripeMock(page);

    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2026-09-14&endDate=2026-09-16&pickupTime=11:00&dropoffTime=17:00',
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

    await page.goBack();
    await expect(page.locator('#step1')).toHaveClass(/active/);
    await expect(page.locator('#pickupLocation')).toHaveValue(reservationGuest.pickupLocation);

    await page.locator('#continueToPaymentBtn').click();
    await expect(page.locator('#step2')).toHaveClass(/active/);
    await expect(page.locator('#fullName')).toHaveValue(reservationGuest.name);
    await expect(page.locator('#passport')).toHaveValue(reservationGuest.passport);
    await expect(page.locator('#phone')).toHaveValue(reservationGuest.phone);
    await expect(page.locator('#email')).toHaveValue(reservationGuest.email);

    await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();
    await expect(page.locator('#step3')).toHaveClass(/active/);
    await expect(page.locator('#card-element')).toHaveAttribute('data-mock-stripe', 'mounted');

    await page.goBack();
    await expect(page.locator('#step2')).toHaveClass(/active/);
    await expect(page.locator('#fullName')).toHaveValue(reservationGuest.name);
    await expect(page.locator('#passport')).toHaveValue(reservationGuest.passport);
    await expect(page.locator('#phone')).toHaveValue(reservationGuest.phone);
    await expect(page.locator('#email')).toHaveValue(reservationGuest.email);

    await expectNoConsoleErrors(consoleErrors, 'reserve browser back step memory');
});

test('reserve lets guests clear remembered details without losing the selected schedule', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2026-09-14&endDate=2026-09-16&pickupTime=11:00&dropoffTime=17:00',
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
    await page.locator('.reserve-optional-summary').click();
    await page.locator('#address').fill(reservationGuest.address);
    await page.locator('#city').fill(reservationGuest.city);

    await page.getByRole('button', { name: /Clear details/i }).click();

    await expect(page.locator('#step2')).toHaveClass(/active/);
    await expect(page.locator('#pickupLocation')).toHaveValue(reservationGuest.pickupLocation);
    await expect(page.locator('#startDate')).toHaveValue('2026-09-14');
    await expect(page.locator('#endDate')).toHaveValue('2026-09-16');
    await expect(page.locator('#fullName')).toHaveValue('');
    await expect(page.locator('#passport')).toHaveValue('');
    await expect(page.locator('#phone')).toHaveValue('');
    await expect(page.locator('#email')).toHaveValue('');
    await expect(page.locator('#address')).toHaveValue('');
    await expect(page.locator('#city')).toHaveValue('');
    await expect(page.locator('#country')).toHaveValue('AE');

    await page.getByRole('button', { name: /Continue to Payment/i }).click();
    await expect(page.locator('#step2')).toHaveClass(/active/);
    await expect(page.locator('#step2Validation')).toContainText('Please complete all required fields');

    await expectNoConsoleErrors(consoleErrors, 'reserve clear details control');
});
