// Ejemplo de Backend para Stripe - Node.js/Express
// Instala las dependencias: npm install express stripe cors dotenv nodemailer

require('dotenv').config();
const express = require('express');

// Verificar que STRIPE_SECRET_KEY estÃ© configurada
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('tu_clave')) {
    console.error('\nâŒ ERROR: STRIPE_SECRET_KEY no estÃ¡ configurada en .env');
    console.error('   Por favor, configura tu clave secreta de Stripe en el archivo .env');
    console.error('   ObtÃ©n tu clave en: https://dashboard.stripe.com/apikeys');
    console.error('   Ver: CONFIGURAR-STRIPE.md para mÃ¡s informaciÃ³n\n');
    process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    timeout: 30000, // 30 segundos para operaciones de Stripe
    maxNetworkRetries: 2 // Reintentar hasta 2 veces en caso de error de red
});
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// Importar rutas de reserva (con manejo de errores)
let reserveRoutes;
try {
    reserveRoutes = require('./app/api/reserve/route');
    console.log('âœ… Rutas de reserva cargadas correctamente');
} catch (error) {
    console.error('âš ï¸ Error al cargar rutas de reserva:', error.message);
    console.error('   El servidor continuarÃ¡ funcionando sin estas rutas');
    // Crear un router vacÃ­o para evitar errores
    const express = require('express');
    reserveRoutes = express.Router();
}

// Configurar transporter de email
// IMPORTANTE: Para Gmail, necesitas una contraseÃ±a de aplicaciÃ³n
// ObtÃ©nla en: https://myaccount.google.com/apppasswords

const EMAIL_CONFIG = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || 'prestigegoalmotion@gmail.com',
    password: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD,
};

// Verificar configuraciÃ³n de email al iniciar
if (!EMAIL_CONFIG.password) {
    console.warn('âš ï¸ ADVERTENCIA: EMAIL_PASSWORD o EMAIL_APP_PASSWORD no estÃ¡ configurado en .env');
    console.warn('   El envÃ­o de emails no funcionarÃ¡ hasta que lo configures.');
    console.warn('   Ver: CONFIGURACION-EMAIL.md para mÃ¡s informaciÃ³n');
}

const emailTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true para 465, false para otros puertos
    requireTLS: true,
    auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.password,
    },
    tls: {
        // No fallar en certificados invÃ¡lidos
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 segundos para establecer conexiÃ³n
    greetingTimeout: 10000, // 10 segundos para saludo SMTP
    socketTimeout: 10000, // 10 segundos para operaciones de socket
    // Reintentar conexiÃ³n si falla
    pool: false,
    maxConnections: 1,
    maxMessages: 3
});

// Verificar conexiÃ³n con el servidor de email (no bloqueante)
// Hacer esto de forma asÃ­ncrona para no bloquear el inicio del servidor
emailTransporter.verify(function(error, success) {
    if (error) {
        console.error('âŒ Error al verificar conexiÃ³n con servidor de email:', error.message);
        console.error('   Verifica tu configuraciÃ³n en .env (EMAIL_USER y EMAIL_APP_PASSWORD)');
        console.error('   El servidor continuarÃ¡ funcionando, pero los emails pueden fallar');
    } else {
        console.log('âœ… Servidor de email configurado correctamente');
        console.log('   Email de envÃ­o:', EMAIL_CONFIG.user);
    }
});


