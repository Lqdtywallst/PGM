const crypto = require('node:crypto');

const LEAD_STATUSES = new Set(['lead_received', 'received']);
const PAYMENT_PENDING_STATUSES = new Set([
    'checkout_started',
    'payment_intent_created',
    'payment_requires_action'
]);
const PAYMENT_ISSUE_STATUSES = new Set([
    'customer_processing_failed',
    'payment_canceled',
    'payment_failed',
    'payment_intent_failed'
]);
const CONFIRMED_STATUSES = new Set([
    'confirmed',
    'payment_succeeded',
    'reservation_confirmed',
    'confirmed_email_failed'
]);

function asCleanString(value) {
    return String(value ?? '').trim();
}

function firstValue(values = []) {
    for (const value of values) {
        const normalized = asCleanString(value);
        if (normalized) return normalized;
    }

    return '';
}

function normalizeEmail(value) {
    const email = asCleanString(value).toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function normalizePhone(value) {
    const raw = asCleanString(value);
    if (!raw) return '';

    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (raw.trim().startsWith('+')) return `+${digits}`;
    if (digits.startsWith('00')) return `+${digits.slice(2)}`;
    if (digits.startsWith('971')) return `+${digits}`;
    if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 10) return `+971${digits.slice(1)}`;

    return digits.length >= 8 ? `+${digits}` : digits;
}

