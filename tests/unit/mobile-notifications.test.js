const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildReservationNotificationText,
    getMobileNotificationDiagnostics,
    sendReservationMobileNotification
} = require('../../server/integrations/mobile-notifications');
const {
    buildNotificationAdminPatch,
    notifyReservationMobile
} = require('../../server/reservations/reservation-mobile-notifier');

const reservation = {
    reservationId: 'res_mobile_test',
    status: 'checkout_started',
    source: 'website',
    customerData: {
        name: 'Mobile Test Client',
        email: 'mobile-test@example.com',
        phone: '+971 58 612 2568'
    },
    reservationData: {
        reservationId: 'res_mobile_test',
        car: 'Ferrari 296 GTS',
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        pickupTime: '10:00',
        dropoffTime: '18:00',
        pickupLocation: 'Dubai Marina',
        totalAmount: 6400,
        upfrontAmount: 3200,
        remainingAmount: 3200,
        currency: 'AED'
    },
    payment: {
        paymentIntentId: 'pi_mobile_test',
        currency: 'aed'
    }
};

test('mobile notification diagnostics detect Telegram and webhook channels without exposing secrets', () => {
    const diagnostics = getMobileNotificationDiagnostics({
        APP_ENV: 'staging',
        RESERVATION_TELEGRAM_BOT_TOKEN: '123456:test-token',
        RESERVATION_TELEGRAM_CHAT_ID: '987654',
        RESERVATION_NOTIFICATION_WEBHOOK_URL: 'https://hooks.example.test/reservations',
        RESERVATION_NOTIFICATION_WEBHOOK_SECRET: 'secret'
    });

    assert.equal(diagnostics.configured, true);
    assert.deepEqual(diagnostics.channels, ['telegram', 'webhook']);
    assert.equal(Object.prototype.hasOwnProperty.call(diagnostics, 'telegramBotToken'), false);
});

test('mobile notification text includes the operational reservation summary and CRM link', () => {
    const text = buildReservationNotificationText(reservation, {
        event: 'reservation_received',
        env: {
            APP_ENV: 'staging',
            RESERVATION_CRM_URL: 'https://pgm-staging.up.railway.app'
        }
    });

    assert.match(text, /New reservation - Staging CRM/);
    assert.match(text, /ID: res_mobile_test/);
    assert.match(text, /Vehicle: Ferrari 296 GTS/);
    assert.match(text, /Phone: \+971 58 612 2568/);
    assert.match(text, /CRM: https:\/\/pgm-staging\.up\.railway\.app\/crm/);
});

test('mobile notification sends to configured channels', async () => {
    const requests = [];
    const result = await sendReservationMobileNotification(reservation, {
        event: 'reservation_received',
        env: {
            APP_ENV: 'staging',
            RESERVATION_TELEGRAM_BOT_TOKEN: '123456:test-token',
            RESERVATION_TELEGRAM_CHAT_ID: '987654',
            RESERVATION_NOTIFICATION_WEBHOOK_URL: 'https://hooks.example.test/reservations'
        },
        fetchImpl: async (url, options) => {
            requests.push({ url, options });
            return {
                ok: true,
                status: 200,
                async text() {
                    return 'ok';
                }
            };
        }
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.channels, ['telegram', 'webhook']);
    assert.equal(requests.length, 2);
    assert.match(requests[0].url, /^https:\/\/api\.telegram\.org\/bot123456:test-token\/sendMessage/);
    assert.equal(requests[1].url, 'https://hooks.example.test/reservations');
});

test('reservation mobile notifier records attempts and skips already sent events', async () => {
    const saved = [];
    const firstResult = await notifyReservationMobile(reservation, 'reservation_received', {
        now: '2026-05-13T10:00:00.000Z',
        saveReservationRecord: async (record) => {
            saved.push(record);
            return record;
        },
        sendReservationMobileNotification: async () => ({
            success: true,
            configured: true,
            channels: ['telegram'],
            attemptedChannels: ['telegram']
        })
    });

    assert.equal(firstResult.success, true);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].reservationData.admin.mobileNotifications.reservation_received.status, 'sent');

    const patchedAdmin = buildNotificationAdminPatch(
        reservation,
        'reservation_received',
        { success: true, configured: true, channels: ['telegram'] },
        new Date('2026-05-13T10:00:00.000Z')
    );
    const skipped = await notifyReservationMobile({
        ...reservation,
        reservationData: {
            ...reservation.reservationData,
            admin: patchedAdmin
        }
    }, 'reservation_received', {
        saveReservationRecord: async () => {
            throw new Error('should not save duplicate notification');
        },
        sendReservationMobileNotification: async () => {
            throw new Error('should not send duplicate notification');
        }
    });

    assert.equal(skipped.skipped, true);
    assert.equal(skipped.reason, 'already_sent');
});
