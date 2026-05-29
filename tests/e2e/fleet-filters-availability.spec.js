const { expect, test } = require('@playwright/test');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const {
    closeReservationStore,
    deleteReservationRecord
} = require('../../server/reservations/reservation-store');
const {
    createConsoleTracker,
    fleetCards,
    fleetCardsForBrand,
    fleetModelCountLabel,
    fleetShowCarsLabel,
    expectNoConsoleErrors,
    primeHomeAnimations,
    settlePage
} = require('./support/site-helpers');

const repoRoot = path.resolve(__dirname, '../..');
const workspaceRoot = path.resolve(repoRoot, '..');
const reservationId = `e2e_fleet_filters_${crypto.randomBytes(5).toString('hex')}`;
const blockedVehicleId = 'mercedes-g63-amg';
const overlapSchedule = {
    startDate: '2026-11-11',
    endDate: '2026-11-13',
    pickupTime: '12:00',
    dropoffTime: '12:00'
};
const clearSchedule = {
    startDate: '2026-11-20',
    endDate: '2026-11-22',
    pickupTime: '12:00',
    dropoffTime: '12:00'
};
const lamborghiniSuvIds = fleetCards
    .filter((card) => card.brandKey === 'lamborghini' && card.types.includes('suv'))
    .map((card) => card.id);
const lowPriceSuvIds = fleetCards
    .filter((card) => card.types.includes('suv') && card.pricePerDay <= 2000)
    .map((card) => card.id);

let backendProcess = null;
let backendStartedByTest = false;
const backendBaseUrl = 'http://localhost:3000';

