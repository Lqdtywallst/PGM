const { test, expect } = require('@playwright/test');

async function readTypeMetrics(page, selectors) {
    return page.evaluate((inputSelectors) => {
        const read = (selector) => {
            const element = document.querySelector(selector);
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);

            return {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                fontSize: Number.parseFloat(styles.fontSize),
                lineHeight: Number.parseFloat(styles.lineHeight),
                fontWeight: Number.parseInt(styles.fontWeight, 10),
                letterSpacing: styles.letterSpacing === 'normal' ? 0 : Number.parseFloat(styles.letterSpacing),
                textAlign: styles.textAlign
            };
        };

        return {
            kicker: read(inputSelectors.kicker),
            title: read(inputSelectors.title),
            lead: read(inputSelectors.lead)
        };
    }, selectors);
}

test.describe('Mobile section type level', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('services and locations match the about intro typography level', async ({ page }) => {
        await page.goto('/about.html', { waitUntil: 'networkidle' });
        const about = await readTypeMetrics(page, {
            kicker: '.about-proof-strip--entry .about-kicker',
            title: '.about-proof-strip--entry .about-proof-strip__head h1',
            lead: '.about-proof-strip--entry .about-proof-strip__head p'
        });

        const targets = [
            {
                route: '/services.html',
                selectors: {
                    kicker: '.services-flow--lead .services-kicker',
                    title: '.services-flow--lead .services-section__head h1',
                    lead: '.services-flow--lead .services-section__head p'
                }
            },
            {
                route: '/locations.html',
                selectors: {
                    kicker: '.locations-hero .locations-kicker',
                    title: '.locations-hero .locations-hero__copy h1',
                    lead: '.locations-hero .locations-hero__lead'
                }
            }
        ];

        for (const target of targets) {
            await page.goto(target.route, { waitUntil: 'networkidle' });
            const metrics = await readTypeMetrics(page, target.selectors);

            expect(metrics.kicker.x).toBeCloseTo(about.kicker.x, 0);
            expect(metrics.kicker.y).toBeCloseTo(about.kicker.y, 0);
            expect(metrics.kicker.fontSize).toBeCloseTo(about.kicker.fontSize, 1);
            expect(metrics.kicker.fontWeight).toBe(about.kicker.fontWeight);
            expect(metrics.kicker.letterSpacing).toBeCloseTo(about.kicker.letterSpacing, 1);

            expect(metrics.title.x).toBeCloseTo(about.title.x, 0);
            expect(metrics.title.fontSize).toBeCloseTo(about.title.fontSize, 1);
            expect(metrics.title.lineHeight).toBeCloseTo(about.title.lineHeight, 1);
            expect(metrics.title.fontWeight).toBe(about.title.fontWeight);
            expect(metrics.title.textAlign).toMatch(/^(left|start)$/);

            expect(metrics.lead.x).toBeCloseTo(about.lead.x, 0);
            expect(metrics.lead.width).toBeCloseTo(about.lead.width, 0);
            expect(metrics.lead.fontSize).toBeCloseTo(about.lead.fontSize, 1);
            expect(metrics.lead.lineHeight).toBeCloseTo(about.lead.lineHeight, 1);
            expect(metrics.lead.fontWeight).toBe(about.lead.fontWeight);
            expect(metrics.lead.textAlign).toMatch(/^(left|start)$/);
        }
    });
});
