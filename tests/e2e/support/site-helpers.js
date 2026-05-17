const { expect } = require('@playwright/test');

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

async function primeHomeAnimations(page) {
    await page.addInitScript(() => {
        window.__siteV2HeroIntroSeen = true;
    });
}

async function settlePage(page, delayMs = 300) {
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

async function mockFleetAvailability(page, overrides = {}) {
    await page.route('**/api/availability?**', async (route) => {
        const requestUrl = new URL(route.request().url());

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'ok',
                schedule: {
                    startDate: requestUrl.searchParams.get('startDate'),
                    endDate: requestUrl.searchParams.get('endDate'),
                    pickupTime: requestUrl.searchParams.get('pickupTime'),
                    dropoffTime: requestUrl.searchParams.get('dropoffTime')
                },
                vehicles: [
                    { id: 'lamborghini-huracan-evo-spyder', available: true },
                    { id: 'ferrari-296-gts', available: true },
                    { id: 'porsche-992-gt3', available: true },
                    { id: 'lamborghini-urus-sport', available: true },
                    { id: 'mercedes-g63-amg', available: true },
                    { id: 'rolls-royce-cullinan-black-badge', available: true }
                ].map((vehicle) => ({ ...vehicle, ...overrides[vehicle.id] }))
            })
        });
    });
}

module.exports = {
    createConsoleTracker,
    expectNoConsoleErrors,
    mockFleetAvailability,
    normalizeConsoleErrors,
    primeHomeAnimations,
    settlePage
};
