const test = require('node:test');
const assert = require('node:assert/strict');

const {
    assertCheckoutVehicleAvailable,
    calculateServerPricing,
    verifyCheckoutAmount,
    withCheckoutVehicleLock
} = require('../../server/reservations/checkout-guard');

const fleetCards = [
    {
        id: 'ferrari-296-gts',
        brand: 'Ferrari',
        pricePerDay: 3400,
        copy: { title: '296 GTS' }
    },
    {
        id: 'mercedes-g63-amg',
        brand: 'Mercedes',
        pricePerDay: 1650,
        copy: { title: 'G63 AMG' }
    }
];

const baseReservation = {
    car: '296 GTS',
    startDate: '2026-06-15',
    endDate: '2026-06-16',
    pickupTime: '12:00',
    dropoffTime: '12:00',
    currency: 'AED'
};

test('server pricing canonicalizes vehicle and computes the 50 percent checkout amount', () => {
    const pricing = calculateServerPricing(baseReservation, { fleetCards, currency: 'aed' });

    assert.equal(pricing.amountMinor, 170000);
    assert.equal(pricing.reservationData.car, 'Ferrari 296 GTS');
    assert.equal(pricing.reservationData.pricePerDay, 3400);
    assert.equal(pricing.reservationData.totalAmount, 3400);
    assert.equal(pricing.reservationData.upfrontAmount, 1700);
});

test('checkout rejects a client-tampered amount before Stripe receives it', () => {
    assert.throws(
        () => verifyCheckoutAmount({
            reservationData: {
                ...baseReservation,
                pricePerDay: 1,
                totalAmount: 1,
                upfrontAmount: 0.5
            },
            amount: 100,
            currency: 'aed',
            fleetCards
        }),
        /amount does not match/i
    );
});

test('checkout accepts only the server-calculated minor-unit amount', () => {
    const pricing = verifyCheckoutAmount({
        reservationData: baseReservation,
        amount: 170000,
        currency: 'aed',
        fleetCards
    });

    assert.equal(pricing.amountMinor, 170000);
    assert.equal(pricing.reservationData.total, 'AED 3400.00');
});

test('checkout rejects vehicles outside the fleet catalog', () => {
    assert.throws(
        () => verifyCheckoutAmount({
            reservationData: {
                ...baseReservation,
                car: 'Imaginary Hypercar'
            },
            amount: 170000,
            currency: 'aed',
            fleetCards
        }),
        /valid vehicle/i
    );
});

test('checkout availability blocks confirmed overlapping reservations for the selected car', () => {
    assert.throws(
        () => assertCheckoutVehicleAvailable({
            fleetCards,
            reservationData: baseReservation,
            reservationId: 'res_new',
            reservations: [
                {
                    reservationId: 'res_existing',
                    status: 'confirmed',
                    reservationData: {
                        car: 'Ferrari 296 GTS',
                        startDate: '2026-06-15',
                        endDate: '2026-06-17',
                        pickupTime: '10:00',
                        dropoffTime: '10:00'
                    }
                }
            ]
        }),
        /not available/i
    );
});

test('checkout vehicle lock serializes critical sections for the same car', async () => {
    const events = [];

    const first = withCheckoutVehicleLock(baseReservation, async () => {
        events.push('first:start');
        await new Promise((resolve) => setTimeout(resolve, 25));
        events.push('first:end');
    }, { fleetCards });

    const second = withCheckoutVehicleLock(baseReservation, async () => {
        events.push('second:start');
        events.push('second:end');
    }, { fleetCards });

    await Promise.all([first, second]);

    assert.deepEqual(events, [
        'first:start',
        'first:end',
        'second:start',
        'second:end'
    ]);
});
