#!/usr/bin/env node

const {
    buildReservationId,
    closeReservationStore,
    getReservationStoreMode,
    saveReservationRecord
} = require('../server/reservations/reservation-store');

function addDaysIso(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

async function main() {
    const reservationId = process.env.DEMO_RESERVATION_ID || buildReservationId();
    const vehicle = process.env.DEMO_VEHICLE || 'Lamborghini Huracan EVO Spyder';
    const customerName = process.env.DEMO_CUSTOMER_NAME || 'Demo Client';
    const customerEmail = process.env.DEMO_CUSTOMER_EMAIL || 'demo.client@example.com';
    const customerPhone = process.env.DEMO_CUSTOMER_PHONE || '+971 58 612 2568';

    const saved = await saveReservationRecord({
        reservationId,
        status: process.env.DEMO_STATUS || 'checkout_started',
        source: 'local_admin_demo_seed',
        customerData: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            passport: 'DEMO-PASSPORT'
        },
        reservationData: {
            reservationId,
            car: vehicle,
            startDate: process.env.DEMO_START_DATE || addDaysIso(1),
            endDate: process.env.DEMO_END_DATE || addDaysIso(3),
            pickupTime: '10:00',
            dropoffTime: '18:00',
            pickupLocation: 'Dubai Marina hotel lobby',
            dropoffLocation: 'DXB Terminal 3',
            durationLabel: '2 days',
            pricePerDay: 3200,
            totalAmount: 6400,
            upfrontAmount: 3200,
            remainingAmount: 3200,
            currency: 'AED'
        },
        payment: {
            paymentIntentId: `pi_demo_${reservationId.replace(/[^a-zA-Z0-9_]/g, '_')}`,
            stripeStatus: 'requires_payment_method',
            amount: 320000,
            currency: 'aed'
        },
        email: {
            status: 'not_sent_demo'
        }
    });

    console.log(JSON.stringify({
        ok: true,
        storage: saved.storage || getReservationStoreMode(),
        reservationId: saved.reservationId,
        customerEmail,
        vehicle,
        crm: '/admin/reservations.html'
    }, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closeReservationStore();
    });
