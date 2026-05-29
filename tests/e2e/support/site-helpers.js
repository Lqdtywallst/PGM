const { expect } = require('@playwright/test');
const fleetCards = require('../../../server/data/fleet-cards.json');

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

function fleetCardsForBrand(brandKey) {
    return fleetCards.filter((card) => card.brandKey === brandKey);
}

function fleetCardsForType(type) {
    return fleetCards.filter((card) => Array.isArray(card.types) && card.types.includes(type));
}

function fleetModelCountLabel(count) {
    return `${count} ${count === 1 ? 'model' : 'models'} visible`;
}

function fleetShowCarsLabel(count) {
    return `Show ${count} ${count === 1 ? 'car' : 'cars'}`;
}

async function expectFleetResultCount(page, count) {
    await expect(page.locator('.js-fleet-results-count')).toContainText(fleetModelCountLabel(count));
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
        const vehicles = fleetCards.map((card) => ({
            id: card.id,
            available: true,
            ...overrides[card.id]
        }));

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
                vehicles
            })
        });
    });
}

module.exports = {
    createConsoleTracker,
    expectFleetResultCount,
    expectNoConsoleErrors,
    fleetCards,
    fleetCardsForBrand,
    fleetCardsForType,
    fleetModelCountLabel,
    fleetShowCarsLabel,
    mockFleetAvailability,
    normalizeConsoleErrors,
    primeHomeAnimations,
    settlePage
};
