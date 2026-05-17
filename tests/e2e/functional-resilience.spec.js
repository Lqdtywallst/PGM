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

async function openReserve(page) {
    await page.goto(
        '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-10-01&endDate=2026-10-03&pickupTime=10:00&dropoffTime=18:00',
        { waitUntil: 'domcontentloaded' }
    );
    await settlePage(page);
}

async function goToGuestDetailsStep(page) {
    await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
    await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
    await page.locator('#continueToPaymentBtn').click();
    await expect(page.locator('#step2')).toHaveClass(/active/);
}

test('reserve preserves guest data after validation errors and lets the user recover', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await openReserve(page);
    await goToGuestDetailsStep(page);

    await page.locator('#fullName').fill(reservationGuest.name);
    await page.locator('#passport').fill(reservationGuest.passport);
    await page.locator('#phone').fill('123');
    await page.locator('#email').fill('bad-email');
    await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();

    await expect(page.locator('#step2Validation')).toContainText(
        'Please complete all required fields before continuing.'
    );
    await expect(page.locator('#fullName')).toHaveValue(reservationGuest.name);
    await expect(page.locator('#passport')).toHaveValue(reservationGuest.passport);
    await expect(page.locator('#phone')).toHaveValue('123');
    await expect(page.locator('#email')).toHaveValue('bad-email');

    await page.locator('#phone').fill(reservationGuest.phone);
    await page.locator('#email').fill(reservationGuest.email);
    await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();

    await expect(page.locator('#step3')).toHaveClass(/active/);
    await expect(page.locator('#payButton')).toBeVisible();
    await expectNoConsoleErrors(consoleErrors, 'reserve validation recovery');
});

test('fleet survives browser back from reserve without losing the active schedule', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);
    await mockFleetAvailability(page);

    await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
    await settlePage(page);

    await page.locator('#fleet-pickup-date').fill('2026-10-08');
    await page.locator('#fleet-return-date').fill('2026-10-10');
    await page.locator('#fleet-pickup-time').fill('11:00');
    await page.locator('#fleet-return-time').fill('16:00');
    await page.locator('.js-fleet-brand-select').selectOption('mercedes');
    await expect(page.locator('.js-fleet-results-count')).toContainText('1 model visible');

    await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().click();
    await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
    await expect(page.locator('#startDate')).toHaveValue('2026-10-08');
    await expect(page.locator('#endDate')).toHaveValue('2026-10-10');
    await expect(page.locator('#pickupTime')).toHaveValue('11:00');
    await expect(page.locator('#dropoffTime')).toHaveValue('16:00');

    await page.goBack({ waitUntil: 'domcontentloaded' });
    await settlePage(page);

    await expect(page).toHaveURL(/\/fleet\.html$/i);
    await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-10-08');
    await expect(page.locator('#fleet-return-date')).toHaveValue('2026-10-10');
    await expect(page.locator('#fleet-pickup-time')).toHaveValue('11:00');
    await expect(page.locator('#fleet-return-time')).toHaveValue('16:00');
    await expect(page.locator('.js-fleet-brand-select')).toHaveValue('mercedes');
    await expect(page.locator('.js-fleet-results-count')).toContainText('1 model visible');

    await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().click();
    await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
    await expect(page.locator('#startDate')).toHaveValue('2026-10-08');
    await expect(page.locator('#pickupTime')).toHaveValue('11:00');
    await expectNoConsoleErrors(consoleErrors, 'fleet back navigation recovery');
});

test('contact form retries successfully after a transient backend error', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/contact', async (route) => {
        requestCount += 1;

        if (requestCount === 1) {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: false,
                    error: 'Mail service unavailable.'
                })
            });
            return;
        }

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

    await expect(page.locator('#contactFormStatus')).toContainText('Mail service unavailable.');
    await expect(page.locator('#contactName')).toHaveValue(contactLead.name);
    await expect(page.locator('#contactEmail')).toHaveValue(contactLead.email);
    await expect(page.locator('#contactSubmitButton')).toBeEnabled();

    await page.locator('#contactSubmitButton').click();

    await expect(page.locator('#contactFormStatus')).toContainText('Message sent successfully');
    await expect(page.locator('#contactName')).toHaveValue('');
    await expect(page.locator('#contactEmail')).toHaveValue('');
    await expect(page.locator('#contactMessage')).toHaveValue('');
    await expect(requestCount).toBe(2);
});