// Middleware
// Configurar CORS para permitir todas las conexiones (desarrollo)
app.use(cors({
    origin: '*', // En producciÃ³n, especifica el dominio exacto
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Middleware para logging de requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Usar rutas de reserva
app.use('/api/reserve', reserveRoutes);

// Endpoint para crear PaymentIntent (mantener para compatibilidad)
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { 
            amount, 
            currency, 
            paymentMethodId, 
            customerData, 
            reservationData 
        } = req.body;

        // ValidaciÃ³n bÃ¡sica
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                error: 'El monto es requerido y debe ser mayor a 0' 
            });
        }

        if (!customerData || !customerData.email) {
            return res.status(400).json({ 
                error: 'Los datos del cliente son requeridos' 
            });
        }

        if (!reservationData || !reservationData.car) {
            return res.status(400).json({ 
                error: 'Los datos de la reserva son requeridos' 
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customerData.email)) {
            return res.status(400).json({ 
                error: 'El email proporcionado no es vÃ¡lido' 
            });
        }

        // Crear o recuperar cliente en Stripe
        let customer;
        try {
            // Buscar cliente existente por email
            const existingCustomers = await stripe.customers.list({
                email: customerData.email,
                limit: 1
            });

            if (existingCustomers.data.length > 0) {
                customer = existingCustomers.data[0];
                // Actualizar informaciÃ³n del cliente si es necesario
                if (customerData.name || customerData.phone || customerData.address) {
                    await stripe.customers.update(customer.id, {
                        name: customerData.name || customer.name,
                        phone: customerData.phone || customer.phone,
                        address: {
                            line1: customerData.address || customer.address?.line1,
                            city: customerData.city || customer.address?.city,
                            postal_code: customerData.postalCode || customer.address?.postal_code,
                            country: customerData.country || customer.address?.country || 'ES',
                        },
                        metadata: {
                            dni: customerData.dni || customer.metadata?.dni || '',
                        }
                    });
                }
            } else {
                // Crear nuevo cliente
                customer = await stripe.customers.create({
                    email: customerData.email,
                    name: customerData.name,
                    phone: customerData.phone,
                    address: {
                        line1: customerData.address,
                        city: customerData.city,
                        postal_code: customerData.postalCode,
                        country: customerData.country || 'ES',
                    },
                    metadata: {
                        dni: customerData.dni || '',
                    }
                });
            }
        } catch (customerError) {
            console.error('Error al crear/actualizar cliente:', customerError);
            return res.status(500).json({ 
                error: 'Error al procesar los datos del cliente: ' + customerError.message 
            });
        }

        // Preparar objeto PaymentIntent
        const paymentIntentParams = {
            amount: Math.round(amount), // Asegurar que sea un entero (centavos)
            currency: (currency || 'eur').toLowerCase(),
            customer: customer.id,
            confirmation_method: 'manual',
            confirm: false,
            description: `Reserva: ${reservationData.car} - ${reservationData.days} dÃ­as`,
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
            // Habilitar Link de Stripe
            payment_method_options: {
                link: {
                    persistent_token: null, // Se puede usar para recordar tarjetas
                }
            }
        };

        // Si se proporciona paymentMethodId, agregarlo (para pagos con tarjeta directa)
        if (paymentMethodId) {
            paymentIntentParams.payment_method = paymentMethodId;
        }

        // Crear PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

        // AquÃ­ podrÃ­as guardar la reserva en tu base de datos
        // con estado "pendiente" hasta que se confirme el pago
        // Ejemplo:
        // await saveReservation({
        //     paymentIntentId: paymentIntent.id,
        //     customerId: customer.id,
        //     status: 'pending',
        //     ...reservationData,
        //     ...customerData
        // });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            customerId: customer.id,
        });

    } catch (error) {
        console.error('Error al crear PaymentIntent:', error);
        
        // Manejar errores especÃ­ficos de Stripe
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ 
                error: 'Error con la tarjeta: ' + error.message 
            });
        } else if (error.type === 'StripeRateLimitError') {
            return res.status(429).json({ 
                error: 'Demasiadas solicitudes. Por favor, intenta de nuevo mÃ¡s tarde.' 
            });
        } else if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ 
                error: 'Solicitud invÃ¡lida: ' + error.message 
            });
        } else if (error.type === 'StripeAPIError') {
            return res.status(500).json({ 
                error: 'Error del servidor de Stripe. Por favor, intenta de nuevo mÃ¡s tarde.' 
            });
        }
        
        res.status(500).json({ 
            error: error.message || 'Error al procesar el pago' 
        });
    }
});

