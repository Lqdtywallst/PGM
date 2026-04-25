// API route for reservations
// Handles all reservation-related operations

require('dotenv').config();
const express = require('express');
const {
    EMAIL_CONFIG,
    createEmailTransporter
} = require('../../../server/email-config');
const {
    buildReservationId,
    findReservationForLookup,
    readReservationRecord,
    saveReservationRecord
} = require('../../../server/reservation-store');

// Verify that STRIPE_SECRET_KEY is configured
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('tu_clave')) {
    console.error('[RESERVE ROUTE]  ERROR: STRIPE_SECRET_KEY is not configured');
    console.error('[RESERVE ROUTE] The module will load but payment functions will not work');
}

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const router = express.Router();

// Map country names to 2-character ISO codes
const countryNameToCode = {
    'France': 'FR',
    'Italy': 'IT',
    'Germany': 'DE',
    'United Kingdom': 'GB',
    'UK': 'GB',
    'United States': 'US',
    'USA': 'US',
    'United Arab Emirates': 'AE',
    'UAE': 'AE',
};

// Function to convert country name to ISO code
function normalizeCountryCode(country) {
    if (!country) return null;
    // If it's already a 2-character ISO code, return it
    if (country.length === 2 && /^[A-Z]{2}$/i.test(country)) {
        return country.toUpperCase();
    }
    // If it's a country name, convert it to a code
    return countryNameToCode[country] || country;
}

function maskEmail(email) {
    if (!email || typeof email !== 'string') return null;
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return '[redacted-email]';
    const visibleLocal = localPart.slice(0, 2);
    return `${visibleLocal}${'*'.repeat(Math.max(localPart.length - 2, 1))}@${domain}`;
}

function summarizeHeaders(headers = {}) {
    return {
        origin: headers.origin || null,
        referer: headers.referer || null,
        contentType: headers['content-type'] || null,
        userAgent: headers['user-agent'] || null,
    };
}

function summarizeCustomerData(customerData = {}) {
    return {
        nameProvided: !!(customerData.name || customerData.fullName),
        email: maskEmail(customerData.email),
        hasPhone: !!customerData.phone,
        hasDocument: !!(customerData.dni || customerData.passport),
        hasAddress: !!customerData.address,
        city: customerData.city || null,
        country: customerData.country || null,
    };
}

function summarizeReservationData(reservationData = {}) {
    return {
        car: reservationData.car || null,
        startDate: reservationData.startDate || null,
        endDate: reservationData.endDate || null,
        pickupTime: reservationData.pickupTime || null,
        dropoffTime: reservationData.dropoffTime || null,
        days: reservationData.days || null,
        durationHours: reservationData.durationHours || null,
        totalAmount: reservationData.totalAmount || null,
        upfrontAmount: reservationData.upfrontAmount || null,
        remainingAmount: reservationData.remainingAmount || null,
        currency: reservationData.currency || null,
        pickupLocationProvided: !!reservationData.pickupLocation,
    };
}

function summarizeReservationRequest(data = {}) {
    const customerData = data.customerData || {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        passport: data.passport,
        dni: data.dni,
        address: data.address,
        city: data.city,
        country: data.country,
    };
    const reservationData = data.reservationData || {
        car: data.car,
        startDate: data.startDate,
        endDate: data.endDate,
        pickupTime: data.pickupTime,
        dropoffTime: data.dropoffTime,
        days: data.days,
        durationHours: data.durationHours,
        totalAmount: data.totalAmount,
        upfrontAmount: data.upfrontAmount,
        remainingAmount: data.remainingAmount,
        pickupLocation: data.pickupLocation,
        currency: data.currency,
    };

    return {
        hasNestedCustomerData: !!data.customerData,
        hasNestedReservationData: !!data.reservationData,
        amount: data.amount || null,
        currency: data.currency || reservationData.currency || null,
        customer: summarizeCustomerData(customerData),
        reservation: summarizeReservationData(reservationData),
    };
}

function summarizeSavedReservationRecord(record = null) {
    if (!record) return null;

    return {
        reservationId: record.reservationId || null,
        paymentIntentId: record.paymentIntentId || null,
        status: record.status || null,
        storage: record.storage || null,
        customer: summarizeCustomerData(record.customerData || {}),
        reservation: summarizeReservationData(record.reservationData || {}),
        email: record.email || {},
        createdAt: record.createdAt || null,
        updatedAt: record.updatedAt || null
    };
}

function normalizeLookupValue(value) {
    return String(value || '').trim();
}

function normalizeLookupEmail(value) {
    return normalizeLookupValue(value).toLowerCase();
}

function buildReservationStatusLabel(status) {
    const normalizedStatus = normalizeLookupValue(status).toLowerCase();
    const labels = {
        confirmed: 'Confirmed',
        payment_succeeded: 'Payment received',
        confirmed_email_failed: 'Confirmed',
        payment_intent_created: 'Payment pending',
        checkout_started: 'Checkout started',
        lead_received: 'Request received',
        received: 'Request received',
        payment_failed: 'Payment failed',
        payment_canceled: 'Payment canceled',
        payment_requires_action: 'Payment needs attention'
    };

    return labels[normalizedStatus] || (normalizedStatus ? normalizedStatus.replace(/_/g, ' ') : 'In review');
}

