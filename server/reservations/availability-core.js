const fs = require('fs');
const path = require('path');

const fleetCardsPath = path.join(__dirname, '..', 'data', 'fleet-cards.json');

const NON_BLOCKING_STATUS_PATTERNS = [
    /cancel/i,
    /^payment(?:_intent)?_failed$/i,
    /^customer_processing_failed$/i,
    /refunded/i,
    /expired/i
];
const TEMPORARY_HOLD_STATUS_PATTERNS = [
    /^checkout_started$/i,
    /^lead_received$/i,
    /^payment_intent_created$/i,
    /^payment_requires_action$/i,
    /^received$/i
];
const TEMPORARY_HOLD_MS = 30 * 60 * 1000;

function cleanText(value) {
    return String(value || '').trim();
}

function normalizeVehicleName(value) {
    return cleanText(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/rolls[\s-]?royce/g, 'rolls royce')
        .replace(/mercedes[\s-]?benz/g, 'mercedes')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function compactVehicleName(value) {
    return normalizeVehicleName(value).replace(/\s+/g, '');
}

function loadFleetCards() {
    return JSON.parse(fs.readFileSync(fleetCardsPath, 'utf8'));
}

function buildVehicleCatalog(fleetCards = loadFleetCards()) {
    return fleetCards.map((card) => {
        const title = cleanText(card.copy?.title);
        const brand = cleanText(card.brand);
        const aliases = [
            card.id,
            title,
            `${brand} ${title}`,
            `${brand} ${title}`.replace(/\bSport\b/i, '').trim(),
            `${brand} ${title}`.replace(/\bEVO\b/i, '').trim()
        ].filter(Boolean);

        return {
            id: card.id,
            brand,
            title,
            label: `${brand} ${title}`,
            aliases: [...new Set(aliases.map(normalizeVehicleName).filter(Boolean))],
            compactAliases: [...new Set(aliases.map(compactVehicleName).filter(Boolean))]
        };
    });
}

function vehicleMatchesReservation(vehicle, reservationVehicleName) {
    const normalizedReservation = normalizeVehicleName(reservationVehicleName);
    const compactReservation = compactVehicleName(reservationVehicleName);

    if (!normalizedReservation) {
        return false;
    }

    return vehicle.aliases.some((alias) => (
        alias === normalizedReservation ||
        normalizedReservation.includes(alias) ||
        alias.includes(normalizedReservation)
    )) || vehicle.compactAliases.some((alias) => (
        alias === compactReservation ||
        compactReservation.includes(alias) ||
        alias.includes(compactReservation)
    ));
}

function firstValue(values) {
    return values.find((value) => value !== undefined && value !== null && cleanText(value) !== '') ?? null;
}

function reservationVehicleName(record = {}) {
    const reservationData = record.reservationData || {};
    const rawRequest = record.rawRequest || {};

    return firstValue([
        reservationData.car,
        reservationData.vehicle,
        rawRequest.car,
        rawRequest.vehicle,
        record.car
    ]);
}

function normalizeDate(value) {
    const normalized = cleanText(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
}

function normalizeTime(value, fallback) {
    const normalized = cleanText(value);
    return /^\d{2}:\d{2}$/.test(normalized) ? normalized : fallback;
}

function scheduleToMs(dateValue, timeValue, fallbackTime) {
    const date = normalizeDate(dateValue);
    if (!date) {
        return null;
    }

    const time = normalizeTime(timeValue, fallbackTime);
    const parsed = new Date(`${date}T${time}:00+04:00`);
    const timeMs = parsed.getTime();
    return Number.isFinite(timeMs) ? timeMs : null;
}

function buildScheduleWindow(schedule = {}) {
    const startMs = scheduleToMs(schedule.startDate, schedule.pickupTime, '00:00');
    const endMs = scheduleToMs(schedule.endDate, schedule.dropoffTime, '23:59');

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return null;
    }

    return {
        startDate: normalizeDate(schedule.startDate),
        endDate: normalizeDate(schedule.endDate),
        pickupTime: normalizeTime(schedule.pickupTime, '00:00'),
        dropoffTime: normalizeTime(schedule.dropoffTime, '23:59'),
        startMs,
        endMs
    };
}

function reservationSchedule(record = {}) {
    const reservationData = record.reservationData || {};
    const rawRequest = record.rawRequest || {};

    return buildScheduleWindow({
        startDate: firstValue([reservationData.startDate, rawRequest.startDate, record.startDate, record.start_date]),
        endDate: firstValue([reservationData.endDate, rawRequest.endDate, record.endDate, record.end_date]),
        pickupTime: firstValue([reservationData.pickupTime, rawRequest.pickupTime, record.pickupTime, record.pickup_time]),
        dropoffTime: firstValue([reservationData.dropoffTime, rawRequest.dropoffTime, record.dropoffTime, record.dropoff_time])
    });
}

function schedulesOverlap(left, right) {
    return Boolean(left && right && left.startMs < right.endMs && right.startMs < left.endMs);
}

function timestampToMs(value) {
    const parsed = new Date(cleanText(value)).getTime();
    return Number.isFinite(parsed) ? parsed : null;
}

function temporaryHoldAgeMs(record = {}, now = Date.now()) {
    const createdMs = timestampToMs(record.createdAt || record.rawRequest?.submittedAt || record.updatedAt);
    return Number.isFinite(createdMs) ? now - createdMs : null;
}

function isTemporaryHoldStatus(status) {
    return TEMPORARY_HOLD_STATUS_PATTERNS.some((pattern) => pattern.test(status));
}

function isBlockingReservation(record = {}, options = {}) {
    const status = cleanText(record.status || record.reservationData?.status || 'received');

    if (NON_BLOCKING_STATUS_PATTERNS.some((pattern) => pattern.test(status))) {
        return false;
    }

    if (isTemporaryHoldStatus(status)) {
        const ageMs = temporaryHoldAgeMs(record, options.now);
        return ageMs === null || ageMs <= TEMPORARY_HOLD_MS;
    }

    return true;
}

function buildAvailability({ fleetCards, reservations = [], schedule = {}, now = Date.now() } = {}) {
    const catalog = buildVehicleCatalog(fleetCards);
    const requestedWindow = buildScheduleWindow(schedule);

    if (!requestedWindow) {
        return {
            status: 'missing_schedule',
            schedule: null,
            vehicles: catalog.map((vehicle) => ({
                id: vehicle.id,
                title: vehicle.title,
                brand: vehicle.brand,
                label: vehicle.label,
                available: null,
                conflicts: []
            }))
        };
    }

    const activeReservations = reservations
        .filter((record) => isBlockingReservation(record, { now }))
        .map((record) => ({
            record,
            vehicleName: reservationVehicleName(record),
            schedule: reservationSchedule(record)
        }))
        .filter((entry) => entry.vehicleName && entry.schedule && schedulesOverlap(requestedWindow, entry.schedule));

    return {
        status: 'ok',
        schedule: {
            startDate: requestedWindow.startDate,
            endDate: requestedWindow.endDate,
            pickupTime: requestedWindow.pickupTime,
            dropoffTime: requestedWindow.dropoffTime
        },
        vehicles: catalog.map((vehicle) => {
            const conflicts = activeReservations
                .filter((entry) => vehicleMatchesReservation(vehicle, entry.vehicleName))
                .map((entry) => ({
                    reservationId: entry.record.reservationId || entry.record.reservationData?.reservationId || '',
                    status: entry.record.status || 'received',
                    startDate: entry.schedule.startDate,
                    endDate: entry.schedule.endDate
                }));

            return {
                id: vehicle.id,
                title: vehicle.title,
                brand: vehicle.brand,
                label: vehicle.label,
                available: conflicts.length === 0,
                conflicts
            };
        })
    };
}

function buildPublicAvailabilityPayload(availability = {}) {
    return {
        status: availability.status || 'missing_schedule',
        schedule: availability.schedule || null,
        vehicles: (availability.vehicles || []).map((vehicle) => ({
            id: vehicle.id,
            title: vehicle.title,
            brand: vehicle.brand,
            label: vehicle.label,
            available: vehicle.available
        }))
    };
}

module.exports = {
    buildAvailability,
    buildPublicAvailabilityPayload,
    buildScheduleWindow,
    buildVehicleCatalog,
    isBlockingReservation,
    loadFleetCards,
    normalizeVehicleName,
    schedulesOverlap,
    vehicleMatchesReservation
};
