const { test, expect } = require('@playwright/test');

test.describe('Contact mobile footer transition', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('keeps contact form clear of the footer with a dark transition band', async ({ page }) => {
        await page.goto('/contact.html', { waitUntil: 'networkidle' });
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - window.innerHeight));

        const footer = page.locator('.site-v2-footer');
        const footerShell = page.locator('.site-v2-footer__shell');
        await expect(footer).toBeVisible();
        await expect(footerShell).toBeVisible();

        const geometry = await page.evaluate(() => {
            const hero = document.querySelector('.contact-hero');
            const footerElement = document.querySelector('.site-v2-footer');
            const shell = document.querySelector('.site-v2-footer__shell');
            const heroRect = hero.getBoundingClientRect();
            const footerRect = footerElement.getBoundingClientRect();
            const shellRect = shell.getBoundingClientRect();
            const heroStyles = window.getComputedStyle(hero);
            const footerStyles = window.getComputedStyle(footerElement);

            return {
                heroBottom: heroRect.bottom,
                footerTop: footerRect.top,
                shellTop: shellRect.top,
                footerPaddingTop: Number.parseFloat(footerStyles.paddingTop),
                heroBackground: heroStyles.backgroundImage
            };
        });

        expect(geometry.heroBottom).toBeLessThanOrEqual(geometry.footerTop + 1);
        expect(geometry.shellTop).toBeGreaterThanOrEqual(geometry.footerTop + 12);
        expect(geometry.footerPaddingTop).toBeGreaterThanOrEqual(12);
        expect(geometry.heroBackground).toContain('rgb(5, 5, 6)');
    });
});
