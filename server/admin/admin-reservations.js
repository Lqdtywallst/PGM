const crypto = require('node:crypto');
const express = require('express');
const {
    getMobileNotificationDiagnostics
} = require('../integrations/mobile-notifications');

const QUICK_FILTERS = Object.freeze({
    new_leads: 'New leads',
    new_today: 'New today',
    pending_review: 'Pending review',
    to_contact: 'Pending review',
    pending_payment: 'Payment pending',
    payment_issues: 'Payment issues',
    confirmed_to_schedule: 'Confirmed handover open',
    email_issue: 'Email issues',
    pickup_today: 'Pickup today',
    next_7_days: 'Next 7 days',
    handover_done: 'Handover done',
    canceled: 'Canceled',
    archived: 'Archived',
    confirmed: 'Confirmed',
    today: 'Today',
    needs_contact: 'Pending review',
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
    'payment_intent_failed',
    'payment_failed'
]);

const LEAD_STATUSES = new Set([
    'lead_received',
    'received'
]);

const CHECKOUT_PENDING_STATUSES = new Set([
    'checkout_started',
    'payment_intent_created',
    'payment_requires_action'
]);

const EMAIL_ISSUE_STATUSES = new Set([
    'failed',
    'error',
    'bounced',
    'rejected'
]);

const MANUAL_RESERVATION_STATUSES = new Set([
    ...Object.keys(STATUS_LABELS),
    'payment_intent_failed',
    'reservation_confirmed',
    'failed',
    'error'
]);

function normalizeAppEnvironment(env = process.env) {
    const raw = asCleanString(env.APP_ENV || env.PGM_APP_ENV || env.NODE_ENV).toLowerCase();

    if (['production', 'prod'].includes(raw)) return 'production';
    if (['staging', 'stage', 'preview', 'preprod', 'preproduction'].includes(raw)) return 'staging';
    if (['test'].includes(raw)) return 'test';
    if (['development', 'dev', 'local'].includes(raw)) return 'development';

    return raw || 'development';
}

function labelFromEnvironment(environment) {
    if (environment === 'production') return 'Production CRM';
    if (environment === 'staging') return 'Staging CRM';
    if (environment === 'test') return 'Test CRM';
    return 'Local CRM';
}

function getStripeSecretMode(env = process.env) {
    const secretKey = asCleanString(env.STRIPE_SECRET_KEY);
    if (!secretKey) return 'missing';
    if (secretKey.startsWith('sk_live_')) return 'live';
    if (secretKey.startsWith('sk_test_')) return 'test';
    return 'unknown';
}

function buildStatusCheck(id, label, status, detail) {
    return {
        id,
        label,
        status,
        detail: asCleanString(detail)
    };
}

