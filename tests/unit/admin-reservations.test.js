const assert = require('node:assert/strict');
const test = require('node:test');

const {
    applyAdminReservationAction,
    buildAdminOperationsStatus,
    buildAdminReservationDetail,
    buildAdminReservationSummary,
    collectReservationFilters,
    filterAdminReservationSummaries,
    toReservationCsv
} = require('../../server/admin/admin-reservations');

const now = '2026-04-25T12:00:00.000Z';

function valueOrDefault(source, key, fallback) {
    return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : fallback;
}

function reservation(overrides = {}) {
    return {
        reservationId: overrides.reservationId || 'res_default',
        status: overrides.status || 'checkout_started',
        customerData: {
            name: overrides.name || 'Alex Client',
            email: overrides.email || 'alex@example.com',
            phone: overrides.phone || '+971 50 111 2222',
            passport: overrides.passport || 'P123456'
        },
        reservationData: {
            reservationId: overrides.reservationId || 'res_default',
            car: overrides.car || 'Mercedes G63 AMG',
            startDate: valueOrDefault(overrides, 'startDate', '2026-04-25'),
            endDate: valueOrDefault(overrides, 'endDate', '2026-04-27'),
            pickupTime: '10:00',
            dropoffTime: '18:00',
            pickupLocation: 'Dubai Marina',
            totalAmount: 3300,
            upfrontAmount: 1650,
            remainingAmount: 1650,
            currency: 'AED',
            admin: overrides.admin || undefined
        },
        payment: {
            paymentIntentId: overrides.paymentIntentId || 'pi_default',
            stripeStatus: overrides.stripeStatus || 'requires_payment_method'
        },
        email: overrides.emailData || {},
        createdAt: overrides.createdAt || '2026-04-24T09:00:00.000Z',
        updatedAt: overrides.updatedAt || '2026-04-24T09:00:00.000Z',
        storage: 'local-json'
    };
}

test('admin reservation summary includes contact links, money and operational flags', () => {
    const summary = buildAdminReservationSummary(reservation(), { now });

    assert.equal(summary.customer.whatsappHref.includes('wa.me/971501112222'), true);
    assert.equal(summary.customer.callHref, 'tel:+971501112222');
    assert.equal(summary.payment.total, '3,300 AED');
    assert.equal(summary.flags.pendingPayment, true);
    assert.equal(summary.flags.today, true);
    assert.equal(summary.flags.needsContact, true);
});

test('admin reservation filters support quick views and search', () => {
    const records = [
        reservation({ reservationId: 'res_pending', status: 'checkout_started', car: 'Mercedes G63 AMG' }),
        reservation({
            reservationId: 'res_contacted',
            status: 'confirmed',
            car: 'Ferrari 296 GTS',
            admin: { contactedAt: '2026-04-25T09:00:00.000Z' }
        }),
        reservation({
            reservationId: 'res_failed',
            status: 'payment_intent_failed',
            car: 'Range Rover Vogue',
            startDate: '2026-05-10'
        })
    ];

    const needsContact = filterAdminReservationSummaries(
        records,
        collectReservationFilters({ quick: 'needs_contact' }),
        { now }
    );
    assert.deepEqual(needsContact.items.map((item) => item.reservationId).sort(), ['res_failed', 'res_pending']);

    const ferrari = filterAdminReservationSummaries(
        records,
        collectReservationFilters({ q: 'ferrari' }),
        { now }
    );
    assert.equal(ferrari.total, 1);
    assert.equal(ferrari.items[0].reservationId, 'res_contacted');
});

test('admin reservation quick filters separate client work queues', () => {
    const records = [
        reservation({
            reservationId: 'res_lead',
            status: 'lead_received',
            car: 'Contact request',
            startDate: '',
            endDate: ''
        }),
        reservation({
            reservationId: 'res_created_today',
            status: 'received',
            car: 'General inquiry',
            startDate: '2026-05-20',
            endDate: '2026-05-22',
            createdAt: now
        }),
        reservation({
            reservationId: 'res_checkout',
            status: 'payment_intent_created',
            startDate: '2026-04-29'
        }),
        reservation({
            reservationId: 'res_payment_issue',
            status: 'payment_canceled',
            startDate: '2026-05-09'
        }),
        reservation({
            reservationId: 'res_confirmed_open',
            status: 'payment_succeeded',
            startDate: '2026-04-26',
            admin: { contactedAt: now }
        }),
        reservation({
            reservationId: 'res_email_issue',
            status: 'confirmed_email_failed',
            startDate: '2026-04-27',
            emailData: { status: 'failed' }
        }),
        reservation({
            reservationId: 'res_handover_done',
            status: 'confirmed',
            startDate: '2026-04-25',
            admin: { contactedAt: now, handoverConfirmedAt: now }
        }),
        reservation({
            reservationId: 'res_canceled',
            status: 'admin_canceled',
            startDate: '2026-04-25',
            admin: { canceledAt: now }
        })
    ];
    const idsFor = (quick) => filterAdminReservationSummaries(
        records,
        collectReservationFilters({ quick }),
        { now }
    ).items.map((item) => item.reservationId).sort();

    assert.deepEqual(idsFor('new_leads'), ['res_created_today', 'res_lead']);
    assert.deepEqual(idsFor('new_today'), ['res_created_today']);
    const pendingReviewIds = [
        'res_checkout',
        'res_created_today',
        'res_email_issue',
        'res_lead',
        'res_payment_issue'
    ];
    assert.deepEqual(idsFor('pending_review'), pendingReviewIds);
    assert.deepEqual(idsFor('to_contact'), pendingReviewIds);
    assert.deepEqual(idsFor('pending_payment'), ['res_checkout', 'res_created_today', 'res_lead']);
    assert.deepEqual(idsFor('payment_issues'), ['res_payment_issue']);
    assert.deepEqual(idsFor('confirmed_to_schedule'), ['res_confirmed_open', 'res_email_issue']);
    assert.deepEqual(idsFor('email_issue'), ['res_email_issue']);
    assert.deepEqual(idsFor('pickup_today'), ['res_handover_done']);
    assert.deepEqual(idsFor('next_7_days'), [
        'res_checkout',
        'res_confirmed_open',
        'res_email_issue',
        'res_handover_done'
    ]);
    assert.deepEqual(idsFor('handover_done'), ['res_handover_done']);
    assert.deepEqual(idsFor('canceled'), ['res_canceled']);
});

