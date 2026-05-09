const { test, expect } = require('@playwright/test');
const {
    contactLead,
    reservationGuest
} = require('../../test-data/users.json');
const { settlePage } = require('./support/site-helpers');

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
                            id: 'pi_mock_customer_checkout',
                            status: 'succeeded',
                            amount: 165000
                        }
                    };
                }
            };
        };
    });
}

test('contact form shows the API error and keeps the typed values', async ({ page }) => {
    await page.route('**/api/contact', async (route) => {
        await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
                success: false,
                error: 'Mail service unavailable.'
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

    await expect(page.locator('#contactFormStatus')).toContainText('Mail service unavailable.');
    await expect(page.locator('#contactName')).toHaveValue(contactLead.name);
    await expect(page.locator('#contactEmail')).toHaveValue(contactLead.email);
    await expect(page.locator('#contactSubmitButton')).toBeEnabled();
});

test('reserve shows a backend error when reservation creation fails before payment', async ({ page }) => {
    await installStripeMock(page);

    await page.route('**/api/test', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true })
        });
    });

    await page.route('**/api/reserve', async (route) => {
        await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
                error: 'Reservation service unavailable.'
            })
        });
    });

    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-07-10&endDate=2026-07-12&pickupTime=10:00&dropoffTime=18:00',
        { waitUntil: 'domcontentloaded' }
    );
    await settlePage(page);

    await goToGuestDetailsStep(page);
    await fillGuestDetails(page);
    await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();

    await expect(page.locator('#step3')).toHaveClass(/active/);
    await expect(page.locator('#card-element')).toHaveAttribute('data-mock-stripe', 'mounted');

    await page.locator('#payButton').click();

    await expect(page.locator('#paymentStatus')).toContainText(
        'We could not complete payment. Reservation service unavailable.'
    );
    await expect(page.locator('#payButton')).toBeEnabled();
});
