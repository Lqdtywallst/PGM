const { test, expect } = require('@playwright/test');
const { reservationGuest } = require('../../test-data/users.json');
const { settlePage } = require('./support/site-helpers');

async function goToPaymentStep(page) {
    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-12-26&endDate=2026-12-28&pickupTime=10:00&dropoffTime=18:00',
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
    await expect(page.locator('#payButton')).toBeVisible();
}

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

test.describe('Complete-flow error recovery', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'desktop-chromium',
            'This audit targets desktop payment recovery behavior.'
        );
    });

    test('booking still completes when reservation confirmation fails after a successful payment', async ({ page }) => {
        await installStripeMock(page, {
            error: null,
            paymentIntent: {
                id: 'pi_mock_confirm_failure',
                status: 'succeeded',
                amount: 165000
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
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    reservationId: 'res_mock_456',
                    clientSecret: 'pi_mock_secret_confirm_failure',
                    client_secret: 'pi_mock_secret_confirm_failure'
                })
            });
        });

        await page.route('**/api/reserve/confirm', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: false,
                    emailSent: false,
                    error: 'Confirmation email failed.'
                })
            });
        });

        await goToPaymentStep(page);
        await expect(page.locator('#card-element')).toHaveAttribute('data-mock-stripe', 'mounted');

        const successDialogPromise = page.waitForEvent('dialog');
        await page.locator('#payButton').click();

        await expect(page.locator('#paymentStatus')).toContainText('Payment successful! Processing reservation...');
        const successDialog = await successDialogPromise;
        expect(successDialog.message()).toContain('Payment successful');
        await successDialog.accept();

        await expect(page).toHaveURL(/\/index\.html$/i);
    });

    test('booking surfaces a recoverable card failure when payment method is rejected', async ({ page }) => {
        await installStripeMock(page, {
            error: null,
            paymentIntent: {
                id: 'pi_mock_failure',
                status: 'requires_payment_method',
                amount: 165000
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
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    reservationId: 'res_mock_789',
                    clientSecret: 'pi_mock_secret_failure',
                    client_secret: 'pi_mock_secret_failure'
                })
            });
        });

        await goToPaymentStep(page);
        await expect(page.locator('#card-element')).toHaveAttribute('data-mock-stripe', 'mounted');

        await page.locator('#payButton').click();

        await expect(page.locator('#paymentStatus')).toContainText(
            'Payment method failed. Please try a different card.'
        );
        await expect(page.locator('#card-errors')).toContainText(
            'Payment method failed. Please try a different card.'
        );
        await expect(page.locator('#payButton')).toBeEnabled();
        await expect(page.locator('#step3')).toHaveClass(/active/);
    });
});
