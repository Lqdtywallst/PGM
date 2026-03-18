// API route for reservations
// Handles all reservation-related operations

require('dotenv').config();
const express = require('express');

// Verify that STRIPE_SECRET_KEY is configured
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('tu_clave')) {
    console.error('[RESERVE ROUTE] ❌ ERROR: STRIPE_SECRET_KEY is not configured');
    console.error('[RESERVE ROUTE] The module will load but payment functions will not work');
}

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const nodemailer = require('nodemailer');

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

// Email configuration
const EMAIL_CONFIG = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || 'prestigegoalmotion@gmail.com',
    password: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD,
};

const emailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    requireTLS: true,
    auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.password,
    },
    tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false
    }
});

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
                .header { background: #0a0a0a; color: #d4af37; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; margin-top: 20px; }
                .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #d4af37; }
                .label { font-weight: bold; color: #0a0a0a; }
                .status { background: #ff9800; color: white; padding: 10px; text-align: center; font-weight: bold; margin: 20px 0; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 New Pending Reservation - Dynasty Prestige</h1>
                </div>
                <div class="content">
                    <div class="status">⏳ PAYMENT PENDING</div>
                    <h2>Reservation Details</h2>
                    <div class="info-row"><span class="label">Vehicle:</span> ${reservationData.car || 'N/A'}</div>
                    <div class="info-row"><span class="label">Start date:</span> ${reservationData.startDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">End date:</span> ${reservationData.endDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">Days:</span> ${reservationData.days || 'N/A'}</div>
                    <div class="info-row"><span class="label">Price per day:</span> ${reservationData.pricePerDay || 'N/A'} €</div>
                    <div class="info-row"><span class="label">Total:</span> ${reservationData.total || 'N/A'} €</div>
                    ${reservationData.pickupLocation ? `<div class="info-row"><span class="label">Pickup location:</span> ${reservationData.pickupLocation}</div>` : ''}
                    <h3>Customer Details</h3>
                    <div class="info-row"><span class="label">Name:</span> ${customerData.name || customerData.fullName || 'N/A'}</div>
                    <div class="info-row"><span class="label">Email:</span> ${customerData.email || 'N/A'}</div>
                    <div class="info-row"><span class="label">Phone:</span> ${customerData.phone || 'N/A'}</div>
                    ${customerData.dni || customerData.passport ? `<div class="info-row"><span class="label">DNI/Passport:</span> ${customerData.dni || customerData.passport}</div>` : ''}
                    ${customerData.address ? `<div class="info-row"><span class="label">Address:</span> ${customerData.address}</div>` : ''}
                    ${customerData.city ? `<div class="info-row"><span class="label">City:</span> ${customerData.city}</div>` : ''}
                    ${customerData.postalCode ? `<div class="info-row"><span class="label">Postal Code:</span> ${customerData.postalCode}</div>` : ''}
                    ${customerData.country ? `<div class="info-row"><span class="label">Country:</span> ${customerData.country}</div>` : ''}
                    <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">This reservation is pending payment. The customer will proceed with payment next.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        await emailTransporter.sendMail({
            from: EMAIL_CONFIG.user,
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
                .header { background: #0a0a0a; color: #d4af37; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; margin-top: 20px; }
                .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #d4af37; }
                .label { font-weight: bold; color: #0a0a0a; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚗 New Reservation - Dynasty Prestige</h1>
                </div>
                <div class="content">
                    <h2>Reservation Details</h2>
                    <div class="info-row"><span class="label">Vehicle:</span> ${reservationData.car || 'N/A'}</div>
                    <div class="info-row"><span class="label">Start date:</span> ${reservationData.startDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">End date:</span> ${reservationData.endDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">Days:</span> ${reservationData.days || 'N/A'}</div>
                    <div class="info-row"><span class="label">Price per day:</span> ${reservationData.pricePerDay || 'N/A'} €</div>
                    <div class="info-row"><span class="label">Total:</span> ${reservationData.total || 'N/A'} €</div>
                    ${reservationData.pickupLocation ? `<div class="info-row"><span class="label">Pickup location:</span> ${reservationData.pickupLocation}</div>` : ''}
                    ${paymentIntentId ? `<div class="info-row"><span class="label">Payment Intent ID:</span> ${paymentIntentId}</div>` : ''}
                    <h3>Customer Details</h3>
                    <div class="info-row"><span class="label">Name:</span> ${customerData.name || customerData.fullName || 'N/A'}</div>
                    <div class="info-row"><span class="label">Email:</span> ${customerData.email || 'N/A'}</div>
                    <div class="info-row"><span class="label">Phone:</span> ${customerData.phone || 'N/A'}</div>
                    ${customerData.dni || customerData.passport ? `<div class="info-row"><span class="label">DNI/Passport:</span> ${customerData.dni || customerData.passport}</div>` : ''}
                    ${customerData.address ? `<div class="info-row"><span class="label">Address:</span> ${customerData.address}</div>` : ''}
                    ${customerData.city ? `<div class="info-row"><span class="label">City:</span> ${customerData.city}</div>` : ''}
                    ${customerData.postalCode ? `<div class="info-row"><span class="label">Postal Code:</span> ${customerData.postalCode}</div>` : ''}
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
                .header { background: #0a0a0a; color: #d4af37; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; margin-top: 20px; }
                .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #d4af37; }
                .label { font-weight: bold; color: #0a0a0a; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Reservation Confirmed - Dynasty Prestige</h1>
                </div>
                <div class="content">
                    <p>Dear ${customerData.name || customerData.fullName || 'Customer'},</p>
                    <p>Your reservation has been confirmed successfully. Below are the details:</p>
                    <h2>Reservation Details</h2>
                    <div class="info-row"><span class="label">Vehicle:</span> ${reservationData.car || 'N/A'}</div>
                    <div class="info-row"><span class="label">Start date:</span> ${reservationData.startDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">End date:</span> ${reservationData.endDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">Days:</span> ${reservationData.days || 'N/A'}</div>
                    <div class="info-row"><span class="label">Price per day:</span> ${reservationData.pricePerDay || 'N/A'} €</div>
                    <div class="info-row"><span class="label">Total:</span> ${reservationData.total || (reservationData.pricePerDay && reservationData.days ? (parseFloat(reservationData.pricePerDay) * parseInt(reservationData.days)).toFixed(2) + ' €' : 'N/A')}</div>
                    ${reservationData.pickupLocation ? `<div class="info-row"><span class="label">Pickup location:</span> ${reservationData.pickupLocation}</div>` : ''}
                    <p style="margin-top: 20px;">Thank you for choosing Dynasty Prestige.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        console.log('[EMAIL] ========== STARTING EMAIL DELIVERY ==========');
        console.log('[EMAIL] Configuration:', {
            from: EMAIL_CONFIG.user,
            service: EMAIL_CONFIG.service,
            hasPassword: !!EMAIL_CONFIG.password
        });
        console.log('[EMAIL] Reservation data:', {
            car: reservationData.car,
            days: reservationData.days,
            total: reservationData.total
        });
        console.log('[EMAIL] Customer data:', {
            name: customerData.name || customerData.fullName,
            email: customerData.email,
            hasEmail: !!customerData.email
        });
        
        // Send email to the company
        console.log('[EMAIL] Sending email to company:', companyEmail);
        const companyEmailResult = await emailTransporter.sendMail({
            from: EMAIL_CONFIG.user,
            to: companyEmail,
            subject: `New Reservation: ${reservationData.car || 'Vehicle'} - ${customerData.name || customerData.fullName || 'Customer'}`,
            html: companyEmailHtml,
        });
        console.log('[EMAIL] ✅ Company email sent:', {
            messageId: companyEmailResult.messageId,
            accepted: companyEmailResult.accepted,
            rejected: companyEmailResult.rejected
        });
        
        // Send email to customer
        if (customerData.email) {
            console.log('[EMAIL] Sending email to customer:', customerData.email);
            const customerEmailResult = await emailTransporter.sendMail({
                from: EMAIL_CONFIG.user,
                to: customerData.email,
                subject: `Reservation Confirmed - Dynasty Prestige`,
                html: customerEmailHtml,
                replyTo: companyEmail,
            });
            console.log('[EMAIL] ✅ Customer email sent:', {
                messageId: customerEmailResult.messageId,
                accepted: customerEmailResult.accepted,
                rejected: customerEmailResult.rejected
            });
        } else {
            console.warn('[EMAIL] ⚠️ Customer email not sent: no email in customerData');
        }
        
        console.log('[EMAIL] ✅ All emails sent successfully');
        return { success: true };
    } catch (error) {
        console.error('[EMAIL] ❌ ERROR SENDING EMAILS:', error);
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
    console.log('[API] Headers:', req.headers);
    
    try {
        const data = req.body;
        console.log('[API] Data received:', JSON.stringify(data, null, 2));
        
        // Basic validation (similar to the provided TypeScript code)
        console.log('[API] Validating data...');
        if (!data.fullName && !data.customerData?.name) {
        console.error('[API] ❌ Validation failed: Missing fullName');
            return res.status(400).json({ error: 'Missing fullName' });
        }

        if (!data.email && !data.customerData?.email) {
        console.error('[API] ❌ Validation failed: Missing email');
            return res.status(400).json({ error: 'Missing email' });
        }

        if (!data.startDate && !data.reservationData?.startDate) {
        console.error('[API] ❌ Validation failed: Missing startDate');
            return res.status(400).json({ error: 'Missing startDate' });
        }

        console.log('[API] ✅ Validation passed');
        console.log('[API] NEW RESERVATION:', data);

        // Normalize data (supports both formats: direct or nested)
        console.log('[API] Normalizing data...');
        const customerData = data.customerData || {
            name: data.fullName,
            email: data.email,
            phone: data.phone,
            dni: data.passport || data.dni,
            address: data.address,
            city: data.city,
            postalCode: data.postalCode,
            country: normalizeCountryCode(data.country), // Convert to ISO code
        };

        const reservationData = data.reservationData || {
            car: data.car || 'Mercedes GLE 53 AMG',
            pricePerDay: data.pricePerDay || 500,
            days: data.days || 1,
            startDate: data.startDate,
            endDate: data.endDate,
            pickupLocation: data.pickupLocation,
        };

        console.log('[API] Normalized data:', {
            customer: customerData,
            reservation: reservationData
        });

        // Calculate total if not provided
        if (!data.amount && !reservationData.total) {
            console.log('[API] Calculating total...');
            const start = new Date(reservationData.startDate);
            const end = new Date(reservationData.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            reservationData.days = diffDays;
            reservationData.total = diffDays * reservationData.pricePerDay;
            console.log('[API] Calculated total:', {
                days: diffDays,
                pricePerDay: reservationData.pricePerDay,
                total: reservationData.total
            });
        }

        // Send notification email BEFORE payment (async, non-blocking)
        console.log('[API] Sending notification email (async)...');
        sendReservationNotificationEmail(reservationData, customerData)
            .then((emailResult) => {
                console.log('[API] ✅ Notification email sent (async):', emailResult);
            })
            .catch((emailError) => {
                console.warn('[API] ⚠️ Error sending notification email (non-critical, async):', emailError);
                // Do not fail reservation if email fails
            });

        // If amount is provided, create PaymentIntent with Stripe
        let paymentIntent = null;
        let customer = null;

        if (data.amount) {
            console.log('[API] Amount received:', data.amount);
            console.log('[API] Creating PaymentIntent with Stripe...');
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerData.email)) {
                console.error('[API] ❌ Invalid email:', customerData.email);
                return res.status(400).json({ 
                    error: 'Invalid email format' 
                });
            }

            // Verify Stripe is configured
            if (!stripe) {
                console.error('[API] ❌ Stripe is not initialized');
                return res.status(500).json({ 
                    error: 'Stripe not configured' 
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
                            postal_code: customerData.postalCode,
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
                            postal_code: customerData.postalCode,
                            country: customerData.country,
                        },
                        metadata: {
                            dni: customerData.dni || '',
                        },
                    });
                    const createDuration = Date.now() - createStartTime;
                    const totalCustomerDuration = Date.now() - customerStartTime;
                    console.log('[API] ✅ Customer created:', customer.id, `(${createDuration}ms, total: ${totalCustomerDuration}ms)`);
                }
            } catch (error) {
                console.error('[API] ❌ Error creating/updating customer:', error);
                console.error('[API] Error details:', {
                    message: error.message,
                    type: error.type,
                    code: error.code
                });
                return res.status(500).json({ 
                    error: 'Error processing customer data: ' + error.message 
                });
            }

            // Create PaymentIntent
            console.log('[API] Creating PaymentIntent...');
            const paymentIntentStartTime = Date.now();
            try {
                const paymentIntentData = {
                    amount: Math.round(data.amount),
                    currency: data.currency || 'aed',
                    customer: customer.id,
                    confirmation_method: 'automatic',
                    confirm: false,
                    description: `Reservation: ${reservationData.car} - ${reservationData.days} days`,
                    metadata: {
                        car: reservationData.car,
                        days: reservationData.days.toString(),
                        startDate: reservationData.startDate,
                        endDate: reservationData.endDate,
                        pricePerDay: reservationData.pricePerDay.toString(),
                        customerName: customerData.name,
                        customerEmail: customerData.email,
                        pickupLocation: reservationData.pickupLocation || '',
                    },
                    payment_method_types: ['card', 'apple_pay', 'google_pay', 'link'],
                };
                
                console.log('[API] PaymentIntent data:', {
                    amount: paymentIntentData.amount,
                    currency: paymentIntentData.currency,
                    customer: paymentIntentData.customer,
                    description: paymentIntentData.description
                });
                
                try {
                    paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
                    const paymentIntentDuration = Date.now() - paymentIntentStartTime;
                    console.log('[API] ✅ PaymentIntent created:', {
                        id: paymentIntent.id,
                        status: paymentIntent.status,
                        client_secret: paymentIntent.client_secret ? paymentIntent.client_secret.substring(0, 20) + '...' : null,
                        duration: `${paymentIntentDuration}ms`
                    });
                } catch (paymentError) {
                    // If the error is due to payment methods not enabled (Apple Pay/Google Pay), try only basic methods
                    const errorMessage = paymentError.message || paymentError.toString() || '';
                    const isPaymentMethodError = errorMessage.includes('payment method type') || 
                                                 errorMessage.includes('invalid') ||
                                                 errorMessage.includes('apple_pay') ||
                                                 errorMessage.includes('google_pay');
                    
                    if (isPaymentMethodError) {
                        console.log('[API] ⚠️ Payment methods not available, using only card and link...');
                        console.log('[API] Error original:', errorMessage);
                        try {
                            paymentIntentData.payment_method_types = ['card', 'link'];
                            paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
                            console.log('[API] ✅ PaymentIntent created with basic methods');
                        } catch (retryError) {
                            console.error('[API] ❌ Error on second attempt:', retryError);
                            throw retryError;
                        }
                    } else {
                        throw paymentError;
                    }
                }
            } catch (error) {
                console.error('[API] ❌ Error creating PaymentIntent:', error);
                console.error('[API] Error details:', {
                    message: error.message,
                    type: error.type,
                    code: error.code,
                    decline_code: error.decline_code
                });
                return res.status(500).json({ 
                    error: 'Error creating payment intent: ' + error.message 
                });
            }
        } else {
            console.log('[API] ⚠️ Amount not received, PaymentIntent will not be created');
        }

        // Send confirmation emails asynchronously (non-blocking)
        // We do not wait for the response to avoid timeouts
        // EMAIL DISABLED - Commented out per user request
        // console.log('[API] Sending confirmation emails (async)...');
        // sendReservationEmail(
        //     reservationData,
        //     customerData,
        //     paymentIntent?.id || null
        // ).then((emailResult) => {
        //     console.log('[API] ✅ Emails sent (async):', emailResult);
        // }).catch((emailError) => {
        //     console.warn('[API] ⚠️ Error sending emails (non-critical, async):', emailError);
        //     // Do not fail the reservation if email fails
        // });
        console.log('[API] ℹ️ Email notification disabled');

        // Here you can save to the database
        // Ejemplo:
        // await saveReservation({
        //     paymentIntentId: paymentIntent?.id,
        //     customerId: customer?.id,
        //     status: paymentIntent ? 'pending' : 'confirmed',
        //     ...reservationData,
        //     ...customerData
        // });

        // Response
        console.log('[API] Preparing response...');
        if (paymentIntent) {
            const response = {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                customerId: customer.id,
            };
            console.log('[API] ✅ Successful response with PaymentIntent:', {
                paymentIntentId: response.paymentIntentId,
                customerId: response.customerId,
                hasClientSecret: !!response.clientSecret
            });
            return res.json(response);
        } else {
            const response = {
                success: true,
                message: 'Reservation created successfully',
            };
            console.log('[API] ✅ Successful response without PaymentIntent');
            return res.json(response);
        }

    } catch (error) {
        console.error('[API] ❌ GENERAL ERROR:', error);
        console.error('[API] Stack trace:', error.stack);
        return res.status(500).json({ 
            error: 'Error processing reservation: ' + error.message 
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
            console.error('[API CONFIRM] ❌ PaymentIntentId required');
            return res.status(400).json({ 
                error: 'Payment Intent ID is required' 
            });
        }

        // Check payment status
        console.log('[API CONFIRM] Retrieving PaymentIntent from Stripe...');
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log('[API CONFIRM] PaymentIntent retrieved:', {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
        });

        if (paymentIntent.status === 'succeeded') {
            console.log('[API CONFIRM] ✅ Payment successful, sending emails...');
            
            // Prepare reservation data (use provided data or PaymentIntent metadata)
            let finalReservationData = reservationData || {
                car: paymentIntent.metadata.car,
                days: parseInt(paymentIntent.metadata.days) || 1,
                startDate: paymentIntent.metadata.startDate,
                endDate: paymentIntent.metadata.endDate,
                pricePerDay: parseFloat(paymentIntent.metadata.pricePerDay) || 0,
                pickupLocation: paymentIntent.metadata.pickupLocation,
            };
            
            // Calculate total if not provided
            if (!finalReservationData.total && finalReservationData.pricePerDay && finalReservationData.days) {
                const calculatedTotal = (parseFloat(finalReservationData.pricePerDay) * parseInt(finalReservationData.days)).toFixed(2);
                finalReservationData.total = calculatedTotal + ' €';
            }
            
            // Prepare customer data (use provided data or PaymentIntent metadata)
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
                        finalCustomerData.postalCode = customer.address?.postal_code || '';
                        finalCustomerData.country = customer.address?.country || '';
                        finalCustomerData.dni = customer.metadata?.dni || '';
                    }
                } catch (customerError) {
                    console.warn('[API CONFIRM] ⚠️ Error fetching customer data:', customerError);
                }
            }
            
            // Send confirmation emails
            console.log('[API CONFIRM] Sending confirmation emails...');
            console.log('[API CONFIRM] Calling sendReservationEmail with data:', {
                reservationData: finalReservationData,
                customerData: {
                    name: finalCustomerData.name || finalCustomerData.fullName,
                    email: finalCustomerData.email,
                    hasEmail: !!finalCustomerData.email
                },
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
                console.log('[API CONFIRM] ✅ Email send result:', emailResult);
            } catch (emailErr) {
                emailError = emailErr.message || emailErr.toString();
                console.error('[API CONFIRM] ❌ Error sending emails:', emailError);
                // Do not fail confirmation if email fails; payment already succeeded
            }
            
            console.log('[API CONFIRM] ✅ Confirmation completed');
            return res.json({
                success: true,
                paymentIntentId: paymentIntent.id,
                status: paymentIntent.status,
                emailSent: emailResult?.success || false,
                emailError: emailError,
                message: emailResult?.success ? 'Reservation confirmed and emails sent' : (emailError ? 'Reservation confirmed but email failed' : 'Reservation confirmed')
            });
        } else {
            console.log('[API CONFIRM] ⚠️ Payment not completed, status:', paymentIntent.status);
            return res.json({
                success: false,
                paymentIntentId: paymentIntent.id,
                status: paymentIntent.status,
                message: 'Payment has not been completed yet',
            });
        }
    } catch (error) {
        console.error('[API CONFIRM] ❌ ERROR:', error);
        console.error('[API CONFIRM] Stack trace:', error.stack);
        return res.status(500).json({ 
            error: 'Error confirming reservation: ' + error.message 
        });
    }
});

// GET /api/reserve/:paymentIntentId - Get reservation status
router.get('/:paymentIntentId', async (req, res) => {
    try {
        const { paymentIntentId } = req.params;

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        return res.json({
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata,
        });
    } catch (error) {
        console.error('Error retrieving reservation:', error);
        return res.status(500).json({ 
            error: 'Error retrieving reservation: ' + error.message 
        });
    }
});

module.exports = router;
