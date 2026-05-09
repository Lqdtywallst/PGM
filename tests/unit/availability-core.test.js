const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildAvailability,
    buildPublicAvailabilityPayload,
    buildScheduleWindow,
    vehicleMatchesReservation
} = require('../../server/availability-core');

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
    }
];

function reservation(overrides = {}) {
    return {
        reservationId: overrides.reservationId || 'res_default',
        status: overrides.status || 'confirmed',
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
            reservation({ reservationId: 'res_failed', status: 'payment_failed' })
        ],
        schedule: requestedSchedule
    });

    const mercedes = availability.vehicles.find((vehicle) => vehicle.id === 'mercedes-g63-amg');
    assert.equal(mercedes.available, true);
    assert.equal(mercedes.conflicts.length, 0);
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
