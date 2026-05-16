const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildAvailability,
    buildPublicAvailabilityPayload,
    buildScheduleWindow,
    vehicleMatchesReservation
} = require('../../server/reservations/availability-core');

const fleetCards = [
    {
        id: 'mercedes-g63-amg',
        brand: 'Mercedes',
        copy: { title: 'G63 AMG' }
    },
    {
        id: 'ferrari-296-gts',
        brand: 'Ferrari',
        copy: { title: '296 GTS' }
    },
    {
        id: 'lamborghini-huracan-evo-spyder',
        brand: 'Lamborghini',
        copy: { title: 'Huracán EVO Spyder' }
    }
];

function reservation(overrides = {}) {
    return {
        reservationId: overrides.reservationId || 'res_default',
        status: overrides.status || 'confirmed',
        createdAt: overrides.createdAt,
        updatedAt: overrides.updatedAt,
        payment: overrides.payment,
        reservationData: {
            car: overrides.car || 'Mercedes-Benz G63 AMG',
            startDate: overrides.startDate || '2026-11-10',
            endDate: overrides.endDate || '2026-11-12',
            pickupTime: overrides.pickupTime || '10:00',
            dropoffTime: overrides.dropoffTime || '18:00'
        }
    };
}

const requestedSchedule = {
    startDate: '2026-11-11',
    endDate: '2026-11-13',
    pickupTime: '12:00',
    dropoffTime: '12:00'
};

test('availability blocks a vehicle when an active CRM reservation overlaps the requested window', () => {
    const availability = buildAvailability({
        fleetCards,
        reservations: [reservation()],
        schedule: requestedSchedule
    });

    const mercedes = availability.vehicles.find((vehicle) => vehicle.id === 'mercedes-g63-amg');
    const ferrari = availability.vehicles.find((vehicle) => vehicle.id === 'ferrari-296-gts');

    assert.equal(availability.status, 'ok');
    assert.equal(mercedes.available, false);
    assert.equal(mercedes.conflicts.length, 1);
    assert.equal(mercedes.conflicts[0].reservationId, 'res_default');
    assert.equal(ferrari.available, true);
});

test('cancelled or failed reservations do not block availability', () => {
    const availability = buildAvailability({
        fleetCards,
        reservations: [
            reservation({ reservationId: 'res_cancelled', status: 'admin_canceled' }),
            reservation({ reservationId: 'res_failed', status: 'payment_failed' }),
            reservation({ reservationId: 'res_intent_failed', status: 'payment_intent_failed' }),
            reservation({ reservationId: 'res_canceled', status: 'payment_canceled' })
        ],
        schedule: requestedSchedule
    });

    const mercedes = availability.vehicles.find((vehicle) => vehicle.id === 'mercedes-g63-amg');
    assert.equal(mercedes.available, true);
    assert.equal(mercedes.conflicts.length, 0);
});

test('fresh pending requests hold availability only briefly', () => {
    const now = Date.parse('2026-11-09T10:00:00.000Z');
    const availability = buildAvailability({
        fleetCards,
        reservations: [
            reservation({
                reservationId: 'res_fresh_hold',
                status: 'checkout_started',
                createdAt: '2026-11-09T09:55:00.000Z'
            }),
            reservation({
                reservationId: 'res_fresh_lead',
                status: 'lead_received',
                createdAt: '2026-11-09T09:56:00.000Z'
            }),
            reservation({
                reservationId: 'res_payment_intent_created',
                status: 'payment_intent_created',
                createdAt: '2026-11-09T09:58:00.000Z'
            }),
            reservation({
                reservationId: 'res_detached_card',
                status: 'payment_intent_created',
                createdAt: '2026-11-09T09:58:00.000Z',
                payment: {
                    stripeStatus: 'requires_payment_method'
                }
            })
        ],
        schedule: requestedSchedule,
        now
    });

    const mercedes = availability.vehicles.find((vehicle) => vehicle.id === 'mercedes-g63-amg');
    assert.equal(mercedes.available, false);
    assert.deepEqual(mercedes.conflicts.map((conflict) => conflict.reservationId), [
        'res_fresh_hold',
        'res_fresh_lead',
        'res_payment_intent_created'
    ]);
});

test('stale pending requests do not hide available cars', () => {
    const now = Date.parse('2026-11-09T10:00:00.000Z');
    const availability = buildAvailability({
        fleetCards,
        reservations: [
            reservation({
                reservationId: 'res_abandoned_checkout',
                status: 'checkout_started',
                createdAt: '2026-11-09T09:00:00.000Z'
            }),
            reservation({
                reservationId: 'res_abandoned_lead',
                status: 'lead_received',
                createdAt: '2026-11-09T09:00:00.000Z'
            })
        ],
        schedule: requestedSchedule,
        now
    });

    const mercedes = availability.vehicles.find((vehicle) => vehicle.id === 'mercedes-g63-amg');
    assert.equal(mercedes.available, true);
    assert.equal(mercedes.conflicts.length, 0);
});

