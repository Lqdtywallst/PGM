const assert = require('node:assert/strict');
const test = require('node:test');

const {
    applyAdminReservationAction,
    buildAdminReservationDetail,
    buildAdminReservationSummary,
    collectReservationFilters,
    filterAdminReservationSummaries,
    toReservationCsv
} = require('../../server/admin/admin-reservations');

const now = '2026-04-25T12:00:00.000Z';

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
            startDate: overrides.startDate || '2026-04-25',
            endDate: overrides.endDate || '2026-04-27',
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
            status: 'payment_failed',
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
