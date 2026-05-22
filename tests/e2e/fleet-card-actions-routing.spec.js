const { expect, test } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    mockFleetAvailability,
    settlePage
} = require('./support/site-helpers');

const fleetCards = [
    {
        id: 'lamborghini-huracan-evo-spyder',
        detailPath: '/lamborghini-huracan-evo-spyder-rental-dubai.html',
        reserveCar: 'Huracan EVO Spyder',
        fullCar: 'Lamborghini Huracan EVO Spyder',
        price: '3200'
    },
    {
        id: 'ferrari-296-gts',
        detailPath: '/ferrari-296-gts-rental-dubai.html',
        reserveCar: '296 GTS',
        fullCar: 'Ferrari 296 GTS',
        price: '3400'
    },
    {
        id: 'porsche-992-gt3',
        detailPath: '/porsche-992-gt3-rental-dubai.html',
        reserveCar: '992 GT3',
        fullCar: 'Porsche 992 GT3',
        price: '2300'
    },
    {
        id: 'lamborghini-urus-sport',
        detailPath: '/lamborghini-urus-rental-dubai.html',
        reserveCar: 'Urus SE',
        fullCar: 'Lamborghini Urus SE',
        price: '3600'
    },
    {
        id: 'mercedes-g63-amg',
        detailPath: '/mercedes-g63-amg-rental-dubai.html',
        reserveCar: 'G63 AMG',
        fullCar: 'Mercedes G63 AMG',
        price: '1990'
    },
    {
        id: 'rolls-royce-cullinan-black-badge',
        detailPath: '/rolls-royce-cullinan-black-badge-rental-dubai.html',
        reserveCar: 'Cullinan Black Badge',
        fullCar: 'Rolls-Royce Cullinan Black Badge',
        price: '3750'
    }
];

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
            const consoleErrors = createConsoleTracker(page);
            await mockFleetAvailability(page);

            await openFleet(page);
            const card = page.locator(`.js-fleet-card[data-id="${fleetCard.id}"]`);
            await expect(card).toHaveAttribute('data-detail-href', `.${fleetCard.detailPath}`);
            await expect(card.locator('.fleet-card__media')).toHaveAttribute('href', `.${fleetCard.detailPath}`);
            await expect(card.locator('.fleet-card__title a')).toHaveAttribute('href', `.${fleetCard.detailPath}`);

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
            expect(reserveUrl.pathname).toBe('/app/reserve/page.html');
            expect(reserveUrl.searchParams.get('car')).toBe(fleetCard.reserveCar);
            expect(reserveUrl.searchParams.get('price')).toBe(fleetCard.price);

            await Promise.all([
                page.waitForURL((url) => url.pathname === '/app/reserve/page.html', { waitUntil: 'commit' }),
                card.locator('.fleet-card__reserve').click()
            ]);
            const clickedReserveUrl = new URL(page.url());
            expect(clickedReserveUrl.searchParams.get('car')).toBe(fleetCard.reserveCar);
            expect(clickedReserveUrl.searchParams.get('price')).toBe(fleetCard.price);

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
