const { test, expect } = require('@playwright/test');
const contactLead = require('../../test-data/users.json').contactLead;
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

function futureDateInput(offsetDays) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offsetDays);
    return date.toISOString().slice(0, 10);
}

test('home booking form passes schedule into fleet', async ({ page }) => {
    await primeHomeAnimations(page);
    const consoleErrors = createConsoleTracker(page);
    const pickupDate = futureDateInput(21);
    const returnDate = futureDateInput(23);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settlePage(page);

    await page.locator('#home-pickup-date').fill(pickupDate);
    await page.locator('#home-return-date').fill(returnDate);
    await page.locator('#home-pickup-time').selectOption('10:00');
    await page.locator('#home-return-time').selectOption('18:00');
    await page.getByRole('button', { name: /See available cars/i }).click();

    await expect(page).toHaveURL(/\/fleet\.html\?/i);
    await expect(page.locator('#fleet-pickup-date')).toHaveValue(pickupDate);
    await expect(page.locator('#fleet-return-date')).toHaveValue(returnDate);
    await expect(page.locator('#fleet-pickup-time')).toHaveValue('10:00');
    await expect(page.locator('#fleet-return-time')).toHaveValue('18:00');

    await expectNoConsoleErrors(consoleErrors, 'home booking handoff');
});

test('contact form submits a success state with demo data', async ({ page }) => {
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

    await expectNoConsoleErrors(consoleErrors, 'contact form success flow');
});
