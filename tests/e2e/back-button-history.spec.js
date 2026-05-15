const { test, expect } = require('@playwright/test');

test.describe('Floating back button history', () => {
    test('stays hidden on Home and direct internal loads, then appears after internal navigation', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.lab-floating-back')).toHaveCount(0);

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.lab-floating-back')).toHaveCount(0);

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('.lab-floating-back')).toHaveCount(0);

        await page.locator('a[href="./fleet.html"], a[href="/fleet.html"]').first().click();
        await page.waitForURL(/\/fleet\.html$/);

        const backButton = page.locator('.lab-floating-back');
        await expect(backButton).toBeVisible();
        await expect(backButton).toHaveAttribute('href', '/');

        await backButton.click();
        await page.waitForURL(/\/$/);
        await expect(page.locator('.lab-floating-back')).toHaveCount(0);
    });
});
