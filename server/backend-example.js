// Backend para Stripe - Node.js/Express
// Dynasty Prestige - API Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
    EMAIL_CONFIG,
    createEmailTransporter,
    getEmailDiagnostics,
    isEmailConfigured
} = require('./email-config');
const {
    buildReservationId,
    saveReservationRecord
} = require('./reservation-store');
const {
    clearAdminSessionCookie,
    createAdminSessionToken,
    getAdminConfig,
    getAdminSessionFromRequest,
    requireAdminSession,
    setAdminSessionCookie,
    verifyAdminCredentials
} = require('./admin-auth');
const {
    renderAdminLoginPage,
    renderAdminReservationsPage
} = require('./admin-pages');
const {
    createAdminReservationsRouter
} = require('./admin-reservations');

const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes('tu_clave')
);

// Verify Stripe configuration
if (!stripeConfigured) {
    console.error('\n[ERROR] STRIPE_SECRET_KEY is not configured');
    console.error('   Configure your secret key in Railway > Variables');
    console.error('   Get your key at: https://dashboard.stripe.com/apikeys\n');
    console.warn('[BACKEND] Stripe-dependent routes will return 503 until configured.');
}

// Initialize Stripe.
const stripe = stripeConfigured
    ? require('stripe')(process.env.STRIPE_SECRET_KEY, {
        timeout: 30000,
        maxNetworkRetries: 2
    })
    : null;

const app = express();

// Import reservation routes
let reserveRoutes;
try {
    reserveRoutes = require('../app/api/reserve/route');
    console.log('[OK] Reservation routes loaded');
} catch (error) {
    console.error('[WARN] Error loading routes:', error.message);
    reserveRoutes = express.Router();
}

// Email configuration (contact form only)
const emailTransporter = createEmailTransporter();

// Verificar email (no bloqueante)
if (isEmailConfigured()) {
    emailTransporter.verify((error) => {
        if (error) {
            console.warn('[WARN] Email no configurado correctamente');
        } else {
            console.log('[OK] Email configurado:', EMAIL_CONFIG.user);
        }
    });
}

function maskEmail(email) {
    if (!email || typeof email !== 'string') return null;
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return '[redacted-email]';
    const visibleLocal = localPart.slice(0, 2);
    return `${visibleLocal}${'*'.repeat(Math.max(localPart.length - 2, 1))}@${domain}`;
}

function parseNumericValue(value) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = typeof value === 'number'
        ? value
        : Number.parseFloat(String(value).replace(/[^0-9.-]+/g, ''));

    return Number.isFinite(parsed) ? parsed : null;
}

