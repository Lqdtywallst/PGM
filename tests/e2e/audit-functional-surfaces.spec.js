const { test, expect } = require('@playwright/test');
const { contactLead } = require('../../test-data/users.json');
const fleetCards = require('../../server/data/fleet-cards.json');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    mockFleetAvailability,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

test.setTimeout(60000);

const fleetTotalCount = fleetCards.length;
const mercedesFleetCount = fleetCards.filter((card) => card.brand === 'Mercedes').length;

test.describe('Functional surfaces intelligent audit', () => {
    test.beforeEach(({}, testInfo) => {
        test.skip(
            testInfo.project.name !== 'desktop-chromium',
            'This auditor focuses on desktop control surfaces.'
        );
    });

    test('home booking panel hands schedule into fleet cleanly', async ({ page }) => {
        await primeHomeAnimations(page);
        const consoleErrors = createConsoleTracker(page);
        await mockFleetAvailability(page);

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#home-pickup-date').fill('2026-11-03');
        await page.locator('#home-return-date').fill('2026-11-05');
        await page.locator('#home-pickup-time').selectOption('12:00');
        await page.locator('#home-return-time').selectOption('13:00');
        await page.getByRole('button', { name: /See available cars/i }).click();

        await expect(page).toHaveURL(/\/fleet\.html\?/i);
        await expect(page.locator('#fleet-pickup-date')).toHaveValue('2026-11-03');
        await expect(page.locator('#fleet-return-date')).toHaveValue('2026-11-05');
        await expect(page.locator('#fleet-pickup-time')).toHaveValue('12:00');
        await expect(page.locator('#fleet-return-time')).toHaveValue('13:00');
        await expectNoConsoleErrors(consoleErrors, 'home booking panel handoff');
    });

    test('fleet filters keep reserve CTAs aligned with the active schedule and reset cleanly', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);
        await mockFleetAvailability(page);

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#fleet-pickup-date').fill('2026-11-10');
        await page.locator('#fleet-return-date').fill('2026-11-12');
        await page.locator('#fleet-pickup-time').fill('11:00');
        await page.locator('#fleet-return-time').fill('16:00');
        await page.locator('.js-fleet-brand-select').selectOption('mercedes');
        await expect(page.locator('.js-fleet-results-count')).toContainText(`${mercedesFleetCount} models visible`);

        const reserveLink = page.locator('.js-fleet-card:not([hidden]) .fleet-card__reserve').first();
        await expect(reserveLink).toHaveAttribute('href', /startDate=2026-11-10/i);
        await expect(reserveLink).toHaveAttribute('href', /endDate=2026-11-12/i);
        await expect(reserveLink).toHaveAttribute('href', /pickupTime=11%3A00/i);
        await expect(reserveLink).toHaveAttribute('href', /dropoffTime=16%3A00/i);

        await page.getByRole('button', { name: /Reset filters/i }).click();

        await expect(page.locator('.js-fleet-brand-select')).toHaveValue('all');
        await expect(page.locator('.js-fleet-results-count')).toContainText(`${fleetTotalCount} models visible`);
        await expectNoConsoleErrors(consoleErrors, 'fleet filter surfaces');
    });

    test('reserve stepper reacts to invalid schedule edits and restores a valid quote state', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto(
            '/app/reserve/page.html?car=Mercedes%20G63%20AMG&price=1990&startDate=2026-11-14&endDate=2026-11-16&pickupTime=10:00&dropoffTime=18:00',
            { waitUntil: 'domcontentloaded' }
        );
        await settlePage(page);

        await page.locator('#pickupLocation').fill('Atlantis The Royal, Palm Jumeirah');
        await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();

        const initialTotal = await page.locator('#summaryTotal').textContent();

        await page.locator('#endDate').fill('2026-11-18');
        await page.locator('#endDate').dispatchEvent('change');
        await expect(page.locator('#summaryTotal')).not.toHaveText(initialTotal || '');

        await page.locator('#endDate').fill('2026-11-14');
        await page.locator('#endDate').dispatchEvent('change');
        await page.locator('#dropoffTime').selectOption('09:00');

        await expect(page.locator('#step1Validation')).toContainText(
            'Return date/time must be after delivery date/time.'
        );
        await expect(page.locator('#continueToPaymentBtn')).toBeDisabled();

        await page.locator('#endDate').fill('2026-11-17');
        await page.locator('#endDate').dispatchEvent('change');
        await page.locator('#dropoffTime').selectOption('18:00');

        await expect(page.locator('#continueToPaymentBtn')).toBeEnabled();
        await expectNoConsoleErrors(consoleErrors, 'reserve stepper surface behavior');
    });

    test('contact form blocks partial and invalid input before any success flow', async ({ page }) => {
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/contact.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('#contactName').fill(contactLead.name);
        await page.locator('#contactEmail').fill('bad-email');
        await page.locator('#contactPhone').fill(contactLead.phone);
        await page.locator('#contactSubmitButton').click();

        await expect(page.locator('#contactFormStatus')).toContainText(
            'Please complete all required fields.'
        );

        await page.locator('#contactSubject').selectOption(contactLead.subject);
        await page.locator('#contactMessage').fill(contactLead.message);
        await page.locator('#contactSubmitButton').click();

        await expect(page.locator('#contactFormStatus')).toContainText(
            'Please enter a valid email address.'
        );
        await expectNoConsoleErrors(consoleErrors, 'contact validation surfaces');
    });
});