function buildAdminOperationsStatus(options = {}) {
    const env = options.env || process.env;
    const diagnostics = options.diagnostics || {};
    const appEnv = normalizeAppEnvironment(env);
    const isRealEnvironment = appEnv === 'production' || appEnv === 'staging';
    const expectedStripeMode = appEnv === 'production'
        ? 'live'
        : appEnv === 'staging'
            ? 'test'
            : null;
    const stripeMode = getStripeSecretMode(env);
    const databaseConfigured = diagnostics.mode === 'postgres' || Boolean(asCleanString(env.DATABASE_URL));
    const adminConfigured = Boolean(
        asCleanString(env.ADMIN_USER) &&
        asCleanString(env.ADMIN_PASSWORD_HASH) &&
        asCleanString(env.ADMIN_SESSION_SECRET)
    );
    const webhookConfigured = Boolean(asCleanString(env.STRIPE_WEBHOOK_SECRET));
    const mobileNotifications = getMobileNotificationDiagnostics(env);
    const checks = [];

    checks.push(buildStatusCheck(
        'reservation_storage',
        'Reservation storage',
        databaseConfigured ? 'pass' : (isRealEnvironment ? 'fail' : 'warn'),
        databaseConfigured
            ? 'Reservations are stored in PostgreSQL.'
            : 'Using local JSON fallback. This is not acceptable for staging/production.'
    ));

    checks.push(buildStatusCheck(
        'stripe_mode',
        'Stripe mode',
        expectedStripeMode
            ? (stripeMode === expectedStripeMode ? 'pass' : 'fail')
            : (stripeMode === 'missing' ? 'warn' : 'pass'),
        expectedStripeMode
            ? `Expected ${expectedStripeMode}, detected ${stripeMode}.`
            : `Detected ${stripeMode}.`
    ));

    checks.push(buildStatusCheck(
        'stripe_webhook',
        'Stripe webhook',
        webhookConfigured ? 'pass' : (isRealEnvironment ? 'fail' : 'warn'),
        webhookConfigured
            ? 'Webhook secret is configured.'
            : 'STRIPE_WEBHOOK_SECRET is missing.'
    ));

    checks.push(buildStatusCheck(
        'admin_access',
        'Admin access',
        adminConfigured ? 'pass' : 'fail',
        adminConfigured
            ? 'Admin username, password hash and session secret are configured.'
            : 'Missing one of ADMIN_USER, ADMIN_PASSWORD_HASH or ADMIN_SESSION_SECRET.'
    ));

    checks.push(buildStatusCheck(
        'mobile_notifications',
        'Mobile notifications',
        mobileNotifications.configured ? 'pass' : (isRealEnvironment ? 'fail' : 'warn'),
        mobileNotifications.configured
            ? `Configured channels: ${mobileNotifications.channels.join(', ')}.`
            : 'Configure Telegram or a reservation notification webhook for phone alerts.'
    ));

    checks.push(buildStatusCheck(
        'storage_health',
        'Storage health',
        diagnostics.ok === false ? 'fail' : 'pass',
        diagnostics.ok === false
            ? diagnostics.error || 'Storage diagnostics failed.'
            : 'Storage diagnostics are healthy.'
    ));

    checks.push(buildStatusCheck(
        'crm_data_layer',
        'CRM data layer',
        diagnostics.crmData ? 'pass' : (isRealEnvironment ? 'fail' : 'warn'),
        diagnostics.crmData
            ? `CRM intelligence schema v${diagnostics.crmData.schemaVersion || 'unknown'} is available.`
            : 'CRM intelligence tables and data-quality diagnostics are not available.'
    ));

    const failCount = checks.filter((check) => check.status === 'fail').length;
    const warnCount = checks.filter((check) => check.status === 'warn').length;

    return {
        generatedAt: new Date().toISOString(),
        appEnv,
        nodeEnv: env.NODE_ENV || null,
        label: labelFromEnvironment(appEnv),
        overallStatus: failCount ? 'bad' : (warnCount ? 'review' : 'ok'),
        checks,
        services: {
            adminConfigured,
            stripeConfigured: stripeMode !== 'missing',
            stripeMode,
            stripeWebhookConfigured: webhookConfigured,
            mobileNotifications
        },
        storage: {
            mode: diagnostics.mode || (databaseConfigured ? 'postgres' : 'local-json'),
            ok: diagnostics.ok !== false,
            databaseConfigured,
            schemaVersion: diagnostics.schemaVersion || null,
            schemaReady: diagnostics.schemaReady ?? null,
            reservationCount: diagnostics.reservationCount ?? null,
            latestUpdatedAt: diagnostics.latestUpdatedAt || null,
            crmData: diagnostics.crmData || null
        }
    };
}

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

