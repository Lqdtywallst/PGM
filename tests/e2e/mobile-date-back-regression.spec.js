const { test, expect } = require('@playwright/test');

function getDubaiDateString(offsetDays = 0) {
    const dubaiNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
    dubaiNow.setDate(dubaiNow.getDate() + offsetDays);

    return [
        dubaiNow.getFullYear(),
        String(dubaiNow.getMonth() + 1).padStart(2, '0'),
        String(dubaiNow.getDate()).padStart(2, '0')
    ].join('-');
}

test.describe('Mobile date and back controls regression', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('home date inputs clamp stale stored dates on every date surface', async ({ page }) => {
        const today = getDubaiDateString(0);
        const tomorrow = getDubaiDateString(1);

        await page.goto('/', { waitUntil: 'networkidle' });
        await page.evaluate(() => {
            window.sessionStorage.setItem('dynastyBookingIntent', JSON.stringify({
                startDate: '2026-04-01',
                endDate: '2026-04-02',
                pickupTime: '12:00',
                dropoffTime: '12:00',
                savedAt: Date.now()
            }));
        });

        await page.goto('/', { waitUntil: 'networkidle' });

        await expect(page.locator('#home-pickup-date')).toHaveValue(today);
        await expect(page.locator('#home-pickup-date')).toHaveAttribute('min', today);
        await expect(page.locator('#home-return-date')).toHaveValue(tomorrow);
        await expect(page.locator('#home-return-date')).toHaveAttribute('min', today);
        await expect(page.locator('#hero-lab-pickup-date')).toHaveValue(today);
        await expect(page.locator('#hero-lab-pickup-date')).toHaveAttribute('min', today);
        await expect(page.locator('#hero-lab-return-date')).toHaveValue(tomorrow);
        await expect(page.locator('#hero-lab-return-date')).toHaveAttribute('min', today);
    });

    [
        { route: '/fleet.html', href: '/' },
        { route: '/lamborghini-huracan-evo-spyder-rental-dubai.html', href: '/fleet.html' },
        { route: '/app/reserve/page.html', href: '/fleet.html' }
    ].forEach(({ route, href }) => {
        test(`direct mobile visit shows a usable back arrow on ${route}`, async ({ page, context }) => {
            const directPage = await context.newPage();

            await directPage.setViewportSize({ width: 390, height: 844 });
            await directPage.goto(route, { waitUntil: 'networkidle' });

            const backButton = directPage.locator('.lab-floating-back');
            await expect(backButton).toBeVisible();
            await expect(backButton).toHaveAttribute('href', href);

            const box = await backButton.boundingBox();
            expect(box?.width).toBeGreaterThanOrEqual(42);
            expect(box?.height).toBeGreaterThanOrEqual(42);

            await directPage.close();
        });
    });
});