test('confirmed payment-like statuses keep blocking availability', () => {
    for (const status of ['payment_succeeded', 'confirmed_email_failed', 'confirmed', 'reservation_confirmed']) {
        const availability = buildAvailability({
            fleetCards,
            reservations: [reservation({ reservationId: `res_${status}`, status })],
            schedule: requestedSchedule
        });

        const mercedes = availability.vehicles.find((vehicle) => vehicle.id === 'mercedes-g63-amg');
        assert.equal(mercedes.available, false, `${status} should block availability`);
        assert.equal(mercedes.conflicts.length, 1);
    }
});

test('non-overlapping reservations do not block availability', () => {
    const availability = buildAvailability({
        fleetCards,
        reservations: [
            reservation({
                reservationId: 'res_future',
                startDate: '2026-12-01',
                endDate: '2026-12-03'
            })
        ],
        schedule: requestedSchedule
    });

    const mercedes = availability.vehicles.find((vehicle) => vehicle.id === 'mercedes-g63-amg');
    assert.equal(mercedes.available, true);
});

test('touching schedule boundaries do not count as overlap', () => {
    const availability = buildAvailability({
        fleetCards,
        reservations: [
            reservation({
                reservationId: 'res_ends_at_pickup',
                startDate: '2026-11-09',
                endDate: '2026-11-11',
                pickupTime: '10:00',
                dropoffTime: '12:00'
            }),
            reservation({
                reservationId: 'res_starts_at_return',
                startDate: '2026-11-13',
                endDate: '2026-11-14',
                pickupTime: '12:00',
                dropoffTime: '12:00'
            })
        ],
        schedule: requestedSchedule
    });

    const mercedes = availability.vehicles.find((vehicle) => vehicle.id === 'mercedes-g63-amg');
    assert.equal(mercedes.available, true);
    assert.equal(mercedes.conflicts.length, 0);
});

test('one-minute schedule overlap blocks availability', () => {
    const availability = buildAvailability({
        fleetCards,
        reservations: [
            reservation({
                reservationId: 'res_one_minute_overlap',
                startDate: '2026-11-09',
                endDate: '2026-11-11',
                pickupTime: '10:00',
                dropoffTime: '12:01'
            })
        ],
        schedule: requestedSchedule
    });

    const mercedes = availability.vehicles.find((vehicle) => vehicle.id === 'mercedes-g63-amg');
    assert.equal(mercedes.available, false);
    assert.equal(mercedes.conflicts.length, 1);
});

test('vehicle matching tolerates CRM aliases and brand variations', () => {
    const catalog = buildAvailability({
        fleetCards,
        reservations: [],
        schedule: requestedSchedule
    }).vehicles;
    const mercedesVehicle = {
        ...catalog.find((vehicle) => vehicle.id === 'mercedes-g63-amg'),
        aliases: ['g63 amg', 'mercedes g63 amg'],
        compactAliases: ['g63amg', 'mercedesg63amg']
    };

    assert.equal(vehicleMatchesReservation(mercedesVehicle, 'Mercedes-Benz G63 AMG'), true);
    assert.equal(vehicleMatchesReservation(mercedesVehicle, 'G63 AMG'), true);
    assert.equal(vehicleMatchesReservation(mercedesVehicle, 'Ferrari 296 GTS'), false);
});

test('vehicle matching ignores accents between catalog titles and CRM reservations', () => {
    const availability = buildAvailability({
        fleetCards,
        reservations: [
            reservation({
                reservationId: 'res_huracan_paid',
                car: 'Huracan EVO Spyder',
                status: 'confirmed_email_failed'
            })
        ],
        schedule: requestedSchedule
    });

    const huracan = availability.vehicles.find((vehicle) => vehicle.id === 'lamborghini-huracan-evo-spyder');
    assert.equal(huracan.available, false);
    assert.equal(huracan.conflicts.length, 1);
    assert.equal(huracan.conflicts[0].reservationId, 'res_huracan_paid');
});

test('invalid schedules return a missing schedule state', () => {
    const availability = buildAvailability({
        fleetCards,
        reservations: [reservation()],
        schedule: { startDate: '2026-11-13', endDate: '2026-11-12' }
    });

    assert.equal(buildScheduleWindow({ startDate: '2026-11-13', endDate: '2026-11-12' }), null);
    assert.equal(availability.status, 'missing_schedule');
    assert.equal(availability.vehicles[0].available, null);
});

test('public availability payload does not expose reservation identifiers', () => {
    const availability = buildAvailability({
        fleetCards,
        reservations: [reservation({ reservationId: 'res_private_123' })],
        schedule: requestedSchedule
    });
    const publicPayload = buildPublicAvailabilityPayload(availability);
    const serializedPayload = JSON.stringify(publicPayload);

    assert.equal(publicPayload.vehicles.find((vehicle) => vehicle.id === 'mercedes-g63-amg').available, false);
    assert.equal(serializedPayload.includes('res_private_123'), false);
    assert.equal(serializedPayload.includes('conflicts'), false);
    assert.equal(serializedPayload.includes('conflictCount'), false);
});
