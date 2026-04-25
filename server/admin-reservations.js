const express = require('express');

const QUICK_FILTERS = Object.freeze({
    pending_payment: 'Pending payment',
    confirmed: 'Confirmed',
    today: 'Today',
    next_7_days: 'Next 7 days',
    needs_contact: 'Needs contact',
    failed_payment: 'Failed payment'
});

const STATUS_LABELS = Object.freeze({
    admin_canceled: 'Canceled by admin',
    checkout_started: 'Checkout started',
    confirmed: 'Confirmed',
    confirmed_email_failed: 'Confirmed, email needs attention',
    customer_processing_failed: 'Customer processing failed',
    lead_received: 'Lead received',
    payment_canceled: 'Payment canceled',
    payment_failed: 'Payment failed',
    payment_intent_created: 'Payment started',
    payment_requires_action: 'Payment requires action',
    payment_succeeded: 'Payment succeeded',
    received: 'Received'
});

const PENDING_PAYMENT_STATUSES = new Set([
    'checkout_started',
    'lead_received',
    'payment_intent_created',
    'payment_requires_action',
    'received'
]);

const CONFIRMED_STATUSES = new Set([
    'confirmed',
    'payment_succeeded',
    'confirmed_email_failed',
    'reservation_confirmed'
]);

const FAILED_PAYMENT_STATUSES = new Set([
    'customer_processing_failed',
    'payment_canceled',
    'payment_failed'
]);

function asCleanString(value) {
    return String(value ?? '').trim();
}

function normalizeStatus(value) {
    return asCleanString(value || 'received').toLowerCase();
}

