const {
    buildAvailability,
    buildScheduleWindow,
    buildVehicleCatalog,
    loadFleetCards,
    vehicleMatchesReservation
} = require('./availability-core');

const CHECKOUT_CURRENCY = 'aed';
const HOURS_PER_DAY = 24;
const UPFRONT_PAYMENT_RATIO = 0.5;
const QA_CHECKOUT_MODE = 'qa_price_test';
const QA_CHECKOUT_PRICE_PER_DAY = 1;
const QA_CHECKOUT_MIN_BILLING_DAYS = 4;
const checkoutVehicleLocks = new Map();

function checkoutError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function parseMoneyValue(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const parsed = Number.parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function moneyToMinorUnits(value) {
    return Math.round(roundMoney(value) * 100);
}

function normalizeCheckoutCurrency(currency) {
    return String(currency || CHECKOUT_CURRENCY).trim().toLowerCase();
}

function formatMoneyDisplay(amount, currency = CHECKOUT_CURRENCY) {
    return `${normalizeCheckoutCurrency(currency).toUpperCase()} ${roundMoney(amount).toFixed(2)}`;
}

function normalizeToken(value) {
    return String(value || '').trim();
}

function tokenMatches(submittedToken, expectedToken) {
    const submitted = normalizeToken(submittedToken);
    const expected = normalizeToken(expectedToken);

    if (!submitted || !expected || submitted.length !== expected.length) {
        return false;
    }

    return submitted === expected;
}

function isQaCheckoutRequested(reservationData = {}) {
    const rawMode = String(reservationData.checkoutMode || reservationData.qaCheckoutMode || '').trim().toLowerCase();
    const rawFlag = String(reservationData.qaCheckout || '').trim().toLowerCase();

    return rawMode === QA_CHECKOUT_MODE || ['1', 'true', 'yes'].includes(rawFlag);
}

function resolveQaCheckoutOverride(reservationData = {}, options = {}) {
    if (!isQaCheckoutRequested(reservationData)) {
        return null;
    }

    const expectedToken = normalizeToken(options.qaCheckoutToken || process.env.QA_CHECKOUT_TOKEN);
    if (!expectedToken) {
        throw checkoutError('QA checkout pricing is not enabled.', 403);
    }

    if (!tokenMatches(reservationData.qaCheckoutToken || reservationData.qaToken, expectedToken)) {
        throw checkoutError('QA checkout pricing is not authorized.', 403);
    }

    if (Number(options.billingDays) < QA_CHECKOUT_MIN_BILLING_DAYS) {
        throw checkoutError(`QA checkout requires at least ${QA_CHECKOUT_MIN_BILLING_DAYS} billable days so Stripe can accept the AED minimum charge.`, 400);
    }

    return {
        mode: QA_CHECKOUT_MODE,
        pricePerDay: QA_CHECKOUT_PRICE_PER_DAY,
        minBillingDays: QA_CHECKOUT_MIN_BILLING_DAYS
    };
}

function formatDurationLabel(totalHours) {
    if (!Number.isFinite(totalHours) || totalHours <= 0) return '0h';
    const totalMinutes = Math.round(totalHours * 60);
    const days = Math.floor(totalMinutes / (60 * HOURS_PER_DAY));
    const hours = Math.floor((totalMinutes % (60 * HOURS_PER_DAY)) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    return parts.join(' ') || '0h';
}

function recordMatchesReservationId(record = {}, reservationId) {
    const normalizedId = String(reservationId || '').trim();
    if (!normalizedId) {
        return false;
    }

    return [
        record.reservationId,
        record.reservationData?.reservationId,
        record.rawRequest?.reservationId
    ].some((value) => String(value || '').trim() === normalizedId);
}

function resolveFleetCardForReservation(reservationData = {}, fleetCards = loadFleetCards()) {
    const requestedVehicleName = reservationData.car || reservationData.vehicle;
    const catalog = buildVehicleCatalog(fleetCards);
    const matchingVehicle = catalog.find((vehicle) => (
        vehicleMatchesReservation(vehicle, requestedVehicleName)
    ));

    if (!matchingVehicle) {
        throw checkoutError('Choose a valid vehicle from the fleet before payment.', 400);
    }

    const fleetCard = fleetCards.find((card) => card.id === matchingVehicle.id);
    if (!fleetCard || !Number.isFinite(Number(fleetCard.pricePerDay))) {
        throw checkoutError('This vehicle is temporarily unavailable for secure checkout.', 409);
    }

    return { fleetCard, vehicle: matchingVehicle };
}

function calculateServerPricing(reservationData = {}, options = {}) {
    const currency = normalizeCheckoutCurrency(options.currency || reservationData.currency);
    if (currency !== CHECKOUT_CURRENCY) {
        throw checkoutError('Secure checkout is only available in AED.', 400);
    }

    const fleetCards = options.fleetCards || loadFleetCards();
    const { fleetCard, vehicle } = resolveFleetCardForReservation(reservationData, fleetCards);
    const schedule = buildScheduleWindow({
        startDate: reservationData.startDate,
        endDate: reservationData.endDate,
        pickupTime: reservationData.pickupTime,
        dropoffTime: reservationData.dropoffTime
    });

    if (!schedule) {
        throw checkoutError('Choose a valid pickup and return window before payment.', 400);
    }

    const durationHours = (schedule.endMs - schedule.startMs) / (1000 * 60 * 60);
    const billingDays = durationHours / HOURS_PER_DAY;
    const qaCheckoutOverride = resolveQaCheckoutOverride(reservationData, {
        billingDays,
        currency,
        qaCheckoutToken: options.qaCheckoutToken
    });
    const catalogPricePerDay = Number(fleetCard.pricePerDay);
    const pricePerDay = qaCheckoutOverride ? qaCheckoutOverride.pricePerDay : catalogPricePerDay;
    const totalAmount = roundMoney(billingDays * pricePerDay);
    const upfrontAmount = roundMoney(totalAmount * UPFRONT_PAYMENT_RATIO);
    const remainingAmount = roundMoney(Math.max(totalAmount - upfrontAmount, 0));
    const canonicalVehicleName = `${fleetCard.brand} ${fleetCard.copy?.title || vehicle.title}`.trim();
    const sanitizedReservationData = {
        ...reservationData,
        qaCheckoutToken: undefined,
        qaToken: undefined
    };

    return {
        amountMinor: moneyToMinorUnits(upfrontAmount),
        currency,
        fleetCard,
        vehicle,
        reservationData: {
            ...sanitizedReservationData,
            reservationId: reservationData.reservationId,
            car: canonicalVehicleName,
            vehicleId: fleetCard.id,
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            pickupTime: schedule.pickupTime,
            dropoffTime: schedule.dropoffTime,
            durationHours: roundMoney(durationHours),
            days: roundMoney(billingDays),
            durationLabel: formatDurationLabel(durationHours),
            pricePerDay,
            catalogPricePerDay,
            totalAmount,
            total: formatMoneyDisplay(totalAmount, currency),
            upfrontAmount,
            upfrontDisplay: formatMoneyDisplay(upfrontAmount, currency),
            remainingAmount,
            remainingDisplay: formatMoneyDisplay(remainingAmount, currency),
            currency: currency.toUpperCase(),
            ...(qaCheckoutOverride
                ? {
                    checkoutMode: QA_CHECKOUT_MODE,
                    qaCheckout: true,
                    pricingNote: `QA checkout override: AED ${QA_CHECKOUT_PRICE_PER_DAY.toFixed(2)} per day.`
                }
                : {})
        }
    };
}

function verifyCheckoutAmount({ reservationData = {}, amount, currency, fleetCards, qaCheckoutToken } = {}) {
    const requestedAmount = Math.round(parseMoneyValue(amount) || 0);
    if (!requestedAmount || requestedAmount <= 0) {
        throw checkoutError('Amount is required and must be greater than 0.', 400);
    }

    const pricing = calculateServerPricing(reservationData, { currency, fleetCards, qaCheckoutToken });
    if (requestedAmount !== pricing.amountMinor) {
        throw checkoutError('Reservation amount does not match the selected vehicle and rental window.', 409);
    }

    return pricing;
}

function assertCheckoutVehicleAvailable({
    fleetCards = loadFleetCards(),
    reservations = [],
    reservationData = {},
    reservationId,
    now
} = {}) {
    const { vehicle } = resolveFleetCardForReservation(reservationData, fleetCards);
    const availability = buildAvailability({
        fleetCards,
        reservations: reservations.filter((record) => !recordMatchesReservationId(record, reservationId)),
        schedule: {
            startDate: reservationData.startDate,
            endDate: reservationData.endDate,
            pickupTime: reservationData.pickupTime,
            dropoffTime: reservationData.dropoffTime
        },
        now
    });

    if (availability.status !== 'ok') {
        throw checkoutError('Choose a valid pickup and return window before payment.', 400);
    }

    const blockedVehicle = availability.vehicles.find((entry) => (
        entry.id === vehicle.id && entry.available === false
    ));

    if (blockedVehicle) {
        throw checkoutError(`${blockedVehicle.title || 'This vehicle'} is not available for those dates. Choose another car or WhatsApp the team.`, 409);
    }

    return availability;
}

function buildCheckoutIdempotencyKey(reservationId) {
    const safeId = String(reservationId || '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 120);
    return `pgm-checkout-${safeId || Date.now()}`;
}

async function withCheckoutVehicleLock(reservationData = {}, task, options = {}) {
    if (typeof task !== 'function') {
        throw new TypeError('withCheckoutVehicleLock requires a task function');
    }

    const { vehicle } = resolveFleetCardForReservation(reservationData, options.fleetCards || loadFleetCards());
    const key = vehicle.id;
    const previous = checkoutVehicleLocks.get(key) || Promise.resolve();
    let release;
    const current = previous
        .catch(() => {})
        .then(() => new Promise((resolve) => {
            release = resolve;
        }));

    checkoutVehicleLocks.set(key, current);
    await previous.catch(() => {});

    try {
        return await task();
    } finally {
        if (typeof release === 'function') {
            release();
        }
        if (checkoutVehicleLocks.get(key) === current) {
            checkoutVehicleLocks.delete(key);
        }
    }
}

module.exports = {
    assertCheckoutVehicleAvailable,
    buildCheckoutIdempotencyKey,
    calculateServerPricing,
    formatMoneyDisplay,
    parseMoneyValue,
    recordMatchesReservationId,
    resolveFleetCardForReservation,
    resolveQaCheckoutOverride,
    verifyCheckoutAmount,
    withCheckoutVehicleLock
};
