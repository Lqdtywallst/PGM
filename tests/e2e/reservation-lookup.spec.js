const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

function lookupForm(page) {
    return page.locator('[data-reservation-lookup-form]');
}

test.describe('Reservation lookup customer flow', () => {
    test('validates input and renders a safe matched reservation summary', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);
        let requestPayload = null;

        await page.route('**/api/reserve/lookup', async (route) => {
            requestPayload = route.request().postDataJSON();

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                headers: {
                    'Cache-Control': 'no-store'
                },
                body: JSON.stringify({
                    success: true,
                    reservation: {
                        reservationId: 'res_public_safe',
                        vehicle: 'Ferrari 296 GTS',
                        statusLabel: 'Confirmed',
                        startDate: '2026-12-20',
                        endDate: '2026-12-22',
                        pickupTime: '10:00',
                        dropoffTime: '18:00',
                        durationLabel: '2 days',
                        pickupLocationSummary: 'Palm Jumeirah area',
                        paymentStatus: 'Deposit paid',
                        totalDisplay: '6,800 AED',
                        remainingDisplay: '3,400 AED',
                        nextStep: 'The team will confirm the handover timing with you.'
                    }
                })
            });
        });

        await page.goto('/reservation-lookup.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        const form = lookupForm(page);
        await form.getByRole('button', { name: /Find booking/i }).click();
        await expect(page.locator('#reservationLookupStatus')).toContainText('Enter your reservation ID and booking email.');

        await form.locator('#reservationLookupId').fill('res_public_safe');
        await form.locator('#reservationLookupEmail').fill('not-an-email');
        await form.getByRole('button', { name: /Find booking/i }).click();
        await expect(page.locator('#reservationLookupStatus')).toContainText('Enter a valid booking email.');

        await form.locator('#reservationLookupEmail').fill('guest@example.com');
        await form.getByRole('button', { name: /Find booking/i }).click();

        await expect(page.locator('#reservationLookupStatus')).toContainText('Reservation found.');
        await expect(page.locator('#reservationLookupResult')).toBeVisible();
        await expect(page.locator('#reservationLookupResult')).toContainText('Ferrari 296 GTS');
        await expect(page.locator('#reservationLookupResult')).toContainText('Deposit paid');
        await expect(page.locator('#reservationLookupResult')).toContainText('Palm Jumeirah area');
        await expect(page.locator('#reservationLookupResult')).not.toContainText('guest@example.com');
        await expect(page.locator('#reservationLookupResult').getByRole('link', { name: /WhatsApp the team/i })).toHaveAttribute('href', /res_public_safe/);

        expect(requestPayload).toEqual({
            reservationId: 'res_public_safe',
            email: 'guest@example.com'
        });

        await expectNoConsoleErrors(consoleErrors, 'reservation lookup matched summary');
    });

    test('shows a safe not-found error without rendering a stale result', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.route('**/api/reserve/lookup', async (route) => {
            await route.fulfill({
                status: 404,
                contentType: 'application/json',
                headers: {
                    'Cache-Control': 'no-store'
                },
                body: JSON.stringify({
                    success: false,
                    error: 'We could not match those details. Check the reservation ID and email, or WhatsApp the team.'
                })
            });
        });

        await page.goto('/reservation-lookup.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        const form = lookupForm(page);
        await form.locator('#reservationLookupId').fill('res_missing');
        await form.locator('#reservationLookupEmail').fill('guest@example.com');
        await form.getByRole('button', { name: /Find booking/i }).click();

        await expect(page.locator('#reservationLookupStatus')).toContainText('We could not match those details');
        await expect(page.locator('#reservationLookupResult')).toBeHidden();
        expect(consoleErrors.filter((entry) => !/404 .*Not Found/i.test(entry))).toEqual([]);
    });
});
