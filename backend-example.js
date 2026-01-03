// Ejemplo de Backend para Stripe - Node.js/Express
// Instala las dependencias: npm install express stripe cors dotenv nodemailer

require('dotenv').config();
const express = require('express');

// Verificar que STRIPE_SECRET_KEY esté configurada
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('tu_clave')) {
    console.error('\n❌ ERROR: STRIPE_SECRET_KEY no está configurada en .env');
    console.error('   Por favor, configura tu clave secreta de Stripe en el archivo .env');
    console.error('   Obtén tu clave en: https://dashboard.stripe.com/apikeys');
    console.error('   Ver: CONFIGURAR-STRIPE.md para más información\n');
    process.exit(1);
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// Importar rutas de reserva
const reserveRoutes = require('./app/api/reserve/route');

// Configurar transporter de email
// IMPORTANTE: Para Gmail, necesitas una contraseña de aplicación
// Obténla en: https://myaccount.google.com/apppasswords

const EMAIL_CONFIG = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || 'prestigegoalmotion@gmail.com',
    password: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD,
};

// Verificar configuración de email al iniciar
if (!EMAIL_CONFIG.password) {
    console.warn('⚠️ ADVERTENCIA: EMAIL_PASSWORD o EMAIL_APP_PASSWORD no está configurado en .env');
    console.warn('   El envío de emails no funcionará hasta que lo configures.');
    console.warn('   Ver: CONFIGURACION-EMAIL.md para más información');
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
        // No fallar en certificados inválidos
        rejectUnauthorized: false
    },
    connectionTimeout: 10000, // 10 segundos para establecer conexión
    greetingTimeout: 10000, // 10 segundos para saludo SMTP
    socketTimeout: 10000, // 10 segundos para operaciones de socket
    // Reintentar conexión si falla
    pool: false,
    maxConnections: 1,
    maxMessages: 3
});

// Verificar conexión con el servidor de email
emailTransporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Error al verificar conexión con servidor de email:', error.message);
        console.error('   Verifica tu configuración en .env (EMAIL_USER y EMAIL_APP_PASSWORD)');
    } else {
        console.log('✅ Servidor de email configurado correctamente');
        console.log('   Email de envío:', EMAIL_CONFIG.user);
    }
});

