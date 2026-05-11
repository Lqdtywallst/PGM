const { test, expect } = require('@playwright/test');
const {
    contactLead,
    reservationGuest
} = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

async function installSuccessfulCheckoutMocks(page) {
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
                            id: 'pi_mock_customer_checkout',
                            status: 'succeeded',
                            amount: 165000
                        }
                    };
                }
            };
        };
    });

    await page.route('**/api/test', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true })
        });
    });

    await page.route('**/api/reserve/confirm', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                emailSent: true
            })
        });
    });

    await page.route('**/api/reserve', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                reservationId: 'res_mock_123',
                clientSecret: 'pi_mock_secret_123',
                client_secret: 'pi_mock_secret_123'
            })
        });
    });
}

async function fillGuestDetails(page) {
    await page.locator('#fullName').fill(reservationGuest.name);
    await page.locator('#passport').fill(reservationGuest.passport);
    await page.locator('#phone').fill(reservationGuest.phone);
    await page.locator('#email').fill(reservationGuest.email);
}

async function goFromFleetToReserve(page) {
    await page.locator('.js-fleet-brand-select').selectOption('mercedes');
    await expect(page.locator('.js-fleet-results-count')).toContainText('1 model visible');
    await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().click();
    await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
}

async function completeReserveToPayment(page) {
    await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
    await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
    await page.locator('#continueToPaymentBtn').click();
    await expect(page.locator('#step2')).toHaveClass(/active/);

    await fillGuestDetails(page);
    await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();
    await expect(page.locator('#step3')).toHaveClass(/active/);
    await expect(page.locator('#card-element')).toHaveAttribute('data-mock-stripe', 'mounted');
  }

test.describe('Desktop complete customer flows intelligent audit', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'desktop-chromium',
            'Desktop complete-flow audit.'
        );
    });

    test('guest completes a booking from home overlay to successful payment', async ({ page }) => {
        await primeHomeAnimations(page);
        await installSuccessfulCheckoutMocks(page);
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#home-pickup-date').fill('2026-12-03');
        await page.locator('#home-return-date').fill('2026-12-05');
        await page.locator('#home-pickup-time').selectOption('12:00');
        await page.locator('#home-return-time').selectOption('13:00');
        await page.getByRole('button', { name: /See available cars/i }).click();

        await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-12-03');
        await expect(page.locator('#fleet-return-date')).toHaveValue('2026-12-05');
        await goFromFleetToReserve(page);
        await expect(page.locator('#selectedCar')).toContainText('G63 AMG');

        await completeReserveToPayment(page);

        const successDialogPromise = page.waitForEvent('dialog');
        await page.locator('#payButton').click();
        const successDialog = await successDialogPromise;
        expect(successDialog.message()).toContain('Payment received');
        expect(successDialog.message()).toContain('G63 AMG');
        await successDialog.accept();

        await expect(page).toHaveURL(/\/index\.html$/i);
        await expectNoConsoleErrors(consoleErrors, 'desktop complete booking flow');
    });

    test('support lead completes the contact journey successfully', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.route('**/api/contact', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    message: 'Message sent successfully. We will respond soon.'
                })
            });
        });

        await page.goto('/contact.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#contactName').fill(contactLead.name);
        await page.locator('#contactEmail').fill(contactLead.email);
        await page.locator('#contactPhone').fill(contactLead.phone);
        await page.locator('#contactSubject').selectOption(contactLead.subject);
        await page.locator('#contactMessage').fill(contactLead.message);
        await page.locator('#contactSubmitButton').click();

        await expect(page.locator('#contactFormStatus')).toContainText('Message sent successfully');
        await expect(page.locator('#contactName')).toHaveValue('');
        await expect(page.locator('#contactEmail')).toHaveValue('');
        await expect(page.locator('#contactMessage')).toHaveValue('');
        await expect(page.locator('#contactSubmitButton')).toBeEnabled();
        await expectNoConsoleErrors(consoleErrors, 'contact lead success flow');
    });
});

test.describe('Mobile complete customer flows intelligent audit', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'mobile-chromium',
            'Mobile complete-flow audit.'
        );
    });

    test('mobile guest reaches secure payment from the home booking journey', async ({ page }) => {
        await primeHomeAnimations(page);
        await installSuccessfulCheckoutMocks(page);
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#home-pickup-date').fill('2026-12-10');
        await page.locator('#home-return-date').fill('2026-12-12');
        await page.locator('#home-pickup-time').selectOption('12:00');
        await page.locator('#home-return-time').selectOption('13:00');
        await page.getByRole('button', { name: /See available cars/i }).click();

        await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-12-10');
        await expect(page.locator('#fleet-return-date')).toHaveValue('2026-12-12');
        await goFromFleetToReserve(page);

        await completeReserveToPayment(page);

        const successDialogPromise = page.waitForEvent('dialog');
        await page.locator('#payButton').click();
        const successDialog = await successDialogPromise;
        expect(successDialog.message()).toContain('Payment received');
        await successDialog.accept();

        await expect(page).toHaveURL(/\/index\.html$/i);
        await expectNoConsoleErrors(consoleErrors, 'mobile complete booking flow');
    });
});
