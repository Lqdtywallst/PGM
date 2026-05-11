const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

test.describe('Desktop card action rhythm', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            /mobile/i.test(testInfo.project.name),
            'Desktop card rhythm is validated in desktop/tablet browser projects.'
        );
    });

    test('fleet desktop cards avoid embedded contact actions and keep the global contact dock available', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        const card = page.locator('.js-fleet-card:not([hidden])').first();
        await card.scrollIntoViewIfNeeded();
        await settlePage(page, 120);

        const contactMetrics = await card.evaluate((element) => {
            const cardRect = element.getBoundingClientRect();
            const primary = element.querySelector('.fleet-card__primary');
            const primaryRect = primary?.getBoundingClientRect();
            const row = element.querySelector('.fleet-card__contact-row');
            const rowRect = row?.getBoundingClientRect();
            const visibleEmbeddedContactActions = Array.from(element.querySelectorAll('.fleet-card__secondary'))
                .filter((button) => {
                    const rect = button.getBoundingClientRect();
                    const style = window.getComputedStyle(button);
                    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
                });
            const floating = document.querySelector('.lab-floating-contact');
            const floatingRect = floating?.getBoundingClientRect();
            const floatingStyle = floating ? window.getComputedStyle(floating) : null;

            return {
                cardWidth: cardRect.width,
                primaryWidth: primaryRect?.width || 0,
                primaryBottomGapPx: primaryRect ? cardRect.bottom - primaryRect.bottom : 0,
                contactRowVisible: rowRect ? rowRect.width > 0 && rowRect.height > 0 && window.getComputedStyle(row).display !== 'none' : false,
                visibleEmbeddedContactActionCount: visibleEmbeddedContactActions.length,
                floatingVisible: floatingStyle ? floatingStyle.display !== 'none' && floatingStyle.visibility !== 'hidden' && Number.parseFloat(floatingStyle.opacity) > 0.75 : false,
                floatingRightGapPx: floatingRect ? window.innerWidth - floatingRect.right : null,
                floatingBottomGapPx: floatingRect ? window.innerHeight - floatingRect.bottom : null
            };
        });

        expect(contactMetrics.contactRowVisible).toBe(false);
        expect(contactMetrics.visibleEmbeddedContactActionCount).toBe(0);
        expect(contactMetrics.primaryWidth / contactMetrics.cardWidth).toBeGreaterThanOrEqual(0.78);
        expect(contactMetrics.primaryBottomGapPx).toBeGreaterThanOrEqual(12);
        expect(contactMetrics.primaryBottomGapPx).toBeLessThanOrEqual(42);
        expect(contactMetrics.floatingVisible).toBe(true);
        expect(contactMetrics.floatingRightGapPx).toBeGreaterThanOrEqual(8);
        expect(contactMetrics.floatingRightGapPx).toBeLessThanOrEqual(28);
        expect(contactMetrics.floatingBottomGapPx).toBeGreaterThanOrEqual(8);
        expect(contactMetrics.floatingBottomGapPx).toBeLessThanOrEqual(28);

        await expectNoConsoleErrors(consoleErrors, 'fleet desktop card action rhythm');
    });

    test('home featured fleet cards stay clean without embedded contact actions', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        const card = page.locator('.fleet-visual-card').first();
        await card.scrollIntoViewIfNeeded();
        await settlePage(page, 120);

        const contactMetrics = await card.evaluate((element) => {
            const cardRect = element.getBoundingClientRect();
            const primary = element.querySelector('.fleet-visual-card__primary');
            const primaryRect = primary?.getBoundingClientRect();
            const row = element.querySelector('.fleet-visual-card__contact-row');
            const rowRect = row?.getBoundingClientRect();
            const visibleEmbeddedContactActions = Array.from(element.querySelectorAll('.fleet-visual-card__contact-link'))
                .filter((button) => {
                    const rect = button.getBoundingClientRect();
                    const style = window.getComputedStyle(button);
                    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
                });
            const floating = document.querySelector('.lab-floating-contact');
            const floatingRect = floating?.getBoundingClientRect();
            const floatingStyle = floating ? window.getComputedStyle(floating) : null;

            return {
                cardWidth: cardRect.width,
                primaryWidth: primaryRect?.width || 0,
                primaryBottomGapPx: primaryRect ? cardRect.bottom - primaryRect.bottom : 0,
                contactRowVisible: rowRect ? rowRect.width > 0 && rowRect.height > 0 && window.getComputedStyle(row).display !== 'none' : false,
                visibleEmbeddedContactActionCount: visibleEmbeddedContactActions.length,
                floatingVisible: floatingStyle ? floatingStyle.display !== 'none' && floatingStyle.visibility !== 'hidden' && Number.parseFloat(floatingStyle.opacity) > 0.75 : false,
                floatingRightGapPx: floatingRect ? window.innerWidth - floatingRect.right : null,
                floatingBottomGapPx: floatingRect ? window.innerHeight - floatingRect.bottom : null
            };
        });

        expect(contactMetrics.contactRowVisible).toBe(false);
        expect(contactMetrics.visibleEmbeddedContactActionCount).toBe(0);
        expect(contactMetrics.primaryWidth / contactMetrics.cardWidth).toBeGreaterThanOrEqual(0.78);
        expect(contactMetrics.primaryBottomGapPx).toBeGreaterThanOrEqual(12);
        expect(contactMetrics.primaryBottomGapPx).toBeLessThanOrEqual(42);
        expect(contactMetrics.floatingVisible).toBe(true);
        expect(contactMetrics.floatingRightGapPx).toBeGreaterThanOrEqual(8);
        expect(contactMetrics.floatingRightGapPx).toBeLessThanOrEqual(28);
        expect(contactMetrics.floatingBottomGapPx).toBeGreaterThanOrEqual(8);
        expect(contactMetrics.floatingBottomGapPx).toBeLessThanOrEqual(28);

        await expectNoConsoleErrors(consoleErrors, 'home desktop featured fleet card action rhythm');
    });
});