function normalizeDate(value) {
    const normalized = asCleanString(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function parseNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = typeof value === 'number'
        ? value
        : Number.parseFloat(String(value).replace(/[^0-9.-]/g, ''));

    return Number.isFinite(parsed) ? parsed : null;
}

function stableId(prefix, value) {
    const seed = asCleanString(value) || 'unknown';
    return `${prefix}_${crypto.createHash('sha256').update(seed).digest('hex').slice(0, 18)}`;
}

function valueBand(totalAmount) {
    const value = parseNumber(totalAmount);
    if (value === null) return 'unknown';
    if (value < 2500) return 'entry';
    if (value < 5000) return 'premium';
    if (value < 10000) return 'high_value';
    return 'vip';
}

function daysBetween(startDate, endDate) {
    const start = normalizeDate(startDate);
    const end = normalizeDate(endDate);
    if (!start || !end) return null;

    const startTime = Date.parse(`${start}T00:00:00.000Z`);
    const endTime = Date.parse(`${end}T00:00:00.000Z`);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;

    return Math.max(Math.ceil((endTime - startTime) / 86400000), 0);
}

function leadTimeDays(createdAt, startDate) {
    const start = normalizeDate(startDate);
    if (!createdAt || !start) return null;

    const createdTime = Date.parse(createdAt);
    const startTime = Date.parse(`${start}T00:00:00.000Z`);
    if (!Number.isFinite(createdTime) || !Number.isFinite(startTime)) return null;

    return Math.floor((startTime - createdTime) / 86400000);
}

function getReservationAdmin(record = {}) {
    return record.reservationData?.admin || {};
}

function getCustomerFacts(record = {}) {
    const customerData = record.customerData || {};
    const reservationData = record.reservationData || {};
    const rawRequest = record.rawRequest || {};
    const rawCustomer = rawRequest.customerData || {};
    const email = normalizeEmail(firstValue([
        customerData.email,
        reservationData.customerEmail,
        rawCustomer.email,
        rawRequest.email
    ]));
    const phone = normalizePhone(firstValue([
        customerData.phone,
        customerData.whatsapp,
        reservationData.customerPhone,
        rawCustomer.phone,
        rawRequest.phone
    ]));
    const name = firstValue([
        customerData.name,
        customerData.fullName,
        reservationData.customerName,
        rawCustomer.name,
        rawRequest.customerName
    ]);
    const identitySeed = email || phone || record.stripeCustomerId || record.reservationId || record.paymentIntentId;

    return {
        customerId: stableId('crm_cus', identitySeed),
        identityKey: email ? 'email' : (phone ? 'phone' : (record.stripeCustomerId ? 'stripe_customer' : 'reservation')),
        name,
        email,
        phone,
        phoneDisplay: firstValue([customerData.phone, customerData.whatsapp, rawCustomer.phone, rawRequest.phone]),
        stripeCustomerId: record.stripeCustomerId || record.customerId || null,
        city: firstValue([customerData.city, rawCustomer.city]),
        country: firstValue([customerData.country, rawCustomer.country]),
        consent: {
            contact: customerData.contactConsent ?? rawCustomer.contactConsent ?? null,
            marketing: customerData.marketingConsent ?? rawCustomer.marketingConsent ?? null,
            privacy: customerData.privacyConsent ?? rawCustomer.privacyConsent ?? null
        }
    };
}

function getReservationFacts(record = {}) {
    const reservationData = record.reservationData || {};
    const rawRequest = record.rawRequest || {};
    const totalAmount = parseNumber(firstValue([
        reservationData.totalAmount,
        reservationData.total,
        rawRequest.totalAmount,
        rawRequest.amount
    ]));

    return {
        reservationId: firstValue([record.reservationId, reservationData.reservationId]),
        status: asCleanString(record.status || 'received') || 'received',
        source: asCleanString(record.source || 'website') || 'website',
        vehicle: firstValue([reservationData.car, reservationData.vehicle, rawRequest.car, rawRequest.vehicle]),
        startDate: normalizeDate(firstValue([reservationData.startDate, rawRequest.startDate])),
        endDate: normalizeDate(firstValue([reservationData.endDate, rawRequest.endDate])),
        pickupTime: firstValue([reservationData.pickupTime, rawRequest.pickupTime]),
        dropoffTime: firstValue([reservationData.dropoffTime, rawRequest.dropoffTime]),
        pickupLocation: firstValue([reservationData.pickupLocation, rawRequest.pickupLocation]),
        dropoffLocation: firstValue([reservationData.dropoffLocation, rawRequest.dropoffLocation]),
        totalAmount,
        currency: firstValue([reservationData.currency, record.payment?.currency, rawRequest.currency]),
        durationDays: parseNumber(reservationData.days) ?? daysBetween(reservationData.startDate, reservationData.endDate),
        durationHours: parseNumber(reservationData.durationHours)
    };
}

function classifyLeadStage(record = {}) {
    const status = asCleanString(record.status || 'received');
    const admin = getReservationAdmin(record);
    if (admin.archivedAt) return 'closed';
    if (status === 'admin_canceled' || admin.canceledAt) return 'lost';
    if (CONFIRMED_STATUSES.has(status)) return 'booked';
    if (PAYMENT_ISSUE_STATUSES.has(status)) return 'recovery';
    if (PAYMENT_PENDING_STATUSES.has(status)) return 'payment_pending';
    if (LEAD_STATUSES.has(status)) return admin.contactedAt ? 'qualified' : 'new';

    return 'review';
}

function classifyPaymentStatus(record = {}) {
    const status = asCleanString(record.status || '');
    const stripeStatus = asCleanString(record.payment?.stripeStatus || '').toLowerCase();
    if (status === 'payment_succeeded' || stripeStatus === 'succeeded') return 'deposit_paid';
    if (CONFIRMED_STATUSES.has(status)) return 'confirmed_or_paid';
    if (status === 'payment_requires_action' || stripeStatus === 'requires_action') return 'requires_action';
    if (status === 'payment_intent_created' || stripeStatus === 'requires_payment_method') return 'intent_created';
    if (status === 'checkout_started') return 'checkout_started';
    if (PAYMENT_ISSUE_STATUSES.has(status) || ['failed', 'canceled'].includes(stripeStatus)) return 'failed';
    return 'not_started';
}

function classifyHandoverStatus(record = {}) {
    const admin = getReservationAdmin(record);
    if (admin.handoverConfirmedAt) return 'completed';
    if (CONFIRMED_STATUSES.has(asCleanString(record.status || ''))) return 'to_schedule';
    return 'not_ready';
}

function classifyReservationStatus(record = {}) {
    const status = asCleanString(record.status || '');
    const admin = getReservationAdmin(record);
    if (admin.archivedAt) return 'archived';
    if (status === 'admin_canceled' || admin.canceledAt) return 'canceled';
    return 'active';
}

function buildDataQualityProfile(record = {}) {
    const customer = getCustomerFacts(record);
    const reservation = getReservationFacts(record);
    const required = {
        customer_name: Boolean(customer.name),
        customer_email: Boolean(customer.email),
        customer_phone: Boolean(customer.phone),
        vehicle: Boolean(reservation.vehicle),
        start_date: Boolean(reservation.startDate),
        end_date: Boolean(reservation.endDate),
        pickup_time: Boolean(reservation.pickupTime),
        dropoff_time: Boolean(reservation.dropoffTime),
        pickup_location: Boolean(reservation.pickupLocation),
        total_amount: reservation.totalAmount !== null
    };
    const missingFields = Object.entries(required)
        .filter(([, present]) => !present)
        .map(([field]) => field);
    const score = Math.round(((Object.keys(required).length - missingFields.length) / Object.keys(required).length) * 100);

    return {
        score,
        missingFields,
        hasContactRoute: Boolean(customer.email || customer.phone),
        hasOperationalSchedule: Boolean(reservation.startDate && reservation.endDate && reservation.pickupTime),
        aiReadyForOps: score >= 70 && Boolean(customer.email || customer.phone) && Boolean(reservation.vehicle),
        consentKnown: Object.values(customer.consent).some((value) => value !== null && value !== undefined)
    };
}

function buildAttribution(record = {}) {
    const rawRequest = record.rawRequest || {};
    const attribution = rawRequest.attribution || rawRequest.clientContext || {};
    const device = rawRequest.device || {};

    return {
        source: asCleanString(record.source || rawRequest.source || 'website') || 'website',
        pagePath: firstValue([attribution.pagePath, attribution.page_path, rawRequest.pagePath]),
        referrer: firstValue([attribution.referrer, attribution.referer, rawRequest.referer]),
        landingUrl: firstValue([attribution.landingUrl, attribution.landing_url]),
        utmSource: firstValue([attribution.utmSource, attribution.utm_source]),
        utmMedium: firstValue([attribution.utmMedium, attribution.utm_medium]),
        utmCampaign: firstValue([attribution.utmCampaign, attribution.utm_campaign]),
        device: {
            viewport: firstValue([device.viewport, attribution.viewport]),
            language: firstValue([device.language, attribution.language]),
            timezone: firstValue([device.timezone, attribution.timezone])
        }
    };
}

function inferServiceSignals(reservation = {}) {
    const text = [
        reservation.vehicle,
        reservation.pickupLocation,
        reservation.dropoffLocation
    ].join(' ').toLowerCase();
    const durationDays = parseNumber(reservation.durationDays);

    return {
        airport: /\b(dxb|dwc|airport|terminal)\b/.test(text),
        hotelOrVilla: /\b(hotel|villa|resort|residence|palm|marina)\b/.test(text),
        chauffeur: /\b(chauffeur|driver|driven)\b/.test(text),
        monthly: durationDays !== null && durationDays >= 28
    };
}

function buildAiFeatureSeed(record = {}) {
    const reservation = getReservationFacts(record);
    const vehicleBrand = firstValue([reservation.vehicle]).split(/\s+/)[0] || '';

    return {
        vehicleBrand,
        valueBand: valueBand(reservation.totalAmount),
        durationDays: reservation.durationDays,
        durationHours: reservation.durationHours,
        leadTimeDays: leadTimeDays(record.createdAt, reservation.startDate),
        serviceSignals: inferServiceSignals(reservation),
        needsHumanReview: (
            buildDataQualityProfile(record).score < 70 ||
            classifyLeadStage(record) === 'recovery' ||
            classifyPaymentStatus(record) === 'failed'
        )
    };
}

function buildCrmReservationIntelligence(record = {}) {
    const customer = getCustomerFacts(record);
    const reservation = getReservationFacts(record);

    return {
        customer,
        reservationId: reservation.reservationId,
        leadStage: classifyLeadStage(record),
        paymentStatus: classifyPaymentStatus(record),
        handoverStatus: classifyHandoverStatus(record),
        reservationStatus: classifyReservationStatus(record),
        source: reservation.source,
        preferredVehicle: reservation.vehicle,
        pickupArea: reservation.pickupLocation,
        dropoffArea: reservation.dropoffLocation,
        rentalStart: reservation.startDate,
        rentalEnd: reservation.endDate,
        totalAmount: reservation.totalAmount,
        attribution: buildAttribution(record),
        dataQuality: buildDataQualityProfile(record),
        aiFeatures: buildAiFeatureSeed(record)
    };
}

function buildCrmInteractionSeed(record = {}) {
    const intelligence = buildCrmReservationIntelligence(record);
    const status = asCleanString(record.status || 'received');
    const reservationId = intelligence.reservationId || record.paymentIntentId || 'unknown';
    const eventType = `reservation_${status}`;
    const occurredAt = record.updatedAt || record.createdAt || new Date().toISOString();

    return {
        id: stableId('crm_evt', `${reservationId}:${eventType}`),
        reservationId: intelligence.reservationId,
        customerId: intelligence.customer.customerId,
        eventType,
        channel: 'system',
        direction: 'internal',
        summary: `Reservation ${reservationId} is ${status} for ${intelligence.preferredVehicle || 'vehicle to confirm'}.`,
        actor: 'system',
        outcome: intelligence.leadStage,
        metadata: {
            leadStage: intelligence.leadStage,
            paymentStatus: intelligence.paymentStatus,
            handoverStatus: intelligence.handoverStatus,
            dataQualityScore: intelligence.dataQuality.score
        },
        occurredAt
    };
}

module.exports = {
    buildAiFeatureSeed,
    buildAttribution,
    buildCrmInteractionSeed,
    buildCrmReservationIntelligence,
    buildDataQualityProfile,
    classifyHandoverStatus,
    classifyLeadStage,
    classifyPaymentStatus,
    classifyReservationStatus,
    getCustomerFacts,
    getReservationFacts,
    normalizeEmail,
    normalizePhone
};