// Endpoint para confirmar un PaymentIntent (Ãºtil para pagos con autenticaciÃ³n adicional)
app.post('/api/confirm-payment-intent', async (req, res) => {
    try {
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ 
                error: 'paymentIntentId es requerido' 
            });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Si el pago fue exitoso, enviar emails
        if (paymentIntent.status === 'succeeded') {
            const reservationData = {
                car: paymentIntent.metadata.car,
                days: parseInt(paymentIntent.metadata.days),
                startDate: paymentIntent.metadata.startDate,
                endDate: paymentIntent.metadata.endDate,
                pricePerDay: parseFloat(paymentIntent.metadata.pricePerDay),
            };

            const customerData = {
                name: paymentIntent.metadata.customerName,
                email: paymentIntent.metadata.customerEmail,
                phone: '',
                dni: '',
                address: '',
                city: '',
                postalCode: '',
                country: 'ES',
            };

            // Obtener datos adicionales del cliente
            try {
                if (paymentIntent.customer) {
                    const customer = await stripe.customers.retrieve(paymentIntent.customer);
                    customerData.phone = customer.phone || '';
                    customerData.address = customer.address?.line1 || '';
                    customerData.city = customer.address?.city || '';
                    customerData.postalCode = customer.address?.postal_code || '';
                    customerData.country = customer.address?.country || 'ES';
                    customerData.dni = customer.metadata?.dni || '';
                }
            } catch (customerError) {
                console.warn('No se pudieron obtener datos adicionales del cliente:', customerError.message);
            }

            // Enviar emails (no esperar para no bloquear la respuesta)
            // EMAIL DESHABILITADO - Comentado por solicitud del usuario
            // sendReservationEmail(reservationData, customerData, paymentIntent.id).catch(err => {
            //     console.error('Error al enviar emails (no crÃ­tico):', err);
            // });
            console.log('â„¹ï¸ NotificaciÃ³n de email deshabilitada');
        }
        
        res.json({
            status: paymentIntent.status,
            paymentIntent: paymentIntent
        });
    } catch (error) {
        console.error('Error al confirmar PaymentIntent:', error);
        res.status(500).json({ 
            error: error.message || 'Error al confirmar el pago' 
        });
    }
});

// Endpoint para enviar email de confirmaciÃ³n manualmente
app.post('/api/send-confirmation-email', async (req, res) => {
    try {
        const { paymentIntentId, reservationData, customerData } = req.body;

        if (!paymentIntentId || !reservationData || !customerData) {
            return res.status(400).json({ 
                error: 'Faltan datos requeridos' 
            });
        }

        // EMAIL DESHABILITADO - Comentado por solicitud del usuario
        // const emailSent = await sendReservationEmail(reservationData, customerData, paymentIntentId);
        
        // if (emailSent) {
        //     res.json({ 
        //         success: true, 
        //         message: 'Emails enviados correctamente' 
        //     });
        // } else {
        //     res.status(500).json({ 
        //         error: 'Error al enviar los emails' 
        //     });
        // }
        console.log('â„¹ï¸ NotificaciÃ³n de email deshabilitada');
        res.json({ 
            success: true, 
            message: 'Endpoint deshabilitado - emails no se envÃ­an' 
        });
    } catch (error) {
        console.error('Error al enviar email:', error);
        res.status(500).json({ 
            error: error.message || 'Error al enviar el email' 
        });
    }
});

