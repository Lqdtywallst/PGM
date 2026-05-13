const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const test = require('node:test');

delete process.env.DATABASE_URL;

const {
    closeReservationStore,
    deleteReservationRecord,
    getReservationRecordPath,
    getReservationStoreDiagnostics,
    listLocalReservationRecords,
    readReservationRecord,
    saveReservationRecord
} = require('../../server/reservations/reservation-store');

test('local reservation store writes atomically and can update by payment intent', async () => {
    const suffix = crypto.randomBytes(5).toString('hex');
    const reservationId = `local_store_${suffix}`;
    const paymentIntentId = `pi_local_${suffix}`;

    try {
        await deleteReservationRecord(reservationId);

        const saved = await saveReservationRecord({
            reservationId,
            status: 'payment_intent_created',
            source: 'unit_test',
            customerData: {
                name: 'Local Store Client',
                email: `local-${suffix}@example.com`,
                phone: '+971 58 111 2222'
            },
            reservationData: {
                reservationId,
                car: 'Mercedes G63 AMG',
                startDate: '2026-07-10',
                endDate: '2026-07-12',
                pickupTime: '10:00',
                dropoffTime: '18:00',
                totalAmount: 7000,
                currency: 'AED'
            },
            payment: {
                paymentIntentId,
                stripeStatus: 'requires_payment_method'
            }
        });

        assert.equal(saved.storage, 'local-json');
        assert.equal(fs.existsSync(getReservationRecordPath(reservationId)), true);

        const readByPayment = await readReservationRecord(paymentIntentId);
        assert.equal(readByPayment.reservationId, reservationId);
        assert.equal(readByPayment.payment.paymentIntentId, paymentIntentId);

        const updated = await saveReservationRecord({
            paymentIntentId,
            status: 'confirmed',
            reservationData: {
                admin: {
                    notes: 'Updated using only the payment intent key.'
                }
            },
            payment: {
                stripeStatus: 'succeeded'
            }
        });

        assert.equal(updated.reservationId, reservationId);
        assert.equal(updated.status, 'confirmed');
        assert.equal(updated.customerData.email, `local-${suffix}@example.com`);
        assert.equal(updated.reservationData.admin.notes, 'Updated using only the payment intent key.');

        const webhookStyleUpdate = await saveReservationRecord({
            reservationId: `unexpected_${suffix}`,
            paymentIntentId,
            status: 'payment_failed',
            payment: {
                stripeStatus: 'failed'
            }
        });

        assert.equal(webhookStyleUpdate.reservationId, reservationId);
        assert.equal(webhookStyleUpdate.status, 'payment_failed');

        const localRecords = listLocalReservationRecords({ limit: 5000 });
        assert.equal(localRecords.some((record) => record.reservationId === reservationId), true);

        const diagnostics = await getReservationStoreDiagnostics();
        assert.equal(diagnostics.ok, true);
        assert.equal(diagnostics.mode, 'local-json');
        assert.equal(Number.isInteger(diagnostics.reservationCount), true);
    } finally {
        await deleteReservationRecord(reservationId).catch(() => {});
        await closeReservationStore();
    }
});
