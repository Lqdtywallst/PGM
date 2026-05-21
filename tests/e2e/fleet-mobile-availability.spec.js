const { test, expect } = require('@playwright/test');

const availabilityVehicles = [
    'lamborghini-huracan-evo-spyder',
    'ferrari-296-gts',
    'porsche-992-gt3',
    'lamborghini-urus-sport',
    'mercedes-g63-amg',
    'rolls-royce-cullinan-black-badge'
].map((id) => ({ id, available: true }));

test.describe('Fleet mobile availability badges', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('shows the available-for-dates status on mobile cards', async ({ page }) => {
        await page.route('**/api/availability?**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ vehicles: availabilityVehicles })
            });
        });

        await page.goto('/fleet.html?startDate=2026-05-21&endDate=2026-05-22&pickupTime=12:00&dropoffTime=12:00', {
            waitUntil: 'networkidle'
        });

        const firstBadge = page.locator('.js-fleet-card:not([hidden]) .fleet-card__availability').first();
        await expect(firstBadge).toBeVisible();
        await expect(firstBadge).toHaveText('Available for these dates');

        const box = await firstBadge.boundingBox();
        expect(box?.width).toBeGreaterThan(120);
        expect(box?.height).toBeGreaterThanOrEqual(30);
    });
});