// FunciÃ³n para enviar email del formulario de contacto
async function sendContactEmail(contactData) {
    // SIEMPRE enviar a prestigegoalmotion@gmail.com
    const companyEmail = 'prestigegoalmotion@gmail.com';
    
    // Verificar que tenemos la configuraciÃ³n de email
    if (!EMAIL_CONFIG.password) {
        console.error('âŒ No se puede enviar email: EMAIL_PASSWORD no configurado');
        throw new Error('ConfiguraciÃ³n de email incompleta. Verifica tu archivo .env');
    }
    
    const subjectLabels = {
        'reserva': 'Consulta sobre Reserva',
        'flota': 'InformaciÃ³n sobre Flota',
        'precio': 'Consulta de Precios',
        'evento': 'Eventos Corporativos',
        'otro': 'Otro'
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
                .header { background: #0a0a0a; color: #d4af37; padding: 20px; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; margin-top: 20px; }
                .info-row { margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #d4af37; }
                .label { font-weight: bold; color: #0a0a0a; }
                .message-box { background: white; padding: 15px; margin: 20px 0; border-left: 3px solid #d4af37; }
                .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>ðŸ“§ Nuevo Mensaje de Contacto</h1>
                </div>
                <div class="content">
                    <h2>InformaciÃ³n del Contacto</h2>
                    
                    <div class="info-row">
                        <span class="label">Nombre:</span> ${contactData.name}
                    </div>
                    <div class="info-row">
                        <span class="label">Email:</span> <a href="mailto:${contactData.email}">${contactData.email}</a>
                    </div>
                    ${contactData.phone ? `
                    <div class="info-row">
                        <span class="label">TelÃ©fono:</span> <a href="tel:${contactData.phone}">${contactData.phone}</a>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <span class="label">Asunto:</span> ${subjectLabel}
                    </div>
                    
                    <h2 style="margin-top: 30px;">Mensaje</h2>
                    <div class="message-box">
                        ${contactData.message.replace(/\n/g, '<br>')}
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-left: 3px solid #2196f3;">
                        <p style="margin: 0;"><strong>Responder a:</strong> <a href="mailto:${contactData.email}">${contactData.email}</a></p>
                    </div>
                </div>
                <div class="footer">
                    <p>Este es un email automÃ¡tico del formulario de contacto de Prestige Goal Motion</p>
                    <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        const mailOptions = {
            from: `"Prestige Goal Motion Web" <${EMAIL_CONFIG.user}>`,
            to: companyEmail, // SIEMPRE a prestigegoalmotion@gmail.com
            replyTo: contactData.email, // Permite responder directamente al cliente
            subject: `ðŸ“§ ${subjectLabel} - ${contactData.name}`,
            html: emailHtml,
        };

        const info = await emailTransporter.sendMail(mailOptions);
        
        console.log('âœ… Email de contacto enviado correctamente');
        console.log('   De:', contactData.name, `<${contactData.email}>`);
        console.log('   Para:', companyEmail);
        console.log('   Asunto:', mailOptions.subject);
        console.log('   Message ID:', info.messageId);
        
        return true;
    } catch (error) {
        console.error('âŒ Error al enviar email de contacto:', error.message);
        console.error('   CÃ³digo de error:', error.code);
        console.error('   Detalles completos:', error);
        
        // Proporcionar mensajes de error mÃ¡s especÃ­ficos
        if (error.code === 'EAUTH') {
            console.error('   Problema de autenticaciÃ³n. Verifica EMAIL_USER y EMAIL_APP_PASSWORD');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.message.includes('ETIMEDOUT')) {
            console.error('   âš ï¸ Timeout al conectar con el servidor de email');
            console.error('   Posibles causas:');
            console.error('   1. Firewall bloqueando la conexiÃ³n SMTP (puerto 587)');
            console.error('   2. Problemas de red o conexiÃ³n a internet');
            console.error('   3. Gmail bloqueando la conexiÃ³n (verifica que la App Password sea correcta)');
            console.error('   4. El servidor SMTP de Gmail estÃ¡ temporalmente no disponible');
        } else if (error.code === 'ESOCKET' || error.message.includes('socket')) {
            console.error('   Error de socket. Verifica tu conexiÃ³n a internet');
        }
        
        throw error; // Re-lanzar para que el endpoint pueda manejarlo
    }
}

// Endpoint para el formulario de contacto
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // ValidaciÃ³n
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios' 
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'El email proporcionado no es vÃ¡lido' 
            });
        }

        const contactData = {
            name: name.trim(),
            email: email.trim(),
            phone: phone ? phone.trim() : '',
            subject: subject,
            message: message.trim()
        };

        try {
            const emailSent = await sendContactEmail(contactData);
            
            if (emailSent) {
                res.json({ 
                    success: true, 
                    message: 'Mensaje enviado exitosamente a prestigegoalmotion@gmail.com. Te responderemos pronto.' 
                });
            } else {
                res.status(500).json({ 
                    error: 'Error al enviar el mensaje. Por favor, intenta de nuevo.' 
                });
            }
        } catch (emailError) {
            console.error('Error detallado al enviar email:', emailError);
            
            // Mensajes de error mÃ¡s especÃ­ficos para el cliente
            let errorMessage = 'Error al enviar el mensaje. ';
            
            if (emailError.message.includes('EAUTH') || emailError.message.includes('autenticaciÃ³n')) {
                errorMessage += 'Error de configuraciÃ³n del servidor de email.';
            } else if (emailError.message.includes('ECONNECTION') || 
                       emailError.message.includes('ETIMEDOUT') || 
                       emailError.code === 'ETIMEDOUT' ||
                       emailError.code === 'ECONNECTION') {
                errorMessage += 'No se pudo conectar con el servidor de email. ';
                errorMessage += 'Por favor, verifica tu conexiÃ³n a internet e intenta de nuevo.';
            } else if (emailError.message.includes('ESOCKET') || emailError.message.includes('socket')) {
                errorMessage += 'Error de conexiÃ³n. Por favor, intenta de nuevo.';
            } else {
                errorMessage += emailError.message || 'Por favor, intenta de nuevo mÃ¡s tarde.';
            }
            
            res.status(500).json({ 
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? emailError.message : undefined
            });
        }
    } catch (error) {
        console.error('Error al procesar formulario de contacto:', error);
        res.status(500).json({ 
            error: error.message || 'Error al procesar el formulario' 
        });
    }
});

// Webhook para confirmar pagos exitosos
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('âš ï¸ STRIPE_WEBHOOK_SECRET no configurado. Los webhooks no funcionarÃ¡n correctamente.');
        return res.status(500).send('Webhook secret no configurado');
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('Error de webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Manejar diferentes tipos de eventos
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('âœ… Pago exitoso:', paymentIntent.id);
            console.log('   Cliente:', paymentIntent.metadata.customerEmail);
            console.log('   VehÃ­culo:', paymentIntent.metadata.car);
            console.log('   Monto:', paymentIntent.amount / 100, paymentIntent.currency.toUpperCase());
            
            // Preparar datos para el email
            const reservationData = {
                car: paymentIntent.metadata.car,
                days: parseInt(paymentIntent.metadata.days),
                startDate: paymentIntent.metadata.startDate,
                endDate: paymentIntent.metadata.endDate,
                pricePerDay: parseFloat(paymentIntent.metadata.pricePerDay),
            };

            const customerData = {
                name: paymentIntent.metadata.customerName,
                email: paymentIntent.metadata.customerEmail,
                phone: '', // No estÃ¡ en metadata, se puede obtener del customer
                dni: '',
                address: '',
                city: '',
                postalCode: '',
                country: 'ES',
            };

            // Intentar obtener mÃ¡s datos del cliente desde Stripe
            try {
                if (paymentIntent.customer) {
                    const customer = await stripe.customers.retrieve(paymentIntent.customer);
                    customerData.phone = customer.phone || '';
                    customerData.address = customer.address?.line1 || '';
                    customerData.city = customer.address?.city || '';
                    customerData.postalCode = customer.address?.postal_code || '';
                    customerData.country = customer.address?.country || 'ES';
                    customerData.dni = customer.metadata?.dni || '';
                }
            } catch (customerError) {
                console.warn('No se pudieron obtener datos adicionales del cliente:', customerError.message);
            }

            // Enviar emails de confirmaciÃ³n
            // EMAIL DESHABILITADO - Comentado por solicitud del usuario
            // await sendReservationEmail(reservationData, customerData, paymentIntent.id);
            console.log('â„¹ï¸ NotificaciÃ³n de email deshabilitada - Webhook');
            
            // AquÃ­ guardarÃ­as la reserva como confirmada en tu base de datos
            // Ejemplo:
            // await saveReservationToDatabase({
            //     paymentIntentId: paymentIntent.id,
            //     customerId: paymentIntent.customer,
            //     status: 'confirmed',
            //     ...reservationData,
            //     ...customerData
            // });
            
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('âŒ Pago fallido:', failedPayment.id);
            console.log('   RazÃ³n:', failedPayment.last_payment_error?.message || 'Desconocida');
            
            // AquÃ­ podrÃ­as notificar al cliente o actualizar el estado de la reserva
            // Ejemplo:
            // await updateReservationStatus(failedPayment.id, 'failed');
            // await sendFailureEmail(failedPayment.metadata.customerEmail, failedPayment);
            
            break;

        case 'payment_intent.canceled':
            const canceledPayment = event.data.object;
            console.log('ðŸš« Pago cancelado:', canceledPayment.id);
            
            // Actualizar estado de la reserva
            // await updateReservationStatus(canceledPayment.id, 'canceled');
            
            break;

        case 'payment_intent.requires_action':
            const requiresAction = event.data.object;
            console.log('âš ï¸ Pago requiere acciÃ³n adicional:', requiresAction.id);
            // El cliente necesita completar una acciÃ³n (ej: 3D Secure)
            
            break;

        default:
            console.log(`â„¹ï¸ Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });
});

// Ruta raÃ­z - InformaciÃ³n del servidor
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'ðŸš— Prestige Goal Motion - API Server',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            test: '/api/test',
            reserve: '/api/reserve',
            createPaymentIntent: '/api/create-payment-intent',
            confirmPayment: '/api/confirm-payment-intent',
            sendEmail: '/api/send-confirmation-email',
            contact: '/api/contact',
            webhook: '/api/webhook'
        },
        timestamp: new Date().toISOString()
    });
});

