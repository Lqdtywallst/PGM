const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

delete process.env.DATABASE_URL;

const express = require('express');
const reserveRoutes = require('../../app/api/reserve/route');
const {
    closeReservationStore,
    deleteReservationRecord,
    saveReservationRecord
} = require('../../server/reservations/reservation-store');

function createLookupServer() {
    const app = express();
    app.use(express.json());
    app.use('/api/reserve', reserveRoutes);

    const server = http.createServer(app);

    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            resolve({
                baseUrl: `http://127.0.0.1:${address.port}`,
                close: () => new Promise((closeResolve, closeReject) => {
                    server.close((error) => error ? closeReject(error) : closeResolve());
                })
            });
        });
    });
}

async function postLookup(baseUrl, payload) {
    const response = await fetch(`${baseUrl}/api/reserve/lookup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    return {
        response,
        body: await response.json()
    };
}

test('customer reservation lookup requires matching email and returns only a safe summary', async () => {
    const suffix = crypto.randomBytes(4).toString('hex');
    const reservationId = `lookup_security_${suffix}`;
    const email = `lookup-${suffix}@example.com`;
    const phone = '+971 58 000 9999';
    const passport = `PASS-${suffix}`;
    const pickupLocation = 'Private villa gate 7, Palm Jumeirah';
    const server = await createLookupServer();

    try {
        await deleteReservationRecord(reservationId);
        await saveReservationRecord({
            reservationId,
            status: 'confirmed',
            source: 'lookup_security_test',
            customerData: {
                name: 'Lookup Security Client',
                email,
                phone,
                passport
            },
            reservationData: {
                reservationId,
                car: 'Ferrari 296 GTS',
                startDate: '2026-05-14',
                endDate: '2026-05-16',
                pickupTime: '10:00',
                dropoffTime: '18:00',
                pickupLocation,
                durationLabel: '2 days',
                totalAmount: 6800,
                upfrontAmount: 3400,
                remainingAmount: 3400,
                currency: 'AED'
            },
            payment: {
                paymentIntentId: `pi_lookup_${suffix}`,
                stripeStatus: 'succeeded',
                amount: 340000,
                currency: 'aed'
            },
            rawRequest: {
                customerData: {
                    email,
                    phone,
                    passport
                }
            }
        });

        const missingEmail = await postLookup(server.baseUrl, {
            reservationId,
            email: ''
        });
        assert.equal(missingEmail.response.status, 400);
        assert.equal(missingEmail.response.headers.get('cache-control'), 'no-store');
        assert.equal(missingEmail.body.success, false);

        const wrongEmail = await postLookup(server.baseUrl, {
            reservationId,
            email: `wrong-${suffix}@example.com`
        });
        assert.equal(wrongEmail.response.status, 404);
        assert.equal(wrongEmail.response.headers.get('cache-control'), 'no-store');
        assert.equal(wrongEmail.body.success, false);
        assert.equal(wrongEmail.body.reservation, undefined);

        const matched = await postLookup(server.baseUrl, {
            reservationId,
            email: email.toUpperCase()
        });
        assert.equal(matched.response.status, 200);
        assert.equal(matched.response.headers.get('cache-control'), 'no-store');
        assert.equal(matched.body.success, true);
        assert.equal(matched.body.reservation.reservationId, reservationId);
        assert.equal(matched.body.reservation.vehicle, 'Ferrari 296 GTS');

        const serializedResponse = JSON.stringify(matched.body);
        assert.equal(serializedResponse.includes(email), false);
        assert.equal(serializedResponse.includes(phone), false);
        assert.equal(serializedResponse.includes(passport), false);
        assert.equal(serializedResponse.includes(pickupLocation), false);
        assert.equal(Object.hasOwn(matched.body.reservation, 'customerData'), false);
        assert.equal(Object.hasOwn(matched.body.reservation, 'rawRequest'), false);
    } finally {
        await deleteReservationRecord(reservationId).catch(() => {});
        await server.close().catch(() => {});
        await closeReservationStore();
    }
});
