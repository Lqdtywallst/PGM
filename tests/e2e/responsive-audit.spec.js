const { test, expect } = require('@playwright/test');
const { getViewportCoverageMatrix } = require('../../server/design-system/design-system-contract');

const responsiveViewports = getViewportCoverageMatrix('responsive');

const overlayAuditViewports = [
    'mobile-short',
    'tablet-portrait',
    'laptop'
].map((name) => responsiveViewports.find((viewport) => viewport.name === name)).filter(Boolean);

const responsivePages = [
    {
        path: '/',
        name: 'home',
        expectsVisibleH1: true,
        primary: (page) => page.getByRole('button', { name: /Start with dates/i })
    },
    {
        path: '/fleet.html',
        name: 'fleet',
        expectsVisibleH1: true,
        primary: (page) => page.locator('.js-fleet-card').first()
    },
    {
        path: '/locations.html',
        name: 'locations',
        expectsVisibleH1: true,
        primary: (page) => page.getByRole('link', { name: /Start reservation/i }).first()
    },
    {
        path: '/services.html',
        name: 'services',
        expectsVisibleH1: true,
        primary: (page) => page.getByRole('link', { name: /Open reservation flow/i }).first()
    },
    {
        path: '/contact.html',
        name: 'contact',
        expectsVisibleH1: true,
        primary: (page) => page.locator('#contactForm')
    },
    {
        path: '/app/reserve/page.html',
        name: 'reserve',
        expectsVisibleH1: true,
        primary: (page) => page.locator('#pickupLocation')
    },
    {
        path: '/ferrari-296-gts-rental-dubai.html',
        name: 'vehicle-pdp',
        expectsVisibleH1: true,
        primary: (page) => page.locator('.vehicle-booking__submit')
    },
    {
        path: '/supercar-rental-dubai.html',
        name: 'seo-landing',
        expectsVisibleH1: true,
        primary: (page) => page.getByRole('link', { name: /^(Start reservation|Reserve)$/ }).first()
    }
];

function createConsoleTracker(page) {
    const errors = [];
    page.on('console', (message) => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });
    page.on('pageerror', (error) => {
        errors.push(error.message);
    });
    return errors;
}

function normalizeConsoleErrors(errors) {
    return errors.filter((entry) => entry && !/favicon\.ico/i.test(entry));
}

async function expectNoConsoleErrors(errors, label) {
    await expect(
        normalizeConsoleErrors(errors),
        `${label} should render without console errors`
    ).toEqual([]);
}

async function captureAuditScreenshot(page, testInfo, name, fullPage = true) {
    const screenshotPath = testInfo.outputPath(`${name}.jpeg`);

    try {
        await page.screenshot({
            path: screenshotPath,
            type: 'jpeg',
            quality: 70,
            fullPage,
            animations: 'disabled',
            caret: 'hide'
        });
    } catch (error) {
        if (!/captureScreenshot|Unable to capture screenshot/i.test(String(error && error.message))) {
            throw error;
        }

        await testInfo.attach(`${name}-screenshot-fallback.txt`, {
            body: Buffer.from(`Full-page screenshot failed, falling back to viewport capture.\n${error.message}`),
            contentType: 'text/plain'
        });

        await page.screenshot({
            path: screenshotPath,
            type: 'jpeg',
            quality: 70,
            fullPage: false,
            animations: 'disabled',
            caret: 'hide'
        });
    }
}

async function attachAuditData(testInfo, name, audit) {
    await testInfo.attach(`${name}-metrics.json`, {
        body: Buffer.from(JSON.stringify(audit, null, 2)),
        contentType: 'application/json'
    });
}

function buildContextOptions(viewport) {
    return {
        viewport: {
            width: viewport.width,
            height: viewport.height
        },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        deviceScaleFactor: viewport.deviceScaleFactor,
        reducedMotion: 'reduce'
    };
}

async function settlePage(page, delayMs = 500) {
    await page.addStyleTag({
        content: `
            *, *::before, *::after {
                animation-duration: 0s !important;
                animation-delay: 0s !important;
                transition-duration: 0s !important;
                transition-delay: 0s !important;
                scroll-behavior: auto !important;
            }
        `
    });

    await page.waitForTimeout(delayMs);
}

