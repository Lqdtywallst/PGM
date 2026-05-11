const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

async function collectFirstViewportAudit(page) {
    return page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const hero = document.querySelector('.hero-lab');
        const h1 = document.querySelector('h1');
        const primaryCta = document.querySelector('[data-primary-cta], .home-booking__submit, .hero-lab__cta--primary');
        const heroActions = hero ? Array.from(hero.querySelectorAll('a[href], button')) : [];
        const root = document.documentElement;
        const body = document.body;

        function visibleTextCount(element) {
            return (element?.textContent || '').trim().length;
        }

        function rectFor(element) {
            if (!element) {
                return null;
            }

            const rect = element.getBoundingClientRect();
            return {
                top: Number(rect.top.toFixed(2)),
                bottom: Number(rect.bottom.toFixed(2)),
                left: Number(rect.left.toFixed(2)),
                right: Number(rect.right.toFixed(2))
            };
        }

        return {
            viewportWidth,
            viewportHeight,
            h1Count: document.querySelectorAll('h1').length,
            heroActionCount: heroActions.length,
            hasVisualMedia: Boolean(hero && hero.querySelector('img, video, picture')),
            heroRect: rectFor(hero),
            headingRect: rectFor(h1),
            primaryCtaRect: rectFor(primaryCta),
            primaryCtaLabel: (primaryCta?.textContent || '').trim(),
            headingLength: visibleTextCount(h1),
            horizontalOverflowPx: Math.max(
                0,
                root.scrollWidth - viewportWidth,
                (body ? body.scrollWidth : 0) - viewportWidth
            )
        };
    });
}

async function collectSeoLandingViewportAudit(page) {
    return page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        const root = document.documentElement;
        const body = document.body;
        const h1 = document.querySelector('h1');
        const booking = document.querySelector('#vehicle-booking');
        const visibleReservationCta = Array.from(
            document.querySelectorAll(
                '.vehicle-hero__actions .btn-primary, .vehicle-mobile-cta__primary, .cta-row .btn-primary, a.btn-primary[href*="app/reserve/page.html"]'
            )
        ).find((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.top < viewportHeight && rect.bottom > 0;
        });

        function rectFor(element) {
            if (!element) {
                return null;
            }

            const rect = element.getBoundingClientRect();
            return {
                top: Number(rect.top.toFixed(2)),
                bottom: Number(rect.bottom.toFixed(2)),
                left: Number(rect.left.toFixed(2)),
                right: Number(rect.right.toFixed(2))
            };
        }

        return {
            viewportHeight,
            h1Count: document.querySelectorAll('h1').length,
            headingRect: rectFor(h1),
            bookingRect: rectFor(booking),
            reservationCtaRect: rectFor(visibleReservationCta),
            reservationCtaLabel: (visibleReservationCta?.textContent || '').trim(),
            placeholderTextPresent: /gallery slot|add more media/i.test(document.body.innerText),
            horizontalOverflowPx: Math.max(
                0,
                root.scrollWidth - window.innerWidth,
                (body ? body.scrollWidth : 0) - window.innerWidth
            )
        };
    });
}

test('homepage first viewport stays clear and stable', async ({ page }) => {
    await primeHomeAnimations(page);
    const consoleErrors = createConsoleTracker(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settlePage(page);

    const audit = await collectFirstViewportAudit(page);

    expect(audit.h1Count).toBe(1);
    expect(audit.heroActionCount).toBeLessThanOrEqual(2);
    expect(audit.hasVisualMedia).toBeTruthy();
    expect(audit.headingLength).toBeGreaterThanOrEqual(20);
    expect(audit.primaryCtaLabel).toBeTruthy();
    expect(audit.heroRect).not.toBeNull();
    expect(audit.headingRect).not.toBeNull();
    expect(audit.primaryCtaRect).not.toBeNull();
    expect(audit.headingRect.top).toBeLessThan(audit.viewportHeight * 0.65);
    expect(audit.primaryCtaRect.top).toBeLessThan(audit.viewportHeight);
    expect(audit.horizontalOverflowPx).toBeLessThanOrEqual(4);

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-primary-cta]')).toBeVisible();
    await expectNoConsoleErrors(consoleErrors, 'first viewport');
});

const seoLandingViewportCases = [
    { path: '/ferrari-rental-dubai.html', title: 'Ferrari 296 GTS', expectedHeading: 'Ferrari 296 GTS', requireBookingPanel: true },
    { path: '/porsche-rental-dubai.html', title: 'Porsche 992 GT3', expectedHeading: 'Porsche 992 GT3', requireBookingPanel: true },
    { path: '/rolls-royce-rental-dubai.html', title: 'Cullinan Black Badge', expectedHeading: 'Cullinan Black Badge', requireBookingPanel: true },
    { path: '/lamborghini-rental-dubai.html', title: 'Rent a Lamborghini in Dubai', expectedHeading: 'Rent a Lamborghini in Dubai', requireBookingPanel: false },
    { path: '/mercedes-rental-dubai.html', title: 'Mercedes G63 AMG rental Dubai', expectedHeading: 'Mercedes G63 AMG rental Dubai', requireBookingPanel: false }
];

for (const landing of seoLandingViewportCases) {
    test(`${landing.title} keeps the booking path visible in the first viewport`, async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto(landing.path, { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        const audit = await collectSeoLandingViewportAudit(page);

        expect(audit.h1Count).toBe(1);
        expect(audit.headingRect).not.toBeNull();
        expect(audit.headingRect.top).toBeLessThan(audit.viewportHeight * 0.7);
        expect(audit.reservationCtaRect).not.toBeNull();
        expect(audit.reservationCtaRect.top).toBeLessThan(audit.viewportHeight);
        expect(audit.reservationCtaLabel).toBeTruthy();
        expect(audit.placeholderTextPresent).toBeFalsy();
        expect(audit.horizontalOverflowPx).toBeLessThanOrEqual(4);

        if (landing.requireBookingPanel) {
            expect(audit.bookingRect).not.toBeNull();
            expect(audit.bookingRect.top).toBeLessThan(audit.viewportHeight);
        }

        await expect(page.locator('h1')).toContainText(landing.expectedHeading || landing.title);
        if (landing.requireBookingPanel) {
            await expect(page.locator('#vehicle-booking')).toBeVisible();
        }
        await expectNoConsoleErrors(consoleErrors, `${landing.title} first viewport`);
    });
}