function labelFromStatus(status) {
    const normalized = normalizeStatus(status);
    return STATUS_LABELS[normalized] || normalized
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function firstValue(values) {
    return values.find((value) => value !== undefined && value !== null && asCleanString(value) !== '') ?? null;
}

function toIsoDate(value) {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function addDaysIsoDate(baseDate, days) {
    const date = new Date(`${toIsoDate(baseDate)}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function normalizePhoneForHref(phone) {
    const raw = asCleanString(phone);
    if (!raw) return '';
    return raw.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
}

function normalizePhoneForWhatsApp(phone) {
    return normalizePhoneForHref(phone).replace(/^\+/, '').replace(/\D/g, '');
}

function encodeMailto(value) {
    return encodeURIComponent(asCleanString(value));
}

function formatMoney(value, currency = 'AED') {
    if (value === undefined || value === null || value === '') return null;

    if (typeof value === 'string' && /[a-zA-Z]/.test(value) && !/^\d/.test(value.trim())) {
        return value;
    }

    const numeric = typeof value === 'number'
        ? value
        : Number.parseFloat(String(value).replace(/[^0-9.-]+/g, ''));

    if (!Number.isFinite(numeric)) {
        return asCleanString(value) || null;
    }

    return `${Math.round(numeric).toLocaleString('en-US')} ${asCleanString(currency || 'AED').toUpperCase()}`;
}

function getAdminData(record = {}) {
    const admin = record.reservationData?.admin;
    return admin && typeof admin === 'object' ? admin : {};
}

function getReservationFacts(record = {}) {
    const customerData = record.customerData || {};
    const reservationData = record.reservationData || {};
    const rawRequest = record.rawRequest || {};
    const payment = record.payment || {};
    const email = record.email || {};
    const currency = firstValue([
        reservationData.currency,
        payment.currency,
        rawRequest.currency,
        'AED'
    ]);

    return {
        reservationId: firstValue([
            record.reservationId,
            reservationData.reservationId,
            payment.reservationId
        ]),
        paymentIntentId: firstValue([
            record.paymentIntentId,
            payment.paymentIntentId,
            payment.id
        ]),
        stripeCustomerId: record.stripeCustomerId || null,
        status: normalizeStatus(record.status),
        source: record.source || 'website',
        storage: record.storage || null,
        createdAt: record.createdAt || null,
        updatedAt: record.updatedAt || null,
        customerName: firstValue([
            customerData.name,
            customerData.fullName,
            reservationData.customerName,
            rawRequest.customerName,
            rawRequest.customerData?.name
        ]),
        customerEmail: firstValue([
            customerData.email,
            reservationData.customerEmail,
            rawRequest.email,
            rawRequest.customerData?.email
        ]),
        customerPhone: firstValue([
            customerData.phone,
            customerData.whatsapp,
            reservationData.customerPhone,
            rawRequest.phone,
            rawRequest.customerData?.phone
        ]),
        customerIdDocument: firstValue([
            customerData.passport,
            customerData.dni,
            customerData.idNumber,
            rawRequest.passport,
            rawRequest.customerData?.passport
        ]),
        vehicle: firstValue([
            reservationData.car,
            reservationData.vehicle,
            rawRequest.car,
            rawRequest.vehicle
        ]),
        startDate: toIsoDate(firstValue([
            reservationData.startDate,
            rawRequest.startDate
        ])),
        endDate: toIsoDate(firstValue([
            reservationData.endDate,
            rawRequest.endDate
        ])),
        pickupTime: firstValue([
            reservationData.pickupTime,
            rawRequest.pickupTime
        ]),
        dropoffTime: firstValue([
            reservationData.dropoffTime,
            rawRequest.dropoffTime
        ]),
        pickupLocation: firstValue([
            reservationData.pickupLocation,
            rawRequest.pickupLocation
        ]),
        dropoffLocation: firstValue([
            reservationData.dropoffLocation,
            rawRequest.dropoffLocation
        ]),
        durationLabel: firstValue([
            reservationData.durationLabel,
            reservationData.days ? `${reservationData.days} days` : null
        ]),
        total: firstValue([
            reservationData.totalDisplay,
            reservationData.total,
            formatMoney(reservationData.totalAmount, currency),
            formatMoney(payment.amount ? Number(payment.amount) / 100 : null, payment.currency || currency)
        ]),
        upfront: firstValue([
            reservationData.upfrontDisplay,
            formatMoney(reservationData.upfrontAmount, currency)
        ]),
        remaining: firstValue([
            reservationData.remainingDisplay,
            formatMoney(reservationData.remainingAmount, currency)
        ]),
        pricePerDay: firstValue([
            formatMoney(reservationData.pricePerDay, currency),
            reservationData.price
        ]),
        stripeStatus: payment.stripeStatus || null,
        paymentError: payment.lastPaymentError || payment.error || null,
        emailStatus: firstValue([
            email.status,
            email.confirmationStatus,
            email.sentAt ? 'sent' : null
        ]),
        emailSentAt: email.sentAt || email.confirmationSentAt || null,
        currency: asCleanString(currency || 'AED').toUpperCase()
    };
}

function classifyReservation(record = {}, options = {}) {
    const facts = getReservationFacts(record);
    const admin = getAdminData(record);
    const today = toIsoDate(options.now || new Date());
    const nextWeek = addDaysIsoDate(today, 7);
    const status = facts.status;
    const isCanceled = status.includes('cancel') || Boolean(admin.canceledAt);
    const startsToday = facts.startDate === today;
    const createdToday = toIsoDate(facts.createdAt) === today;
    const startsNextSevenDays = Boolean(
        facts.startDate &&
        facts.startDate >= today &&
        facts.startDate <= nextWeek
    );
    const failedPayment = FAILED_PAYMENT_STATUSES.has(status);
    const pendingPayment = PENDING_PAYMENT_STATUSES.has(status);
    const confirmed = CONFIRMED_STATUSES.has(status);
    const needsContact = !isCanceled && !admin.contactedAt && (pendingPayment || failedPayment || confirmed);

    return {
        pendingPayment,
        confirmed,
        today: startsToday || createdToday,
        next7Days: startsNextSevenDays,
        needsContact,
        failedPayment,
        canceled: isCanceled
    };
}

function buildAdminReservationSummary(record = {}, options = {}) {
    const facts = getReservationFacts(record);
    const admin = getAdminData(record);
    const phoneHref = normalizePhoneForHref(facts.customerPhone);
    const whatsappPhone = normalizePhoneForWhatsApp(facts.customerPhone);
    const whatsappMessage = [
        `Hello${facts.customerName ? ` ${facts.customerName}` : ''}, this is Dynasty Prestige.`,
        `We are contacting you about reservation ${facts.reservationId || ''}.`,
        facts.vehicle ? `Vehicle: ${facts.vehicle}.` : ''
    ].filter(Boolean).join(' ');

    return {
        id: facts.reservationId || facts.paymentIntentId,
        reservationId: facts.reservationId,
        paymentIntentId: facts.paymentIntentId,
        status: facts.status,
        statusLabel: labelFromStatus(facts.status),
        source: facts.source,
        storage: facts.storage,
        createdAt: facts.createdAt,
        updatedAt: facts.updatedAt,
        customer: {
            name: facts.customerName,
            email: facts.customerEmail,
            phone: facts.customerPhone,
            idDocument: facts.customerIdDocument,
            callHref: phoneHref ? `tel:${phoneHref}` : null,
            whatsappHref: whatsappPhone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}` : null,
            emailHref: facts.customerEmail ? `mailto:${encodeMailto(facts.customerEmail)}` : null
        },
        vehicle: {
            name: facts.vehicle,
            pricePerDay: facts.pricePerDay
        },
        schedule: {
            startDate: facts.startDate,
            endDate: facts.endDate,
            pickupTime: facts.pickupTime,
            dropoffTime: facts.dropoffTime,
            pickupLocation: facts.pickupLocation,
            dropoffLocation: facts.dropoffLocation,
            durationLabel: facts.durationLabel
        },
        payment: {
            total: facts.total,
            upfront: facts.upfront,
            remaining: facts.remaining,
            currency: facts.currency,
            stripeStatus: facts.stripeStatus,
            error: facts.paymentError
        },
        email: {
            status: facts.emailStatus,
            sentAt: facts.emailSentAt
        },
        admin: {
            contacted: Boolean(admin.contactedAt),
            contactedAt: admin.contactedAt || null,
            contactedBy: admin.contactedBy || null,
            contactMethod: admin.contactMethod || null,
            handoverConfirmedAt: admin.handoverConfirmedAt || null,
            handoverStatus: admin.handoverStatus || null,
            canceledAt: admin.canceledAt || null,
            cancelReason: admin.cancelReason || null,
            notes: admin.notes || '',
            lastAction: admin.lastAction || null,
            lastActionAt: admin.lastActionAt || null,
            lastActionBy: admin.lastActionBy || null
        },
        flags: classifyReservation(record, options)
    };
}

function buildAdminReservationDetail(record = {}, options = {}) {
    const { admin, ...reservationData } = record.reservationData || {};

    return {
        ...buildAdminReservationSummary(record, options),
        customerData: record.customerData || {},
        reservationData,
        paymentData: record.payment || {},
        emailData: record.email || {},
        technical: {
            source: record.source || null,
            storage: record.storage || null,
            stripeCustomerId: record.stripeCustomerId || null,
            paymentIntentId: record.paymentIntentId || record.payment?.paymentIntentId || null
        }
    };
}

function summaryMatchesSearch(summary, query) {
    const normalizedQuery = asCleanString(query).toLowerCase();
    if (!normalizedQuery) return true;

    const searchable = [
        summary.reservationId,
        summary.paymentIntentId,
        summary.status,
        summary.statusLabel,
        summary.customer.name,
        summary.customer.email,
        summary.customer.phone,
        summary.vehicle.name,
        summary.schedule.startDate,
        summary.schedule.endDate,
        summary.schedule.pickupLocation
    ].filter(Boolean).join(' ').toLowerCase();

    return searchable.includes(normalizedQuery);
}

function summaryMatchesQuickFilter(summary, quickFilter) {
    switch (quickFilter) {
        case 'pending_payment':
            return summary.flags.pendingPayment;
        case 'confirmed':
            return summary.flags.confirmed;
        case 'today':
            return summary.flags.today;
        case 'next_7_days':
            return summary.flags.next7Days;
        case 'needs_contact':
            return summary.flags.needsContact;
        case 'failed_payment':
            return summary.flags.failedPayment;
        default:
            return true;
    }
}

function collectReservationFilters(query = {}) {
    const quick = asCleanString(query.quick);
    const status = asCleanString(query.status).toLowerCase();
    const q = asCleanString(query.q);
    const limit = Math.min(Math.max(Number(query.limit || 500), 1), 5000);

    return {
        quick: QUICK_FILTERS[quick] ? quick : '',
        status,
        q,
        limit
    };
}

function filterAdminReservationSummaries(records = [], filters = {}, options = {}) {
    const items = records
        .map((record) => buildAdminReservationSummary(record, options))
        .filter((summary) => summary.id)
        .filter((summary) => !filters.status || summary.status === filters.status)
        .filter((summary) => summaryMatchesQuickFilter(summary, filters.quick))
        .filter((summary) => summaryMatchesSearch(summary, filters.q))
        .sort((left, right) => (
            new Date(right.updatedAt || right.createdAt || 0) -
            new Date(left.updatedAt || left.createdAt || 0)
        ));

    return {
        total: items.length,
        items: items.slice(0, filters.limit || 500)
    };
}

function applyAdminReservationAction(record = {}, action, payload = {}, actor = 'admin', options = {}) {
    const normalizedAction = asCleanString(action).toLowerCase();
    const timestamp = (options.now ? new Date(options.now) : new Date()).toISOString();
    const admin = {
        ...getAdminData(record),
        lastAction: normalizedAction,
        lastActionAt: timestamp,
        lastActionBy: actor || 'admin'
    };
    let status = record.status || 'received';

    if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
        admin.notes = asCleanString(payload.notes);
    }

    if (normalizedAction === 'mark_contacted') {
        admin.contactedAt = timestamp;
        admin.contactedBy = actor || 'admin';
        admin.contactMethod = asCleanString(payload.method) || 'manual';
    } else if (normalizedAction === 'confirm_handover') {
        admin.handoverConfirmedAt = timestamp;
        admin.handoverStatus = 'confirmed';
    } else if (normalizedAction === 'cancel') {
        status = 'admin_canceled';
        admin.canceledAt = timestamp;
        admin.cancelReason = asCleanString(payload.reason) || asCleanString(payload.notes) || 'Admin canceled';
    } else if (normalizedAction === 'update_notes') {
        admin.notes = asCleanString(payload.notes);
    } else {
        const error = new Error(`Unsupported admin reservation action: ${normalizedAction || 'empty'}`);
        error.statusCode = 400;
        throw error;
    }

    const { storage, ...recordWithoutStorage } = record;
    return {
        ...recordWithoutStorage,
        status,
        reservationData: {
            ...(record.reservationData || {}),
            admin
        }
    };
}