// Función para enviar email de confirmación de reserva
async function sendReservationEmail(reservationData, customerData, paymentIntentId) {
    const companyEmail = 'prestigegoalmotion@gmail.com';
    
    // Email para la empresa (notificación de nueva reserva)
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
                .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚗 Nueva Reserva - Prestige Goal Motion</h1>
                </div>
                <div class="content">
                    <h2>Detalles de la Reserva</h2>
                    
                    <div class="info-row">
                        <span class="label">Vehículo:</span> ${reservationData.car}
                    </div>
                    <div class="info-row">
                        <span class="label">Fecha de inicio:</span> ${reservationData.startDate}
                    </div>
                    <div class="info-row">
                        <span class="label">Fecha de fin:</span> ${reservationData.endDate}
                    </div>
                    <div class="info-row">
                        <span class="label">Días:</span> ${reservationData.days}
                    </div>
                    <div class="info-row">
                        <span class="label">Precio por día:</span> ${reservationData.pricePerDay} €
                    </div>
                    <div class="info-row">
                        <span class="label">Total:</span> ${(reservationData.pricePerDay * reservationData.days).toFixed(2)} €
                    </div>
                    
                    <h2 style="margin-top: 30px;">Datos del Cliente</h2>
                    
                    <div class="info-row">
                        <span class="label">Nombre:</span> ${customerData.name}
                    </div>
                    <div class="info-row">
                        <span class="label">Email:</span> ${customerData.email}
                    </div>
                    <div class="info-row">
                        <span class="label">Teléfono:</span> ${customerData.phone}
                    </div>
                    <div class="info-row">
                        <span class="label">DNI:</span> ${customerData.dni}
                    </div>
                    <div class="info-row">
                        <span class="label">Dirección:</span> ${customerData.address}
                    </div>
                    <div class="info-row">
                        <span class="label">Ciudad:</span> ${customerData.city}
                    </div>
                    <div class="info-row">
                        <span class="label">Código Postal:</span> ${customerData.postalCode}
                    </div>
                    <div class="info-row">
                        <span class="label">País:</span> ${customerData.country}
                    </div>
                    
                    <div class="info-row" style="margin-top: 20px; background: #e8f5e9; border-left-color: #4caf50;">
                        <span class="label">ID de Pago Stripe:</span> ${paymentIntentId}
                    </div>
                </div>
                <div class="footer">
                    <p>Este es un email automático de Prestige Goal Motion</p>
                    <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    // Email para el cliente (confirmación)
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
                .success-box { background: #e8f5e9; border-left-color: #4caf50; padding: 15px; margin: 20px 0; }
                .footer { margin-top: 20px; padding: 20px; text-align: center; color: #666; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Reserva Confirmada</h1>
                </div>
                <div class="content">
                    <div class="success-box">
                        <h2 style="margin-top: 0; color: #4caf50;">¡Gracias por tu reserva!</h2>
                        <p>Tu reserva ha sido confirmada y el pago procesado exitosamente.</p>
                    </div>
                    
                    <h2>Detalles de tu Reserva</h2>
                    
                    <div class="info-row">
                        <span class="label">Vehículo:</span> ${reservationData.car}
                    </div>
                    <div class="info-row">
                        <span class="label">Fecha de inicio:</span> ${reservationData.startDate}
                    </div>
                    <div class="info-row">
                        <span class="label">Fecha de fin:</span> ${reservationData.endDate}
                    </div>
                    <div class="info-row">
                        <span class="label">Días:</span> ${reservationData.days}
                    </div>
                    <div class="info-row">
                        <span class="label">Total pagado:</span> ${(reservationData.pricePerDay * reservationData.days).toFixed(2)} €
                    </div>
                    
                    <h2 style="margin-top: 30px;">Información de Contacto</h2>
                    <p>Si tienes alguna pregunta o necesitas modificar tu reserva, contáctanos:</p>
                    <ul>
                        <li><strong>Teléfono:</strong> +34 680 162 813</li>
                        <li><strong>Email:</strong> prestigegoalmotion@gmail.com</li>
                        <li><strong>Dirección:</strong> Calle Cicón, 27</li>
                        <li><strong>Horario:</strong> 24 horas, Lunes a Lunes</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Prestige Goal Motion - Alquiler de Coches de Lujo</p>
                    <p>© 2025 Prestige Goal Motion. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    try {
        // Enviar email a la empresa
        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER || 'prestigegoalmotion@gmail.com',
            to: companyEmail,
            subject: `🚗 Nueva Reserva - ${reservationData.car} - ${customerData.name}`,
            html: companyEmailHtml,
        });

        // Enviar email de confirmación al cliente
        await emailTransporter.sendMail({
            from: process.env.EMAIL_USER || 'prestigegoalmotion@gmail.com',
            to: customerData.email,
            subject: '✅ Reserva Confirmada - Prestige Goal Motion',
            html: customerEmailHtml,
        });

        console.log('✅ Emails enviados correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al enviar emails:', error);
        return false;
    }
}

// Middleware
// Configurar CORS para permitir todas las conexiones (desarrollo)
app.use(cors({
    origin: '*', // En producción, especifica el dominio exacto
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

        // Validación básica
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
                error: 'El email proporcionado no es válido' 
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
                // Actualizar información del cliente si es necesario
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
            description: `Reserva: ${reservationData.car} - ${reservationData.days} días`,
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

        // Aquí podrías guardar la reserva en tu base de datos
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
        
        // Manejar errores específicos de Stripe
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ 
                error: 'Error con la tarjeta: ' + error.message 
            });
        } else if (error.type === 'StripeRateLimitError') {
            return res.status(429).json({ 
                error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.' 
            });
        } else if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ 
                error: 'Solicitud inválida: ' + error.message 
            });
        } else if (error.type === 'StripeAPIError') {
            return res.status(500).json({ 
                error: 'Error del servidor de Stripe. Por favor, intenta de nuevo más tarde.' 
            });
        }
        
        res.status(500).json({ 
            error: error.message || 'Error al procesar el pago' 
        });
    }
});

