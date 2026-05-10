const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const shouldRun = Boolean(process.env.TEST_DATABASE_URL);

if (shouldRun) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    process.env.DATABASE_SSL = process.env.TEST_DATABASE_SSL || 'false';
}

const {
    closeReservationStore,
    deleteReservationRecord,
    findReservationForLookup,
    listReservationRecords,
    readReservationRecord,
    saveReservationRecord
} = require('../../server/reservations/reservation-store');

test('reservation store writes, reads, updates and lists PostgreSQL reservations', {
    skip: shouldRun ? false : 'Set TEST_DATABASE_URL to run PostgreSQL integration storage tests.'
}, async () => {
    const suffix = crypto.randomBytes(5).toString('hex');
    const reservationId = `test_pg_${suffix}`;

    try {
        await deleteReservationRecord(reservationId);

        const saved = await saveReservationRecord({
            reservationId,
            status: 'checkout_started',
            source: 'integration_test',
            customerData: {
                name: 'Postgres Test Client',
                email: `pg-test-${suffix}@example.com`,
                phone: '+971 50 999 1234',
                passport: 'PG-TEST'
            },
            reservationData: {
                reservationId,
                car: 'Ferrari 296 GTS',
                startDate: '2026-05-10',
                endDate: '2026-05-12',
                pickupTime: '11:00',
                dropoffTime: '16:00',
                pickupLocation: 'Downtown Dubai',
                totalAmount: 6800,
                upfrontAmount: 3400,
                remainingAmount: 3400,
                currency: 'AED'
            },
            payment: {
                paymentIntentId: `pi_${suffix}`,
                stripeStatus: 'requires_payment_method',
                amount: 340000,
                currency: 'aed'
            }
        });

        assert.equal(saved.storage, 'postgres');
        assert.equal(saved.reservationId, reservationId);
        assert.equal(saved.customerData.email, `pg-test-${suffix}@example.com`);

        const readBack = await readReservationRecord(reservationId);
        assert.equal(readBack.storage, 'postgres');
        assert.equal(readBack.reservationData.car, 'Ferrari 296 GTS');
        assert.equal(readBack.payment.paymentIntentId, `pi_${suffix}`);

        const lookup = await findReservationForLookup({
            reservationId,
            email: `PG-TEST-${suffix}@EXAMPLE.COM`
        });
        assert.equal(lookup.reservationId, reservationId);

        const updated = await saveReservationRecord({
            reservationId,
            status: 'confirmed',
            reservationData: {
                admin: {
                    notes: 'Integration test contacted client.'
                }
            },
            payment: {
                stripeStatus: 'succeeded'
            }
        });
        assert.equal(updated.status, 'confirmed');
        assert.equal(updated.customerData.phone, '+971 50 999 1234');
        assert.equal(updated.reservationData.admin.notes, 'Integration test contacted client.');

        const listed = await listReservationRecords({ limit: 50 });
        assert.ok(listed.some((record) => record.reservationId === reservationId));
    } finally {
        await deleteReservationRecord(reservationId).catch(() => {});
        await closeReservationStore();
    }
});
