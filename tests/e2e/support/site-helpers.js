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

module.exports = {
    createConsoleTracker,
    expectNoConsoleErrors,
    normalizeConsoleErrors,
    primeHomeAnimations,
    settlePage
};
