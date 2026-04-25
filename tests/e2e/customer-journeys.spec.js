const { test, expect } = require('@playwright/test');
const { reservationGuest } = require('../../test-data/users.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

async function getVisibleFleetTitles(page) {
    const titles = await page.locator('.js-fleet-card:not([hidden]) .fleet-card__title a').allTextContents();
    return titles.map((title) => title.trim()).filter(Boolean);
}

async function openBrandLandingFromMegaMenu(page, landingPathname) {
    await primeHomeAnimations(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settlePage(page);
    await page.getByRole('button', { name: 'Cars Brands' }).click();
    await page.locator(`#lab-nav-brands-panel a[href$="${landingPathname}"]`).click();
}

async function fillVehicleAvailabilityWindow(page, bookingWindow) {
    await page.locator('input[name="startDate"]').fill(bookingWindow.startDate);
    await page.locator('input[name="endDate"]').fill(bookingWindow.endDate);
    await page.locator('input[name="pickupTime"]').fill(bookingWindow.pickupTime);
    await page.locator('input[name="dropoffTime"]').fill(bookingWindow.dropoffTime);
}

async function expectReservationPrefill(page, reservationIntent) {
    await expect(page).toHaveURL(/\/app\/reserve\/page\.html\?/i);
    await expect(page.locator('#selectedCar')).toHaveText(reservationIntent.selectedCar);
    await expect(page.locator('#selectedCarRate')).toContainText(reservationIntent.selectedRate);

    if (reservationIntent.startDate) {
        await expect(page.locator('#startDate')).toHaveValue(reservationIntent.startDate);
    }

    if (reservationIntent.endDate) {
        await expect(page.locator('#endDate')).toHaveValue(reservationIntent.endDate);
    }

    if (reservationIntent.pickupTime) {
        await expect(page.locator('#pickupTime')).toHaveValue(reservationIntent.pickupTime);
    }

    if (reservationIntent.dropoffTime) {
        await expect(page.locator('#dropoffTime')).toHaveValue(reservationIntent.dropoffTime);
    }
}

async function fillReservationGuestDetails(page, guest) {
    await page.locator('#fullName').fill(guest.name);
    await page.locator('#passport').fill(guest.passport);
    await page.locator('#phone').fill(guest.phone);
    await page.locator('#email').fill(guest.email);
}

async function installStripeMock(page) {
    await page.addInitScript(() => {
        window.Stripe = function StripeMock() {
            return {
                elements() {
                    return {
                        create() {
                            return {
                                mount(selector) {
                                    const container = document.querySelector(selector);
                                    if (container) {
                                        container.setAttribute('data-mock-stripe', 'mounted');
                                    }
                                },
                                on() {}
                            };
                        }
                    };
                },
                async confirmCardPayment(clientSecret) {
                    return {
                        error: null,
                        paymentIntent: {
                            id: 'pi_mock_customer_checkout',
                            status: 'succeeded',
                            amount: 165000,
                            client_secret: clientSecret
                        }
                    };
                }
            };
        };
    });
}

const directBrandAvailabilityJourneys = [
    {
        brandLabel: 'Ferrari',
        landingPathname: 'ferrari-rental-dubai.html',
        landingUrl: /\/ferrari-rental-dubai\.html$/i,
        landingHeading: 'Ferrari 296 GTS',
        reservationIntent: {
            selectedCar: 'Ferrari 296 GTS',
            selectedRate: '3,400',
            startDate: '2026-08-04',
            endDate: '2026-08-06',
            pickupTime: '13:00',
            dropoffTime: '11:00'
        }
    },
    {
        brandLabel: 'Porsche',
        landingPathname: 'porsche-rental-dubai.html',
        landingUrl: /\/porsche-rental-dubai\.html$/i,
        landingHeading: 'Porsche 992 GT3',
        reservationIntent: {
            selectedCar: 'Porsche 992 GT3',
            selectedRate: '2,100',
            startDate: '2026-08-09',
            endDate: '2026-08-11',
            pickupTime: '10:30',
            dropoffTime: '16:30'
        }
    },
    {
        brandLabel: 'Rolls-Royce',
        landingPathname: 'rolls-royce-rental-dubai.html',
        landingUrl: /\/rolls-royce-rental-dubai\.html$/i,
        landingHeading: 'Cullinan Black Badge',
        reservationIntent: {
            selectedCar: 'Rolls-Royce Cullinan Black Badge',
            selectedRate: '3,750',
            startDate: '2026-08-16',
            endDate: '2026-08-18',
            pickupTime: '12:00',
            dropoffTime: '18:00'
        }
    }
];

test('guest explores tabs and opens the Mercedes SEO landing from the mega menu', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Mega menu journey is desktop-first');

    await primeHomeAnimations(page);
    const consoleErrors = createConsoleTracker(page);

    const customerRoute = [
        { label: 'Services', expectedPath: /\/services\.html$/i },
        { label: 'Locations', expectedPath: /\/locations\.html$/i },
        { label: 'Fleet', expectedPath: /\/fleet\.html$/i },
        { label: 'About Us', expectedPath: /\/about\.html$/i }
    ];

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await settlePage(page);

    for (const route of customerRoute) {
        await page.getByRole('link', { name: route.label }).first().click();
        await expect(page).toHaveURL(route.expectedPath);
        await expect(page.locator('h1')).toBeVisible();
    }

    await openBrandLandingFromMegaMenu(page, 'mercedes-rental-dubai.html');

    await expect(page).toHaveURL(/\/mercedes-rental-dubai\.html$/i);
    await expect(page.locator('h1')).toContainText('Mercedes G63 AMG rental Dubai');
    await page.getByRole('link', { name: /open g63 detail page/i }).click();
    await expect(page).toHaveURL(/\/mercedes-g63-amg-rental-dubai\.html$/i);
    await expect(page.locator('h1')).toContainText('Mercedes G63 AMG');

    await expectNoConsoleErrors(consoleErrors, 'customer browsing tabs and brands');
});

for (const journey of directBrandAvailabilityJourneys) {
    test(`guest opens the ${journey.brandLabel} SEO landing from the mega menu and carries dates into reserve`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Mega menu journey is desktop-first');

        const consoleErrors = createConsoleTracker(page);

        await openBrandLandingFromMegaMenu(page, journey.landingPathname);
        await expect(page).toHaveURL(journey.landingUrl);
        await expect(page.locator('h1')).toContainText(journey.landingHeading);
        await expect(page.locator('#vehicle-booking')).toBeVisible();

        await fillVehicleAvailabilityWindow(page, journey.reservationIntent);
        await page.locator('#vehicle-booking').getByRole('button', { name: /Check availability/i }).click();

        await expectReservationPrefill(page, journey.reservationIntent);
        await expectNoConsoleErrors(consoleErrors, `${journey.brandLabel} seo landing to reserve`);
    });
}