function buildReservationNextStep(status) {
    const normalizedStatus = normalizeLookupValue(status).toLowerCase();

    if (['confirmed', 'payment_succeeded', 'confirmed_email_failed'].includes(normalizedStatus)) {
        return 'Your booking is saved. The Dynasty Prestige team will coordinate handover details directly with you.';
    }

    if (['payment_intent_created', 'checkout_started', 'payment_requires_action'].includes(normalizedStatus)) {
        return 'Payment is not fully confirmed yet. If you already paid, WhatsApp the team with your reservation ID.';
    }

    if (['payment_failed', 'payment_canceled'].includes(normalizedStatus)) {
        return 'The payment did not complete. You can restart the reservation or contact the team for help.';
    }

    return 'Your request is in the system. The team will confirm availability and next steps.';
}

function formatOptionalMoneyDisplay(value, currency) {
    const parsedValue = parseMoneyValue(value);
    return parsedValue === null ? null : formatMoneyDisplay(parsedValue, currency);
}

function displayEmailValue(value, fallback = 'To be confirmed') {
    const normalized = String(value || '').trim();
    return normalized || fallback;
}

function buildSafeReservationLookupSummary(record = {}) {
    const reservationData = record.reservationData || {};
    const paymentData = record.payment || {};
    const currency = reservationData.currency || paymentData.currency || 'AED';

    return {
        reservationId: record.reservationId || reservationData.reservationId || null,
        status: record.status || 'received',
        statusLabel: buildReservationStatusLabel(record.status),
        vehicle: reservationData.car || 'Vehicle to be confirmed',
        startDate: reservationData.startDate || null,
        endDate: reservationData.endDate || null,
        pickupTime: reservationData.pickupTime || null,
        dropoffTime: reservationData.dropoffTime || null,
        durationLabel: reservationData.durationLabel || (reservationData.days ? `${reservationData.days} day rental` : null),
        pickupLocationSummary: reservationData.pickupLocation ? 'Pickup location provided to the team' : 'Pickup location to be confirmed',
        totalDisplay: reservationData.total || formatOptionalMoneyDisplay(reservationData.totalAmount, currency),
        upfrontDisplay: reservationData.upfrontDisplay || formatOptionalMoneyDisplay(reservationData.upfrontAmount, currency),
        remainingDisplay: reservationData.remainingDisplay || formatOptionalMoneyDisplay(reservationData.remainingAmount, currency),
        paymentStatus: paymentData.stripeStatus || record.status || null,
        emailStatus: record.email?.confirmation?.status || record.email?.pendingNotification?.status || null,
        nextStep: buildReservationNextStep(record.status),
        updatedAt: record.updatedAt || null
    };
}

function sanitizeReservationRequestForStorage(data = {}) {
    return {
        hasNestedCustomerData: !!data.customerData,
        hasNestedReservationData: !!data.reservationData,
        amount: data.amount || null,
        currency: data.currency || data.reservationData?.currency || null,
        submittedAt: new Date().toISOString()
    };
}

function buildPaymentPersistence(paymentIntent = null, currency = 'aed') {
    if (!paymentIntent) {
        return {
            currency: (currency || 'aed').toLowerCase()
        };
    }

    return {
        paymentIntentId: paymentIntent.id,
        stripeStatus: paymentIntent.status || null,
        amount: paymentIntent.amount || null,
        currency: paymentIntent.currency || currency || 'aed'
    };
}

async function persistReservationUpdate(record, contextLabel, options = {}) {
    const { critical = false } = options;

    try {
        const savedRecord = await saveReservationRecord(record);
        console.log('[DB] Reservation saved:', {
            context: contextLabel,
            reservationId: savedRecord.reservationId,
            paymentIntentId: savedRecord.paymentIntentId,
            status: savedRecord.status,
            storage: savedRecord.storage
        });
        return savedRecord;
    } catch (error) {
        console.error('[DB] Error saving reservation:', {
            context: contextLabel,
            message: error.message
        });

        if (critical) {
            throw error;
        }

        return null;
    }
}

