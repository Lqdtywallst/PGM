const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildCrmInteractionSeed,
    buildCrmReservationIntelligence,
    buildDataQualityProfile,
    classifyLeadStage,
    classifyPaymentStatus,
    normalizeEmail,
    normalizePhone
} = require('../../server/crm/crm-intelligence');

function reservation(overrides = {}) {
    return {
        reservationId: overrides.reservationId || 'res_ai_ready',
        status: overrides.status || 'payment_intent_created',
        source: overrides.source || 'website',
        customerData: {
            name: 'Alex Client',
            email: 'Alex.Client@Example.com',
            phone: '+971 58 612 2568',
            city: 'Dubai',
            country: 'AE',
            ...(overrides.customerData || {})
        },
        reservationData: {
            reservationId: overrides.reservationId || 'res_ai_ready',
            car: overrides.car || 'Ferrari 296 GTS',
            startDate: '2026-06-10',
            endDate: '2026-06-12',
            pickupTime: '12:00',
            dropoffTime: '12:00',
            pickupLocation: 'DXB Airport Terminal 3',
            dropoffLocation: 'Palm Jumeirah villa',
            totalAmount: 6800,
            currency: 'AED',
            ...(overrides.reservationData || {})
        },
        payment: {
            paymentIntentId: 'pi_test',
            stripeStatus: 'requires_payment_method',
            currency: 'aed',
            ...(overrides.payment || {})
        },
        rawRequest: {
            attribution: {
                pagePath: '/app/reserve/page.html',
                referrer: '/fleet.html',
                utmSource: 'google',
                utmCampaign: 'dubai-luxury-car'
            },
            device: {
                viewport: '1440x900',
                language: 'en-GB',
                timezone: 'Asia/Dubai'
            }
        },
        createdAt: '2026-06-01T10:00:00.000Z',
        updatedAt: '2026-06-01T10:05:00.000Z'
    };
}

test('CRM intelligence normalizes customer identity and operational stages', () => {
    const intelligence = buildCrmReservationIntelligence(reservation());

    assert.equal(intelligence.customer.email, 'alex.client@example.com');
    assert.equal(intelligence.customer.phone, '+971586122568');
    assert.equal(intelligence.leadStage, 'payment_pending');
    assert.equal(intelligence.paymentStatus, 'intent_created');
    assert.equal(intelligence.handoverStatus, 'not_ready');
    assert.equal(intelligence.dataQuality.score, 100);
    assert.equal(intelligence.aiFeatures.valueBand, 'high_value');
    assert.equal(intelligence.aiFeatures.serviceSignals.airport, true);
    assert.equal(intelligence.aiFeatures.serviceSignals.hotelOrVilla, true);
    assert.equal(intelligence.attribution.utmSource, 'google');
});

test('CRM intelligence exposes data quality gaps for incomplete manual leads', () => {
    const profile = buildDataQualityProfile(reservation({
        status: 'received',
        customerData: {
            email: '',
            phone: ''
        },
        reservationData: {
            pickupLocation: '',
            totalAmount: ''
        }
    }));

    assert.equal(profile.hasContactRoute, false);
    assert.equal(profile.aiReadyForOps, false);
    assert.deepEqual(
        profile.missingFields.sort(),
        ['customer_email', 'customer_phone', 'pickup_location', 'total_amount'].sort()
    );
});

test('CRM intelligence creates deterministic system interaction seeds', () => {
    const record = reservation({ reservationId: 'res_same_event', status: 'payment_succeeded' });
    const first = buildCrmInteractionSeed(record);
    const second = buildCrmInteractionSeed({ ...record, updatedAt: '2026-06-01T11:00:00.000Z' });

    assert.equal(first.id, second.id);
    assert.equal(first.outcome, 'booked');
    assert.equal(classifyLeadStage(record), 'booked');
    assert.equal(classifyPaymentStatus(record), 'deposit_paid');
});

test('CRM intelligence normalization is conservative', () => {
    assert.equal(normalizeEmail(' BAD '), '');
    assert.equal(normalizeEmail('OWNER@EXAMPLE.COM'), 'owner@example.com');
    assert.equal(normalizePhone('058 612 2568'), '+971586122568');
    assert.equal(normalizePhone('+971 58 612 2568'), '+971586122568');
});