function csvCell(value) {
    const normalized = asCleanString(value);
    if (!/[",\n\r]/.test(normalized)) {
        return normalized;
    }

    return `"${normalized.replace(/"/g, '""')}"`;
}

function toReservationCsv(items = []) {
    const columns = [
        ['reservationId', 'Reservation ID'],
        ['statusLabel', 'Status'],
        ['customerName', 'Customer'],
        ['customerEmail', 'Email'],
        ['customerPhone', 'Phone'],
        ['vehicle', 'Vehicle'],
        ['startDate', 'Start date'],
        ['endDate', 'End date'],
        ['pickupTime', 'Pickup time'],
        ['dropoffTime', 'Dropoff time'],
        ['pickupLocation', 'Pickup location'],
        ['total', 'Total'],
        ['upfront', 'Upfront'],
        ['remaining', 'Remaining'],
        ['contactedAt', 'Contacted at'],
        ['handoverConfirmedAt', 'Handover confirmed at'],
        ['updatedAt', 'Updated at']
    ];

    const rows = items.map((item) => ({
        reservationId: item.reservationId,
        statusLabel: item.statusLabel,
        customerName: item.customer.name,
        customerEmail: item.customer.email,
        customerPhone: item.customer.phone,
        vehicle: item.vehicle.name,
        startDate: item.schedule.startDate,
        endDate: item.schedule.endDate,
        pickupTime: item.schedule.pickupTime,
        dropoffTime: item.schedule.dropoffTime,
        pickupLocation: item.schedule.pickupLocation,
        total: item.payment.total,
        upfront: item.payment.upfront,
        remaining: item.payment.remaining,
        contactedAt: item.admin.contactedAt,
        handoverConfirmedAt: item.admin.handoverConfirmedAt,
        updatedAt: item.updatedAt
    }));

    return [
        columns.map(([, label]) => csvCell(label)).join(','),
        ...rows.map((row) => columns.map(([key]) => csvCell(row[key])).join(','))
    ].join('\n');
}

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

function createAdminReservationsRouter(dependencies = {}) {
    const store = dependencies.store || require('./reservation-store');
    const router = express.Router();

    router.use((req, res, next) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        next();
    });

    router.get('/reservations', asyncRoute(async (req, res) => {
        const filters = collectReservationFilters(req.query);
        const records = await store.listReservationRecords({ limit: 5000 });
        const result = filterAdminReservationSummaries(records, filters);

        res.json({
            items: result.items,
            total: result.total,
            filters,
            quickFilters: QUICK_FILTERS,
            storage: store.getReservationStoreMode ? store.getReservationStoreMode() : null
        });
    }));

    router.get('/reservations.csv', asyncRoute(async (req, res) => {
        const filters = collectReservationFilters({ ...req.query, limit: 5000 });
        const records = await store.listReservationRecords({ limit: 5000 });
        const result = filterAdminReservationSummaries(records, filters);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="dynasty-reservations.csv"');
        res.send(toReservationCsv(result.items));
    }));

    router.get('/reservations/:id', asyncRoute(async (req, res) => {
        const record = await store.readReservationRecord(req.params.id);
        if (!record) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        return res.json({ reservation: buildAdminReservationDetail(record) });
    }));

    router.patch('/reservations/:id', asyncRoute(async (req, res) => {
        const record = await store.readReservationRecord(req.params.id);
        if (!record) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        try {
            const nextRecord = applyAdminReservationAction(
                record,
                req.body?.action,
                req.body || {},
                req.adminSession?.user || 'admin'
            );
            const savedRecord = await store.saveReservationRecord(nextRecord);

            return res.json({ reservation: buildAdminReservationDetail(savedRecord) });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                error: error.statusCode ? error.message : 'Reservation could not be updated'
            });
        }
    }));

    return router;
}

module.exports = {
    CONFIRMED_STATUSES,
    FAILED_PAYMENT_STATUSES,
    PENDING_PAYMENT_STATUSES,
    QUICK_FILTERS,
    applyAdminReservationAction,
    buildAdminReservationDetail,
    buildAdminReservationSummary,
    classifyReservation,
    collectReservationFilters,
    createAdminReservationsRouter,
    filterAdminReservationSummaries,
    toReservationCsv
};