async function waitForBackend(url, processRef) {
    const startedAt = Date.now();
    let lastError = null;

    while (Date.now() - startedAt < 15000) {
        if (processRef.exitCode !== null) {
            throw new Error(`Fleet availability backend exited early with code ${processRef.exitCode}`);
        }

        try {
            const response = await fetch(`${url}/health`);
            if (response.ok) {
                return;
            }
        } catch (error) {
            lastError = error;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(`Fleet availability backend did not start: ${lastError?.message || 'timeout'}`);
}

async function isBackendReady() {
    try {
        const response = await fetch(`${backendBaseUrl}/health`);
        return response.ok;
    } catch {
        return false;
    }
}

async function ensureCommonBackend() {
    if (await isBackendReady()) {
        return;
    }

    backendStartedByTest = true;
    backendProcess = childProcess.spawn(process.execPath, ['server/apps/backend.js'], {
        cwd: repoRoot,
        env: {
            ...process.env,
            CONTACT_FORM_LOG_ONLY: 'true',
            NODE_ENV: 'test',
            PORT: '3000'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    await waitForBackend(backendBaseUrl, backendProcess);
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => null);
    return { response, body };
}

async function seedBlockingReservationViaApi() {
    const { response, body } = await postJson(`${backendBaseUrl}/api/reserve`, {
        reservationId,
        fullName: 'Fleet Filter E2E Guest',
        email: 'fleet-filter-e2e@example.com',
        phone: '+971 58 612 2568',
        car: 'Mercedes G63 AMG',
        pricePerDay: 1990,
        days: 2,
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        pickupTime: '10:00',
        dropoffTime: '18:00',
        durationHours: 56,
        pickupLocation: 'E2E reservation seed',
        totalAmount: 3300,
        upfrontAmount: 1990,
        remainingAmount: 1990,
        currency: 'aed'
    });

    expect(response.ok, `Seed reservation should be accepted by ${backendBaseUrl}/api/reserve: ${JSON.stringify(body)}`).toBe(true);
    expect(body?.success).toBe(true);
}

async function waitForSeededAvailability() {
    const params = new URLSearchParams(overlapSchedule);
    await expect.poll(async () => {
        const response = await fetch(`${backendBaseUrl}/api/availability?${params.toString()}`);
        const body = await response.json();
        return body.vehicles?.find((vehicle) => vehicle.id === blockedVehicleId)?.available;
    }, {
        message: 'Seeded Mercedes reservation should block overlapping availability through the real backend',
        timeout: 10000
    }).toBe(false);
}

async function deleteIfExists(filePath) {
    try {
        await fs.unlink(filePath);
        return true;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
        return false;
    }
}

async function cleanupSeedFiles() {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const candidates = [
        path.join(workspaceRoot, 'PGM', 'output', 'runtime-reservations', `${reservationId}.json`),
        path.join(workspaceRoot, 'PGM-functional-audit', 'output', 'runtime-reservations', `${reservationId}.json`)
    ];

    await Promise.all(candidates.map((candidate) => deleteIfExists(candidate)));
}

async function useTestBackend(page) {
    await page.addInitScript((url) => {
        window.BACKEND_URL = url;
        window.PGM_RUNTIME_CONFIG = {
            ...(window.PGM_RUNTIME_CONFIG || {}),
            backendUrl: url
        };
    }, backendBaseUrl);
}

async function fillFleetSchedule(page, schedule) {
    const currentReturnDate = await page.locator('#fleet-return-date').inputValue().catch(() => '');

    if (currentReturnDate && schedule.startDate > currentReturnDate) {
        await page.locator('#fleet-return-date').fill(schedule.endDate);
        await page.locator('#fleet-pickup-date').fill(schedule.startDate);
    } else {
        await page.locator('#fleet-pickup-date').fill(schedule.startDate);
        await page.locator('#fleet-return-date').fill(schedule.endDate);
    }

    await page.locator('#fleet-pickup-time').fill(schedule.pickupTime);
    await page.locator('#fleet-return-time').fill(schedule.dropoffTime);
}

async function visibleFleetState(page) {
    return page.locator('.js-fleet-card').evaluateAll((cards) => cards
        .filter((card) => !card.hidden)
        .map((card) => ({
            id: card.dataset.id,
            brand: card.dataset.brand,
            type: card.dataset.type,
            price: Number(card.dataset.price)
        })));
}

async function setRangeValue(page, selector, value) {
    await page.locator(selector).evaluate((input, nextValue) => {
        input.value = String(nextValue);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
}

test.describe('Fleet rental period availability and filters', () => {
    test.beforeAll(async () => {
        await cleanupSeedFiles().catch(() => {});
        await deleteReservationRecord(reservationId).catch(() => {});
        await ensureCommonBackend();
        await seedBlockingReservationViaApi();
        await waitForSeededAvailability();
    });

    test.afterAll(async () => {
        await cleanupSeedFiles().catch(() => {});
        await deleteReservationRecord(reservationId).catch(() => {});
        await closeReservationStore().catch(() => {});

        if (backendStartedByTest && backendProcess && backendProcess.exitCode === null) {
            backendProcess.kill();
        }
    });

    test('desktop rental period uses stored CRM reservations and filters intersect correctly', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop Fleet filter contract');
        test.slow();

        await primeHomeAnimations(page);
        await useTestBackend(page);
        const consoleErrors = createConsoleTracker(page);
        const availabilityRequests = [];
        const invalidAvailabilityRequests = [];

        page.on('request', (request) => {
            if (request.url().includes('/api/availability')) {
                const url = new URL(request.url());
                availabilityRequests.push(url);

                if (url.searchParams.get('startDate') > url.searchParams.get('endDate')) {
                    invalidAvailabilityRequests.push(url.toString());
                }
            }
        });

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await fillFleetSchedule(page, overlapSchedule);
        const blockedCard = page.locator(`.js-fleet-card[data-id="${blockedVehicleId}"]`);
        await expect(blockedCard).toBeHidden();
        await expect(page.locator('.js-fleet-results-count')).toContainText(fleetModelCountLabel(fleetCards.length - 1));
        let visible = await visibleFleetState(page);
        expect(visible.map((card) => card.id)).not.toContain(blockedVehicleId);

        const lastAvailabilityRequest = availabilityRequests.at(-1);
        expect(lastAvailabilityRequest.searchParams.get('startDate')).toBe(overlapSchedule.startDate);
        expect(lastAvailabilityRequest.searchParams.get('endDate')).toBe(overlapSchedule.endDate);
        expect(lastAvailabilityRequest.searchParams.get('pickupTime')).toBe(overlapSchedule.pickupTime);
        expect(lastAvailabilityRequest.searchParams.get('dropoffTime')).toBe(overlapSchedule.dropoffTime);

        await fillFleetSchedule(page, clearSchedule);
        await expect(blockedCard).toBeVisible();
        await expect(blockedCard.locator('.fleet-card__availability')).toHaveText('Available for these dates');
        await expect(blockedCard.locator('.fleet-card__reserve')).toHaveText('Reserve');
        await expect(blockedCard.locator('.fleet-card__reserve')).toHaveAttribute('href', /startDate=2026-11-20/i);

        await page.locator('#fleet-pickup-date').fill('2026-11-25');
        await page.locator('#fleet-pickup-date').dispatchEvent('change');
        await expect(page.locator('#fleet-return-date')).toHaveValue('2026-11-26');
        await expect(blockedCard).toBeVisible();
        await expect(blockedCard.locator('.fleet-card__availability')).toHaveText('Available for these dates');
        expect(invalidAvailabilityRequests).toEqual([]);
        await fillFleetSchedule(page, clearSchedule);
        await expect(blockedCard).toBeVisible();
        await expect(blockedCard.locator('.fleet-card__availability')).toHaveText('Available for these dates');

        await page.locator('.js-fleet-brand-select').selectOption('lamborghini');
        await expect(page.locator('.js-fleet-results-count')).toContainText(fleetModelCountLabel(fleetCardsForBrand('lamborghini').length));
        visible = await visibleFleetState(page);
        expect(visible.every((card) => card.brand === 'lamborghini')).toBe(true);

        await page.locator('.js-fleet-type-select').selectOption('suv');
        await expect(page.locator('.js-fleet-results-count')).toContainText(fleetModelCountLabel(lamborghiniSuvIds.length));
        visible = await visibleFleetState(page);
        expect(visible.map((card) => card.id)).toEqual(lamborghiniSuvIds);

        await page.locator('.js-fleet-brand-select').selectOption('all');
        await setRangeValue(page, '.js-fleet-price-max', 2000);
        await expect(page.locator('.js-fleet-results-count')).toContainText(fleetModelCountLabel(lowPriceSuvIds.length));
        visible = await visibleFleetState(page);
        expect(visible.map((card) => card.id)).toEqual(lowPriceSuvIds);
        expect(visible.every((card) => card.price <= 2000)).toBe(true);

        await page.locator('.js-fleet-brand-select').selectOption('ferrari');
        await expect(page.locator('.js-fleet-results-count')).toContainText('0 models visible');
        await expect(page.locator('.js-fleet-empty')).toBeVisible();

        await page.locator('.js-fleet-reset').first().click();
        await expect(page.locator('.js-fleet-results-count')).toContainText(fleetModelCountLabel(fleetCards.length));
        await expect(page.locator('.js-fleet-brand-select')).toHaveValue('all');
        await expect(page.locator('.js-fleet-type-select')).toHaveValue('all');
        await expect(page.locator('#fleet-pickup-date')).toHaveValue(clearSchedule.startDate);
        await expect(page.locator('#fleet-return-date')).toHaveValue(clearSchedule.endDate);

        await expectNoConsoleErrors(consoleErrors, 'desktop Fleet rental period and filters');
    });

    test('mobile rental period chip and filter sheet apply the same Fleet contract', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile Fleet filter contract');
        test.slow();

        await primeHomeAnimations(page);
        await useTestBackend(page);
        const consoleErrors = createConsoleTracker(page);

        await page.goto('/fleet.html', { waitUntil: 'domcontentloaded' });
        await settlePage(page);

        await page.locator('.js-fleet-mobile-dates').click();
        await expect(page.locator('.js-fleet-browser')).toHaveClass(/fleet-filters-open/);
        await fillFleetSchedule(page, overlapSchedule);

        const blockedCard = page.locator(`.js-fleet-card[data-id="${blockedVehicleId}"]`);
        await expect(blockedCard).toBeHidden();
        await expect(page.locator('.js-fleet-results-count')).toContainText(fleetModelCountLabel(fleetCards.length - 1));
        await page.locator('.fleet-filter-apply').click();
        await expect(page.locator('.js-fleet-browser')).not.toHaveClass(/fleet-filters-open/);
        await expect(page.locator('.js-fleet-mobile-dates')).toContainText('11 Nov - 13 Nov');
        await expect(blockedCard).toBeHidden();

        await page.locator('.fleet-mobile-filter-toggle').click();
        await page.locator('.js-fleet-brand-select').selectOption('lamborghini');
        await page.locator('.js-fleet-type-select').selectOption('suv');
        await expect(page.locator('.js-fleet-results-count')).toContainText(fleetModelCountLabel(lamborghiniSuvIds.length));
        await expect(page.locator('.fleet-filter-apply')).toHaveText(fleetShowCarsLabel(lamborghiniSuvIds.length));
        await page.locator('.fleet-filter-apply').click();

        const visible = await visibleFleetState(page);
        expect(visible.map((card) => card.id)).toEqual(lamborghiniSuvIds);

        await expectNoConsoleErrors(consoleErrors, 'mobile Fleet rental period and filters');
    });
});
