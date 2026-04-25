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

    test('fleet desktop card contact actions form a full-width 50/50 split below the primary CTA', async ({ page }) => {
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
            const buttons = Array.from(row?.querySelectorAll('.fleet-card__secondary') || [])
                .map((button) => {
                    const rect = button.getBoundingClientRect();

                    return {
                        text: String(button.textContent || '').trim(),
                        top: rect.top,
                        width: rect.width,
                        height: rect.height
                    };
                });

            return {
                cardWidth: cardRect.width,
                rowWidth: rowRect?.width || 0,
                rowLeftGapPx: rowRect ? rowRect.left - cardRect.left : 0,
                rowRightGapPx: rowRect ? cardRect.right - rowRect.right : 0,
                gapFromPrimaryPx: rowRect && primaryRect ? rowRect.top - primaryRect.bottom : 0,
                buttons
            };
        });

        expect(contactMetrics.buttons.map((button) => button.text)).toEqual(['Call', 'WhatsApp']);
        expect(contactMetrics.gapFromPrimaryPx).toBeGreaterThanOrEqual(10);
        expect(Math.abs(contactMetrics.rowLeftGapPx)).toBeLessThanOrEqual(2);
        expect(Math.abs(contactMetrics.rowRightGapPx)).toBeLessThanOrEqual(2);
        expect(contactMetrics.rowWidth / contactMetrics.cardWidth).toBeGreaterThanOrEqual(0.985);
        expect(Math.abs(contactMetrics.buttons[0].top - contactMetrics.buttons[1].top)).toBeLessThanOrEqual(1);

        for (const button of contactMetrics.buttons) {
            expect(button.width / contactMetrics.rowWidth).toBeGreaterThanOrEqual(0.49);
            expect(button.width / contactMetrics.rowWidth).toBeLessThanOrEqual(0.51);
            expect(button.height).toBeGreaterThanOrEqual(44);
            expect(button.height).toBeLessThanOrEqual(72);
        }

        await expectNoConsoleErrors(consoleErrors, 'fleet desktop card contact actions');
    });

    test('home featured fleet cards use the same full-width 50/50 desktop contact split', async ({ page }) => {
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
            const buttons = Array.from(row?.querySelectorAll('.fleet-visual-card__contact-link') || [])
                .map((button) => {
                    const rect = button.getBoundingClientRect();

                    return {
                        text: String(button.textContent || '').trim(),
                        top: rect.top,
                        width: rect.width,
                        height: rect.height
                    };
                });

            return {
                cardWidth: cardRect.width,
                rowWidth: rowRect?.width || 0,
                rowLeftGapPx: rowRect ? rowRect.left - cardRect.left : 0,
                rowRightGapPx: rowRect ? cardRect.right - rowRect.right : 0,
                gapFromPrimaryPx: rowRect && primaryRect ? rowRect.top - primaryRect.bottom : 0,
                buttons
            };
        });

        expect(contactMetrics.buttons.map((button) => button.text)).toEqual(['Call', 'WhatsApp']);
        expect(contactMetrics.gapFromPrimaryPx).toBeGreaterThanOrEqual(10);
        expect(Math.abs(contactMetrics.rowLeftGapPx)).toBeLessThanOrEqual(2);
        expect(Math.abs(contactMetrics.rowRightGapPx)).toBeLessThanOrEqual(2);
        expect(contactMetrics.rowWidth / contactMetrics.cardWidth).toBeGreaterThanOrEqual(0.985);
        expect(Math.abs(contactMetrics.buttons[0].top - contactMetrics.buttons[1].top)).toBeLessThanOrEqual(1);

        for (const button of contactMetrics.buttons) {
            expect(button.width / contactMetrics.rowWidth).toBeGreaterThanOrEqual(0.49);
            expect(button.width / contactMetrics.rowWidth).toBeLessThanOrEqual(0.51);
            expect(button.height).toBeGreaterThanOrEqual(44);
            expect(button.height).toBeLessThanOrEqual(72);
        }

        await expectNoConsoleErrors(consoleErrors, 'home desktop featured fleet card contact actions');
    });
});