// Endpoint para confirmar un PaymentIntent (útil para pagos con autenticación adicional)
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
            sendReservationEmail(reservationData, customerData, paymentIntent.id).catch(err => {
                console.error('Error al enviar emails (no crítico):', err);
            });
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

// Endpoint para enviar email de confirmación manualmente
app.post('/api/send-confirmation-email', async (req, res) => {
    try {
        const { paymentIntentId, reservationData, customerData } = req.body;

        if (!paymentIntentId || !reservationData || !customerData) {
            return res.status(400).json({ 
                error: 'Faltan datos requeridos' 
            });
        }

        const emailSent = await sendReservationEmail(reservationData, customerData, paymentIntentId);
        
        if (emailSent) {
            res.json({ 
                success: true, 
                message: 'Emails enviados correctamente' 
            });
        } else {
            res.status(500).json({ 
                error: 'Error al enviar los emails' 
            });
        }
    } catch (error) {
        console.error('Error al enviar email:', error);
        res.status(500).json({ 
            error: error.message || 'Error al enviar el email' 
        });
    }
});

// Función para enviar email del formulario de contacto
async function sendContactEmail(contactData) {
    // SIEMPRE enviar a prestigegoalmotion@gmail.com
    const companyEmail = 'prestigegoalmotion@gmail.com';
    
    // Verificar que tenemos la configuración de email
    if (!EMAIL_CONFIG.password) {
        console.error('❌ No se puede enviar email: EMAIL_PASSWORD no configurado');
        throw new Error('Configuración de email incompleta. Verifica tu archivo .env');
    }
    
    const subjectLabels = {
        'reserva': 'Consulta sobre Reserva',
        'flota': 'Información sobre Flota',
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
                    <h1>📧 Nuevo Mensaje de Contacto</h1>
                </div>
                <div class="content">
                    <h2>Información del Contacto</h2>
                    
                    <div class="info-row">
                        <span class="label">Nombre:</span> ${contactData.name}
                    </div>
                    <div class="info-row">
                        <span class="label">Email:</span> <a href="mailto:${contactData.email}">${contactData.email}</a>
                    </div>
                    ${contactData.phone ? `
                    <div class="info-row">
                        <span class="label">Teléfono:</span> <a href="tel:${contactData.phone}">${contactData.phone}</a>
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
                    <p>Este es un email automático del formulario de contacto de Prestige Goal Motion</p>
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
            subject: `📧 ${subjectLabel} - ${contactData.name}`,
            html: emailHtml,
        };

        const info = await emailTransporter.sendMail(mailOptions);
        
        console.log('✅ Email de contacto enviado correctamente');
        console.log('   De:', contactData.name, `<${contactData.email}>`);
        console.log('   Para:', companyEmail);
        console.log('   Asunto:', mailOptions.subject);
        console.log('   Message ID:', info.messageId);
        
        return true;
    } catch (error) {
        console.error('❌ Error al enviar email de contacto:', error.message);
        console.error('   Código de error:', error.code);
        console.error('   Detalles completos:', error);
        
        // Proporcionar mensajes de error más específicos
        if (error.code === 'EAUTH') {
            console.error('   Problema de autenticación. Verifica EMAIL_USER y EMAIL_APP_PASSWORD');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.message.includes('ETIMEDOUT')) {
            console.error('   ⚠️ Timeout al conectar con el servidor de email');
            console.error('   Posibles causas:');
            console.error('   1. Firewall bloqueando la conexión SMTP (puerto 587)');
            console.error('   2. Problemas de red o conexión a internet');
            console.error('   3. Gmail bloqueando la conexión (verifica que la App Password sea correcta)');
            console.error('   4. El servidor SMTP de Gmail está temporalmente no disponible');
        } else if (error.code === 'ESOCKET' || error.message.includes('socket')) {
            console.error('   Error de socket. Verifica tu conexión a internet');
        }
        
        throw error; // Re-lanzar para que el endpoint pueda manejarlo
    }
}

// Endpoint para el formulario de contacto
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Validación
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios' 
            });
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'El email proporcionado no es válido' 
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
            
            // Mensajes de error más específicos para el cliente
            let errorMessage = 'Error al enviar el mensaje. ';
            
            if (emailError.message.includes('EAUTH') || emailError.message.includes('autenticación')) {
                errorMessage += 'Error de configuración del servidor de email.';
            } else if (emailError.message.includes('ECONNECTION') || 
                       emailError.message.includes('ETIMEDOUT') || 
                       emailError.code === 'ETIMEDOUT' ||
                       emailError.code === 'ECONNECTION') {
                errorMessage += 'No se pudo conectar con el servidor de email. ';
                errorMessage += 'Por favor, verifica tu conexión a internet e intenta de nuevo.';
            } else if (emailError.message.includes('ESOCKET') || emailError.message.includes('socket')) {
                errorMessage += 'Error de conexión. Por favor, intenta de nuevo.';
            } else {
                errorMessage += emailError.message || 'Por favor, intenta de nuevo más tarde.';
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
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET no configurado. Los webhooks no funcionarán correctamente.');
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
            console.log('✅ Pago exitoso:', paymentIntent.id);
            console.log('   Cliente:', paymentIntent.metadata.customerEmail);
            console.log('   Vehículo:', paymentIntent.metadata.car);
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
                phone: '', // No está en metadata, se puede obtener del customer
                dni: '',
                address: '',
                city: '',
                postalCode: '',
                country: 'ES',
            };

            // Intentar obtener más datos del cliente desde Stripe
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

            // Enviar emails de confirmación
            await sendReservationEmail(reservationData, customerData, paymentIntent.id);
            
            // Aquí guardarías la reserva como confirmada en tu base de datos
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
            console.log('❌ Pago fallido:', failedPayment.id);
            console.log('   Razón:', failedPayment.last_payment_error?.message || 'Desconocida');
            
            // Aquí podrías notificar al cliente o actualizar el estado de la reserva
            // Ejemplo:
            // await updateReservationStatus(failedPayment.id, 'failed');
            // await sendFailureEmail(failedPayment.metadata.customerEmail, failedPayment);
            
            break;

        case 'payment_intent.canceled':
            const canceledPayment = event.data.object;
            console.log('🚫 Pago cancelado:', canceledPayment.id);
            
            // Actualizar estado de la reserva
            // await updateReservationStatus(canceledPayment.id, 'canceled');
            
            break;

        case 'payment_intent.requires_action':
            const requiresAction = event.data.object;
            console.log('⚠️ Pago requiere acción adicional:', requiresAction.id);
            // El cliente necesita completar una acción (ej: 3D Secure)
            
            break;

        default:
            console.log(`ℹ️ Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });
});

