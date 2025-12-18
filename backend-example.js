// Ejemplo de Backend para Stripe - Node.js/Express
// Instala las dependencias: npm install express stripe cors dotenv nodemailer

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// Configurar transporter de email
// Opción 1: Usar Gmail (requiere contraseña de aplicación)
// Opción 2: Usar otro servicio SMTP (configurar en .env)
const emailTransporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'prestigegoalmotion@gmail.com',
        pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD, // Contraseña de aplicación de Gmail
    },
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
app.use(cors());
app.use(express.json());

// Endpoint para crear PaymentIntent
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

// Endpoint de salud (opcional)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`Modo: ${process.env.NODE_ENV || 'development'}`);
});



