const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    settlePage
} = require('./support/site-helpers');

const firstViewportMatrix = [
    { name: 'mobile-small', width: 360, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    { name: 'mobile-modern', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    { name: 'tablet-portrait', width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    { name: 'laptop', width: 1366, height: 768, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
    { name: 'desktop-wide', width: 1707, height: 893, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }
];

const firstViewportPages = [
    {
        path: '/',
        name: 'home',
        section: '.hero-lab',
        heading: 'h1',
        primary: '.hero-lab__cta--primary',
        secondary: null,
        minimumHeroFillRatio: 0.45,
        requirePrimaryInViewport: true
    },
    {
        path: '/fleet.html',
        name: 'fleet',
        section: '.fleet-browser__hero',
        heading: '.fleet-browser__hero-copy h1',
        primary: '.fleet-browser__hero-copy h1',
        secondary: null,
        minimumHeroFillRatio: 0.42,
        requirePrimaryInViewport: true
    },
    {
        path: '/locations.html',
        name: 'locations',
        section: '.locations-hero',
        heading: '.locations-hero h1',
        primary: '.locations-button--primary',
        secondary: null,
        minimumHeroFillRatio: 0.45,
        requirePrimaryInViewport: false
    },
    {
        path: '/services.html',
        name: 'services',
        section: '.services-hero',
        heading: 'h1[data-service-title], .services-hero h1',
        primary: '.services-hero__selector .services-lane-orb',
        secondary: null,
        minimumHeroFillRatio: 0.45,
        requirePrimaryInViewport: true
    },
    {
        path: '/about.html',
        name: 'about',
        section: '.about-hero',
        heading: '.about-hero h1',
        primary: '.about-button--primary',
        secondary: null,
        minimumHeroFillRatio: 0.45,
        requirePrimaryInViewport: true
    },
    {
        path: '/contact.html',
        name: 'contact',
        section: '.contact-hero',
        heading: '.contact-hero h1',
        primary: '.contact-button--primary',
        secondary: null,
        minimumHeroFillRatio: 0.45,
        requirePrimaryInViewport: false
    }
];

async function collectViewportAudit(page, selectors) {
    return page.evaluate((input) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const root = document.documentElement;
        const body = document.body;

        function elementFor(selector) {
            return Array.from(document.querySelectorAll(selector)).find((element) => {
                const style = window.getComputedStyle(element);
                const rect = element.getBoundingClientRect();

                return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
            }) || null;
        }

        function rectFor(selector) {
            const element = elementFor(selector);

            if (!element) {
                return null;
            }

            const rect = element.getBoundingClientRect();
            return {
                top: Number(rect.top.toFixed(2)),
                right: Number(rect.right.toFixed(2)),
                bottom: Number(rect.bottom.toFixed(2)),
                left: Number(rect.left.toFixed(2)),
                width: Number(rect.width.toFixed(2)),
                height: Number(rect.height.toFixed(2))
            };
        }

        function textFor(selector) {
            return (elementFor(selector)?.textContent || '').replace(/\s+/g, ' ').trim();
        }

        const sectionRect = rectFor(input.section);
        const headingRect = rectFor(input.heading);
        const primaryRect = rectFor(input.primary);
        const selectorRect = rectFor('.services-hero__selector');
        const featureRect = rectFor('.services-hero__feature');
        const locationsSummaryRect = rectFor('.locations-hero__summary');
        const locationsMapRect = rectFor('.locations-map-card');
        const locationsZoneListRect = rectFor('.locations-hero__zone-list');
        const secondaryRect = input.secondary ? rectFor(input.secondary) : null;

        return {
            viewportWidth,
            viewportHeight,
            heroTop: sectionRect ? sectionRect.top : null,
            heroHeight: sectionRect ? sectionRect.height : null,
            horizontalOverflowPx: Math.max(
                0,
                root.scrollWidth - viewportWidth,
                (body ? body.scrollWidth : 0) - viewportWidth
            ),
            headingRect,
            primaryRect,
            selectorRect,
            featureRect,
            locationsSummaryRect,
            locationsMapRect,
            locationsZoneListRect,
            secondaryRect,
            headingText: textFor(input.heading),
            primaryText: textFor(input.primary)
        };
    }, selectors);
}

async function runFirstViewportMatrix({ browser, viewport, pageEntry }) {
    const context = await browser.newContext({
        viewport: {
            width: viewport.width,
            height: viewport.height
        },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        deviceScaleFactor: viewport.deviceScaleFactor,
        reducedMotion: 'reduce'
    });

    const routePage = await context.newPage();
    const consoleErrors = createConsoleTracker(routePage);
    const auditLabel = `${pageEntry.name}-${viewport.name}`;

    try {
        await routePage.goto(pageEntry.path, { waitUntil: 'domcontentloaded' });
        await settlePage(routePage);

        const audit = await collectViewportAudit(routePage, {
            section: pageEntry.section,
            heading: pageEntry.heading,
            primary: pageEntry.primary,
            secondary: pageEntry.secondary
        });

        expect(audit.headingRect).not.toBeNull();
        expect(audit.primaryRect).not.toBeNull();
        expect(audit.headingText.length).toBeGreaterThan(8);
        expect(audit.primaryText.length).toBeGreaterThan(4);

        expect(audit.heroTop).toBeLessThan(audit.viewportHeight * 0.5);
        expect(audit.heroHeight).toBeGreaterThan(audit.viewportHeight * pageEntry.minimumHeroFillRatio);
        expect(audit.headingRect.top).toBeLessThan(audit.viewportHeight * 0.75);
        if (pageEntry.requirePrimaryInViewport) {
            expect(audit.primaryRect.top).toBeLessThan(audit.viewportHeight);
        } else {
            expect(audit.primaryRect.top).toBeLessThan(audit.viewportHeight * 1.5);
        }
        if (pageEntry.name === 'services' && viewport.width >= 861) {
            expect(audit.selectorRect).not.toBeNull();
            expect(audit.featureRect).not.toBeNull();
            expect(audit.selectorRect.top).toBeLessThan(audit.viewportHeight * 0.32);
            expect(audit.selectorRect.bottom).toBeLessThanOrEqual(audit.viewportHeight * 0.58);
            expect(audit.featureRect.top).toBeGreaterThanOrEqual(audit.viewportHeight * 0.4);
            expect(audit.featureRect.height).toBeGreaterThan(audit.viewportHeight * 0.34);
        }
        if (pageEntry.name === 'locations' && viewport.width >= 1181) {
            expect(audit.locationsSummaryRect).not.toBeNull();
            expect(audit.locationsMapRect).not.toBeNull();
            expect(audit.locationsZoneListRect).not.toBeNull();
            expect(audit.locationsSummaryRect.left).toBeLessThan(audit.locationsMapRect.left);
            expect(audit.locationsSummaryRect.top).toBeLessThan(audit.viewportHeight * 0.25);
            expect(audit.locationsMapRect.top).toBeLessThan(audit.viewportHeight * 0.2);
            expect(audit.locationsSummaryRect.bottom).toBeLessThanOrEqual(audit.viewportHeight + 4);
            expect(audit.locationsMapRect.bottom).toBeLessThanOrEqual(audit.viewportHeight + 4);
            expect(audit.locationsZoneListRect.bottom).toBeLessThanOrEqual(audit.viewportHeight + 4);
            expect(audit.locationsMapRect.width).toBeGreaterThan(audit.viewportWidth * 0.38);
        }
        expect(audit.horizontalOverflowPx).toBeLessThanOrEqual(4);

        await expect(routePage.locator(pageEntry.section).first(), auditLabel + ' section visible').toBeVisible();
        await expect(routePage.locator(pageEntry.heading).first(), auditLabel + ' heading visible').toBeVisible();
        await expect(routePage.locator(pageEntry.primary).first(), auditLabel + ' primary action visible').toBeVisible();
        if (pageEntry.name === 'contact') {
            await expect(routePage.locator('#contactForm').first(), auditLabel + ' contact form visible').toBeVisible();
        }

        await expectNoConsoleErrors(consoleErrors, auditLabel);
    } finally {
        await context.close();
    }
}

test.describe('First viewport matrix for all main tabs', () => {
    test.beforeEach(({}, testInfo) => {
        test.setTimeout(45000);
        test.skip(
            testInfo.project.name !== 'desktop-chromium',
            'Route matrix is executed only once in dedicated desktop project context.'
        );
    });

    for (const viewport of firstViewportMatrix) {
        for (const pageEntry of firstViewportPages) {
            test(
                `${pageEntry.name} keeps first section above fold in ${viewport.name} (${viewport.width}x${viewport.height})`,
                async ({ browser }) => {
                    await runFirstViewportMatrix({ browser, viewport, pageEntry });
                }
            );
        }
    }
});
