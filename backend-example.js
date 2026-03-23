// Backend para Stripe - Node.js/Express
// Dynasty Prestige - API Server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

// Verify Stripe configuration
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('tu_clave')) {
    console.error('\n❌ ERROR: STRIPE_SECRET_KEY is not configured');
    console.error('   Configure your secret key in Railway → Variables');
    console.error('   Get your key at: https://dashboard.stripe.com/apikeys\n');
    process.exit(1);
}

// Inicializar Stripe
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    timeout: 30000,
    maxNetworkRetries: 2
});

const app = express();

// Import reservation routes
let reserveRoutes;
try {
    reserveRoutes = require('./app/api/reserve/route');
    console.log('✅ Reservation routes loaded');
} catch (error) {
    console.error('⚠️ Error loading routes:', error.message);
    reserveRoutes = express.Router();
}

// Email configuration (contact form only)
const EMAIL_CONFIG = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || 'prestigegoalmotion@gmail.com',
    password: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD,
};

const emailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.password,
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
});

// Verificar email (no bloqueante)
if (EMAIL_CONFIG.password) {
    emailTransporter.verify((error) => {
        if (error) {
            console.warn('⚠️ Email no configurado correctamente');
        } else {
            console.log('✅ Email configurado:', EMAIL_CONFIG.user);
        }
    });
}

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

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
app.use('/api/reserve', reserveRoutes);

// Endpoint para crear PaymentIntent (compatibilidad)
app.post('/api/create-payment-intent', async (req, res) => {
    try {
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

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerData.email)) {
            return res.status(400).json({ error: 'The provided email is not valid' });
        }

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
            return res.status(500).json({ error: 'Error processing customer data' });
        }

        // Crear PaymentIntent
        const paymentIntentParams = {
            amount: Math.round(amount),
            currency: (currency || 'aed').toLowerCase(),
            customer: customer.id,
            confirmation_method: 'manual',
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

        res.json({
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

// Endpoint para confirmar PaymentIntent
app.post('/api/confirm-payment-intent', async (req, res) => {
    try {
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
    
    if (!EMAIL_CONFIG.password) {
        throw new Error('Incomplete email configuration');
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
                    <h1>📧 New Contact Message</h1>
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
            from: `"Dynasty Prestige Web" <${EMAIL_CONFIG.user}>`,
            to: companyEmail,
            replyTo: contactData.email,
            subject: `📧 ${subjectLabel} - ${contactData.name}`,
            html: emailHtml,
        });
        
        console.log('✅ Contact email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
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
            await sendContactEmail(contactData);
            res.json({ 
                success: true, 
                message: 'Message sent successfully. We will respond soon.' 
            });
        } catch (emailError) {
            console.error('Error sending email:', emailError);
            res.status(500).json({ 
                error: 'Error sending the message. Please try again.' 
            });
        }
    } catch (error) {
        console.error('Error processing form:', error);
        res.status(500).json({ error: error.message || 'Error processing the form' });
    }
});

// Webhook de Stripe
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET no configurado');
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
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('✅ Pago exitoso:', paymentIntent.id);
            console.log('   Cliente:', paymentIntent.metadata.customerEmail);
            console.log('   Vehicle:', paymentIntent.metadata.car);
            console.log('   Monto:', paymentIntent.amount / 100, paymentIntent.currency.toUpperCase());
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('❌ Pago fallido:', failedPayment.id);
            console.log('   Reason:', failedPayment.last_payment_error?.message || 'Unknown');
            break;

        case 'payment_intent.canceled':
            console.log('🚫 Pago cancelado:', event.data.object.id);
            break;

        case 'payment_intent.requires_action':
            console.log('⚠️ Payment requires action:', event.data.object.id);
            break;

        default:
            console.log(`ℹ️ Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });
});

// Endpoints informativos
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: '🚗 Dynasty Prestige - API Server',
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
        server: 'Dynasty Prestige API'
    });
});

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 SERVIDOR DYNASTY PRESTIGE');
    console.log('='.repeat(60));
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
    console.log('='.repeat(60));
    console.log('✅ Server ready to receive requests');
    console.log(`✅ PID: ${process.pid}`);
    console.log(`✅ Node.js version: ${process.version}`);
    console.log('='.repeat(60) + '\n');
});

server.on('error', (err) => {
    console.error('❌ Server error:', err);
    process.exit(1);
});

// Signal handling
process.on('SIGTERM', () => {
    console.log('⚠️ SIGTERM received, shutting down server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('⚠️ SIGINT received, shutting down server...');
    process.exit(0);
});
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught error:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled promise rejection:', reason);
});