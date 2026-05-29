const { expect, test } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    mockFleetAvailability,
    settlePage
} = require('./support/site-helpers');
const fleetCardCatalog = require('../../server/data/fleet-cards.json');

function vehicleDisplayName(card) {
    const whatsappVehicleMatch = card.contact?.whatsappText?.match(/interested in the (.*?) in Dubai/i);

    return (whatsappVehicleMatch?.[1] || `${card.brand} ${card.copy.title}`).replace(/\s+/g, ' ').trim();
}

const fleetCards = fleetCardCatalog.map((card) => ({
    id: card.id,
    detailHref: card.href,
    detailPath: new URL(card.href, 'https://example.test/fleet.html').pathname,
    fullCar: vehicleDisplayName(card)
}));

async function openFleet(page) {
    await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
    await settlePage(page);
}

async function expectClickNavigatesTo(page, locator, expectedPath) {
    await Promise.all([
        page.waitForURL((url) => url.pathname === expectedPath, { waitUntil: 'commit' }),
        locator.click()
    ]);

    expect(new URL(page.url()).pathname).toBe(expectedPath);
}

test.describe('Fleet card action routing', () => {
    for (const fleetCard of fleetCards) {
        test(`${fleetCard.fullCar} card actions keep the customer on the intended flow`, async ({ page }) => {
            test.setTimeout(60000);
            const consoleErrors = createConsoleTracker(page);
            await mockFleetAvailability(page);

            await openFleet(page);
            const card = page.locator(`.js-fleet-card[data-id="${fleetCard.id}"]`);
            await expect(card).toHaveAttribute('data-detail-href', fleetCard.detailHref);
            await expect(card.locator('.fleet-card__media')).toHaveAttribute('href', fleetCard.detailHref);
            await expect(card.locator('.fleet-card__title a')).toHaveAttribute('href', fleetCard.detailHref);

            await expectClickNavigatesTo(page, card.locator('.fleet-card__media'), fleetCard.detailPath);

            await openFleet(page);
            await expectClickNavigatesTo(page, card.locator('.fleet-card__title a'), fleetCard.detailPath);

            await openFleet(page);
            await expectClickNavigatesTo(page, card.locator('.fleet-card__spec').first(), fleetCard.detailPath);

            await openFleet(page);
            await Promise.all([
                page.waitForURL((url) => url.pathname === fleetCard.detailPath, { waitUntil: 'commit' }),
                card.press('Enter')
            ]);
            expect(new URL(page.url()).pathname).toBe(fleetCard.detailPath);

            await openFleet(page);
            const reserveHref = await card.locator('.fleet-card__reserve').getAttribute('href');
            const reserveUrl = new URL(reserveHref, page.url());
            const expectedReserveCar = await card.getAttribute('data-car-name');
            const expectedReservePrice = await card.getAttribute('data-price');

            expect(expectedReserveCar).toBeTruthy();
            expect(expectedReservePrice).toBeTruthy();
            expect(reserveUrl.pathname).toBe('/app/reserve/page.html');
            expect(reserveUrl.searchParams.get('car')).toBe(expectedReserveCar);
            expect(reserveUrl.searchParams.get('price')).toBe(expectedReservePrice);

            await Promise.all([
                page.waitForURL((url) => url.pathname === '/app/reserve/page.html', { waitUntil: 'commit' }),
                card.locator('.fleet-card__reserve').click()
            ]);
            const clickedReserveUrl = new URL(page.url());
            expect(clickedReserveUrl.searchParams.get('car')).toBe(expectedReserveCar);
            expect(clickedReserveUrl.searchParams.get('price')).toBe(expectedReservePrice);

            await openFleet(page);
            await expect(card.locator('.fleet-card__secondary')).toHaveCount(0);
            await expect(page.locator('.lab-floating-contact__button--call')).toBeVisible();
            await expect(page.locator('.lab-floating-contact__button--call')).toHaveAttribute('href', 'tel:+971586122568');
            await expect(page.locator('.lab-floating-contact__button--wa')).toBeVisible();
            await expect(page.locator('.lab-floating-contact__button--wa')).toHaveAttribute('href', /https:\/\/wa\.me\/971586122568/);

            await expectNoConsoleErrors(consoleErrors, `${fleetCard.fullCar} Fleet card actions`);
        });
    }
});