function parseMoneyValue(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const cleaned = String(value).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

function formatMoneyDisplay(amount, currency = 'aed') {
    const normalizedCurrency = (currency || 'aed').toUpperCase();
    const numericAmount = Number.isFinite(amount) ? amount : parseMoneyValue(amount) || 0;
    return `${normalizedCurrency} ${numericAmount.toFixed(2)}`;
}

function buildReservationDateTime(dateValue, timeValue) {
    if (!dateValue) return null;
    return new Date(`${dateValue}T${timeValue || '10:00'}:00`);
}

function enrichReservationPricing(reservationData, currency = 'aed') {
    const normalizedCurrency = (currency || 'aed').toLowerCase();
    const startDateTime = buildReservationDateTime(reservationData.startDate, reservationData.pickupTime);
    const endDateTime = buildReservationDateTime(reservationData.endDate, reservationData.dropoffTime);

    let durationHours = parseMoneyValue(reservationData.durationHours);
    if ((!durationHours || durationHours <= 0) && startDateTime && endDateTime && endDateTime > startDateTime) {
        durationHours = (endDateTime - startDateTime) / (1000 * 60 * 60);
    }

    let billingDays = parseMoneyValue(reservationData.days);
    if ((!billingDays || billingDays <= 0) && durationHours) {
        billingDays = durationHours / 24;
    }
    if (!billingDays || billingDays <= 0) {
        billingDays = 1;
    }

    const pricePerDay = parseMoneyValue(reservationData.pricePerDay) || 0;
    const totalAmount = parseMoneyValue(reservationData.totalAmount) ?? parseMoneyValue(reservationData.total) ?? (billingDays * pricePerDay);
    const upfrontAmount = parseMoneyValue(reservationData.upfrontAmount) ?? (totalAmount * 0.5);
    const remainingAmount = parseMoneyValue(reservationData.remainingAmount) ?? Math.max(totalAmount - upfrontAmount, 0);

    reservationData.currency = normalizedCurrency.toUpperCase();
    reservationData.durationHours = Number(durationHours ? durationHours.toFixed(2) : (billingDays * 24).toFixed(2));
    reservationData.days = Number(billingDays.toFixed(2));
    reservationData.durationLabel = reservationData.durationLabel || `${reservationData.days} day rental`;
    reservationData.totalAmount = Number(totalAmount.toFixed(2));
    reservationData.total = reservationData.total || formatMoneyDisplay(reservationData.totalAmount, normalizedCurrency);
    reservationData.upfrontAmount = Number(upfrontAmount.toFixed(2));
    reservationData.upfrontDisplay = reservationData.upfrontDisplay || formatMoneyDisplay(reservationData.upfrontAmount, normalizedCurrency);
    reservationData.remainingAmount = Number(remainingAmount.toFixed(2));
    reservationData.remainingDisplay = reservationData.remainingDisplay || formatMoneyDisplay(reservationData.remainingAmount, normalizedCurrency);

    return reservationData;
}

// Email configuration
const emailTransporter = createEmailTransporter();

// Function to send notification email BEFORE payment
async function sendReservationNotificationEmail(reservationData, customerData) {
    const companyEmail = 'prestigegoalmotion@gmail.com';
    
    // Company notification email (reservation pending payment)
    const notificationEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #0a0a0a; color: #d6f03c; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; margin-top: 20px; }
                .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #d6f03c; }
                .label { font-weight: bold; color: #0a0a0a; }
                .status { background: #ff9800; color: white; padding: 10px; text-align: center; font-weight: bold; margin: 20px 0; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New pending reservation - Dynasty Prestige</h1>
                </div>
                <div class="content">
                    <div class="status">PAYMENT PENDING</div>
                    <h2>Reservation Details</h2>
                    <div class="info-row"><span class="label">Vehicle:</span> ${displayEmailValue(reservationData.car, 'Vehicle to be confirmed')}</div>
                    <div class="info-row"><span class="label">Start date:</span> ${displayEmailValue(reservationData.startDate)}${reservationData.pickupTime ? ` at ${reservationData.pickupTime}` : ''}</div>
                    <div class="info-row"><span class="label">End date:</span> ${displayEmailValue(reservationData.endDate)}${reservationData.dropoffTime ? ` at ${reservationData.dropoffTime}` : ''}</div>
                    <div class="info-row"><span class="label">Rental duration:</span> ${displayEmailValue(reservationData.durationLabel || reservationData.days)}</div>
                    <div class="info-row"><span class="label">Price per day:</span> ${formatMoneyDisplay(reservationData.pricePerDay, reservationData.currency)}</div>
                    <div class="info-row"><span class="label">Total reservation:</span> ${displayEmailValue(reservationData.total)}</div>
                    <div class="info-row"><span class="label">Pay now (50%):</span> ${displayEmailValue(reservationData.upfrontDisplay)}</div>
                    <div class="info-row"><span class="label">Remaining balance:</span> ${displayEmailValue(reservationData.remainingDisplay)}</div>
                    ${reservationData.pickupLocation ? `<div class="info-row"><span class="label">Pickup location:</span> ${reservationData.pickupLocation}</div>` : ''}
                    <h3>Customer Details</h3>
                    <div class="info-row"><span class="label">Name:</span> ${displayEmailValue(customerData.name || customerData.fullName)}</div>
                    <div class="info-row"><span class="label">Email:</span> ${displayEmailValue(customerData.email)}</div>
                    <div class="info-row"><span class="label">Phone:</span> ${displayEmailValue(customerData.phone)}</div>
                    ${customerData.dni || customerData.passport ? `<div class="info-row"><span class="label">DNI/Passport:</span> ${customerData.dni || customerData.passport}</div>` : ''}
                    ${customerData.address ? `<div class="info-row"><span class="label">Address:</span> ${customerData.address}</div>` : ''}
                    ${customerData.city ? `<div class="info-row"><span class="label">City:</span> ${customerData.city}</div>` : ''}
                    ${customerData.country ? `<div class="info-row"><span class="label">Country:</span> ${customerData.country}</div>` : ''}
                    <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">This reservation is pending payment. The customer will proceed with payment next.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        await emailTransporter.sendMail({
            from: EMAIL_CONFIG.from,
            to: companyEmail,
            subject: `New Pending Reservation: ${reservationData.car || 'Vehicle'} - ${customerData.name || customerData.fullName || 'Customer'}`,
            html: notificationEmailHtml,
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error sending notification email:', error);
        return { success: false, error: error.message };
    }
}

// Function to send confirmation email
async function sendReservationEmail(reservationData, customerData, paymentIntentId) {
    const companyEmail = 'prestigegoalmotion@gmail.com';
    
    // Company email
    const companyEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #0a0a0a; color: #d6f03c; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; margin-top: 20px; }
                .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #d6f03c; }
                .label { font-weight: bold; color: #0a0a0a; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New reservation - Dynasty Prestige</h1>
                </div>
                <div class="content">
                    <h2>Reservation Details</h2>
                    <div class="info-row"><span class="label">Vehicle:</span> ${displayEmailValue(reservationData.car, 'Vehicle to be confirmed')}</div>
                    <div class="info-row"><span class="label">Start date:</span> ${displayEmailValue(reservationData.startDate)}${reservationData.pickupTime ? ` at ${reservationData.pickupTime}` : ''}</div>
                    <div class="info-row"><span class="label">End date:</span> ${displayEmailValue(reservationData.endDate)}${reservationData.dropoffTime ? ` at ${reservationData.dropoffTime}` : ''}</div>
                    <div class="info-row"><span class="label">Rental duration:</span> ${displayEmailValue(reservationData.durationLabel || reservationData.days)}</div>
                    <div class="info-row"><span class="label">Price per day:</span> ${formatMoneyDisplay(reservationData.pricePerDay, reservationData.currency)}</div>
                    <div class="info-row"><span class="label">Total reservation:</span> ${displayEmailValue(reservationData.total)}</div>
                    <div class="info-row"><span class="label">Pay now (50%):</span> ${displayEmailValue(reservationData.upfrontDisplay)}</div>
                    <div class="info-row"><span class="label">Remaining balance:</span> ${displayEmailValue(reservationData.remainingDisplay)}</div>
                    ${reservationData.pickupLocation ? `<div class="info-row"><span class="label">Pickup location:</span> ${reservationData.pickupLocation}</div>` : ''}
                    ${paymentIntentId ? `<div class="info-row"><span class="label">Payment Intent ID:</span> ${paymentIntentId}</div>` : ''}
                    <h3>Customer Details</h3>
                    <div class="info-row"><span class="label">Name:</span> ${displayEmailValue(customerData.name || customerData.fullName)}</div>
                    <div class="info-row"><span class="label">Email:</span> ${displayEmailValue(customerData.email)}</div>
                    <div class="info-row"><span class="label">Phone:</span> ${displayEmailValue(customerData.phone)}</div>
                    ${customerData.dni || customerData.passport ? `<div class="info-row"><span class="label">DNI/Passport:</span> ${customerData.dni || customerData.passport}</div>` : ''}
                    ${customerData.address ? `<div class="info-row"><span class="label">Address:</span> ${customerData.address}</div>` : ''}
                    ${customerData.city ? `<div class="info-row"><span class="label">City:</span> ${customerData.city}</div>` : ''}
                    ${customerData.country ? `<div class="info-row"><span class="label">Country:</span> ${customerData.country}</div>` : ''}
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Customer email
    const customerEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #0a0a0a; color: #d6f03c; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; margin-top: 20px; }
                .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #d6f03c; }
                .label { font-weight: bold; color: #0a0a0a; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Reservation confirmed - Dynasty Prestige</h1>
                </div>
                <div class="content">
                    <p>Dear ${customerData.name || customerData.fullName || 'Customer'},</p>
                    <p>Your reservation is confirmed. Here are the key details for your booking:</p>
                    <h2>Reservation Details</h2>
                    <div class="info-row"><span class="label">Vehicle:</span> ${displayEmailValue(reservationData.car, 'Vehicle to be confirmed')}</div>
                    <div class="info-row"><span class="label">Start date:</span> ${displayEmailValue(reservationData.startDate)}${reservationData.pickupTime ? ` at ${reservationData.pickupTime}` : ''}</div>
                    <div class="info-row"><span class="label">End date:</span> ${displayEmailValue(reservationData.endDate)}${reservationData.dropoffTime ? ` at ${reservationData.dropoffTime}` : ''}</div>
                    <div class="info-row"><span class="label">Rental duration:</span> ${displayEmailValue(reservationData.durationLabel || reservationData.days)}</div>
                    <div class="info-row"><span class="label">Price per day:</span> ${formatMoneyDisplay(reservationData.pricePerDay, reservationData.currency)}</div>
                    <div class="info-row"><span class="label">Total reservation:</span> ${displayEmailValue(reservationData.total)}</div>
                    <div class="info-row"><span class="label">Paid now (50%):</span> ${displayEmailValue(reservationData.upfrontDisplay)}</div>
                    <div class="info-row"><span class="label">Remaining balance:</span> ${displayEmailValue(reservationData.remainingDisplay)}</div>
                    ${reservationData.pickupLocation ? `<div class="info-row"><span class="label">Pickup location:</span> ${reservationData.pickupLocation}</div>` : ''}
                    <p style="margin-top: 20px;">The team will coordinate handover details directly with you. Thank you for choosing Dynasty Prestige.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        console.log('[EMAIL] ========== STARTING EMAIL DELIVERY ==========');
        console.log('[EMAIL] Configuration:', {
            from: EMAIL_CONFIG.from,
            service: EMAIL_CONFIG.service,
            hasPassword: !!EMAIL_CONFIG.password
        });
        console.log('[EMAIL] Reservation summary:', summarizeReservationData(reservationData));
        console.log('[EMAIL] Customer summary:', summarizeCustomerData(customerData));
        
        // Send email to the company
        console.log('[EMAIL] Sending email to company:', companyEmail);
        const companyEmailResult = await emailTransporter.sendMail({
            from: EMAIL_CONFIG.from,
            to: companyEmail,
            subject: `New Reservation: ${reservationData.car || 'Vehicle'} - ${customerData.name || customerData.fullName || 'Customer'}`,
            html: companyEmailHtml,
        });
        console.log('[EMAIL]  Company email sent:', {
            messageId: companyEmailResult.messageId,
            accepted: companyEmailResult.accepted,
            rejected: companyEmailResult.rejected
        });
        
        // Send email to customer
        if (customerData.email) {
            console.log('[EMAIL] Sending email to customer:', maskEmail(customerData.email));
            const customerEmailResult = await emailTransporter.sendMail({
                from: EMAIL_CONFIG.from,
                to: customerData.email,
                subject: `Reservation confirmed - Dynasty Prestige`,
                html: customerEmailHtml,
                replyTo: companyEmail,
            });
            console.log('[EMAIL]  Customer email sent:', {
                messageId: customerEmailResult.messageId,
                accepted: customerEmailResult.accepted,
                rejected: customerEmailResult.rejected
            });
        } else {
            console.warn('[EMAIL]  Customer email not sent: no email in customerData');
        }
        
        console.log('[EMAIL]  All emails sent successfully');
        return { success: true };
    } catch (error) {
        console.error('[EMAIL]  ERROR SENDING EMAILS:', error);
        console.error('[EMAIL] Error details:', {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode
        });
        return { success: false, error: error.message };
    }
}

// POST /api/reserve - Create reservation
router.post('/', async (req, res) => {
    console.log('[API] ========== NEW RESERVATION REQUEST ==========');
    console.log('[API] Timestamp:', new Date().toISOString());
    console.log('[API] Request summary:', summarizeHeaders(req.headers));
    
    try {
        const data = req.body;
        console.log('[API] Reservation request summary:', summarizeReservationRequest(data));
        
        // Basic validation (similar to the provided TypeScript code)
        console.log('[API] Validating data...');
        if (!data.fullName && !data.customerData?.name) {
        console.error('[API]  Validation failed: Missing fullName');
            return res.status(400).json({ error: 'Missing fullName' });
        }

        if (!data.email && !data.customerData?.email) {
        console.error('[API]  Validation failed: Missing email');
            return res.status(400).json({ error: 'Missing email' });
        }

        if (!data.startDate && !data.reservationData?.startDate) {
        console.error('[API]  Validation failed: Missing startDate');
            return res.status(400).json({ error: 'Missing startDate' });
        }

        console.log('[API]  Validation passed');
        // Normalize data (supports both formats: direct or nested)
        console.log('[API] Normalizing data...');
        const customerData = data.customerData || {
            name: data.fullName,
            email: data.email,
            phone: data.phone,
            dni: data.passport || data.dni,
            address: data.address,
            city: data.city,
            country: normalizeCountryCode(data.country), // Convert to ISO code
        };
        const reservationCurrency = (data.currency || data.reservationData?.currency || 'aed').toLowerCase();

        const reservationData = data.reservationData || {
            car: data.car || 'Mercedes GLE 53 AMG',
            pricePerDay: data.pricePerDay || 500,
            days: data.days,
            startDate: data.startDate,
            endDate: data.endDate,
            pickupTime: data.pickupTime,
            dropoffTime: data.dropoffTime,
            durationHours: data.durationHours,
            durationLabel: data.durationLabel,
            totalAmount: data.totalAmount,
            total: data.total,
            upfrontAmount: data.upfrontAmount,
            upfrontDisplay: data.upfrontDisplay,
            remainingAmount: data.remainingAmount,
            remainingDisplay: data.remainingDisplay,
            pickupLocation: data.pickupLocation,
            currency: reservationCurrency.toUpperCase(),
        };
        const reservationId = data.reservationId || reservationData.reservationId || buildReservationId();
        reservationData.reservationId = reservationId;
        enrichReservationPricing(reservationData, reservationCurrency);

        console.log('[API] Normalized reservation summary:', {
            customer: summarizeCustomerData(customerData),
            reservation: summarizeReservationData(reservationData)
        });

        console.log('[API] Pricing summary:', {
            days: reservationData.days,
            durationHours: reservationData.durationHours,
            totalAmount: reservationData.totalAmount,
            upfrontAmount: reservationData.upfrontAmount,
            remainingAmount: reservationData.remainingAmount
        });

        const persistedReservation = await persistReservationUpdate({
            reservationId,
            status: data.amount ? 'checkout_started' : 'lead_received',
            source: 'website',
            customerData,
            reservationData,
            payment: buildPaymentPersistence(null, reservationCurrency),
            email: {
                pendingNotification: {
                    status: 'queued',
                    queuedAt: new Date().toISOString()
                }
            },
            rawRequest: sanitizeReservationRequestForStorage(data)
        }, 'reservation received', { critical: true });

        // Send notification email BEFORE payment (async, non-blocking)
        console.log('[API] Sending notification email (async)...');
        sendReservationNotificationEmail(reservationData, customerData)
            .then((emailResult) => {
                void persistReservationUpdate({
                    reservationId,
                    email: {
                        pendingNotification: {
                            status: emailResult.success ? 'sent' : 'failed',
                            attemptedAt: new Date().toISOString(),
                            error: emailResult.error || null
                        }
                    }
                }, 'pending notification email result');
                console.log('[API]  Notification email processed (async):', emailResult);
            })
            .catch((emailError) => {
                void persistReservationUpdate({
                    reservationId,
                    email: {
                        pendingNotification: {
                            status: 'failed',
                            attemptedAt: new Date().toISOString(),
                            error: emailError.message || String(emailError)
                        }
                    }
                }, 'pending notification email failure');
                console.warn('[API]  Error sending notification email (non-critical, async):', emailError);
                // Do not fail reservation if email fails
            });

        // If amount is provided, create a Stripe payment intent.
        let paymentIntent = null;
        let customer = null;

        if (data.amount) {
            console.log('[API] Amount received:', data.amount);
            console.log('[API] Creating payment intent with Stripe...');
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerData.email)) {
                console.error('[API]  Invalid email:', customerData.email);
                return res.status(400).json({ 
                    error: 'Invalid email format' 
                });
            }

            // Verify Stripe is configured
            if (!stripe) {
                console.error('[API]  Stripe is not initialized');
                return res.status(500).json({ 
                    error: 'Secure payment is temporarily unavailable' 
                });
            }

            // Create or retrieve customer in Stripe
            console.log('[API] Looking up/creating Stripe customer...');
            const customerStartTime = Date.now();
            try {
                const existingCustomers = await stripe.customers.list({
                    email: customerData.email,
                    limit: 1,
                });

                if (existingCustomers.data.length > 0) {
                    customer = existingCustomers.data[0];
                    const customerLookupDuration = Date.now() - customerStartTime;
                    console.log('[API] Existing customer found:', customer.id, `(${customerLookupDuration}ms)`);
                    // Update customer information
                    const updateStartTime = Date.now();
                    await stripe.customers.update(customer.id, {
                        name: customerData.name,
                        phone: customerData.phone,
                        address: {
                            line1: customerData.address,
                            city: customerData.city,
                            country: customerData.country,
                        },
                        metadata: {
                            dni: customerData.dni || '',
                        },
                    });
                    const updateDuration = Date.now() - updateStartTime;
                    console.log('[API] Customer updated', `(${updateDuration}ms)`);
                } else {
                    console.log('[API] Creating new customer...');
                    const createStartTime = Date.now();
                    customer = await stripe.customers.create({
                        email: customerData.email,
                        name: customerData.name,
                        phone: customerData.phone,
                        address: {
                            line1: customerData.address,
                            city: customerData.city,
                            country: customerData.country,
                        },
                        metadata: {
                            dni: customerData.dni || '',
                        },
                    });
                    const createDuration = Date.now() - createStartTime;
                    const totalCustomerDuration = Date.now() - customerStartTime;
                    console.log('[API]  Customer created:', customer.id, `(${createDuration}ms, total: ${totalCustomerDuration}ms)`);
                }
            } catch (error) {
                console.error('[API]  Error creating/updating customer:', error);
                console.error('[API] Error details:', {
                    message: error.message,
                    type: error.type,
                    code: error.code
                });
                await persistReservationUpdate({
                    reservationId,
                    status: 'customer_processing_failed',
                    customerData,
                    reservationData,
                    payment: {
                        error: error.message,
                        errorType: error.type || null,
                        errorCode: error.code || null
                    }
                }, 'stripe customer failure');
                return res.status(500).json({ 
                    error: 'Error processing customer data: ' + error.message 
                });
            }

            // Create the Stripe payment intent.
            console.log('[API] Creating payment intent...');
            const paymentIntentStartTime = Date.now();
            try {
                const paymentIntentData = {
                    amount: Math.round(data.amount),
                    currency: data.currency || 'aed',
                    customer: customer.id,
                    confirmation_method: 'automatic',
                    confirm: false,
                    description: `Reservation: ${reservationData.car} - 50% upfront`,
                    metadata: {
                        reservationId,
                        car: reservationData.car,
                        days: reservationData.days.toString(),
                        startDate: reservationData.startDate,
                        endDate: reservationData.endDate,
                        pickupTime: reservationData.pickupTime || '',
                        dropoffTime: reservationData.dropoffTime || '',
                        durationHours: reservationData.durationHours.toString(),
                        durationLabel: reservationData.durationLabel || '',
                        pricePerDay: reservationData.pricePerDay.toString(),
                        totalAmount: reservationData.totalAmount.toString(),
                        totalDisplay: reservationData.total || '',
                        upfrontAmount: reservationData.upfrontAmount.toString(),
                        upfrontDisplay: reservationData.upfrontDisplay || '',
                        remainingAmount: reservationData.remainingAmount.toString(),
                        remainingDisplay: reservationData.remainingDisplay || '',
                        customerName: customerData.name,
                        customerEmail: customerData.email,
                        pickupLocation: reservationData.pickupLocation || '',
                    },
                    // The current checkout is card-based, so request only the card method.
                    payment_method_types: ['card'],
                };
                
                console.log('[API] Payment intent data:', {
                    amount: paymentIntentData.amount,
                    currency: paymentIntentData.currency,
                    customer: paymentIntentData.customer,
                    description: paymentIntentData.description
                });
                
                paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
                const paymentIntentDuration = Date.now() - paymentIntentStartTime;
                console.log('[API]  Payment intent created:', {
                    id: paymentIntent.id,
                    status: paymentIntent.status,
                    client_secret: paymentIntent.client_secret ? paymentIntent.client_secret.substring(0, 20) + '...' : null,
                    duration: `${paymentIntentDuration}ms`
                });
                await persistReservationUpdate({
                    reservationId,
                    paymentIntentId: paymentIntent.id,
                    stripeCustomerId: customer.id,
                    status: 'payment_intent_created',
                    customerData,
                    reservationData,
                    payment: buildPaymentPersistence(paymentIntent, reservationCurrency)
                }, 'payment intent created', { critical: true });
            } catch (error) {
                console.error('[API]  Error creating payment intent:', error);
                console.error('[API] Error details:', {
                    message: error.message,
                    type: error.type,
                    code: error.code,
                    decline_code: error.decline_code
                });
                await persistReservationUpdate({
                    reservationId,
                    status: 'payment_intent_failed',
                    customerData,
                    reservationData,
                    payment: {
                        error: error.message,
                        errorType: error.type || null,
                        errorCode: error.code || null,
                        declineCode: error.decline_code || null
                    }
                }, 'payment intent failure');
                return res.status(500).json({ 
                    error: 'Error creating payment intent: ' + error.message 
                });
            }
        } else {
            console.log('[API]  Amount not received, payment intent will not be created');
        }

        // Confirmation emails are sent after Stripe confirms the payment in /api/reserve/confirm.
        // console.log('[API] Sending confirmation emails (async)...');
        // sendReservationEmail(
        //     reservationData,
        //     customerData,
        //     paymentIntent?.id || null
        // ).then((emailResult) => {
        //     console.log('[API]  Emails sent (async):', emailResult);
        // }).catch((emailError) => {
        //     console.warn('[API]  Error sending emails (non-critical, async):', emailError);
        //     // Do not fail the reservation if email fails
        // });
        console.log('[API]  Confirmation email waits for payment confirmation');

        // Response
        console.log('[API] Preparing response...');
        if (paymentIntent) {
            const response = {
                success: true,
                reservationId: persistedReservation.reservationId,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                customerId: customer.id,
            };
            console.log('[API]  Successful response with payment intent:', {
                paymentIntentId: response.paymentIntentId,
                customerId: response.customerId,
                hasClientSecret: !!response.clientSecret
            });
            return res.json(response);
        } else {
            const response = {
                success: true,
                reservationId: persistedReservation.reservationId,
                message: 'Reservation created successfully',
            };
            console.log('[API]  Successful response without payment intent');
            return res.json(response);
        }

    } catch (error) {
        console.error('[API]  GENERAL ERROR:', error);
        console.error('[API] Trace:', error.stack);
        return res.status(500).json({ 
            error: 'Error processing reservation: ' + error.message 
        });
    }
});

// POST /api/reserve/lookup - Secure customer-facing reservation lookup
router.post('/lookup', async (req, res) => {
    try {
        const reservationId = normalizeLookupValue(req.body?.reservationId);
        const email = normalizeLookupEmail(req.body?.email);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        res.set('Cache-Control', 'no-store');

        if (!reservationId || !email || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Enter your reservation ID and the email used for the booking.'
            });
        }

        const record = await findReservationForLookup({ reservationId, email });

        if (!record) {
            console.warn('[API LOOKUP] Reservation lookup mismatch:', {
                reservationId,
                email: maskEmail(email)
            });
            return res.status(404).json({
                success: false,
                error: 'We could not match those details. Check the reservation ID and email, or WhatsApp the team.'
            });
        }

        return res.json({
            success: true,
            reservation: buildSafeReservationLookupSummary(record)
        });
    } catch (error) {
        console.error('[API LOOKUP] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Reservation lookup is temporarily unavailable. Please try again or WhatsApp the team.'
        });
    }
});