function stableReservationIdFromPaymentIntent(paymentIntent) {
    return paymentIntent.metadata?.reservationId ||
        `res_${String(paymentIntent.id || buildReservationId()).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

function buildReservationRecordFromPaymentIntent(paymentIntent, status, source = 'stripe_webhook') {
    const metadata = paymentIntent.metadata || {};
    const reservationId = stableReservationIdFromPaymentIntent(paymentIntent);
    const stripeCustomerId = typeof paymentIntent.customer === 'string'
        ? paymentIntent.customer
        : paymentIntent.customer?.id || null;

    return {
        reservationId,
        paymentIntentId: paymentIntent.id,
        stripeCustomerId,
        status,
        source,
        customerData: {
            name: metadata.customerName || null,
            email: metadata.customerEmail || null
        },
        reservationData: {
            reservationId,
            car: metadata.car || null,
            days: parseNumericValue(metadata.days),
            startDate: metadata.startDate || null,
            endDate: metadata.endDate || null,
            pickupTime: metadata.pickupTime || null,
            dropoffTime: metadata.dropoffTime || null,
            durationHours: parseNumericValue(metadata.durationHours),
            durationLabel: metadata.durationLabel || null,
            pricePerDay: parseNumericValue(metadata.pricePerDay),
            totalAmount: parseNumericValue(metadata.totalAmount),
            total: metadata.totalDisplay || null,
            upfrontAmount: parseNumericValue(metadata.upfrontAmount),
            upfrontDisplay: metadata.upfrontDisplay || null,
            remainingAmount: parseNumericValue(metadata.remainingAmount),
            remainingDisplay: metadata.remainingDisplay || null,
            pickupLocation: metadata.pickupLocation || null,
            currency: (paymentIntent.currency || 'aed').toUpperCase()
        },
        payment: {
            paymentIntentId: paymentIntent.id,
            stripeStatus: paymentIntent.status || null,
            amount: paymentIntent.amount || null,
            currency: paymentIntent.currency || null,
            lastPaymentError: paymentIntent.last_payment_error?.message || null
        }
    };
}

async function persistBackendReservation(record, contextLabel, options = {}) {
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

const exactAllowedOrigins = new Set([
    'https://prestigegoalmotion.com',
    'https://www.prestigegoalmotion.com',
    'https://staging.prestigegoalmotion.com',
    'https://preprod.prestigegoalmotion.com',
    'https://pgm-production.up.railway.app',
    'https://pgm-staging.up.railway.app',
    ...String(process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
]);

function isAllowedOrigin(origin) {
    if (!origin) {
        return true;
    }

    try {
        const url = new URL(origin);
        const hostname = url.hostname.toLowerCase();

        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
            return true;
        }

        if (hostname.endsWith('.vercel.app')) {
            return true;
        }

        return exactAllowedOrigins.has(origin);
    } catch (error) {
        console.warn('[CORS] Invalid origin header received:', origin);
        return false;
    }
}

function setAdminNoIndexHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

async function handleStripeWebhook(req, res) {
    if (!stripe) {
        return res.status(503).send('Stripe is not configured');
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('[WARN] STRIPE_WEBHOOK_SECRET no configurado');
        return res.status(500).send('Webhook secret no configurado');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Error de webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            console.log('[OK] Pago exitoso:', paymentIntent.id);
            console.log('   Cliente:', maskEmail(paymentIntent.metadata.customerEmail));
            console.log('   Vehicle:', paymentIntent.metadata.car);
            console.log('   Monto:', paymentIntent.amount / 100, paymentIntent.currency.toUpperCase());
            await persistBackendReservation(
                buildReservationRecordFromPaymentIntent(paymentIntent, 'confirmed', 'stripe_webhook'),
                'stripe webhook payment succeeded'
            );
            break;
        }
        case 'payment_intent.payment_failed': {
            const failedPayment = event.data.object;
            console.log('[ERROR] Pago fallido:', failedPayment.id);
            console.log('   Reason:', failedPayment.last_payment_error?.message || 'Unknown');
            await persistBackendReservation(
                buildReservationRecordFromPaymentIntent(failedPayment, 'payment_failed', 'stripe_webhook'),
                'stripe webhook payment failed'
            );
            break;
        }
        case 'payment_intent.canceled':
            console.log('[INFO] Pago cancelado:', event.data.object.id);
            await persistBackendReservation(
                buildReservationRecordFromPaymentIntent(event.data.object, 'payment_canceled', 'stripe_webhook'),
                'stripe webhook payment canceled'
            );
            break;
        case 'payment_intent.requires_action':
            console.log('[WARN] Payment requires action:', event.data.object.id);
            await persistBackendReservation(
                buildReservationRecordFromPaymentIntent(event.data.object, 'payment_requires_action', 'stripe_webhook'),
                'stripe webhook payment requires action'
            );
            break;
        default:
            console.log(`[INFO] Evento no manejado: ${event.type}`);
    }

    return res.json({ received: true });
}

// Middleware
app.use(cors({
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        console.warn('[CORS] Blocked origin:', origin);
        return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

// Stripe webhook must receive the raw body before the global JSON parser.
app.post('/api/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging de requests (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

// Rutas
app.get('/admin/login.html', (req, res) => {
    setAdminNoIndexHeaders(res);
    const adminConfig = getAdminConfig();
    const session = adminConfig.configured ? getAdminSessionFromRequest(req) : null;

    if (session) {
        return res.redirect('/admin/reservations.html');
    }

    return res.type('html').send(renderAdminLoginPage());
});

app.post('/api/admin/login', (req, res) => {
    setAdminNoIndexHeaders(res);

    const credentialResult = verifyAdminCredentials(req.body || {});
    if (!credentialResult.ok) {
        const isSetupMissing = credentialResult.reason === 'not_configured';
        return res.status(isSetupMissing ? 503 : 401).json({
            error: isSetupMissing
                ? 'Admin access is not configured yet'
                : 'Invalid admin credentials'
        });
    }

    const token = createAdminSessionToken(credentialResult.user);
    setAdminSessionCookie(res, token);

    return res.json({
        ok: true,
        user: credentialResult.user
    });
});

app.post('/api/admin/logout', (req, res) => {
    setAdminNoIndexHeaders(res);
    clearAdminSessionCookie(res);
    res.json({ ok: true });
});

app.get('/api/admin/session', (req, res) => {
    setAdminNoIndexHeaders(res);
    const adminConfig = getAdminConfig();

    if (!adminConfig.configured) {
        return res.json({
            authenticated: false,
            configured: false
        });
    }

    const session = getAdminSessionFromRequest(req);
    return res.status(session ? 200 : 401).json({
        authenticated: Boolean(session),
        configured: true,
        user: session?.user || null,
        expiresAt: session?.expiresAt || null
    });
});

app.get('/admin/reservations.html', requireAdminSession({ redirectToLogin: true }), (req, res) => {
    setAdminNoIndexHeaders(res);
    res.type('html').send(renderAdminReservationsPage());
});

app.use('/api/admin', requireAdminSession(), createAdminReservationsRouter());

app.use('/api/reserve', reserveRoutes);

// Compatibility endpoint for creating a Stripe payment intent.
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe is not configured on this server' });
        }

        const { amount, currency, paymentMethodId, customerData, reservationData } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Amount is required and must be greater than 0' });
        }

        if (!customerData?.email) {
            return res.status(400).json({ error: 'Customer data is required' });
        }

        if (!reservationData?.car) {
            return res.status(400).json({ error: 'Reservation data is required' });
        }

        const reservationId = reservationData.reservationId || buildReservationId();
        reservationData.reservationId = reservationId;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerData.email)) {
            return res.status(400).json({ error: 'The provided email is not valid' });
        }

        await persistBackendReservation({
            reservationId,
            status: 'checkout_started',
            source: 'legacy_payment_intent_endpoint',
            customerData,
            reservationData,
            payment: {
                amount: Math.round(amount),
                currency: (currency || 'aed').toLowerCase()
            }
        }, 'legacy checkout started', { critical: true });

        // Create or retrieve customer
        let customer;
        try {
            const existingCustomers = await stripe.customers.list({
                email: customerData.email,
                limit: 1
            });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
                if (customerData.name || customerData.phone || customerData.address) {
                    await stripe.customers.update(customer.id, {
                        name: customerData.name || customer.name,
                        phone: customerData.phone || customer.phone,
                        address: {
                            line1: customerData.address || customer.address?.line1,
                            city: customerData.city || customer.address?.city,
                            country: customerData.country || customer.address?.country || 'ES',
                        },
                        metadata: { dni: customerData.dni || customer.metadata?.dni || '' }
                    });
                }
            } else {
                customer = await stripe.customers.create({
                    email: customerData.email,
                    name: customerData.name,
                    phone: customerData.phone,
                    address: {
                        line1: customerData.address,
                        city: customerData.city,
                        country: customerData.country || 'ES',
                    },
                    metadata: { dni: customerData.dni || '' }
                });
            }
        } catch (customerError) {
            console.error('Error processing customer:', customerError);
            await persistBackendReservation({
                reservationId,
                status: 'customer_processing_failed',
                customerData,
                reservationData,
                payment: {
                    error: customerError.message
                }
            }, 'legacy stripe customer failure');
            return res.status(500).json({ error: 'Error processing customer data' });
        }

        // Create the Stripe payment intent.
        const paymentIntentParams = {
            amount: Math.round(amount),
            currency: (currency || 'aed').toLowerCase(),
            customer: customer.id,
            confirmation_method: 'manual',
            confirm: false,
            description: `Reservation: ${reservationData.car} - ${reservationData.days} days`,
            metadata: {
                reservationId,
                car: reservationData.car,
                days: reservationData.days.toString(),
                startDate: reservationData.startDate,
                endDate: reservationData.endDate,
                pricePerDay: reservationData.pricePerDay.toString(),
                customerName: customerData.name,
                customerEmail: customerData.email,
            },
            payment_method_types: ['card'],
            payment_method_options: {
                link: { persistent_token: null }
            }
        };

        if (paymentMethodId) {
            paymentIntentParams.payment_method = paymentMethodId;
        }

        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        await persistBackendReservation({
            reservationId,
            paymentIntentId: paymentIntent.id,
            stripeCustomerId: customer.id,
            status: 'payment_intent_created',
            source: 'legacy_payment_intent_endpoint',
            customerData,
            reservationData,
            payment: {
                paymentIntentId: paymentIntent.id,
                stripeStatus: paymentIntent.status,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency
            }
        }, 'legacy payment intent created', { critical: true });

        res.json({
            reservationId,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            customerId: customer.id,
        });

    } catch (error) {
        console.error('Error creating PaymentIntent:', error);
        
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ error: 'Card error: ' + error.message });
        } else if (error.type === 'StripeRateLimitError') {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        } else if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ error: 'Invalid request: ' + error.message });
        } else if (error.type === 'StripeAPIError') {
            return res.status(500).json({ error: 'Stripe server error' });
        }
        
        res.status(500).json({ error: error.message || 'Error processing payment' });
    }
});

// Compatibility endpoint for confirming a Stripe payment intent.
app.post('/api/confirm-payment-intent', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe is not configured on this server' });
        }

        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ error: 'paymentIntentId is required' });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        res.json({
            status: paymentIntent.status,
            paymentIntent: paymentIntent
        });
    } catch (error) {
        console.error('Error confirming PaymentIntent:', error);
        res.status(500).json({ error: error.message || 'Error confirming payment' });
    }
});

// Endpoint deshabilitado (emails desactivados)
app.post('/api/send-confirmation-email', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Endpoint disabled - emails are not sent' 
    });
});

// Function to send contact form email
async function sendContactEmail(contactData) {
    const companyEmail = 'prestigegoalmotion@gmail.com';
    
    if (!isEmailConfigured()) {
        if (EMAIL_CONFIG.logOnlyInDevelopment) {
            console.info('[CONTACT] Email delivery disabled in this environment. Logging message only.', {
                name: contactData.name,
                email: maskEmail(contactData.email),
                subject: contactData.subject
            });
            return { loggedOnly: true };
        }

        throw new Error('Contact email transport is not configured');
    }
    
    const subjectLabels = {
        reservation: 'Reservation Inquiry',
        fleet: 'Fleet Information',
        price: 'Pricing Inquiry',
        event: 'Corporate Events',
        other: 'Other'
    };

    const subjectLabel = subjectLabels[contactData.subject] || contactData.subject;

    const emailHtml = `
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
                .message-box { background: white; padding: 15px; margin: 20px 0; border-left: 3px solid #d6f03c; }
                .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New Contact Message</h1>
                </div>
                <div class="content">
                    <h2>Contact Information</h2>
                    <div class="info-row"><span class="label">Name:</span> ${contactData.name}</div>
                    <div class="info-row"><span class="label">Email:</span> <a href="mailto:${contactData.email}">${contactData.email}</a></div>
                    ${contactData.phone ? `<div class="info-row"><span class="label">Phone:</span> <a href="tel:${contactData.phone}">${contactData.phone}</a></div>` : ''}
                    <div class="info-row"><span class="label">Subject:</span> ${subjectLabel}</div>
                    <h2 style="margin-top: 30px;">Message</h2>
                    <div class="message-box">${contactData.message.replace(/\n/g, '<br>')}</div>
                    <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-left: 3px solid #2196f3;">
                        <p style="margin: 0;"><strong>Reply to:</strong> <a href="mailto:${contactData.email}">${contactData.email}</a></p>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated email from the Dynasty Prestige contact form</p>
                    <p>Date: ${new Date().toLocaleString('en-GB')}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const info = await emailTransporter.sendMail({
            from: `"Dynasty Prestige Web" <${EMAIL_CONFIG.from}>`,
            to: companyEmail,
            replyTo: contactData.email,
            subject: `[Dynasty Prestige] ${subjectLabel} - ${contactData.name}`,
            html: emailHtml,
        });
        
        console.log('[OK] Contact email sent:', info.messageId);
        return { loggedOnly: false };
    } catch (error) {
        console.error('[ERROR] Error sending email:', error.message);
        throw error;
    }
}

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'Required fields are missing' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'The provided email is not valid' });
        }

        const contactData = {
            name: name.trim(),
            email: email.trim(),
            phone: phone ? phone.trim() : '',
            subject: subject,
            message: message.trim()
        };

        try {
            const deliveryResult = await sendContactEmail(contactData);
            res.json({ 
                success: true, 
                message: deliveryResult.loggedOnly
                    ? 'Message captured in local mode. Configure SMTP to deliver real emails.'
                    : 'Message sent successfully. We will respond soon.',
                mode: deliveryResult.loggedOnly ? 'development-log-only' : 'email'
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            const statusCode = isEmailConfigured() ? 502 : 503;
            res.status(statusCode).json({ 
                error: isEmailConfigured()
                    ? 'Message could not be delivered right now. Please try again or use WhatsApp.'
                    : 'Contact email is not configured on the server. Set SMTP or EMAIL variables.' 
            });
        }
    } catch (error) {
        console.error('Error processing form:', error);
        res.status(500).json({ error: error.message || 'Error processing the form' });
    }
});


