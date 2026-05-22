const { test, expect } = require('@playwright/test');
const {
    contactLead,
    reservationGuest
} = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    mockFleetAvailability,
    settlePage
} = require('./support/site-helpers');

async function installStripeMock(page, paymentResult) {
    await page.addInitScript((result) => {
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
                    return result;
                }
            };
        };
    }, paymentResult);
}

async function openPaymentStep(page) {
    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2027-01-04&endDate=2027-01-06&pickupTime=10:00&dropoffTime=18:00',
        { waitUntil: 'domcontentloaded' }
    );
    await settlePage(page);

    await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
    await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
    await page.locator('#continueToPaymentBtn').click();
    await expect(page.locator('#step2')).toHaveClass(/active/);

    await page.locator('#fullName').fill(reservationGuest.name);
    await page.locator('#passport').fill(reservationGuest.passport);
    await page.locator('#phone').fill(reservationGuest.phone);
    await page.locator('#email').fill(reservationGuest.email);
    await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();

    await expect(page.locator('#step3')).toHaveClass(/active/);
    await expect(page.locator('#card-element')).toHaveAttribute('data-mock-stripe', 'mounted');
}

test.describe('Adversarial functional audit', () => {
    test('desktop payment resists double-submit and creates only one reservation', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop adversarial payment check.');
        const consoleErrors = createConsoleTracker(page);
        let reserveCalls = 0;
        let confirmCalls = 0;
        let dialogs = 0;

        await installStripeMock(page, {
            error: null,
            paymentIntent: {
                id: 'pi_mock_double_submit',
                status: 'succeeded',
                amount: 199000
            }
        });

        await page.route('**/api/test', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true })
            });
        });

        await page.route('**/api/reserve', async (route) => {
            reserveCalls += 1;
            await new Promise((resolve) => setTimeout(resolve, 250));
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    reservationId: 'res_mock_double_submit',
                    clientSecret: 'pi_mock_secret_double_submit',
                    client_secret: 'pi_mock_secret_double_submit'
                })
            });
        });

        await page.route('**/api/reserve/confirm', async (route) => {
            confirmCalls += 1;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    emailSent: true
                })
            });
        });

        page.on('dialog', async (dialog) => {
            dialogs += 1;
            await dialog.accept();
        });

        await openPaymentStep(page);
        await page.locator('#payButton').dblclick();

        await expect(page.locator('#paymentStatus')).toContainText('Payment received. Finalising your reservation...');
        await expect(page).toHaveURL(/\/index\.html$/i, { timeout: 10000 });
        expect(reserveCalls).toBe(1);
        expect(confirmCalls).toBe(1);
        expect(dialogs).toBe(1);
        await expectNoConsoleErrors(consoleErrors, 'desktop double-submit protection');
    });

    test('desktop reserve can recover from transient backend failure without losing the payment step', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop adversarial retry check.');
        let reserveCalls = 0;
        let dialogs = 0;

        await installStripeMock(page, {
            error: null,
            paymentIntent: {
                id: 'pi_mock_retry_success',
                status: 'succeeded',
                amount: 199000
            }
        });

        await page.route('**/api/test', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true })
            });
        });

        await page.route('**/api/reserve', async (route) => {
            reserveCalls += 1;

            if (reserveCalls === 1) {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Reservation service unavailable.'
                    })
                });
                return;
            }

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    reservationId: 'res_mock_retry_success',
                    clientSecret: 'pi_mock_secret_retry_success',
                    client_secret: 'pi_mock_secret_retry_success'
                })
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

        page.on('dialog', async (dialog) => {
            dialogs += 1;
            await dialog.accept();
        });

        await openPaymentStep(page);
        await page.locator('#payButton').click();

        await expect(page.locator('#paymentStatus')).toContainText(
            'We could not complete payment. Reservation service unavailable.'
        );
        await expect(page.locator('#payButton')).toBeEnabled();
        await expect(page.locator('#step3')).toHaveClass(/active/);

        await page.locator('#payButton').click();

        await expect(page.locator('#paymentStatus')).toContainText('Payment received. Finalising your reservation...');
        await expect(page).toHaveURL(/\/index\.html$/i, { timeout: 10000 });
        expect(reserveCalls).toBe(2);
        expect(dialogs).toBe(1);
    });

    test('desktop contact form resists double-submit and creates only one lead request', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop adversarial lead check.');
        const consoleErrors = createConsoleTracker(page);
        let contactCalls = 0;

        await page.route('**/api/contact', async (route) => {
            contactCalls += 1;
            await new Promise((resolve) => setTimeout(resolve, 250));
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

        await page.locator('#contactSubmitButton').dblclick();

        await expect(page.locator('#contactFormStatus')).toContainText('Message sent successfully');
        await expect(page.locator('#contactName')).toHaveValue('');
        await expect(page.locator('#contactEmail')).toHaveValue('');
        expect(contactCalls).toBe(1);
        await expectNoConsoleErrors(consoleErrors, 'desktop contact double-submit protection');
    });

    test('mobile rapid filter mutation carries only the latest brand into reserve', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile adversarial filter check.');
        const consoleErrors = createConsoleTracker(page);
        await mockFleetAvailability(page);

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#fleet-pickup-date').fill('2027-01-08');
        await page.locator('#fleet-return-date').fill('2027-01-10');
        await page.locator('#fleet-pickup-time').fill('12:00');
        await page.locator('#fleet-return-time').fill('13:00');

        await page.locator('.fleet-mobile-filter-toggle').click();
        await page.locator('.js-fleet-brand-select').selectOption('lamborghini');
        await expect(page.locator('.js-fleet-results-count')).toContainText('2 models visible');
        await page.locator('.fleet-filter-apply').click();

        await page.locator('.fleet-mobile-filter-toggle').click();
        await page.locator('.js-fleet-brand-select').selectOption('ferrari');
        await expect(page.locator('.js-fleet-results-count')).toContainText('1 model visible');
        await page.locator('.fleet-filter-apply').click();

        await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().click();

        await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
        await expect(page.locator('#selectedCar')).toContainText('296 GTS');
        await expect(page.locator('#summaryPricePerDay')).toContainText('3,400');
        await expect(page.locator('#startDate')).toHaveValue('2027-01-08');
        await expect(page.locator('#endDate')).toHaveValue('2027-01-10');
        await expect(page.locator('#pickupTime')).toHaveValue('12:00');
        await expect(page.locator('#dropoffTime')).toHaveValue('13:00');
        await expectNoConsoleErrors(consoleErrors, 'mobile latest-filter reserve handoff');
    });
});