async function collectResponsiveAudit(page) {
    return page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const doc = document.documentElement;
        const body = document.body;
        const meaningfulTags = new Set([
            'a', 'button', 'input', 'select', 'textarea', 'label',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'li', 'dt', 'dd', 'strong', 'small', 'summary'
        ]);

        function getClassText(element) {
            if (typeof element.className === 'string') {
                return element.className;
            }

            return '';
        }

        function isVisible(element) {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) {
                return false;
            }

            if (rect.width < 12 || rect.height < 12) {
                return false;
            }

            return true;
        }

        function isWithinHorizontalScroller(element) {
            let current = element.parentElement;

            while (current && current !== document.body) {
                const style = window.getComputedStyle(current);
                const hasHorizontalScroller = /(auto|scroll)/.test(style.overflowX) &&
                    current.scrollWidth > current.clientWidth + 4;

                if (hasHorizontalScroller) {
                    return true;
                }

                current = current.parentElement;
            }

            return false;
        }

        function isMeaningfulCandidate(element) {
            const tagName = element.tagName.toLowerCase();
            const classText = getClassText(element);

            if (element.getAttribute('aria-hidden') === 'true' || /\bskip-link\b/i.test(classText)) {
                return false;
            }

            if (meaningfulTags.has(tagName)) {
                return true;
            }

            return /(card|cta|form|field|copy|actions|summary|booking|route|zone)/i.test(classText);
        }

        function buildElementLabel(element) {
            const tagName = element.tagName.toLowerCase();
            const idPart = element.id ? `#${element.id}` : '';
            const classText = getClassText(element)
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 3)
                .map((token) => `.${token}`)
                .join('');
            const text = (element.innerText || element.textContent || '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 80);

            return `${tagName}${idPart}${classText}${text ? ` :: ${text}` : ''}`;
        }

        const offenders = Array.from(document.querySelectorAll('body *'))
            .filter((element) => element instanceof HTMLElement)
            .filter((element) => isMeaningfulCandidate(element))
            .filter((element) => isVisible(element))
            .filter((element) => !isWithinHorizontalScroller(element))
            .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                    label: buildElementLabel(element),
                    left: Number(rect.left.toFixed(2)),
                    right: Number(rect.right.toFixed(2)),
                    width: Number(rect.width.toFixed(2)),
                    overflowLeft: Number(Math.max(0, -rect.left).toFixed(2)),
                    overflowRight: Number(Math.max(0, rect.right - viewportWidth).toFixed(2))
                };
            })
            .filter((entry) => entry.overflowLeft > 4 || entry.overflowRight > 4)
            .sort((left, right) => (right.overflowLeft + right.overflowRight) - (left.overflowLeft + left.overflowRight))
            .slice(0, 10);

        return {
            viewportWidth,
            viewportHeight,
            documentScrollWidth: doc.scrollWidth,
            bodyScrollWidth: body ? body.scrollWidth : 0,
            horizontalOverflowPx: Math.max(
                0,
                doc.scrollWidth - viewportWidth,
                (body ? body.scrollWidth : 0) - viewportWidth
            ),
            offenders
        };
    });
}

async function runResponsiveAudit({ browser, pageEntry, viewport, testInfo }) {
    const context = await browser.newContext(buildContextOptions(viewport));
    const page = await context.newPage();

    await page.addInitScript(() => {
        window.__siteV2HeroIntroSeen = true;
    });

    const consoleErrors = createConsoleTracker(page);
    const auditLabel = `${pageEntry.name}-${viewport.name}`;

    try {
        await page.goto(pageEntry.path, { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        if (pageEntry.expectsVisibleH1) {
            await expect(page.locator('h1').first(), `${auditLabel} should show a visible h1`).toBeVisible();
        } else {
            await expect(
                page.locator('h1'),
                `${auditLabel} should keep at most one h1`
            ).toHaveCount(0);
        }

        await expect(
            pageEntry.primary(page),
            `${auditLabel} should keep its primary element visible`
        ).toBeVisible();

        const audit = await collectResponsiveAudit(page);
        await attachAuditData(testInfo, auditLabel, audit);
        await captureAuditScreenshot(page, testInfo, auditLabel);

        expect(
            audit.horizontalOverflowPx,
            `${auditLabel} should not create horizontal page overflow`
        ).toBeLessThanOrEqual(4);
        expect(
            audit.offenders,
            `${auditLabel} should not push meaningful content outside the viewport`
        ).toEqual([]);

        await expectNoConsoleErrors(consoleErrors, auditLabel);
    } finally {
        await context.close();
    }
}

test.describe('Responsive audit matrix', () => {
    test.beforeEach(({}, testInfo) => {
        test.setTimeout(45000);
        test.skip(
            testInfo.project.name !== 'desktop-chromium',
            'Responsive audit manages its own device matrix inside a single browser project.'
        );
    });

    for (const viewport of responsiveViewports) {
        for (const pageEntry of responsivePages) {
            test(`${pageEntry.name} fits ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ browser }, testInfo) => {
                await runResponsiveAudit({
                    browser,
                    pageEntry,
                    viewport,
                    testInfo
                });
            });
        }
    }

    for (const viewport of overlayAuditViewports) {
        test(`home booking overlay stays usable on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ browser }, testInfo) => {
            const context = await browser.newContext(buildContextOptions(viewport));
            const page = await context.newPage();

            await page.addInitScript(() => {
                window.__siteV2HeroIntroSeen = true;
            });

            const consoleErrors = createConsoleTracker(page);
            const auditLabel = `home-overlay-${viewport.name}`;

            try {
                await page.goto('/', { waitUntil: 'domcontentloaded' });
                await settlePage(page);

                await page.getByRole('button', { name: /Start with dates/i }).click();
                await expect(page.locator('#hero-lab-overlay')).toHaveAttribute('aria-hidden', 'false');
                await expect(page.locator('#hero-lab-pickup-date')).toBeVisible();
                await expect(page.locator('#hero-lab-return-date')).toBeVisible();
                await expect(page.getByRole('button', { name: /Search vehicles/i })).toBeVisible();

                const audit = await collectResponsiveAudit(page);
                await attachAuditData(testInfo, auditLabel, audit);
                await captureAuditScreenshot(page, testInfo, auditLabel, false);

                expect(
                    audit.horizontalOverflowPx,
                    `${auditLabel} should not create horizontal overflow`
                ).toBeLessThanOrEqual(4);
                expect(
                    audit.offenders,
                    `${auditLabel} should keep meaningful overlay content inside the viewport`
                ).toEqual([]);

                await expectNoConsoleErrors(consoleErrors, auditLabel);
            } finally {
                await context.close();
            }
        });
    }
});
