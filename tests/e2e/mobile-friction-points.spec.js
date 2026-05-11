const { test, expect } = require('@playwright/test');
const { reservationGuest } = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

async function clickVisibleFilterScrim(page) {
    const point = await page.evaluate(() => {
        const scrim = document.querySelector('.fleet-filter-scrim');
        const sheet = document.querySelector('.fleet-sidebar');

        if (!(scrim instanceof HTMLElement)) {
            return null;
        }

        const sheetRect = sheet instanceof HTMLElement
            ? sheet.getBoundingClientRect()
            : null;
        const candidates = [];

        if (sheetRect && sheetRect.top > 8) {
            candidates.push({ x: window.innerWidth / 2, y: sheetRect.top / 2 });
        }

        if (sheetRect && sheetRect.bottom < window.innerHeight - 8) {
            candidates.push({
                x: window.innerWidth / 2,
                y: sheetRect.bottom + ((window.innerHeight - sheetRect.bottom) / 2)
            });
        }

        candidates.push({ x: 16, y: 16 });

        for (const candidate of candidates) {
            const x = Math.min(window.innerWidth - 4, Math.max(4, candidate.x));
            const y = Math.min(window.innerHeight - 4, Math.max(4, candidate.y));
            const target = document.elementFromPoint(x, y);

            if (target === scrim || target?.closest?.('.fleet-filter-scrim')) {
                return { x, y };
            }
        }

        return null;
    });

    expect(point).toBeTruthy();
    await page.mouse.click(point.x, point.y);
}

