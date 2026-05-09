const crypto = require('node:crypto');
const { expect, test } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

const backendBaseUrl = String(process.env.QA_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const blockedVehicleId = 'mercedes-g63-amg';
const contactPhoneHref = 'tel:+971586122568';
const whatsappPattern = /^https:\/\/wa\.me\/971586122568(?:\?|$)/;

function addDays(days) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function buildSchedules() {
    const offsetDays = 1500 + crypto.randomInt(0, 250);

    return {
        seed: {
            startDate: addDays(offsetDays),
            endDate: addDays(offsetDays + 2),
            pickupTime: '10:00',
            dropoffTime: '18:00'
        },
        overlap: {
            startDate: addDays(offsetDays + 1),
            endDate: addDays(offsetDays + 3),
            pickupTime: '12:00',
            dropoffTime: '12:00'
        },
        clear: {
            startDate: addDays(offsetDays + 20),
            endDate: addDays(offsetDays + 22),
            pickupTime: '12:00',
            dropoffTime: '12:00'
        }
    };
}

async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const body = await response.json().catch(() => null);
    return { response, body };
}

async function assertBackendReady() {
    const { response, body } = await fetchJson(`${backendBaseUrl}/health`, {
        headers: { Accept: 'application/json' }
    });

    expect(response.ok, `Backend must be running before this QA test: ${JSON.stringify(body)}`).toBe(true);
}

async function createReservationInActiveStorage({ reservationId, email, schedule }) {
    const { response, body } = await fetchJson(`${backendBaseUrl}/api/reserve`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            reservationId,
            fullName: 'Manual QA Customer',
            email,
            phone: '+971 58 612 2568',
            car: 'Mercedes G63 AMG',
            pricePerDay: 1650,
            days: 2,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            pickupTime: schedule.pickupTime,
            dropoffTime: schedule.dropoffTime,
            durationHours: 56,
            pickupLocation: 'Manual QA pickup location',
            totalAmount: 3300,
            upfrontAmount: 1650,
            remainingAmount: 1650,
            currency: 'aed'
        })
    });

    expect(response.ok, `Reservation should be saved by the active backend storage: ${JSON.stringify(body)}`).toBe(true);
    expect(body?.success).toBe(true);
}

async function assertReservationLookup({ reservationId, email }) {
    const { response, body } = await fetchJson(`${backendBaseUrl}/api/reserve/lookup`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reservationId, email })
    });

    expect(response.ok, `Saved reservation should be readable through lookup: ${JSON.stringify(body)}`).toBe(true);
    expect(body?.reservation?.vehicle).toBe('Mercedes G63 AMG');
}

async function waitForUnavailable(schedule) {
    const params = new URLSearchParams(schedule);

    await expect.poll(async () => {
        const { response, body } = await fetchJson(`${backendBaseUrl}/api/availability?${params.toString()}`, {
            headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
            return `status:${response.status}`;
        }

        return body?.vehicles?.find((vehicle) => vehicle.id === blockedVehicleId)?.available;
    }, {
        message: 'The reservation saved in active storage should block overlapping Fleet availability',
        timeout: 15000
    }).toBe(false);
}

async function fillFleetSchedule(page, schedule) {
    await page.locator('#fleet-pickup-date').fill(schedule.startDate);
    await page.locator('#fleet-return-date').fill(schedule.endDate);
    await page.locator('#fleet-pickup-time').fill(schedule.pickupTime);
    await page.locator('#fleet-return-time').fill(schedule.dropoffTime);
}

async function expectContactActions(page) {
    const visibleCallLinks = page.locator(`a[href="${contactPhoneHref}"]:visible`);
    const visibleWhatsappLinks = page.locator('a[href*="wa.me/971586122568"]:visible');

    expect(await visibleCallLinks.count(), 'At least one visible call action should use the business phone number').toBeGreaterThan(0);
    expect(await visibleWhatsappLinks.count(), 'At least one visible WhatsApp action should use the business WhatsApp number').toBeGreaterThan(0);

    const whatsappHref = await visibleWhatsappLinks.first().getAttribute('href');
    expect(whatsappHref).toMatch(whatsappPattern);
}

test.describe('Manual rental QA environment with real backend storage', () => {
    test('customer-style reservation blocks Fleet dates and contact actions are actionable', async ({ page }, testInfo) => {
        test.setTimeout(60000);

        const schedules = buildSchedules();
        const runId = crypto.randomBytes(5).toString('hex');
        const reservationId = `manual_qa_${testInfo.project.name.replace(/\W+/g, '_')}_${runId}`;
        const email = `manual-qa-${runId}@example.com`;

        await assertBackendReady();
        await createReservationInActiveStorage({
            reservationId,
            email,
            schedule: schedules.seed
        });
        await assertReservationLookup({ reservationId, email });
        await waitForUnavailable(schedules.overlap);

        await primeHomeAnimations(page);
        const consoleErrors = createConsoleTracker(page);
        const availabilityRequests = [];

        page.on('request', (request) => {
            if (request.url().includes('/api/availability')) {
                availabilityRequests.push(request.url());
            }
        });

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);
        await expectContactActions(page);

        if (testInfo.project.name.includes('mobile')) {
            await page.locator('.js-fleet-mobile-dates').click();
            await expect(page.locator('.js-fleet-browser')).toHaveClass(/fleet-filters-open/);
        }

        const blockedCard = page.locator(`.js-fleet-card[data-id="${blockedVehicleId}"]`);
        await fillFleetSchedule(page, schedules.overlap);
        await expect(blockedCard).toBeHidden({ timeout: 15000 });
        await expect(page.locator('.js-fleet-results-count')).toContainText('5 models visible');

        expect(
            availabilityRequests.some((url) => String(url).startsWith(`${backendBaseUrl}/api/availability`)),
            'Fleet must call the backend that is saving reservations'
        ).toBe(true);

        await fillFleetSchedule(page, schedules.clear);
        await expect(blockedCard).toBeVisible({ timeout: 15000 });
        await expect(blockedCard.locator('.fleet-card__reserve')).toHaveAttribute('href', new RegExp(`startDate=${schedules.clear.startDate}`));
        await expect(blockedCard.locator('.fleet-card__secondary').first()).toHaveAttribute('href', contactPhoneHref);
        await expect(blockedCard.locator('.fleet-card__secondary--wa')).toHaveAttribute('href', whatsappPattern);
        expect(decodeURIComponent(await blockedCard.locator('.fleet-card__secondary--wa').getAttribute('href'))).toContain('Mercedes G63 AMG');

        await page.goto('/reservation-lookup.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);
        await expectContactActions(page);
        const form = page.locator('[data-reservation-lookup-form]');
        await form.locator('#reservationLookupId').fill(reservationId);
        await form.locator('#reservationLookupEmail').fill(email);
        await form.getByRole('button', { name: /Find booking/i }).click();

        await expect(page.locator('#reservationLookupStatus')).toContainText('Reservation found.', { timeout: 15000 });
        await expect(page.locator('#reservationLookupResult')).toBeVisible();
        await expect(page.locator('#reservationLookupResult')).toContainText('Mercedes G63 AMG');
        await expect(page.locator('#reservationLookupResult').getByRole('link', { name: /WhatsApp the team/i })).toHaveAttribute('href', new RegExp(reservationId));
        await expectNoConsoleErrors(consoleErrors, `manual rental QA ${testInfo.project.name}`);
    });
});