test('guest compares Lamborghini models from the SEO landing and starts reserve from the chosen card', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Mega menu journey is desktop-first');

    const consoleErrors = createConsoleTracker(page);

    await openBrandLandingFromMegaMenu(page, 'lamborghini-rental-dubai.html');
    await expect(page).toHaveURL(/\/lamborghini-rental-dubai\.html$/i);
    await expect(page.locator('h1')).toContainText('Rent a Lamborghini in Dubai');

    const modelCards = page.locator('.model-card');
    await expect(modelCards).toHaveCount(2);
    await expect(modelCards.filter({ hasText: 'Lamborghini Huracan EVO Spyder' })).toBeVisible();
    await expect(modelCards.filter({ hasText: 'Lamborghini Urus Sport' })).toBeVisible();

    await modelCards
        .filter({ hasText: 'Lamborghini Huracan EVO Spyder' })
        .getByRole('link', { name: 'Book' })
        .click();

    await expectReservationPrefill(page, {
        selectedCar: 'Lamborghini Huracan EVO Spyder',
        selectedRate: '3,200'
    });
    await expectNoConsoleErrors(consoleErrors, 'lamborghini brand comparison to reserve');
});

test('guest compares Ferrari and Mercedes in fleet before opening reserve', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
    await settlePage(page);

    await page.locator('#fleet-pickup-date').fill('2026-05-20');
    await page.locator('#fleet-return-date').fill('2026-05-22');
    await page.locator('#fleet-pickup-time').fill('10:00');
    await page.locator('#fleet-return-time').fill('18:00');

    await page.locator('.js-fleet-brand-select').selectOption('ferrari');
    await expect(page.locator('.js-fleet-results-count')).toContainText('1 model visible');
    await expect(getVisibleFleetTitles(page)).resolves.toEqual(['296 GTS']);

    await page.locator('.js-fleet-brand-select').selectOption('mercedes');
    await expect(page.locator('.js-fleet-results-count')).toContainText('1 model visible');
    await expect(getVisibleFleetTitles(page)).resolves.toEqual(['G63 AMG']);

    await page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').click();

    await expectReservationPrefill(page, {
        selectedCar: 'G63 AMG',
        selectedRate: '1,650',
        startDate: '2026-05-20',
        endDate: '2026-05-22',
        pickupTime: '10:00',
        dropoffTime: '18:00'
    });

    await expectNoConsoleErrors(consoleErrors, 'fleet comparison and reserve handoff');
});

