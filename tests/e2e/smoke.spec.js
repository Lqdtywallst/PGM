const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

test('homepage opens cleanly with a visible hero', async ({ page }) => {
    await primeHomeAnimations(page);
    const consoleErrors = createConsoleTracker(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settlePage(page);

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.hero-lab')).toBeVisible();
    await expect(page.locator('.hero-lab__cta--primary')).toBeVisible();

    await expectNoConsoleErrors(consoleErrors, 'homepage smoke');
});
