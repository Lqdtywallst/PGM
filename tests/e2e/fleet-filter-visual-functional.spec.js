const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

const FILTER_VIEWPORTS = [
    { name: 'mobile-360', width: 360, height: 700 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'laptop-1366', width: 1366, height: 768 },
    { name: 'desktop-1600', width: 1600, height: 900 }
];

async function openFilterIfCollapsed(page) {
    const toggle = page.locator('.fleet-mobile-filter-toggle:visible').first();

    if (await toggle.count()) {
        await toggle.click();
        await expect(page.locator('.js-fleet-browser')).toHaveClass(/fleet-filters-open/);
    }
}

async function getFilterMetrics(page) {
    return page.locator('.fleet-sidebar').evaluate((sidebar) => {
        function isVisible(element) {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return rect.width > 0 &&
                rect.height > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity || 1) !== 0;
        }

        function textForControl(control) {
            if (control instanceof HTMLSelectElement) {
                return String(control.selectedOptions[0]?.textContent || control.value || '').trim();
            }

            return String(control.textContent || control.value || control.getAttribute('aria-label') || '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function measuredTextWidth(control, text) {
            const style = getComputedStyle(control);
            const probe = document.createElement('span');
            probe.textContent = style.textTransform === 'uppercase' ? text.toUpperCase() : text;
            probe.style.position = 'fixed';
            probe.style.left = '-9999px';
            probe.style.top = '-9999px';
            probe.style.whiteSpace = 'nowrap';
            probe.style.fontFamily = style.fontFamily;
            probe.style.fontSize = style.fontSize;
            probe.style.fontWeight = style.fontWeight;
            probe.style.letterSpacing = style.letterSpacing;
            document.body.appendChild(probe);
            const width = probe.getBoundingClientRect().width;
            probe.remove();
            return width;
        }

        function controlMetrics(control) {
            const rect = control.getBoundingClientRect();
            const style = getComputedStyle(control);
            const text = textForControl(control);
            const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
            const paddingRight = Number.parseFloat(style.paddingRight) || 0;
            const reservedIconSpace = 0;
            const availableTextWidth = Math.max(0, rect.width - paddingLeft - paddingRight - reservedIconSpace);
            const textWidth = text ? measuredTextWidth(control, text) : 0;

            return {
                tag: control.tagName.toLowerCase(),
                className: String(control.className || ''),
                id: control.id,
                text,
                width: rect.width,
                height: rect.height,
                textTransform: style.textTransform,
                optionTransform: control instanceof HTMLSelectElement
                    ? getComputedStyle(control.options[0]).textTransform
                    : '',
                availableTextWidth,
                textWidth,
                clipX: Math.max(0, control.scrollWidth - control.clientWidth),
                clipY: Math.max(0, control.scrollHeight - control.clientHeight)
            };
        }

        const controls = Array.from(sidebar.querySelectorAll([
            '.fleet-sidebar__topbar select',
            '.fleet-sidebar__topbar button',
            '.fleet-sidebar__field-shell',
            '.fleet-sidebar__body select',
            '.fleet-price-range__input',
            '.fleet-filter-apply',
            '.fleet-filter-close--top'
        ].join(',')))
            .filter(isVisible)
            .map(controlMetrics);

        const fieldDisplays = Array.from(sidebar.querySelectorAll('.fleet-sidebar__field-display'))
            .filter(isVisible)
            .map((display) => ({
                text: String(display.textContent || '').trim(),
                clipX: Math.max(0, display.scrollWidth - display.clientWidth),
                clipY: Math.max(0, display.scrollHeight - display.clientHeight)
            }));

        return {
            pageOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
            sidebarOverflowX: sidebar.scrollWidth > sidebar.clientWidth + 2,
            controls,
            fieldDisplays
        };
    });
}

test.describe('Fleet filter visual and functional audit', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'desktop-chromium',
            'This auditor drives its own viewport matrix.'
        );
    });

    for (const viewport of FILTER_VIEWPORTS) {
        test(`filter works and stays readable on ${viewport.name}`, async ({ page }) => {
            const consoleErrors = createConsoleTracker(page);

            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto('/fleet.html?startDate=2026-05-13&endDate=2026-05-16&pickupTime=12:00&dropoffTime=12:00', {
                waitUntil: 'domcontentloaded'
            });
            await settlePage(page);
            await openFilterIfCollapsed(page);

            await page.locator('#fleet-sort').selectOption('price-asc');
            await page.locator('#fleet-brand-filter').selectOption('lamborghini');
            await page.locator('#fleet-type-filter').selectOption('suv');

            await expect(page.locator('#fleet-sort')).toHaveValue('price-asc');
            await expect(page.locator('#fleet-brand-filter')).toHaveValue('lamborghini');
            await expect(page.locator('#fleet-type-filter')).toHaveValue('suv');
            await expect(page.locator('.js-fleet-card:not([hidden])')).toHaveCount(1);

            const metrics = await getFilterMetrics(page);

            expect(metrics.pageOverflowX).toBe(false);
            expect(metrics.sidebarOverflowX).toBe(false);
            expect(metrics.fieldDisplays.map((entry) => entry.text)).toEqual(expect.arrayContaining([
                '13/05/2026',
                '12:00',
                '16/05/2026'
            ]));

            for (const field of metrics.fieldDisplays) {
                expect(field.text.length).toBeGreaterThan(0);
                expect(field.clipX).toBeLessThanOrEqual(2);
                expect(field.clipY).toBeLessThanOrEqual(2);
            }

            for (const control of metrics.controls) {
                expect(control.width).toBeGreaterThanOrEqual(44);
                expect(control.height).toBeGreaterThanOrEqual(44);
                expect(control.clipX).toBeLessThanOrEqual(2);
                expect(control.clipY).toBeLessThanOrEqual(2);

                if (control.text && !/fleet-filter-close--top/.test(control.className)) {
                    expect(control.textWidth).toBeLessThanOrEqual(control.availableTextWidth + 6);
                }

                if (control.tag === 'select') {
                    expect(control.textTransform).toBe('uppercase');
                    expect(control.optionTransform).toBe('none');
                }
            }

            await page.locator('.js-fleet-reset:visible').first().click();
            await expect(page.locator('#fleet-sort')).toHaveValue('featured');
            await expect(page.locator('#fleet-brand-filter')).toHaveValue('all');
            await expect(page.locator('#fleet-type-filter')).toHaveValue('all');
            await expect(page.locator('.js-fleet-card:not([hidden])')).toHaveCount(6);
            await expectNoConsoleErrors(consoleErrors, `fleet filter ${viewport.name}`);
        });
    }
});