test('guest starts on a Mercedes brand page and carries the schedule through the vehicle detail page', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);

    await page.goto('/mercedes-rental-dubai.html', { waitUntil: 'domcontentloaded' });
    await settlePage(page);

    await expect(page.locator('h1')).toContainText('Mercedes G63 AMG rental Dubai');
    await page.getByRole('link', { name: /Open G63 detail page/i }).click();

    await expect(page).toHaveURL(/\/mercedes-g63-amg-rental-dubai\.html$/i);
    await expect(page.locator('#vehicle-booking')).toBeVisible();

    await fillVehicleAvailabilityWindow(page, {
        startDate: '2026-06-03',
        endDate: '2026-06-05',
        pickupTime: '11:00',
        dropoffTime: '17:00'
    });
    await page.locator('#vehicle-booking').getByRole('button', { name: /Check availability/i }).click();

    await expectReservationPrefill(page, {
        selectedCar: 'Mercedes G63 AMG',
        selectedRate: '1,650',
        startDate: '2026-06-03',
        endDate: '2026-06-05',
        pickupTime: '11:00',
        dropoffTime: '17:00'
    });

    await expectNoConsoleErrors(consoleErrors, 'brand page to pdp to reserve');
});

test('guest completes a reservation with mocked checkout and success redirect', async ({ page }) => {
    const consoleErrors = createConsoleTracker(page);
    const requestLog = {
        reserve: null,
        confirm: null
    };

    await installStripeMock(page);

    await page.route('**/api/test', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true })
        });
    });

    await page.route('**/api/reserve', async (route) => {
        requestLog.reserve = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ clientSecret: 'pi_mock_customer_checkout_secret' })
        });
    });

    await page.route('**/api/reserve/confirm', async (route) => {
        requestLog.confirm = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true, emailSent: true })
        });
    });

    await page.goto('/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1650&startDate=2026-07-10&endDate=2026-07-12&pickupTime=10:00&dropoffTime=18:00', {
        waitUntil: 'domcontentloaded'
    });
    await settlePage(page);

    await page.locator('#pickupLocation').fill(reservationGuest.pickupLocation);
    await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
    await page.locator('#continueToPaymentBtn').click();

    await expect(page.locator('#step2')).toHaveClass(/active/);
    await fillReservationGuestDetails(page, reservationGuest);
    await page.locator('#step2').getByRole('button', { name: /Continue to Payment/i }).click();

    await expect(page.locator('#step3')).toHaveClass(/active/);
    await expect(page.locator('#payment-form-container')).toBeVisible();
    await expect(page.locator('#card-element')).toHaveAttribute('data-mock-stripe', 'mounted');

    const successDialogPromise = page.waitForEvent('dialog');
    await page.locator('#payButton').click();

    const successDialog = await successDialogPromise;
    expect(successDialog.message()).toContain('Payment received');
    expect(successDialog.message()).toContain('Mercedes G63 AMG');
    await successDialog.accept();

    await expect(page).toHaveURL(/\/index\.html$/i);
    await expect
        .poll(() => page.evaluate(() => window.sessionStorage.getItem('dynastyBookingIntent')))
        .toBeNull();

    expect(requestLog.reserve).not.toBeNull();
    expect(requestLog.confirm).not.toBeNull();
    expect(requestLog.reserve.customerData.name).toBe(reservationGuest.name);
    expect(requestLog.reserve.customerData.email).toBe(reservationGuest.email);
    expect(requestLog.reserve.reservationData.car).toBe('Mercedes G63 AMG');
    expect(requestLog.reserve.reservationData.startDate).toBe('2026-07-10');
    expect(requestLog.reserve.reservationData.endDate).toBe('2026-07-12');
    expect(requestLog.confirm.paymentIntentId).toBe('pi_mock_customer_checkout');
    expect(requestLog.confirm.customerData.name).toBe(reservationGuest.name);
    expect(requestLog.confirm.reservationData.pickupLocation).toBe(reservationGuest.pickupLocation);

    await expectNoConsoleErrors(consoleErrors, 'mocked reservation checkout');
});
