const { expect, test } = require('@playwright/test');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const net = require('node:net');
const path = require('node:path');

const {
    deleteReservationRecord,
    saveReservationRecord
} = require('../../server/reservation-store');
const {
    hashAdminPassword
} = require('../../server/admin-auth');

const repoRoot = path.resolve(__dirname, '../..');
const adminUser = 'owner';
const adminPassword = 'AdminCrmTest2026!';
const reservationId = `e2e_admin_${crypto.randomBytes(5).toString('hex')}`;

let backendProcess = null;
let adminBaseUrl = '';

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
                name: 'CRM Test Client',
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
        backendProcess = childProcess.spawn(process.execPath, ['server/backend-example.js'], {
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
    });

    test.beforeEach(({}, testInfo) => {
        test.skip(/mobile/i.test(testInfo.project.name), 'Admin CRM layout is validated on desktop.');
    });

    test('admin can log in, see a stored reservation and update private workflow notes', async ({ page }) => {
        await page.goto(`${adminBaseUrl}/admin/login.html`, { waitUntil: 'domcontentloaded' });
        await page.fill('#username', adminUser);
        await page.fill('#password', adminPassword);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(/\/admin\/reservations\.html$/);
        await expect(page.locator('#storageMode')).toContainText('local-json');
        await expect(page.locator('#resultCount')).toContainText('reservation');

        const card = page.locator('.reservation-card', { hasText: 'CRM Test Client' });
        await expect(card).toContainText('Lamborghini Huracan EVO Spyder');
        await expect(card).toContainText('Needs contact');
        await card.click();

        await expect(page.locator('.detail-title')).toContainText('Lamborghini Huracan EVO Spyder');
        await expect(page.locator('#reservationDetail')).toContainText('crm-test-client@example.com');
        await expect(page.locator('#reservationDetail')).toContainText('6,400 AED');

        await page.fill('#adminNotes', 'Client contacted from the CRM E2E test.');
        await page.click('[data-action="update_notes"]');
        await expect(page.locator('#adminNotes')).toHaveValue('Client contacted from the CRM E2E test.');

        await page.click('[data-action="mark_contacted"]');
        await expect(page.locator('#reservationDetail')).toContainText('Contacted at');
    });
});