async function installStripeMock(page) {
    await page.addInitScript(() => {
        window.Stripe = function StripeMock() {
            return {
                elements() {
                    return {
                        create() {
                            return {
                                mount(selector) {
                                    const container = document.querySelector(selector);
                                    if (container) {
                                        container.setAttribute('data-mock-stripe', 'mounted');
                                    }
                                },
                                on() {}
                            };
                        }
                    };
                },
                async confirmCardPayment() {
                    return {
                        error: null,
                        paymentIntent: {
                            id: 'pi_mock_mobile_reload',
                            status: 'succeeded',
                            amount: 165000
                        }
                    };
                }
            };
        };
    });
}

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
        await expect(page.locator('.fleet-filter-close--top')).toBeVisible();
        await expect(page.locator('.fleet-filter-close--top')).toContainText(/Back to cars/i);
        await page.locator('.js-fleet-brand-select').selectOption('lamborghini');
        await page.locator('.js-fleet-type-select').selectOption('convertible');
        await expect(page.locator('.fleet-sidebar')).toBeVisible();
        await expect(page.locator('.fleet-filter-apply')).toContainText(/Show 1 car/i);
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
        await page.locator('.fleet-filter-apply').click();
        await expect(page.locator('.fleet-browser')).not.toHaveClass(/fleet-filters-open/);
        await expect(page.locator('.js-fleet-card:not([hidden])').first()).toBeVisible();

        await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first().click();

        await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
        await expect(page.locator('#selectedCar')).toContainText('Huracan EVO Spyder');
        await expect(page.locator('#startDate')).toHaveValue('2026-12-20');
        await expect(page.locator('#endDate')).toHaveValue('2026-12-22');
        await expect(page.locator('#pickupTime')).toHaveValue('12:00');
        await expect(page.locator('#dropoffTime')).toHaveValue('13:00');
        await expectNoConsoleErrors(consoleErrors, 'mobile fleet filter sheet handoff');
    });

    test('mobile filter sheet has obvious exits back to fleet results', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('.fleet-mobile-filter-toggle').click();
        await expect(page.locator('.fleet-browser')).toHaveClass(/fleet-filters-open/);
        await expect(page.locator('.fleet-filter-close--top')).toContainText(/Back to cars/i);
        await expect(page.locator('.fleet-filter-apply')).toContainText(/Show 6 cars/i);
        await page.locator('.fleet-filter-close--top').click();
        await expect(page.locator('.fleet-browser')).not.toHaveClass(/fleet-filters-open/);
        await expect(page.locator('.fleet-mobile-filter-toggle')).toBeFocused();

        await page.locator('.fleet-mobile-filter-toggle').click();
        await page.keyboard.press('Escape');
        await expect(page.locator('.fleet-browser')).not.toHaveClass(/fleet-filters-open/);

        await page.locator('.fleet-mobile-filter-toggle').click();
        await expect(page.locator('.fleet-browser')).toHaveClass(/fleet-filters-open/);
        await clickVisibleFilterScrim(page);
        await expect(page.locator('.fleet-browser')).not.toHaveClass(/fleet-filters-open/);
        await expect(page.locator('.js-fleet-card:not([hidden])').first()).toBeVisible();

        await expectNoConsoleErrors(consoleErrors, 'mobile fleet filter exits');
    });

    test('mobile vehicle pages expose a prominent return to fleet', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/lamborghini-huracan-evo-spyder-rental-dubai.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        const returnLink = page.locator('.vehicle-return-link').first();
        await expect(returnLink).toBeVisible();
        await expect(returnLink).toContainText(/Back to fleet/i);
        await expect(returnLink).toContainText(/View all cars/i);

        const metrics = await returnLink.evaluate((link) => {
            const rect = link.getBoundingClientRect();
            return {
                top: rect.top,
                width: rect.width,
                height: rect.height,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight
            };
        });

        expect(metrics.top).toBeGreaterThanOrEqual(0);
        expect(metrics.top).toBeLessThan(metrics.viewportHeight * 0.42);
        expect(metrics.width).toBeGreaterThan(metrics.viewportWidth * 0.84);
        expect(metrics.height).toBeGreaterThanOrEqual(40);

        await returnLink.click();
        await expect(page).toHaveURL(/\/fleet\.html$/i);
        await expect(page.locator('.js-fleet-card').first()).toBeVisible();
        await expectNoConsoleErrors(consoleErrors, 'mobile vehicle return to fleet');
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
                    const controlText = control instanceof HTMLSelectElement
                        ? String(control.selectedOptions[0]?.textContent || control.value || '').replace(/\s+/g, ' ').trim()
                        : String(control.textContent || control.value || '').replace(/\s+/g, ' ').trim();

                    return {
                        className: String(control.className || ''),
                        text: controlText,
                        isVisible,
                        isBodyControl: control.matches('.fleet-sidebar__field-shell, .js-fleet-brand-select, .js-fleet-type-select'),
                        isFullyVisible: rect.top >= 0 && rect.bottom <= viewportHeight,
                        visibleHeight,
                        viewportClipPx: Math.max(0, -rect.top, rect.bottom - viewportHeight),
                        widthRatio: rect.width / Math.max(1, sheetRect.width),
                        height: rect.height,
                        clipX: Math.max(0, control.scrollWidth - control.clientWidth),
                        clipY: Math.max(0, control.scrollHeight - control.clientHeight)
                    };
                });

            return {
                sheetTop: sheetRect.top,
                sheetBottom: sheetRect.bottom,
                sheetHeightRatio: sheetRect.height / Math.max(1, viewportHeight),
                displays,
                criticalControls,
                visibleSelectedFilters: criticalControls
                    .filter((control) => control.isBodyControl && control.isFullyVisible && /js-fleet-(brand|type)-select/.test(control.className))
                    .map((control) => control.text),
                peekingControls: criticalControls
                    .filter((control) => control.visibleHeight > 0 && !control.isFullyVisible)
                    .map((control) => ({
                        className: control.className,
                        text: control.text,
                        visibleHeight: control.visibleHeight,
                        height: control.height,
                        viewportClipPx: control.viewportClipPx
                    })),
                overflowPx: Math.max(0, sidebar.scrollWidth - sidebar.clientWidth)
            };
        });

        expect(shortSheetMetrics.sheetTop).toBeLessThanOrEqual(1);
        expect(shortSheetMetrics.sheetBottom).toBeLessThanOrEqual(609);
        expect(shortSheetMetrics.sheetHeightRatio).toBeLessThanOrEqual(0.94);
        expect(shortSheetMetrics.overflowPx).toBeLessThanOrEqual(4);
        expect(shortSheetMetrics.displays).toEqual(expect.arrayContaining([
            '20/04/2026',
            '12:00',
            '22/04/2026',
            '18:00'
        ]));
        expect(shortSheetMetrics.visibleSelectedFilters).toEqual(expect.arrayContaining([
            'Lamborghini',
            'Convertible'
        ]));
        expect(shortSheetMetrics.peekingControls).toEqual([]);

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

    test('fleet mobile cards avoid embedded contact buttons and keep the global dock visible', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        const card = page.locator('.js-fleet-card:not([hidden])').first();
        await card.scrollIntoViewIfNeeded();
        await settlePage(page, 120);

        const contactBarMetrics = await card.evaluate((element) => {
            const cardRect = element.getBoundingClientRect();
            const primary = element.querySelector('.fleet-card__primary');
            const primaryRect = primary?.getBoundingClientRect();
            const row = element.querySelector('.fleet-card__contact-row');
            const rowRect = row?.getBoundingClientRect();
            const floating = document.querySelector('.lab-floating-contact');
            const floatingRect = floating?.getBoundingClientRect();
            const floatingStyle = floating ? window.getComputedStyle(floating) : null;
            const visibleEmbeddedContactActions = Array.from(element.querySelectorAll('.fleet-card__secondary'))
                .filter((button) => {
                    const rect = button.getBoundingClientRect();
                    const style = window.getComputedStyle(button);
                    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
                });

            return {
                cardWidth: cardRect.width,
                primaryWidth: primaryRect?.width || 0,
                primaryBottomGapPx: primaryRect ? cardRect.bottom - primaryRect.bottom : 0,
                rowWidth: rowRect?.width || 0,
                contactRowVisible: rowRect ? rowRect.width > 0 && rowRect.height > 0 && window.getComputedStyle(row).display !== 'none' : false,
                visibleEmbeddedContactActionCount: visibleEmbeddedContactActions.length,
                floatingOpacity: floatingStyle ? Number.parseFloat(floatingStyle.opacity) : 0,
                floatingOverCardActions: floating ? floating.classList.contains('is-over-card-actions') : false,
                floatingRightGapPx: floatingRect ? window.innerWidth - floatingRect.right : null,
                floatingBottomGapPx: floatingRect ? window.innerHeight - floatingRect.bottom : null
            };
        });

        expect(contactBarMetrics.contactRowVisible).toBe(false);
        expect(contactBarMetrics.visibleEmbeddedContactActionCount).toBe(0);
        expect(contactBarMetrics.primaryWidth / contactBarMetrics.cardWidth).toBeGreaterThanOrEqual(0.78);
        expect(contactBarMetrics.primaryBottomGapPx).toBeGreaterThanOrEqual(12);
        expect(contactBarMetrics.primaryBottomGapPx).toBeLessThanOrEqual(42);
        expect(contactBarMetrics.floatingOverCardActions).toBe(false);
        expect(contactBarMetrics.floatingOpacity).toBeGreaterThanOrEqual(0.75);
        expect(contactBarMetrics.floatingRightGapPx).toBeGreaterThanOrEqual(4);
        expect(contactBarMetrics.floatingRightGapPx).toBeLessThanOrEqual(24);
        expect(contactBarMetrics.floatingBottomGapPx).toBeGreaterThanOrEqual(4);
        expect(contactBarMetrics.floatingBottomGapPx).toBeLessThanOrEqual(24);

        await expectNoConsoleErrors(consoleErrors, 'fleet mobile card contact dock');
    });

    test('mobile reserve clears private details after reload while preserving schedule', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);
        await installStripeMock(page);

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

        await expect(page.locator('#step1')).toHaveClass(/active/);
        await expect(page.locator('#startDate')).toHaveValue('2026-12-30');
        await expect(page.locator('#endDate')).toHaveValue('2027-01-02');
        await expect(page.locator('#pickupTime')).toHaveValue('10:00');
        await expect(page.locator('#dropoffTime')).toHaveValue('18:00');
        await expect(page.locator('#pickupLocation')).toHaveValue('');
        await expect(page.locator('#fullName')).toHaveValue('');
        await expect(page.locator('#passport')).toHaveValue('');
        await expect(page.locator('#phone')).toHaveValue('');
        await expect(page.locator('#email')).toHaveValue('');

        await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
        await page.locator('#continueToPaymentBtn').click();
        await expect(page.locator('#step2')).toHaveClass(/active/);
        await page.locator('#fullName').fill(reservationGuest.name);
        await page.locator('#passport').fill(reservationGuest.passport);
        await page.locator('#phone').fill(reservationGuest.phone);
        await page.locator('#email').fill(reservationGuest.email);

        await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();
        await expect(page.locator('#step3')).toHaveClass(/active/);
        await expect(page.locator('#card-element')).toHaveAttribute('data-mock-stripe', 'mounted');
        await expectNoConsoleErrors(consoleErrors, 'mobile reserve reload recovery');
    });
});
