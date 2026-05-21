const { test, expect } = require('@playwright/test');

test.describe('Floating back button history', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('uses the real previous page after internal navigation', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.lab-floating-back')).toHaveCount(0);

        await page.evaluate(() => {
            window.location.href = '/fleet.html';
        });
        await page.waitForURL(/\/fleet\.html$/);

        const backButton = page.locator('.lab-floating-back');
        await expect(backButton).toBeVisible();
        await expect(backButton).toHaveAttribute('href', '/');

        await backButton.click();
        await page.waitForURL(/\/$/);
        await expect(page.locator('.lab-floating-back')).toHaveCount(0);
    });

    test('returns to the actual last internal page instead of the direct fallback', async ({ page }) => {
        await page.goto('/services.html', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
            window.location.href = '/lamborghini-huracan-evo-spyder-rental-dubai.html';
        });
        await page.waitForURL(/\/lamborghini-huracan-evo-spyder-rental-dubai\.html$/);

        const backButton = page.locator('.lab-floating-back');
        await expect(backButton).toBeVisible();
        await expect(backButton).toHaveAttribute('href', '/services.html');

        await backButton.click();
        await page.waitForURL(/\/services\.html$/);
    });
});
