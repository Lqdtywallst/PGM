const { test, expect } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');
const headerConfig = require('../../server/data/global-header.json');

const directHeaderLinks = headerConfig.navItems.filter((item) => item.visible && item.itemType === 'link');
const brandMenu = headerConfig.navItems.find((item) => item.visible && item.label === 'Cars Brands');
const typeMenu = headerConfig.navItems.find((item) => item.visible && item.label === 'Cars Types');

function normalizePath(pathname) {
    return pathname === '/index.html' ? '/' : pathname;
}

function expectedPathPattern(href) {
    const expected = new URL(href, 'http://example.test');
    const normalizedPath = normalizePath(expected.pathname);

    if (normalizedPath === '/') {
        return /\/(?:index\.html)?$/i;
    }

    return new RegExp(`${normalizedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function openHomeSettled(page) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settlePage(page);
}

async function expectHeaderRoute(page, locator, href, label) {
    await locator.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});

    await expect(page, `${label} should navigate to ${href}`).toHaveURL(expectedPathPattern(href));
    await expect(page.locator('h1'), `${label} destination should render a page heading`).toBeVisible();
}

async function openDesktopMega(page, label) {
    const header = page.locator('header.lab-header');
    const trigger = header.getByRole('button', { name: label, exact: true });

    await trigger.click();

    await expect(trigger, `${label} mega menu should be expanded`).toHaveAttribute('aria-expanded', 'true');
    return header;
}

async function openMobileDrawer(page) {
    const toggle = page.locator('.lab-mobile-toggle');
    await toggle.click();

    await expect(toggle, 'mobile menu toggle should reflect open state').toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#lab-mobile-drawer')).toHaveAttribute('aria-hidden', 'false');
    return page.locator('#lab-mobile-drawer');
}

async function expectFleetTypeFilter(page, type, label) {
    await expect(page, `${label} should land on Fleet with type=${type}`).toHaveURL(
        new RegExp(`/fleet\\.html\\?type=${type}$`, 'i')
    );
    await expect(page.locator('.js-fleet-browser')).toBeVisible();
    await expect(page.locator('.js-fleet-type-select'), `${label} should sync the Fleet type select`).toHaveValue(type);

    const visibleCardTypes = await page.locator('.js-fleet-card').evaluateAll((cards) => cards
        .filter((card) => !card.hidden)
        .map((card) => card.dataset.type || ''));

    expect(visibleCardTypes.length, `${label} should leave at least one visible Fleet card`).toBeGreaterThan(0);
    expect(
        visibleCardTypes.every((cardTypes) => cardTypes.split(/\s+/).includes(type)),
        `${label} visible Fleet cards should all match type=${type}`
    ).toBe(true);
}

async function expectContactLinks(scope, prefix = 'Header') {
    await expect(scope.locator('a[href^="tel:"]').first(), `${prefix} call link`).toHaveAttribute('href', 'tel:+971586122568');
    await expect(scope.locator('a[href^="mailto:"]').first(), `${prefix} email link`).toHaveAttribute('href', 'mailto:prestigegoalmotion@gmail.com');
    await expect(scope.locator('a[href^="https://wa.me/"]').first(), `${prefix} WhatsApp link`).toHaveAttribute(
        'href',
        /https:\/\/wa\.me\/971586122568/
    );
}

test('desktop header navigation, brand cards and type filters route correctly', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop header audit only');
    test.slow();

    await primeHomeAnimations(page);
    const consoleErrors = createConsoleTracker(page);

    await openHomeSettled(page);
    await expectContactLinks(page.locator('header.lab-header'));

    await expectHeaderRoute(
        page,
        page.locator('header.lab-header a.lab-brand'),
        '/index.html',
        'Header brand logo'
    );

    for (const link of directHeaderLinks) {
        await openHomeSettled(page);
        await expectHeaderRoute(
            page,
            page.locator('header.lab-header nav.lab-nav').getByRole('link', { name: link.label, exact: true }),
            link.href,
            `Header ${link.label}`
        );
    }

    await openHomeSettled(page);
    await expectHeaderRoute(
        page,
        page.locator('header.lab-header a.lab-reserve'),
        headerConfig.primaryButton.href,
        'Header Reserve'
    );

    for (const card of brandMenu.cards.filter((item) => item.visible)) {
        await openHomeSettled(page);
        const header = await openDesktopMega(page, 'Cars Brands');
        await expectHeaderRoute(
            page,
            header.locator('.lab-nav__panel--brands').getByRole('link', { name: new RegExp(card.title, 'i') }),
            card.href,
            `Cars Brands ${card.title}`
        );
    }

    for (const card of typeMenu.cards.filter((item) => item.visible)) {
        const type = new URL(card.href, 'http://example.test').searchParams.get('type');

        await openHomeSettled(page);
        const header = await openDesktopMega(page, 'Cars Types');
        await header.locator('.lab-nav__panel--types').getByRole('link', { name: new RegExp(card.title, 'i') }).click();
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await expectFleetTypeFilter(page, type, `Cars Types ${card.title}`);
    }

    await expectNoConsoleErrors(consoleErrors, 'desktop full header navigation');
});

test('mobile drawer navigation, brand cards and type filters route correctly', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile drawer audit only');
    test.slow();

    await primeHomeAnimations(page);
    const consoleErrors = createConsoleTracker(page);

    await openHomeSettled(page);
    let drawer = await openMobileDrawer(page);
    await expectContactLinks(drawer, 'Mobile drawer');

    for (const link of directHeaderLinks) {
        await openHomeSettled(page);
        drawer = await openMobileDrawer(page);
        await expectHeaderRoute(
            page,
            drawer.locator('.lab-mobile-drawer__links--nav').getByRole('link', { name: link.label, exact: true }),
            link.href,
            `Mobile drawer ${link.label}`
        );
    }

    await openHomeSettled(page);
    drawer = await openMobileDrawer(page);
    await expectHeaderRoute(
        page,
        drawer.locator('.lab-mobile-drawer__action--primary'),
        headerConfig.primaryButton.href,
        'Mobile drawer Reserve'
    );

    for (const card of brandMenu.cards.filter((item) => item.visible)) {
        await openHomeSettled(page);
        drawer = await openMobileDrawer(page);
        await drawer.locator('[data-mobile-drawer-disclosure="brands"] summary').click();
        await expectHeaderRoute(
            page,
            drawer.locator('[data-mobile-drawer-disclosure="brands"]').getByRole('link', { name: new RegExp(card.title, 'i') }),
            card.href,
            `Mobile drawer Brands ${card.title}`
        );
    }

    for (const card of typeMenu.cards.filter((item) => item.visible)) {
        const type = new URL(card.href, 'http://example.test').searchParams.get('type');

        await openHomeSettled(page);
        drawer = await openMobileDrawer(page);
        await drawer.locator('[data-mobile-drawer-disclosure="browse"] summary').click();
        await drawer.locator('[data-mobile-drawer-disclosure="browse"]').getByRole('link', { name: new RegExp(card.title, 'i') }).click();
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await expectFleetTypeFilter(page, type, `Mobile drawer Browse ${card.title}`);
    }

    await expectNoConsoleErrors(consoleErrors, 'mobile full header navigation');
});
