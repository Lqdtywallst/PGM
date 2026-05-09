const crypto = require('node:crypto');
const { expect, test } = require('@playwright/test');
const {
    createConsoleTracker,
    expectNoConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

const frontendBaseUrl = String(process.env.PLAYWRIGHT_BASE_URL || '').replace(/\/+$/, '');
const backendBaseUrl = String(process.env.PREPROD_BACKEND_URL || '').replace(/\/+$/, '');
const blockedVehicleId = 'mercedes-g63-amg';

function requirePreprodConfig() {
    expect(frontendBaseUrl, 'PLAYWRIGHT_BASE_URL must point to the preproduction frontend').toBeTruthy();
    expect(backendBaseUrl, 'PREPROD_BACKEND_URL must point to the staging backend').toBeTruthy();
}

function addDays(days) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function buildSchedules() {
    const offsetDays = 1300 + crypto.randomInt(0, 300);

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

async function assertBackendHealth() {
    const { response, body } = await fetchJson(`${backendBaseUrl}/health`, {
        headers: { Accept: 'application/json' }
    });

    expect(response.ok, `Backend health should be OK: ${JSON.stringify(body)}`).toBe(true);
}

async function seedBlockingReservation({ reservationId, email, schedule }) {
    const { response, body } = await fetchJson(`${backendBaseUrl}/api/reserve`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            reservationId,
            fullName: 'Preprod QA Gate',
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
            pickupLocation: 'Preproduction QA seeded reservation',
            totalAmount: 3300,
            upfrontAmount: 1650,
            remainingAmount: 1650,
            currency: 'aed'
        })
    });

    expect(response.ok, `Seed reservation should be accepted: ${JSON.stringify(body)}`).toBe(true);
    expect(body?.success).toBe(true);
}

async function waitForBlockedAvailability(schedule) {
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
        message: 'Seeded staging reservation should block Mercedes G63 AMG availability',
        timeout: 15000
    }).toBe(false);
}

async function assertFrontendRuntimeConfig(page) {
    const runtime = await page.evaluate(() => ({
        env: window.APP_ENVIRONMENT,
        backendUrl: window.getBackendUrl?.() || window.STRIPE_CONFIG?.backendUrl || ''
    }));

    expect(runtime.env).toBe('staging');
    expect(String(runtime.backendUrl).replace(/\/+$/, '')).toBe(backendBaseUrl);
}

async function fillFleetSchedule(page, schedule) {
    await page.locator('#fleet-pickup-date').fill(schedule.startDate);
    await page.locator('#fleet-return-date').fill(schedule.endDate);
    await page.locator('#fleet-pickup-time').fill(schedule.pickupTime);
    await page.locator('#fleet-return-time').fill(schedule.dropoffTime);
}

test.describe('Preproduction functional gate', () => {
    test('Fleet availability and Find Booking use the staging backend like a real customer', async ({ page }, testInfo) => {
        test.setTimeout(60000);
        requirePreprodConfig();

        const schedules = buildSchedules();
        const runId = crypto.randomBytes(5).toString('hex');
        const reservationId = `preprod_gate_${testInfo.project.name.replace(/\W+/g, '_')}_${runId}`;
        const email = `preprod-gate-${runId}@example.com`;

        await assertBackendHealth();
        await seedBlockingReservation({
            reservationId,
            email,
            schedule: schedules.seed
        });
        await waitForBlockedAvailability(schedules.overlap);

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
        await assertFrontendRuntimeConfig(page);

        if (testInfo.project.name.includes('mobile')) {
            await page.locator('.js-fleet-mobile-dates').click();
            await expect(page.locator('.js-fleet-browser')).toHaveClass(/fleet-filters-open/);
        }

        await fillFleetSchedule(page, schedules.overlap);
        const blockedCard = page.locator(`.js-fleet-card[data-id="${blockedVehicleId}"]`);
        await expect(blockedCard).toBeHidden({ timeout: 15000 });
        await expect(page.locator('.js-fleet-results-count')).toContainText('5 models visible');

        expect(
            availabilityRequests.some((url) => String(url).startsWith(`${backendBaseUrl}/api/availability`)),
            'Fleet page should call the configured staging backend for availability'
        ).toBe(true);

        await fillFleetSchedule(page, schedules.clear);
        await expect(blockedCard).toBeVisible({ timeout: 15000 });
        await expect(blockedCard.locator('.fleet-card__reserve')).toHaveAttribute('href', new RegExp(`startDate=${schedules.clear.startDate}`));

        await page.goto('/reservation-lookup.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);
        await assertFrontendRuntimeConfig(page);
        const form = page.locator('[data-reservation-lookup-form]');
        await form.locator('#reservationLookupId').fill(reservationId);
        await form.locator('#reservationLookupEmail').fill(email);
        await form.getByRole('button', { name: /Find booking/i }).click();

        await expect(page.locator('#reservationLookupStatus')).toContainText('Reservation found.', { timeout: 15000 });
        await expect(page.locator('#reservationLookupResult')).toBeVisible();
        await expect(page.locator('#reservationLookupResult')).toContainText('Mercedes G63 AMG');
        await expectNoConsoleErrors(consoleErrors, `preproduction ${testInfo.project.name} flow`);
    });
});
