const { expect, test } = require('@playwright/test');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');

const {
    deleteReservationRecord,
    saveReservationRecord
} = require('../../server/reservations/reservation-store');
const {
    hashAdminPassword
} = require('../../server/admin/admin-auth');

const repoRoot = path.resolve(__dirname, '../..');
const adminUser = 'owner';
const adminPassword = 'AdminCrmTest2026!';
const reservationId = `e2e_admin_${crypto.randomBytes(5).toString('hex')}`;
const reservationSuffix = reservationId.slice(-6);
const adminClientName = `CRM Test Client ${reservationSuffix}`;
const manualClientName = `Manual CRM E2E Client ${reservationSuffix}`;

let backendProcess = null;
let adminBaseUrl = '';
let manualReservationId = '';

function addDaysIso(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

function getFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            server.close(() => resolve(address.port));
        });
    });
}

async function waitForBackend(url, processRef) {
    const startedAt = Date.now();
    let lastError = null;

    while (Date.now() - startedAt < 15000) {
        if (processRef.exitCode !== null) {
            throw new Error(`Admin backend exited early with code ${processRef.exitCode}`);
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

    throw new Error(`Admin backend did not start: ${lastError?.message || 'timeout'}`);
}

test.describe('Private admin reservations CRM', () => {
    test.beforeAll(async () => {
        await deleteReservationRecord(reservationId).catch(() => {});
        await saveReservationRecord({
            reservationId,
            status: 'checkout_started',
            source: 'admin_crm_e2e',
            customerData: {
                name: adminClientName,
                email: 'crm-test-client@example.com',
                phone: '+971 58 612 2568',
                passport: 'CRM-TEST-ID'
            },
            reservationData: {
                reservationId,
                car: 'Lamborghini Huracan EVO Spyder',
                startDate: addDaysIso(1),
                endDate: addDaysIso(3),
                pickupTime: '10:00',
                dropoffTime: '18:00',
                pickupLocation: 'Dubai Marina hotel lobby',
                dropoffLocation: 'DXB Terminal 3',
                totalAmount: 6400,
                upfrontAmount: 3200,
                remainingAmount: 3200,
                currency: 'AED'
            },
            payment: {
                paymentIntentId: `pi_${reservationId}`,
                stripeStatus: 'requires_payment_method',
                amount: 320000,
                currency: 'aed'
            }
        });

        const port = await getFreePort();
        adminBaseUrl = `http://127.0.0.1:${port}`;
        backendProcess = childProcess.spawn(process.execPath, ['server/apps/backend.js'], {
            cwd: repoRoot,
            env: {
                ...process.env,
                ADMIN_USER: adminUser,
                ADMIN_PASSWORD_HASH: hashAdminPassword(adminPassword),
                ADMIN_SESSION_SECRET: `test-secret-${crypto.randomBytes(32).toString('hex')}`,
                CONTACT_FORM_LOG_ONLY: 'true',
                NODE_ENV: 'test',
                PORT: String(port)
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        await waitForBackend(adminBaseUrl, backendProcess);
    });

    test.afterAll(async () => {
        if (backendProcess && backendProcess.exitCode === null) {
            backendProcess.kill();
        }

        await deleteReservationRecord(reservationId).catch(() => {});
        if (manualReservationId) {
            await deleteReservationRecord(manualReservationId).catch(() => {});
        }
    });

    test('admin can log in, see a stored reservation and update private workflow notes', async ({ page }) => {
        await page.goto(`${adminBaseUrl}/crm`, { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/admin\/login\.html/);
        await page.fill('#username', adminUser);
        await page.fill('#password', adminPassword);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/admin\/reservations\.html$/);
        await expect(page.locator('a[href="/admin/content.html"]')).toHaveCount(0);
        await expect(page.locator('a[href="/admin/visual.html"]')).toHaveCount(0);

        for (const removedEditorPath of [
            '/admin/content.html',
            '/admin/visual.html',
            '/admin/preview/page?path=%2F',
            '/api/admin/content',
            '/api/admin/visual-editor'
        ]) {
            const removedEditorResponse = await page.request.get(`${adminBaseUrl}${removedEditorPath}`);
            expect(removedEditorResponse.status(), removedEditorPath).toBe(404);
        }

        await expect(page.locator('#operationsPanel')).toContainText('System status');
        await expect(page.locator('#operationsPanel')).toContainText('Test CRM');
        await expect(page.locator('#operationsPanel')).toContainText('local-json');
        await expect(page.locator('#operationsPanel')).toContainText('AI-ready');
        await expect(page.locator('#operationsDetailsPanel')).toBeHidden();
        await page.click('#operationsDetailsToggle');
        await expect(page.locator('#operationsDetailsToggle')).toHaveText('Hide details');
        await expect(page.locator('#operationsDetailsPanel')).toBeVisible();
        await page.click('#operationsDetailsClose');
        await expect(page.locator('#operationsDetailsToggle')).toHaveText('Show details');
        await expect(page.locator('#operationsDetailsPanel')).toBeHidden();
        await expect(page.locator('#storageMode')).toContainText('local-json');
        await expect(page.locator('#resultCount')).toContainText('reservation');
        await expect(page.locator('.calendar-panel')).toContainText('Reservations by day and car');
        await expect(page.locator('#calendarSummary')).toContainText('scheduled reservation');
        await expect(page.locator('#calendarSnapshot')).toContainText('Bookings');
        await expect(page.locator('#calendarSnapshot')).toContainText('Busy days');
        await expect(page.locator('#calendarToggleButton')).toHaveText(/Open calendar/);
        await expect(page.locator('#calendarBody')).toBeHidden();
        await page.click('#calendarToggleButton');
        await expect(page.locator('#calendarToggleButton')).toHaveText(/Hide calendar/);
        await expect(page.locator('#calendarBody')).toBeVisible();
        await expect(page.locator('#reservationCalendarGrid')).toContainText('Lamborghini Huracan EVO Spyder');
        await expect(page.locator('[data-calendar-view="timeline"]')).toHaveClass(/is-active/);
        await expect(page.locator('[data-calendar-vehicle-filter="Lamborghini Huracan EVO Spyder"]')).toBeVisible();
        await page.click('[data-calendar-view="month"]');
        await expect(page.locator('[data-calendar-view="month"]')).toHaveClass(/is-active/);
        await expect(page.locator('.calendar-month')).toBeVisible();
        await expect(page.locator('.calendar-month__booking').first()).toContainText('Lamborghini Huracan EVO Spyder');
        await page.click('[data-calendar-vehicle-filter="Lamborghini Huracan EVO Spyder"]');
        await expect(page.locator('.calendar-vehicle-chip.is-active')).toContainText('Lamborghini Huracan EVO Spyder');
        await expect(page.locator('#reservationCalendarGrid')).toContainText('Lamborghini Huracan EVO Spyder');
        await page.click('[data-calendar-vehicle-filter=""]');
        await page.click('[data-calendar-view="timeline"]');
        await expect(page.locator('[data-calendar-view="timeline"]')).toHaveClass(/is-active/);
        await expect(page.locator('#reservationCalendarGrid')).toContainText('Lamborghini Huracan EVO Spyder');

        const calendarReservation = page.locator(`[data-calendar-reservation-id="${reservationId}"]`).first();
        await calendarReservation.scrollIntoViewIfNeeded();
        await calendarReservation.click();
        await expect(page.locator('.detail-title')).toContainText('Lamborghini Huracan EVO Spyder');
        await page.click('#closeReservationDetail');
        await expect(page.locator('#reservationDetail')).toContainText('Operations overview');

        const card = page.locator('.reservation-card', { hasText: reservationId });
        await expect(card).toContainText('Lamborghini Huracan EVO Spyder');
        await expect(card).toContainText('Pending review');
        await expect(page.locator('#reservationDetail')).toContainText('Operations overview');
        await expect(page.locator('#reservationDetail')).toContainText('Today at a glance');
        await expect(page.locator('#closeReservationDetail')).toHaveCount(0);
        await card.click();

        await expect(page.locator('.detail-title')).toContainText('Lamborghini Huracan EVO Spyder');
        await expect(page.locator('#closeReservationDetail')).toBeVisible();
        if ((page.viewportSize()?.width || 0) <= 620) {
            await expect(page.locator('#reservationDetailBackdrop')).toBeVisible();
            await expect(page.locator('#reservationDetail')).toHaveCSS('position', 'fixed');
        }
        await expect(page.locator('#reservationDetail')).toContainText('crm-test-client@example.com');
        await expect(page.locator('#reservationDetail')).toContainText('6,400 AED');
        await page.click('#closeReservationDetail');
        await expect(page.locator('#reservationDetail')).toContainText('Operations overview');
        await expect(page.locator('#reservationDetail')).toContainText('Today at a glance');
        await expect(page.locator('#closeReservationDetail')).toHaveCount(0);
        await expect(page.locator('#reservationDetailBackdrop')).toBeHidden();
        await card.click();
        await expect(page.locator('.detail-title')).toContainText('Lamborghini Huracan EVO Spyder');

        await page.fill('#adminNotes', 'Client contacted from the CRM E2E test.');
        await page.click('[data-action="update_notes"]');
        await expect(page.locator('#adminNotes')).toHaveValue('Client contacted from the CRM E2E test.');

        await page.click('[data-action="mark_contacted"]');
        await expect(page.locator('#reservationDetail')).toContainText('Reviewed at');
        await page.click('#closeReservationDetail');
        await expect(page.locator('#reservationDetailBackdrop')).toBeHidden();

        await page.click('#manualNewButton');
        await expect(page.locator('#manualPanel')).toBeVisible();
        await page.fill('#manualCustomerName', manualClientName);
        await page.fill('#manualCustomerPhone', '+971 55 777 3333');
        await page.fill('#manualCustomerEmail', 'manual-crm-e2e@example.com');
        await page.fill('#manualCustomerId', 'MANUAL-E2E-ID');
        await page.fill('#manualVehicle', 'Bentley Bentayga Azure');
        await page.selectOption('#manualStatus', 'received');
        await page.fill('#manualStartDate', addDaysIso(5));
        await page.fill('#manualEndDate', addDaysIso(7));
        await page.fill('#manualPickupTime', '09:30');
        await page.fill('#manualDropoffTime', '18:30');
        await page.fill('#manualPickupLocation', 'Atlantis The Royal');
        await page.fill('#manualDropoffLocation', 'Dubai Hills office');
        await page.fill('#manualTotalAmount', '9800');
        await page.fill('#manualUpfrontAmount', '4900');
        await page.fill('#manualRemainingAmount', '4900');
        await page.fill('#manualNotes', 'Manual booking from E2E test.');
        await page.click('#manualSubmitButton');

        await expect(page.locator('#manualPanel')).toBeHidden();
        await expect(page.locator('.detail-title')).toContainText('Bentley Bentayga Azure');
        await expect(page.locator('#reservationDetail')).toContainText(manualClientName);
        await expect(page.locator('#reservationDetail')).toContainText('9,800 AED');
        await expect(page.locator('#reservationDetail')).toContainText('Booking created in CRM');

        const manualListResponse = await page.request.get(`${adminBaseUrl}/api/admin/reservations?q=${encodeURIComponent(manualClientName)}`);
        const manualList = await manualListResponse.json();
        manualReservationId = manualList.items[0]?.reservationId || '';
        expect(manualReservationId).toMatch(/^manual_/);

        await page.click('#editReservationButton');
        await expect(page.locator('#manualPanel')).toBeVisible();
        await page.fill('#manualVehicle', 'Rolls-Royce Cullinan');
        await page.fill('#manualTotalAmount', '12000');
        await page.fill('#manualNotes', 'Edited from the CRM E2E test.');
        await page.click('#manualSubmitButton');

        await expect(page.locator('.detail-title')).toContainText('Rolls-Royce Cullinan');
        await expect(page.locator('#reservationDetail')).toContainText('12,000 AED');
        await expect(page.locator('#reservationDetail')).toContainText('Updated vehicle, total amount, admin notes');

        await page.fill('#adminNotes', 'Archive after E2E coverage.');
        page.once('dialog', async (dialog) => {
            await dialog.accept();
        });
        await page.click('[data-action="archive"]');
        await expect(page.locator('#reservationDetail')).toContainText('Archived at');
        await expect(page.locator('#reservationDetail')).toContainText('Archive after E2E coverage.');

        await page.selectOption('#queueFilterSelect', 'archived');
        const archivedManualCard = page.locator('.reservation-card', { hasText: manualClientName });
        await expect(archivedManualCard).toContainText('Archived');
        await archivedManualCard.click();
        await expect(page.locator('.detail-title')).toContainText('Rolls-Royce Cullinan');

        page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('Delete reservation');
            await dialog.accept();
        });
        await page.click('[data-delete-reservation]');
        await expect(page.locator('#reservationDetail')).toContainText('Operations overview');
        await expect(page.locator('.reservation-card', { hasText: manualClientName })).toHaveCount(0);
        const deletedManualResponse = await page.request.get(`${adminBaseUrl}/api/admin/reservations/${encodeURIComponent(manualReservationId)}`);
        expect(deletedManualResponse.status()).toBe(404);
        manualReservationId = '';
    });
});