function daysBetweenIsoDates(startDate, endDate) {
    const start = new Date(`${toIsoDate(startDate)}T00:00:00.000Z`);
    const end = new Date(`${toIsoDate(endDate)}T00:00:00.000Z`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 0;
    }

    return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function monthFromDate(value, options = {}) {
    const fallback = toIsoDate(options.now || new Date()).slice(0, 7);
    const normalized = asCleanString(value || fallback);
    const match = normalized.match(/^(\d{4})-(\d{2})$/);

    if (!match) {
        return fallback;
    }

    const month = Number(match[2]);
    return month >= 1 && month <= 12 ? `${match[1]}-${match[2]}` : fallback;
}

function endOfMonthIso(month) {
    const [year, monthNumber] = month.split('-').map(Number);
    const date = new Date(Date.UTC(year, monthNumber, 0));
    return date.toISOString().slice(0, 10);
}

function monthLabel(month) {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('en-GB', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function weekStartIso(dateValue) {
    const date = new Date(`${toIsoDate(dateValue)}T00:00:00.000Z`);
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
    return date.toISOString().slice(0, 10);
}

function weekEndIso(dateValue) {
    return addDaysIsoDate(weekStartIso(dateValue), 6);
}

function isIsoDateWithin(value, startDate, endDate) {
    return Boolean(value && startDate && endDate && value >= startDate && value <= endDate);
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

function numberOrNull(value) {
    if (value === undefined || value === null || value === '') return null;
    const numeric = typeof value === 'number'
        ? value
        : Number.parseFloat(String(value).replace(/[^0-9.-]+/g, ''));

    return Number.isFinite(numeric) ? numeric : null;
}

function getObjectPayload(payload = {}) {
    return payload && typeof payload === 'object' ? payload : {};
}

function firstPresentValue(source = {}, keys = []) {
    const input = getObjectPayload(source);
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            return input[key];
        }
    }

    return undefined;
}

function setCleanTextIfPresent(target, key, source, aliases = [key]) {
    const value = firstPresentValue(source, aliases);
    if (value !== undefined) {
        target[key] = asCleanString(value);
        return true;
    }

    return false;
}

function setDateIfPresent(target, key, source, aliases = [key]) {
    const value = firstPresentValue(source, aliases);
    if (value !== undefined) {
        target[key] = toIsoDate(value) || asCleanString(value);
        return true;
    }

    return false;
}

function setNumberIfPresent(target, key, source, aliases = [key]) {
    const value = firstPresentValue(source, aliases);
    if (value !== undefined) {
        target[key] = numberOrNull(value);
        return true;
    }

    return false;
}

function buildValidationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
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

function getManualReservationInput(payload = {}) {
    const input = getObjectPayload(payload);
    return getObjectPayload(input.reservation || input);
}

function normalizeManualCurrency(value) {
    const currency = asCleanString(value || 'AED').toUpperCase();
    return currency || 'AED';
}

function normalizeManualStatus(value, fallback = 'received') {
    const status = normalizeStatus(value || fallback);
    if (!MANUAL_RESERVATION_STATUSES.has(status)) {
        throw buildValidationError(`Unsupported reservation status: ${status}`);
    }

    return status;
}

function buildManualReservationPatch(payload = {}) {
    const input = getManualReservationInput(payload);
    const customerData = {};
    const reservationData = {};
    const payment = {};
    const updatedFields = [];

    if (setCleanTextIfPresent(customerData, 'name', input, ['customerName', 'name', 'fullName'])) {
        updatedFields.push('client name');
    }
    if (setCleanTextIfPresent(customerData, 'email', input, ['customerEmail', 'email'])) {
        updatedFields.push('email');
    }
    if (setCleanTextIfPresent(customerData, 'phone', input, ['customerPhone', 'phone', 'whatsapp'])) {
        updatedFields.push('phone');
    }
    if (setCleanTextIfPresent(customerData, 'passport', input, ['customerIdDocument', 'passport', 'dni', 'idDocument', 'idNumber'])) {
        updatedFields.push('ID/passport');
    }
    if (setCleanTextIfPresent(reservationData, 'car', input, ['vehicle', 'car', 'vehicleName'])) {
        updatedFields.push('vehicle');
    }
    if (setDateIfPresent(reservationData, 'startDate', input, ['startDate', 'pickupDate'])) {
        updatedFields.push('start date');
    }
    if (setDateIfPresent(reservationData, 'endDate', input, ['endDate', 'dropoffDate'])) {
        updatedFields.push('end date');
    }
    if (setCleanTextIfPresent(reservationData, 'pickupTime', input)) {
        updatedFields.push('pickup time');
    }
    if (setCleanTextIfPresent(reservationData, 'dropoffTime', input)) {
        updatedFields.push('dropoff time');
    }
    if (setCleanTextIfPresent(reservationData, 'pickupLocation', input)) {
        updatedFields.push('pickup location');
    }
    if (setCleanTextIfPresent(reservationData, 'dropoffLocation', input, ['dropoffLocation', 'returnLocation'])) {
        updatedFields.push('dropoff location');
    }
    if (setNumberIfPresent(reservationData, 'totalAmount', input)) {
        updatedFields.push('total amount');
    }
    if (setNumberIfPresent(reservationData, 'upfrontAmount', input)) {
        updatedFields.push('upfront amount');
    }
    if (setNumberIfPresent(reservationData, 'remainingAmount', input)) {
        updatedFields.push('remaining amount');
    }

    const currencyValue = firstPresentValue(input, ['currency']);
    if (currencyValue !== undefined) {
        const currency = normalizeManualCurrency(currencyValue);
        reservationData.currency = currency;
        payment.currency = currency.toLowerCase();
        updatedFields.push('currency');
    }

    const statusValue = firstPresentValue(input, ['status']);
    const status = statusValue === undefined || !asCleanString(statusValue) ? null : normalizeManualStatus(statusValue);
    if (status) {
        updatedFields.push('status');
    }

    const notesValue = firstPresentValue(input, ['notes', 'adminNotes']);
    const hasNotes = notesValue !== undefined;
    if (hasNotes) {
        updatedFields.push('admin notes');
    }

    return {
        customerData,
        reservationData,
        payment,
        status,
        notes: hasNotes ? asCleanString(notesValue) : null,
        hasNotes,
        updatedFields: [...new Set(updatedFields)]
    };
}

function hasOwnValue(source, key) {
    return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function textValueChanged(nextValue, currentValue) {
    return asCleanString(nextValue) !== asCleanString(currentValue);
}

function numberValueChanged(nextValue, currentValue) {
    return numberOrNull(nextValue) !== numberOrNull(currentValue);
}

function collectManualChangedFields(record = {}, patch = {}) {
    const customerData = record.customerData || {};
    const reservationData = record.reservationData || {};
    const admin = getAdminData(record);
    const changedFields = [];

    if (hasOwnValue(patch.customerData, 'name') && textValueChanged(patch.customerData.name, firstValue([
        customerData.name,
        customerData.fullName,
        reservationData.customerName
    ]))) {
        changedFields.push('client name');
    }
    if (hasOwnValue(patch.customerData, 'email') && textValueChanged(patch.customerData.email, firstValue([
        customerData.email,
        reservationData.customerEmail
    ]))) {
        changedFields.push('email');
    }
    if (hasOwnValue(patch.customerData, 'phone') && textValueChanged(patch.customerData.phone, firstValue([
        customerData.phone,
        customerData.whatsapp,
        reservationData.customerPhone
    ]))) {
        changedFields.push('phone');
    }
    if (hasOwnValue(patch.customerData, 'passport') && textValueChanged(patch.customerData.passport, firstValue([
        customerData.passport,
        customerData.dni,
        customerData.idNumber
    ]))) {
        changedFields.push('ID/passport');
    }
    if (hasOwnValue(patch.reservationData, 'car') && textValueChanged(patch.reservationData.car, firstValue([
        reservationData.car,
        reservationData.vehicle
    ]))) {
        changedFields.push('vehicle');
    }
    if (hasOwnValue(patch.reservationData, 'startDate') && textValueChanged(
        patch.reservationData.startDate,
        toIsoDate(reservationData.startDate) || reservationData.startDate
    )) {
        changedFields.push('start date');
    }
    if (hasOwnValue(patch.reservationData, 'endDate') && textValueChanged(
        patch.reservationData.endDate,
        toIsoDate(reservationData.endDate) || reservationData.endDate
    )) {
        changedFields.push('end date');
    }
    if (hasOwnValue(patch.reservationData, 'pickupTime') && textValueChanged(patch.reservationData.pickupTime, reservationData.pickupTime)) {
        changedFields.push('pickup time');
    }
    if (hasOwnValue(patch.reservationData, 'dropoffTime') && textValueChanged(patch.reservationData.dropoffTime, reservationData.dropoffTime)) {
        changedFields.push('dropoff time');
    }
    if (hasOwnValue(patch.reservationData, 'pickupLocation') && textValueChanged(patch.reservationData.pickupLocation, reservationData.pickupLocation)) {
        changedFields.push('pickup location');
    }
    if (hasOwnValue(patch.reservationData, 'dropoffLocation') && textValueChanged(patch.reservationData.dropoffLocation, reservationData.dropoffLocation)) {
        changedFields.push('dropoff location');
    }
    if (hasOwnValue(patch.reservationData, 'totalAmount') && numberValueChanged(patch.reservationData.totalAmount, reservationData.totalAmount)) {
        changedFields.push('total amount');
    }
    if (hasOwnValue(patch.reservationData, 'upfrontAmount') && numberValueChanged(patch.reservationData.upfrontAmount, reservationData.upfrontAmount)) {
        changedFields.push('upfront amount');
    }
    if (hasOwnValue(patch.reservationData, 'remainingAmount') && numberValueChanged(patch.reservationData.remainingAmount, reservationData.remainingAmount)) {
        changedFields.push('remaining amount');
    }
    if (hasOwnValue(patch.reservationData, 'currency') && textValueChanged(patch.reservationData.currency, reservationData.currency)) {
        changedFields.push('currency');
    }
    if (patch.status && patch.status !== normalizeStatus(record.status)) {
        changedFields.push('status');
    }
    if (patch.hasNotes && textValueChanged(patch.notes, admin.notes)) {
        changedFields.push('admin notes');
    }

    return changedFields;
}

function generateManualReservationId(options = {}) {
    const baseDate = options.now ? new Date(options.now) : new Date();
    const date = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const timestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `manual_${timestamp}_${crypto.randomBytes(4).toString('hex')}`;
}

function appendAdminActivity(admin = {}, entry = {}) {
    const activity = Array.isArray(admin.activity) ? admin.activity.filter(Boolean) : [];
    const nextEntry = {
        action: asCleanString(entry.action),
        at: asCleanString(entry.at),
        by: asCleanString(entry.by || 'admin'),
        summary: asCleanString(entry.summary)
    };

    if (!nextEntry.action || !nextEntry.at) {
        return {
            ...admin,
            activity: activity.slice(-50)
        };
    }

    return {
        ...admin,
        activity: [...activity, nextEntry].slice(-50)
    };
}

function createManualReservationRecord(payload = {}, actor = 'admin', options = {}) {
    const input = getManualReservationInput(payload);
    const patch = buildManualReservationPatch(input);
    const timestamp = (options.now ? new Date(options.now) : new Date()).toISOString();
    const reservationId = asCleanString(input.reservationId) || generateManualReservationId({ now: timestamp });
    const currency = patch.reservationData.currency || 'AED';
    const missingFields = [];

    if (!patch.customerData.name) missingFields.push('customerName');
    if (!patch.customerData.phone) missingFields.push('customerPhone');
    if (!patch.reservationData.car) missingFields.push('vehicle');

    if (missingFields.length) {
        throw buildValidationError(`Manual reservation requires: ${missingFields.join(', ')}`);
    }

    const admin = appendAdminActivity({
        notes: patch.hasNotes ? patch.notes : '',
        lastAction: 'create_manual',
        lastActionAt: timestamp,
        lastActionBy: actor || 'admin'
    }, {
        action: 'create_manual',
        at: timestamp,
        by: actor || 'admin',
            summary: 'Booking created in CRM'
    });

    return {
        reservationId,
        status: patch.status || 'received',
        source: 'manual_crm',
        customerData: patch.customerData,
        reservationData: {
            ...patch.reservationData,
            reservationId,
            currency,
            admin
        },
        payment: {
            currency: currency.toLowerCase(),
            ...patch.payment
        },
        rawRequest: {
            type: 'manual_crm',
            createdAt: timestamp,
            createdBy: actor || 'admin'
        },
        createdAt: timestamp,
        updatedAt: timestamp
    };
}

function applyManualReservationUpdate(record = {}, payload = {}, actor = 'admin', options = {}) {
    const patch = buildManualReservationPatch(payload);
    const facts = getReservationFacts(record);
    const timestamp = (options.now ? new Date(options.now) : new Date()).toISOString();
    const reservationId = facts.reservationId || record.reservationId || record.reservationData?.reservationId;
    const changedFields = collectManualChangedFields(record, patch);
    const adminBase = {
        ...getAdminData(record),
        lastAction: 'update_reservation',
        lastActionAt: timestamp,
        lastActionBy: actor || 'admin'
    };
    const admin = appendAdminActivity({
        ...adminBase,
        notes: patch.hasNotes ? patch.notes : adminBase.notes
    }, {
        action: 'update_reservation',
        at: timestamp,
        by: actor || 'admin',
        summary: changedFields.length
            ? `Updated ${changedFields.join(', ')}`
            : 'Reservation saved from CRM'
    });
    const { storage, ...recordWithoutStorage } = record;

    return {
        ...recordWithoutStorage,
        status: patch.status || record.status || 'received',
        customerData: {
            ...(record.customerData || {}),
            ...patch.customerData
        },
        reservationData: {
            ...(record.reservationData || {}),
            ...patch.reservationData,
            reservationId,
            admin
        },
        payment: {
            ...(record.payment || {}),
            ...patch.payment
        },
        rawRequest: record.rawRequest || {
            type: 'crm_update',
            updatedAt: timestamp,
            updatedBy: actor || 'admin'
        }
    };
}

function classifyReservation(record = {}, options = {}) {
    const facts = getReservationFacts(record);
    const admin = getAdminData(record);
    const today = toIsoDate(options.now || new Date());
    const nextWeek = addDaysIsoDate(today, 7);
    const status = facts.status;
    const adminCanceled = status === 'admin_canceled' || Boolean(admin.canceledAt);
    const paymentCanceled = status === 'payment_canceled';
    const archived = Boolean(admin.archivedAt);
    const isCanceled = adminCanceled;
    const startsToday = facts.startDate === today;
    const createdToday = toIsoDate(facts.createdAt) === today;
    const lead = LEAD_STATUSES.has(status);
    const checkoutPending = CHECKOUT_PENDING_STATUSES.has(status);
    const paymentIssueStatus = FAILED_PAYMENT_STATUSES.has(status);
    const confirmedStatus = CONFIRMED_STATUSES.has(status);
    const emailStatus = normalizeStatus(facts.emailStatus);
    const active = !isCanceled && !archived;
    const paymentIssue = active && paymentIssueStatus;
    const failedPayment = paymentIssue;
    const pendingPayment = active && PENDING_PAYMENT_STATUSES.has(status);
    const confirmed = active && confirmedStatus;
    const emailIssue = active && (status === 'confirmed_email_failed' || EMAIL_ISSUE_STATUSES.has(emailStatus));
    const handoverDone = active && Boolean(admin.handoverConfirmedAt);
    const newLead = active && lead && !admin.contactedAt;
    const confirmedToSchedule = active && confirmed && !handoverDone;
    const toContact = active && !admin.contactedAt && (lead || checkoutPending || paymentIssue || confirmed);
    const newToday = active && createdToday;
    const pickupToday = active && startsToday;
    const next7Days = active && Boolean(
        facts.startDate &&
        facts.startDate >= today &&
        facts.startDate <= nextWeek
    );

    return {
        lead,
        newLead,
        checkoutPending,
        pendingPayment,
        paymentIssue,
        confirmed,
        confirmedToSchedule,
        emailIssue,
        newToday,
        pickupToday,
        today: pickupToday || newToday,
        next7Days,
        toContact,
        pendingReview: toContact,
        needsContact: toContact,
        failedPayment,
        paymentCanceled,
        handoverDone,
        active,
        adminCanceled,
        canceled: isCanceled,
        archived
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
            archivedAt: admin.archivedAt || null,
            archivedBy: admin.archivedBy || null,
            archiveReason: admin.archiveReason || null,
            notes: admin.notes || '',
            lastAction: admin.lastAction || null,
            lastActionAt: admin.lastActionAt || null,
            lastActionBy: admin.lastActionBy || null,
            activity: Array.isArray(admin.activity) ? admin.activity.slice(-12).reverse() : []
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
        case 'new_leads':
            return summary.flags.newLead;
        case 'new_today':
            return summary.flags.newToday;
        case 'pending_review':
            return summary.flags.pendingReview;
        case 'to_contact':
            return summary.flags.toContact;
        case 'pending_payment':
            return summary.flags.pendingPayment;
        case 'payment_issues':
            return summary.flags.paymentIssue;
        case 'confirmed_to_schedule':
            return summary.flags.confirmedToSchedule;
        case 'email_issue':
            return summary.flags.emailIssue;
        case 'pickup_today':
            return summary.flags.pickupToday;
        case 'confirmed':
            return summary.flags.confirmed;
        case 'today':
            return summary.flags.today;
        case 'next_7_days':
            return summary.flags.next7Days;
        case 'needs_contact':
            return summary.flags.needsContact;
        case 'handover_done':
            return summary.flags.handoverDone;
        case 'canceled':
            return summary.flags.canceled;
        case 'archived':
            return summary.flags.archived;
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

function calendarStatusClass(summary = {}) {
    if (summary.flags?.archived || summary.flags?.canceled) return 'canceled';
    if (summary.flags?.emailIssue) return 'email';
    if (summary.flags?.paymentIssue) return 'failed';
    if (summary.flags?.pendingPayment) return 'pending';
    if (summary.flags?.confirmed) return 'confirmed';
    return '';
}

function calendarReservationEntry(summary = {}, monthStart, monthEnd, includeInactive = false) {
    const startDate = toIsoDate(summary.schedule?.startDate);
    const rawEndDate = toIsoDate(summary.schedule?.endDate) || startDate;
    const endDate = rawEndDate && startDate && rawEndDate < startDate ? startDate : rawEndDate;

    if (!summary.id || !startDate || !endDate) {
        return null;
    }

    if (!includeInactive && summary.flags && summary.flags.active === false) {
        return null;
    }

    if (endDate < monthStart || startDate > monthEnd) {
        return null;
    }

    return {
        id: summary.id,
        reservationId: summary.reservationId || summary.id,
        vehicle: summary.vehicle?.name || 'Vehicle not set',
        customer: summary.customer?.name || 'Guest not set',
        status: summary.status,
        statusLabel: summary.statusLabel,
        statusClass: calendarStatusClass(summary),
        startDate,
        endDate,
        pickupTime: summary.schedule?.pickupTime || '',
        dropoffTime: summary.schedule?.dropoffTime || '',
        pickupLocation: summary.schedule?.pickupLocation || '',
        dropoffLocation: summary.schedule?.dropoffLocation || '',
        total: summary.payment?.total || '',
        flags: summary.flags || {},
        durationDays: daysBetweenIsoDates(startDate, endDate) + 1
    };
}

function buildAdminReservationCalendar(records = [], options = {}) {
    const month = monthFromDate(options.month || options.query?.month, options);
    const monthStart = `${month}-01`;
    const monthEnd = endOfMonthIso(month);
    const gridStart = weekStartIso(monthStart);
    const gridEnd = weekEndIso(monthEnd);
    const today = toIsoDate(options.now || new Date());
    const includeInactive = options.includeInactive === true || asCleanString(options.query?.includeInactive) === 'true';
    const summaries = records
        .map((record) => buildAdminReservationSummary(record, options))
        .filter((summary) => summary.id);
    const reservations = summaries
        .map((summary) => calendarReservationEntry(summary, monthStart, monthEnd, includeInactive))
        .filter(Boolean)
        .sort((left, right) => (
            left.startDate.localeCompare(right.startDate) ||
            left.vehicle.localeCompare(right.vehicle) ||
            left.customer.localeCompare(right.customer)
        ));
    const vehicleTotals = new Map();

    reservations.forEach((reservation) => {
        const current = vehicleTotals.get(reservation.vehicle) || {
            name: reservation.vehicle,
            reservationCount: 0,
            bookingDayCount: 0
        };
        current.reservationCount += 1;
        current.bookingDayCount += Math.max(1, Math.min(
            daysBetweenIsoDates(
                reservation.startDate < monthStart ? monthStart : reservation.startDate,
                reservation.endDate > monthEnd ? monthEnd : reservation.endDate
            ) + 1,
            370
        ));
        vehicleTotals.set(reservation.vehicle, current);
    });

    const days = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
        const dayReservations = reservations
            .filter((reservation) => isIsoDateWithin(cursor, reservation.startDate, reservation.endDate))
            .map((reservation) => ({
                ...reservation,
                isStart: cursor === reservation.startDate,
                isEnd: cursor === reservation.endDate,
                continuesBefore: reservation.startDate < cursor,
                continuesAfter: reservation.endDate > cursor,
                isMultiDay: reservation.startDate !== reservation.endDate,
                dayTime: cursor === reservation.startDate
                    ? reservation.pickupTime
                    : cursor === reservation.endDate
                        ? reservation.dropoffTime
                        : ''
            }));

        days.push({
            date: cursor,
            dayNumber: Number(cursor.slice(8, 10)),
            isToday: cursor === today,
            isCurrentMonth: cursor >= monthStart && cursor <= monthEnd,
            reservations: dayReservations
        });
        cursor = addDaysIsoDate(cursor, 1);
    }

    return {
        month,
        label: monthLabel(month),
        today,
        range: {
            monthStart,
            monthEnd,
            gridStart,
            gridEnd
        },
        totals: {
            reservations: reservations.length,
            vehicles: vehicleTotals.size,
            daysWithReservations: days.filter((day) => day.isCurrentMonth && day.reservations.length > 0).length
        },
        vehicles: Array.from(vehicleTotals.values()).sort((left, right) => (
            right.reservationCount - left.reservationCount ||
            left.name.localeCompare(right.name)
        )),
        days
    };
}

function applyAdminReservationAction(record = {}, action, payload = {}, actor = 'admin', options = {}) {
    const normalizedAction = asCleanString(action).toLowerCase();
    const timestamp = (options.now ? new Date(options.now) : new Date()).toISOString();
    let admin = {
        ...getAdminData(record),
        lastAction: normalizedAction,
        lastActionAt: timestamp,
        lastActionBy: actor || 'admin'
    };
    let status = record.status || 'received';
    let activitySummary = '';

    if (Object.prototype.hasOwnProperty.call(payload, 'notes')) {
        admin.notes = asCleanString(payload.notes);
    }

    if (normalizedAction === 'mark_contacted') {
        admin.contactedAt = timestamp;
        admin.contactedBy = actor || 'admin';
        admin.contactMethod = asCleanString(payload.method) || 'manual';
        activitySummary = 'Reservation marked reviewed';
    } else if (normalizedAction === 'confirm_handover') {
        admin.handoverConfirmedAt = timestamp;
        admin.handoverStatus = 'confirmed';
        activitySummary = 'Handover confirmed';
    } else if (normalizedAction === 'cancel') {
        status = 'admin_canceled';
        admin.canceledAt = timestamp;
        admin.cancelReason = asCleanString(payload.reason) || asCleanString(payload.notes) || 'Admin canceled';
        activitySummary = `Reservation canceled: ${admin.cancelReason}`;
    } else if (normalizedAction === 'archive') {
        admin.archivedAt = timestamp;
        admin.archivedBy = actor || 'admin';
        admin.archiveReason = asCleanString(payload.reason) || asCleanString(payload.notes) || 'Archived in CRM';
        activitySummary = `Reservation archived: ${admin.archiveReason}`;
    } else if (normalizedAction === 'update_notes') {
        admin.notes = asCleanString(payload.notes);
        activitySummary = 'Admin notes updated';
    } else {
        const error = new Error(`Unsupported admin reservation action: ${normalizedAction || 'empty'}`);
        error.statusCode = 400;
        throw error;
    }

    admin = appendAdminActivity(admin, {
        action: normalizedAction,
        at: timestamp,
        by: actor || 'admin',
        summary: activitySummary
    });

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
        ['contactedAt', 'Reviewed at'],
        ['handoverConfirmedAt', 'Handover confirmed at'],
        ['archivedAt', 'Archived at'],
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
        archivedAt: item.admin.archivedAt,
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
    const store = dependencies.store || require('../reservations/reservation-store');
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

    router.post('/reservations', asyncRoute(async (req, res) => {
        try {
            const record = createManualReservationRecord(
                req.body || {},
                req.adminSession?.user || 'admin'
            );
            const savedRecord = await store.saveReservationRecord(record);

            return res.status(201).json({ reservation: buildAdminReservationDetail(savedRecord) });
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                error: error.statusCode ? error.message : 'Manual reservation could not be created'
            });
        }
    }));

    router.get('/reservations/storage', asyncRoute(async (req, res) => {
        if (!store.getReservationStoreDiagnostics) {
            return res.json({
                ok: true,
                mode: store.getReservationStoreMode ? store.getReservationStoreMode() : null,
                diagnosticsAvailable: false
            });
        }

        const diagnostics = await store.getReservationStoreDiagnostics();
        return res.status(diagnostics.ok ? 200 : 503).json({
            ...diagnostics,
            diagnosticsAvailable: true
        });
    }));

    router.get('/reservations/operations', asyncRoute(async (req, res) => {
        const diagnostics = store.getReservationStoreDiagnostics
            ? await store.getReservationStoreDiagnostics()
            : {
                ok: true,
                mode: store.getReservationStoreMode ? store.getReservationStoreMode() : null
            };
        const status = buildAdminOperationsStatus({ diagnostics });

        return res.status(status.overallStatus === 'bad' ? 503 : 200).json(status);
    }));

    router.get('/reservations/calendar', asyncRoute(async (req, res) => {
        const records = await store.listReservationRecords({ limit: 5000 });
        const calendar = buildAdminReservationCalendar(records, {
            month: req.query.month,
            query: req.query
        });

        return res.json(calendar);
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

    router.put('/reservations/:id', asyncRoute(async (req, res) => {
        const record = await store.readReservationRecord(req.params.id);
        if (!record) {
            return res.status(404).json({ error: 'Reservation not found' });
        }

        try {
            const nextRecord = applyManualReservationUpdate(
                record,
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
    CHECKOUT_PENDING_STATUSES,
    CONFIRMED_STATUSES,
    EMAIL_ISSUE_STATUSES,
    FAILED_PAYMENT_STATUSES,
    LEAD_STATUSES,
    MANUAL_RESERVATION_STATUSES,
    PENDING_PAYMENT_STATUSES,
    QUICK_FILTERS,
    applyAdminReservationAction,
    applyManualReservationUpdate,
    buildAdminReservationCalendar,
    buildAdminReservationDetail,
    buildAdminReservationSummary,
    buildAdminOperationsStatus,
    classifyReservation,
    collectReservationFilters,
    createAdminReservationsRouter,
    createManualReservationRecord,
    filterAdminReservationSummaries,
    generateManualReservationId,
    toReservationCsv
};
