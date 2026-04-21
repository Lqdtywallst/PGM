const { test, expect } = require('@playwright/test');
const { reservationGuest } = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

test.describe('Mobile friction points', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'mobile-chromium',
            'This audit targets mobile friction points.'
        );
    });

    test('mobile filter sheet can narrow the fleet and still hand the correct schedule into reserve', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#fleet-pickup-date').fill('2026-12-20');
        await page.locator('#fleet-return-date').fill('2026-12-22');
        await page.locator('#fleet-pickup-time').fill('12:00');
        await page.locator('#fleet-return-time').fill('13:00');

        await page.locator('.fleet-mobile-filter-toggle').click();
        await page.locator('.js-fleet-brand-select').selectOption('lamborghini');
        await page.locator('.js-fleet-type-select').selectOption('convertible');
        await expect(page.locator('.fleet-sidebar')).toBeVisible();
        await expect(page.locator('.fleet-sidebar__field-display')).toContainText([
            '20/12/2026',
            '12:00',
            '22/12/2026',
            '13:00'
        ]);
        await expect(page.locator('.js-fleet-brand-select')).toHaveValue('lamborghini');
        await expect(page.locator('.js-fleet-type-select')).toHaveValue('convertible');

        const mobileFilterMetrics = await page.locator('.fleet-sidebar').evaluate((sidebar) => {
            const sheetRect = sidebar.getBoundingClientRect();
            const fields = Array.from(sidebar.querySelectorAll('.fleet-sidebar__field-shell'))
                .map((field) => {
                    const rect = field.getBoundingClientRect();
                    const display = field.querySelector('.fleet-sidebar__field-display');

                    return {
                        widthRatio: rect.width / Math.max(1, sheetRect.width),
                        height: rect.height,
                        text: String(display?.textContent || '').trim(),
                        clipX: Math.max(0, (display?.scrollWidth || 0) - (display?.clientWidth || 0)),
                        clipY: Math.max(0, (display?.scrollHeight || 0) - (display?.clientHeight || 0))
                    };
                });
            const controls = Array.from(sidebar.querySelectorAll('select, button, .fleet-sidebar__field-shell'))
                .map((control) => {
                    const rect = control.getBoundingClientRect();
                    return {
                        width: rect.width,
                        height: rect.height,
                        text: String(control.textContent || control.getAttribute('aria-label') || '').trim()
                    };
                });

            return {
                fields,
                controls,
                overflowPx: Math.max(0, sidebar.scrollWidth - sidebar.clientWidth)
            };
        });

        expect(mobileFilterMetrics.overflowPx).toBeLessThanOrEqual(4);
        for (const field of mobileFilterMetrics.fields) {
            expect(field.widthRatio).toBeGreaterThan(0.72);
            expect(field.height).toBeGreaterThanOrEqual(44);
            expect(field.text.length).toBeGreaterThan(0);
            expect(field.clipX).toBeLessThanOrEqual(2);
            expect(field.clipY).toBeLessThanOrEqual(2);
        }
        for (const control of mobileFilterMetrics.controls) {
            expect(control.width).toBeGreaterThanOrEqual(44);
            expect(control.height).toBeGreaterThanOrEqual(44);
        }

        await expect(page.locator('.js-fleet-results-count')).toContainText('1 model visible');
        await page.locator('.fleet-filter-close').click();

        await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().click();

        await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
        await expect(page.locator('#selectedCar')).toContainText('Huracan EVO Spyder');
        await expect(page.locator('#startDate')).toHaveValue('2026-12-20');
        await expect(page.locator('#endDate')).toHaveValue('2026-12-22');
        await expect(page.locator('#pickupTime')).toHaveValue('12:00');
        await expect(page.locator('#dropoffTime')).toHaveValue('13:00');
        await expectNoConsoleErrors(consoleErrors, 'mobile fleet filter sheet handoff');
    });

    test('short mobile filter sheet keeps filled date controls readable', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.setViewportSize({ width: 400, height: 608 });
        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.evaluate(() => {
            const values = [
                ['#fleet-pickup-date', '2026-04-20'],
                ['#fleet-pickup-time', '12:00'],
                ['#fleet-return-date', '2026-04-22'],
                ['#fleet-return-time', '18:00'],
                ['.js-fleet-brand-select', 'lamborghini'],
                ['.js-fleet-type-select', 'convertible']
            ];

            for (const [selector, value] of values) {
                const control = document.querySelector(selector);

                if (!control) {
                    continue;
                }

                control.value = value;
                control.dispatchEvent(new Event('input', { bubbles: true }));
                control.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        await page.locator('.fleet-mobile-filter-toggle').click();
        await expect(page.locator('.fleet-sidebar')).toBeVisible();

        const shortSheetMetrics = await page.locator('.fleet-sidebar').evaluate((sidebar) => {
            const viewportHeight = window.innerHeight;
            const sheetRect = sidebar.getBoundingClientRect();
            const displays = Array.from(sidebar.querySelectorAll('.fleet-sidebar__field-display'))
                .map((display) => String(display.textContent || '').trim())
                .filter(Boolean);
            const criticalControls = Array.from(sidebar.querySelectorAll('.fleet-sidebar__field-shell, .fleet-sidebar select'))
                .map((control) => {
                    const rect = control.getBoundingClientRect();
                    const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
                    const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
                    const isVisible = visibleHeight > 8 && visibleWidth > 8;

                    return {
                        className: String(control.className || ''),
                        text: String(control.textContent || control.value || '').replace(/\s+/g, ' ').trim(),
                        isVisible,
                        isBodyControl: control.matches('.fleet-sidebar__field-shell, .js-fleet-brand-select, .js-fleet-type-select'),
                        isFullyVisible: rect.top >= 0 && rect.bottom <= viewportHeight,
                        widthRatio: rect.width / Math.max(1, sheetRect.width),
                        height: rect.height,
                        clipX: Math.max(0, control.scrollWidth - control.clientWidth),
                        clipY: Math.max(0, control.scrollHeight - control.clientHeight)
                    };
                });

            return {
                sheetTop: sheetRect.top,
                sheetBottom: sheetRect.bottom,
                displays,
                criticalControls,
                overflowPx: Math.max(0, sidebar.scrollWidth - sidebar.clientWidth)
            };
        });

        expect(shortSheetMetrics.sheetTop).toBeLessThanOrEqual(1);
        expect(shortSheetMetrics.sheetBottom).toBeLessThanOrEqual(609);
        expect(shortSheetMetrics.overflowPx).toBeLessThanOrEqual(4);
        expect(shortSheetMetrics.displays).toEqual(expect.arrayContaining([
            '20/04/2026',
            '12:00',
            '22/04/2026',
            '18:00'
        ]));

        for (const control of shortSheetMetrics.criticalControls.filter((entry) => entry.isVisible)) {
            expect(control.isFullyVisible).toBe(true);
            if (control.isBodyControl) {
                expect(control.widthRatio).toBeGreaterThan(0.72);
            }
            expect(control.height).toBeGreaterThanOrEqual(44);
            expect(control.clipX).toBeLessThanOrEqual(2);
            expect(control.clipY).toBeLessThanOrEqual(2);
        }

        await expectNoConsoleErrors(consoleErrors, 'short mobile fleet filter sheet');
    });

    test('mobile reserve preserves guest progress after reload in step two and still reaches payment', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto(
            '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-12-30&endDate=2027-01-02&pickupTime=10:00&dropoffTime=18:00',
            { waitUntil: 'domcontentloaded' }
        );
        await settlePage(page);

        await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
        await page.locator('#continueToPaymentBtn').click();
        await expect(page.locator('#step2')).toHaveClass(/active/);

        await page.locator('#fullName').fill(reservationGuest.name);
        await page.locator('#passport').fill(reservationGuest.passport);
        await page.locator('#phone').fill(reservationGuest.phone);
        await page.locator('#email').fill(reservationGuest.email);

        await page.reload({ waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await expect(page.locator('#step2')).toHaveClass(/active/);
        await expect(page.locator('#fullName')).toHaveValue(reservationGuest.name);
        await expect(page.locator('#passport')).toHaveValue(reservationGuest.passport);
        await expect(page.locator('#phone')).toHaveValue(reservationGuest.phone);
        await expect(page.locator('#email')).toHaveValue(reservationGuest.email);

        await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();
        await expect(page.locator('#step3')).toHaveClass(/active/);
        await expect(page.locator('#payButton')).toBeVisible();
        await expectNoConsoleErrors(consoleErrors, 'mobile reserve reload recovery');
    });
});