// Endpoint de salud (opcional)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint de prueba para verificar que el servidor funciona
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        server: 'Prestige Goal Motion API'
    });
});

const PORT = process.env.PORT || 3000;

console.log('ðŸ”§ Preparando para iniciar servidor en puerto:', PORT);
console.log('ðŸ”§ Escuchando en: 0.0.0.0');

// Escuchar en 0.0.0.0 para aceptar conexiones externas (necesario para Railway)
try {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log('\n' + '='.repeat(60));
        console.log('ðŸš€ SERVIDOR PRESTIGE GOAL MOTION');
        console.log('='.repeat(60));
        console.log(`âœ… Servidor corriendo en puerto ${PORT}`);
        console.log(`ðŸ“§ Email configurado: ${EMAIL_CONFIG.user}`);
        console.log(`ðŸ”§ Modo: ${process.env.NODE_ENV || 'development'}`);
        console.log(`ðŸŒ URL: http://0.0.0.0:${PORT}`);
        console.log(`ðŸ“¬ Endpoint de contacto: http://0.0.0.0:${PORT}/api/contact`);
        console.log(`ðŸ’³ Endpoint de pagos: http://0.0.0.0:${PORT}/api/create-payment-intent`);
        console.log('='.repeat(60));
        
        try {
            // Verificar configuraciÃ³n de email
            if (!EMAIL_CONFIG.password) {
                console.log('\nâš ï¸  ADVERTENCIA: Email no configurado');
                console.log('   Configura EMAIL_APP_PASSWORD en tu archivo .env');
                console.log('   Ver: CONFIGURACION-EMAIL.md');
            } else {
                console.log('âœ… Email configurado correctamente');
            }
            
            console.log('='.repeat(60));
            console.log('âœ… Servidor listo para recibir peticiones');
            console.log('âœ… Proceso PID:', process.pid);
            console.log('âœ… Node.js versiÃ³n:', process.version);
            console.log('âœ… Plataforma:', process.platform);
            console.log('='.repeat(60) + '\n');
            
            
        } catch (callbackError) {
            console.error('âŒ Error en callback de app.listen():', callbackError);
            console.error('   Stack:', callbackError.stack);
        }
    });
    
    server.on('error', (err) => {
        console.error('âŒ Error en el servidor:', err);
        console.error('   Stack:', err.stack);
        process.exit(1);
    });
    
    server.on('listening', () => {
        console.log('âœ… Servidor escuchando en puerto:', PORT);
    });
    
    console.log('âœ… app.listen() llamado, esperando callback...');
} catch (listenError) {
    console.error('âŒ Error al llamar app.listen():', listenError);
    console.error('   Stack:', listenError.stack);
    process.exit(1);
}

// Manejar errores no capturados (pero no terminar el proceso)
process.on('uncaughtException', (err) => {
    console.error('âŒ Error no capturado:', err);
    console.error('   Stack:', err.stack);
    // NO hacer process.exit() para que Railway pueda manejar el error
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('âŒ Promesa rechazada no manejada:', reason);
    // NO hacer process.exit() para que Railway pueda manejar el error
});

process.on('SIGTERM', () => {
    console.log('âš ï¸ SIGTERM recibido, cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('âš ï¸ SIGINT recibido, cerrando servidor...');
    process.exit(0);
});