// POST /api/reserve/confirm - Confirm payment and send emails
router.post('/confirm', async (req, res) => {
    console.log('[API CONFIRM] ========== RESERVATION CONFIRMATION ==========');
    console.log('[API CONFIRM] Timestamp:', new Date().toISOString());
    
    try {
        const { paymentIntentId, reservationData, customerData } = req.body;
        console.log('[API CONFIRM] Data received:', {
            paymentIntentId: paymentIntentId,
            hasReservationData: !!reservationData,
            hasCustomerData: !!customerData
        });

        if (!paymentIntentId) {
            console.error('[API CONFIRM]  Payment intent ID required');
            return res.status(400).json({ 
                error: 'Payment Intent ID is required' 
            });
        }

        if (!stripe) {
            return res.status(503).json({
                error: 'Secure payment is temporarily unavailable'
            });
        }

        // Check payment status
        console.log('[API CONFIRM] Retrieving payment intent from Stripe...');
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log('[API CONFIRM] Payment intent retrieved:', {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
        });
        const existingReservation = await readReservationRecord(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            console.log('[API CONFIRM]  Payment successful, sending emails...');
            
            // Prepare reservation data (use provided data or payment metadata)
            let finalReservationData = reservationData || {
                car: paymentIntent.metadata.car,
                days: parseMoneyValue(paymentIntent.metadata.days) || 1,
                startDate: paymentIntent.metadata.startDate,
                endDate: paymentIntent.metadata.endDate,
                pickupTime: paymentIntent.metadata.pickupTime,
                dropoffTime: paymentIntent.metadata.dropoffTime,
                durationHours: parseMoneyValue(paymentIntent.metadata.durationHours) || 0,
                durationLabel: paymentIntent.metadata.durationLabel,
                pricePerDay: parseMoneyValue(paymentIntent.metadata.pricePerDay) || 0,
                totalAmount: parseMoneyValue(paymentIntent.metadata.totalAmount) || 0,
                total: paymentIntent.metadata.totalDisplay,
                upfrontAmount: parseMoneyValue(paymentIntent.metadata.upfrontAmount) || 0,
                upfrontDisplay: paymentIntent.metadata.upfrontDisplay,
                remainingAmount: parseMoneyValue(paymentIntent.metadata.remainingAmount) || 0,
                remainingDisplay: paymentIntent.metadata.remainingDisplay,
                pickupLocation: paymentIntent.metadata.pickupLocation,
                currency: paymentIntent.currency || 'aed',
            };
            const reservationId = finalReservationData.reservationId || paymentIntent.metadata.reservationId || existingReservation?.reservationId || buildReservationId();
            finalReservationData.reservationId = reservationId;
            enrichReservationPricing(finalReservationData, finalReservationData.currency || paymentIntent.currency || 'aed');
            
            // Prepare customer data (use provided data or payment metadata)
            let finalCustomerData = customerData;
            if (!finalCustomerData) {
                finalCustomerData = {
                    name: paymentIntent.metadata.customerName,
                    email: paymentIntent.metadata.customerEmail,
                };
                
                // Try to fetch full customer data from Stripe
                try {
                    if (paymentIntent.customer) {
                        const customer = await stripe.customers.retrieve(paymentIntent.customer);
                        finalCustomerData.phone = customer.phone || '';
                        finalCustomerData.address = customer.address?.line1 || '';
                        finalCustomerData.city = customer.address?.city || '';
                        finalCustomerData.country = customer.address?.country || '';
                        finalCustomerData.dni = customer.metadata?.dni || '';
                    }
                } catch (customerError) {
                    console.warn('[API CONFIRM]  Error fetching customer data:', customerError);
                }
            }
            
            const stripeCustomerId = typeof paymentIntent.customer === 'string'
                ? paymentIntent.customer
                : paymentIntent.customer?.id || null;

            await persistReservationUpdate({
                reservationId,
                paymentIntentId,
                stripeCustomerId,
                status: 'payment_succeeded',
                customerData: finalCustomerData,
                reservationData: finalReservationData,
                payment: buildPaymentPersistence(paymentIntent, paymentIntent.currency || finalReservationData.currency)
            }, 'payment confirmed', { critical: true });

            // Send confirmation emails
            console.log('[API CONFIRM] Sending confirmation emails...');
            console.log('[API CONFIRM] Calling sendReservationEmail with data:', {
                reservationData: summarizeReservationData(finalReservationData),
                customerData: summarizeCustomerData(finalCustomerData),
                paymentIntentId: paymentIntentId
            });
            
            let emailResult = null;
            let emailError = null;
            try {
                emailResult = await sendReservationEmail(
                    finalReservationData,
                    finalCustomerData,
                    paymentIntentId
                );
                console.log('[API CONFIRM]  Email send result:', emailResult);
            } catch (emailErr) {
                emailError = emailErr.message || emailErr.toString();
                console.error('[API CONFIRM]  Error sending emails:', emailError);
                // Do not fail confirmation if email fails; payment already succeeded
            }

            await persistReservationUpdate({
                reservationId,
                paymentIntentId,
                status: emailResult?.success ? 'confirmed' : 'confirmed_email_failed',
                email: {
                    confirmation: {
                        status: emailResult?.success ? 'sent' : 'failed',
                        attemptedAt: new Date().toISOString(),
                        error: emailResult?.error || emailError || null
                    }
                }
            }, 'confirmation email result');
            
            console.log('[API CONFIRM]  Confirmation completed');
            return res.json({
                success: true,
                reservationId,
                paymentIntentId: paymentIntent.id,
                status: paymentIntent.status,
                emailSent: emailResult?.success || false,
                emailError: emailError,
                message: emailResult?.success ? 'Reservation confirmed and emails sent' : (emailError ? 'Reservation confirmed but email failed' : 'Reservation confirmed')
            });
        } else {
            console.log('[API CONFIRM]  Payment not completed, status:', paymentIntent.status);
            const reservationId = paymentIntent.metadata.reservationId || existingReservation?.reservationId || buildReservationId();
            await persistReservationUpdate({
                reservationId,
                paymentIntentId,
                status: `payment_${paymentIntent.status || 'not_completed'}`,
                payment: buildPaymentPersistence(paymentIntent, paymentIntent.currency || 'aed')
            }, 'payment not completed');
            return res.json({
                success: false,
                reservationId,
                paymentIntentId: paymentIntent.id,
                status: paymentIntent.status,
                message: 'Payment has not been completed yet',
            });
        }
    } catch (error) {
        console.error('[API CONFIRM]  ERROR:', error);
        console.error('[API CONFIRM] Trace:', error.stack);
        return res.status(500).json({ 
            error: 'Error confirming reservation: ' + error.message 
        });
    }
});

// GET /api/reserve/:paymentIntentId - Get reservation status
router.get('/:paymentIntentId', async (req, res) => {
    try {
        const { paymentIntentId } = req.params;
        const savedRecord = await readReservationRecord(paymentIntentId);

        if (!stripe) {
            if (savedRecord) {
                return res.json({
                    paymentIntentId,
                    status: savedRecord.status,
                    reservation: summarizeSavedReservationRecord(savedRecord)
                });
            }

            return res.status(503).json({
                error: 'Secure payment is temporarily unavailable'
            });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        return res.json({
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata,
            reservation: summarizeSavedReservationRecord(savedRecord),
        });
    } catch (error) {
        console.error('Error retrieving reservation:', error);
        return res.status(500).json({ 
            error: 'Error retrieving reservation: ' + error.message 
        });
    }
});

module.exports = router;