// Endpoints informativos
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Dynasty Prestige - API Server',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            test: '/api/test',
            reserve: '/api/reserve',
            createPaymentIntent: '/api/create-payment-intent',
            confirmPayment: '/api/confirm-payment-intent',
            contact: '/api/contact',
            webhook: '/api/webhook'
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Server running correctly',
        timestamp: new Date().toISOString(),
        server: 'Dynasty Prestige API',
        services: {
            stripeConfigured,
            emailConfigured: isEmailConfigured(),
            contactMode: EMAIL_CONFIG.logOnlyInDevelopment && !isEmailConfigured() ? 'development-log-only' : 'email'
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('DYNASTY PRESTIGE SERVER');
    console.log('='.repeat(60));
    console.log(`[OK] Server running on port ${PORT}`);
    console.log(`[INFO] Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[INFO] URL: http://0.0.0.0:${PORT}`);
    console.log('='.repeat(60));
    console.log('[OK] Server ready to receive requests');
    console.log(`[INFO] PID: ${process.pid}`);
    console.log(`[INFO] Node.js version: ${process.version}`);
    console.log('='.repeat(60) + '\n');
});

server.on('error', (err) => {
    console.error('[ERROR] Server error:', err);
    process.exit(1);
});

// Signal handling
process.on('SIGTERM', () => {
    console.log('[WARN] SIGTERM received, shutting down server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[WARN] SIGINT received, shutting down server...');
    process.exit(0);
});
process.on('uncaughtException', (err) => {
    console.error('[ERROR] Uncaught error:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[ERROR] Unhandled promise rejection:', reason);
});