// Ruta raíz - Información del servidor
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: '🚗 Prestige Goal Motion - API Server',
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
// Escuchar en 0.0.0.0 para aceptar conexiones externas (necesario para Railway)
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 SERVIDOR PRESTIGE GOAL MOTION');
    console.log('='.repeat(60));
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    console.log(`📧 Email configurado: ${EMAIL_CONFIG.user}`);
    console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 URL: http://0.0.0.0:${PORT}`);
    console.log(`📬 Endpoint de contacto: http://0.0.0.0:${PORT}/api/contact`);
    console.log(`💳 Endpoint de pagos: http://0.0.0.0:${PORT}/api/create-payment-intent`);
    console.log('='.repeat(60));
    console.log('✅ Servidor listo para recibir peticiones');
}).on('error', (err) => {
    console.error('❌ Error al iniciar el servidor:', err);
    process.exit(1);
});

// Manejar errores no capturados
process.on('uncaughtException', (err) => {
    console.error('❌ Error no capturado:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
});
    
    if (!EMAIL_CONFIG.password) {
        console.log('\n⚠️  ADVERTENCIA: Email no configurado');
        console.log('   Configura EMAIL_APP_PASSWORD en tu archivo .env');
        console.log('   Ver: CONFIGURACION-EMAIL.md');
    } else {
        console.log('✅ Email configurado correctamente');
    }
    
    console.log('='.repeat(60) + '\n');
});