test('admin actions persist private workflow state without deleting reservation data', () => {
    const baseRecord = reservation({ reservationId: 'res_action' });
    const contacted = applyAdminReservationAction(
        baseRecord,
        'mark_contacted',
        { method: 'whatsapp', notes: 'Client confirmed arrival time.' },
        'owner',
        { now }
    );

    assert.equal(contacted.reservationData.car, 'Mercedes G63 AMG');
    assert.equal(contacted.reservationData.admin.contactedAt, now);
    assert.equal(contacted.reservationData.admin.contactMethod, 'whatsapp');
    assert.equal(contacted.reservationData.admin.notes, 'Client confirmed arrival time.');

    const canceled = applyAdminReservationAction(contacted, 'cancel', { reason: 'Client request' }, 'owner', { now });
    assert.equal(canceled.status, 'admin_canceled');
    assert.equal(canceled.reservationData.admin.cancelReason, 'Client request');
});

test('admin detail hides internal admin object from public reservation data block', () => {
    const detail = buildAdminReservationDetail(reservation({
        admin: { notes: 'Private note', contactedAt: now }
    }), { now });

    assert.equal(detail.admin.notes, 'Private note');
    assert.equal(Object.prototype.hasOwnProperty.call(detail.reservationData, 'admin'), false);
});

test('admin CSV export escapes customer data safely', () => {
    const csv = toReservationCsv([
        buildAdminReservationSummary(reservation({
            reservationId: 'res_csv',
            name: 'Client, VIP',
            car: 'Ferrari "296" GTS'
        }), { now })
    ]);

    assert.match(csv, /"Client, VIP"/);
    assert.match(csv, /"Ferrari ""296"" GTS"/);
});

test('admin operations status separates staging and production safety checks', () => {
    const stagingStatus = buildAdminOperationsStatus({
        env: {
            APP_ENV: 'staging',
            NODE_ENV: 'production',
            STRIPE_SECRET_KEY: 'sk_test_123',
            STRIPE_WEBHOOK_SECRET: 'whsec_123',
            ADMIN_USER: 'owner',
            ADMIN_PASSWORD_HASH: 'pbkdf2_sha256$310000$salt$digest',
            ADMIN_SESSION_SECRET: 'session-secret',
            RESERVATION_TELEGRAM_BOT_TOKEN: '123456:test-token',
            RESERVATION_TELEGRAM_CHAT_ID: '987654'
        },
        diagnostics: {
            ok: true,
            mode: 'postgres',
            reservationCount: 12,
            latestUpdatedAt: now
        }
    });

    assert.equal(stagingStatus.label, 'Staging CRM');
    assert.equal(stagingStatus.overallStatus, 'ok');
    assert.equal(stagingStatus.services.stripeMode, 'test');
    assert.equal(stagingStatus.storage.databaseConfigured, true);

    const brokenProduction = buildAdminOperationsStatus({
        env: {
            APP_ENV: 'production',
            STRIPE_SECRET_KEY: 'sk_test_123',
            ADMIN_USER: 'owner',
            ADMIN_PASSWORD_HASH: 'pbkdf2_sha256$310000$salt$digest',
            ADMIN_SESSION_SECRET: 'session-secret'
        },
        diagnostics: {
            ok: true,
            mode: 'local-json'
        }
    });

    assert.equal(brokenProduction.label, 'Production CRM');
    assert.equal(brokenProduction.overallStatus, 'bad');
    assert.equal(brokenProduction.checks.some((check) => check.id === 'reservation_storage' && check.status === 'fail'), true);
    assert.equal(brokenProduction.checks.some((check) => check.id === 'stripe_mode' && check.status === 'fail'), true);
});
