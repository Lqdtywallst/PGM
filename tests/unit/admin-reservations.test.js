const assert = require('node:assert/strict');
const test = require('node:test');

const {
    applyAdminReservationAction,
    applyManualReservationUpdate,
    buildAdminOperationsStatus,
    buildAdminReservationCalendar,
    buildAdminReservationDetail,
    buildAdminReservationSummary,
    classifyReservation,
    collectReservationFilters,
    createManualReservationRecord,
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
        }),
        reservation({
            reservationId: 'res_archived',
            status: 'received',
            startDate: '2026-04-26',
            admin: { archivedAt: now, archiveReason: 'Old test lead' }
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
    assert.deepEqual(idsFor('archived'), ['res_archived']);
});

test('admin reservation calendar groups active vehicle bookings by day', () => {
    const records = [
        reservation({
            reservationId: 'res_calendar_lambo',
            status: 'confirmed',
            car: 'Lamborghini Huracan EVO Spyder',
            startDate: '2026-05-10',
            endDate: '2026-05-12'
        }),
        reservation({
            reservationId: 'res_calendar_ferrari',
            status: 'payment_succeeded',
            car: 'Ferrari 296 GTS',
            startDate: '2026-05-12',
            endDate: '2026-05-13'
        }),
        reservation({
            reservationId: 'res_calendar_previous_month',
            status: 'confirmed',
            car: 'Mercedes G63 AMG',
            startDate: '2026-04-30',
            endDate: '2026-05-02'
        }),
        reservation({
            reservationId: 'res_calendar_canceled',
            status: 'admin_canceled',
            car: 'Rolls-Royce Cullinan',
            startDate: '2026-05-11',
            endDate: '2026-05-12',
            admin: { canceledAt: now }
        })
    ];
    const calendar = buildAdminReservationCalendar(records, {
        month: '2026-05',
        now: '2026-05-12T08:00:00.000Z'
    });
    const may12 = calendar.days.find((day) => day.date === '2026-05-12');
    const may1 = calendar.days.find((day) => day.date === '2026-05-01');

    assert.equal(calendar.month, '2026-05');
    assert.equal(calendar.label, 'May 2026');
    assert.equal(calendar.totals.reservations, 3);
    assert.equal(calendar.totals.vehicles, 3);
    assert.equal(may12.isToday, true);
    assert.deepEqual(
        may12.reservations.map((item) => item.reservationId).sort(),
        ['res_calendar_ferrari', 'res_calendar_lambo']
    );
    assert.equal(may12.reservations.find((item) => item.reservationId === 'res_calendar_lambo').isEnd, true);
    assert.equal(may12.reservations.find((item) => item.reservationId === 'res_calendar_ferrari').isStart, true);
    assert.deepEqual(may1.reservations.map((item) => item.reservationId), ['res_calendar_previous_month']);
    assert.equal(calendar.days.some((day) => day.reservations.some((item) => item.reservationId === 'res_calendar_canceled')), false);
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
    assert.equal(canceled.reservationData.admin.activity.length, 2);
});

test('manual CRM reservations can be created, edited and archived without hard delete', () => {
    const created = createManualReservationRecord({
        customerName: 'Manual VIP',
        customerPhone: '+971 55 100 2000',
        customerEmail: 'manual@example.com',
        customerIdDocument: 'VIP-ID',
        vehicle: 'Ferrari 296 GTS',
        startDate: '2026-05-10',
        endDate: '2026-05-12',
        pickupTime: '11:30',
        dropoffTime: '17:00',
        pickupLocation: 'Palm Jumeirah',
        totalAmount: '8800',
        upfrontAmount: '4400',
        remainingAmount: '4400',
        notes: 'Booked by WhatsApp'
    }, 'owner', { now });

    assert.match(created.reservationId, /^manual_20260425120000_/);
    assert.equal(created.status, 'received');
    assert.equal(created.source, 'manual_crm');
    assert.equal(created.customerData.name, 'Manual VIP');
    assert.equal(created.reservationData.car, 'Ferrari 296 GTS');
    assert.equal(created.reservationData.totalAmount, 8800);
    assert.equal(created.reservationData.admin.notes, 'Booked by WhatsApp');
    assert.equal(created.reservationData.admin.activity[0].action, 'create_manual');

    const updated = applyManualReservationUpdate(created, {
        vehicle: 'Lamborghini Huracan EVO Spyder',
        status: 'confirmed',
        totalAmount: '9200',
        notes: 'Client sent documents'
    }, 'owner', { now: '2026-04-25T13:00:00.000Z' });

    assert.equal(updated.status, 'confirmed');
    assert.equal(updated.reservationData.car, 'Lamborghini Huracan EVO Spyder');
    assert.equal(updated.reservationData.totalAmount, 9200);
    assert.equal(updated.reservationData.admin.notes, 'Client sent documents');
    assert.equal(updated.reservationData.admin.activity.at(-1).action, 'update_reservation');

    const archived = applyAdminReservationAction(
        updated,
        'archive',
        { reason: 'Duplicate manual test' },
        'owner',
        { now: '2026-04-25T14:00:00.000Z' }
    );

    assert.equal(archived.reservationData.admin.archivedAt, '2026-04-25T14:00:00.000Z');
    assert.equal(archived.reservationData.admin.archiveReason, 'Duplicate manual test');
    assert.equal(classifyReservation(archived, { now }).active, false);
    assert.equal(classifyReservation(archived, { now }).archived, true);
});

test('manual CRM reservations validate core operational fields', () => {
    assert.throws(
        () => createManualReservationRecord({ customerName: 'Missing phone', vehicle: 'G63' }, 'owner', { now }),
        /customerPhone/
    );
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
            latestUpdatedAt: now,
            crmData: {
                schemaVersion: 2,
                customerCount: 9,
                reservationIntelligenceCount: 12,
                interactionEventCount: 18,
                aiReadyReservationCount: 10,
                averageDataQualityScore: 84
            }
        }
    });

    assert.equal(stagingStatus.label, 'Staging CRM');
    assert.equal(stagingStatus.overallStatus, 'ok');
    assert.equal(stagingStatus.services.stripeMode, 'test');
    assert.equal(stagingStatus.storage.databaseConfigured, true);
    assert.equal(stagingStatus.storage.crmData.aiReadyReservationCount, 10);

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
