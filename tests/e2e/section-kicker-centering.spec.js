const { test, expect } = require('@playwright/test');

async function readCenter(page, selector) {
    return page.evaluate((inputSelector) => {
        const element = document.querySelector(inputSelector);
        const rect = element.getBoundingClientRect();
        const before = window.getComputedStyle(element, '::before');

        return {
            centerX: rect.x + rect.width / 2,
            display: window.getComputedStyle(element).display,
            beforeWidth: Number.parseFloat(before.width)
        };
    }, selector);
}

test.describe('Mobile section kicker alignment', () => {
    const targets = [
        { route: '/', selector: '.featured-fleet__eyebrow', label: 'home fleet' },
        { route: '/', selector: '.guest-reviews__eyebrow', label: 'home reviews' },
        { route: '/fleet.html', selector: '.fleet-browser__hero-kicker', label: 'fleet hero', maxWidth: 720 },
        { route: '/about.html', selector: '.about-proof-strip--entry .about-kicker', label: 'about proof' },
        { route: '/services.html', selector: '.services-flow--lead .services-kicker', label: 'services flow' },
        { route: '/locations.html', selector: '.locations-hero .locations-kicker', label: 'locations coverage' }
    ];

    test.use({ viewport: { width: 390, height: 844 } });

    test('keeps line labels centered across mobile tabs', async ({ page }) => {
        const expectedCenter = 390 / 2;

        for (const target of targets) {
            await page.goto(target.route, { waitUntil: 'networkidle' });
            const metrics = await readCenter(page, target.selector);

            expect(metrics.display, target.label).toBe('flex');
            expect(metrics.beforeWidth, target.label).toBeGreaterThan(0);
            expect(Math.abs(metrics.centerX - expectedCenter), target.label).toBeLessThanOrEqual(2);
        }
    });
});
