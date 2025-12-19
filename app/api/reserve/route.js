// API Route para Reservas
// Maneja todas las operaciones relacionadas con reservas

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const router = express.Router();

// Configuración de email
const EMAIL_CONFIG = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || 'prestigegoalmotion@gmail.com',
    password: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD,
};

const emailTransporter = nodemailer.createTransport({
    service: EMAIL_CONFIG.service,
    auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.password,
    },
});

// Función para enviar email de confirmación
async function sendReservationEmail(reservationData, customerData, paymentIntentId) {
    const companyEmail = 'prestigegoalmotion@gmail.com';
    
    // Email para la empresa
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
                    <h1>🚗 Nueva Reserva - Prestige Goal Motion</h1>
                </div>
                <div class="content">
                    <h2>Detalles de la Reserva</h2>
                    <div class="info-row"><span class="label">Vehículo:</span> ${reservationData.car || 'N/A'}</div>
                    <div class="info-row"><span class="label">Fecha de inicio:</span> ${reservationData.startDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">Fecha de fin:</span> ${reservationData.endDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">Días:</span> ${reservationData.days || 'N/A'}</div>
                    <div class="info-row"><span class="label">Precio por día:</span> ${reservationData.pricePerDay || 'N/A'} €</div>
                    <div class="info-row"><span class="label">Total:</span> ${reservationData.total || 'N/A'} €</div>
                    ${reservationData.pickupLocation ? `<div class="info-row"><span class="label">Ubicación de recogida:</span> ${reservationData.pickupLocation}</div>` : ''}
                    ${paymentIntentId ? `<div class="info-row"><span class="label">Payment Intent ID:</span> ${paymentIntentId}</div>` : ''}
                    <h3>Datos del Cliente</h3>
                    <div class="info-row"><span class="label">Nombre:</span> ${customerData.name || customerData.fullName || 'N/A'}</div>
                    <div class="info-row"><span class="label">Email:</span> ${customerData.email || 'N/A'}</div>
                    <div class="info-row"><span class="label">Teléfono:</span> ${customerData.phone || 'N/A'}</div>
                    ${customerData.dni || customerData.passport ? `<div class="info-row"><span class="label">DNI/Passport:</span> ${customerData.dni || customerData.passport}</div>` : ''}
                    ${customerData.address ? `<div class="info-row"><span class="label">Dirección:</span> ${customerData.address}</div>` : ''}
                    ${customerData.city ? `<div class="info-row"><span class="label">Ciudad:</span> ${customerData.city}</div>` : ''}
                    ${customerData.postalCode ? `<div class="info-row"><span class="label">Código Postal:</span> ${customerData.postalCode}</div>` : ''}
                    ${customerData.country ? `<div class="info-row"><span class="label">País:</span> ${customerData.country}</div>` : ''}
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Email para el cliente
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
                    <h1>✅ Reserva Confirmada - Prestige Goal Motion</h1>
                </div>
                <div class="content">
                    <p>Estimado/a ${customerData.name || customerData.fullName || 'Cliente'},</p>
                    <p>Su reserva ha sido confirmada exitosamente. A continuación encontrará los detalles:</p>
                    <h2>Detalles de la Reserva</h2>
                    <div class="info-row"><span class="label">Vehículo:</span> ${reservationData.car || 'N/A'}</div>
                    <div class="info-row"><span class="label">Fecha de inicio:</span> ${reservationData.startDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">Fecha de fin:</span> ${reservationData.endDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">Días:</span> ${reservationData.days || 'N/A'}</div>
                    <div class="info-row"><span class="label">Total:</span> ${reservationData.total || 'N/A'} €</div>
                    ${reservationData.pickupLocation ? `<div class="info-row"><span class="label">Ubicación de recogida:</span> ${reservationData.pickupLocation}</div>` : ''}
                    <p style="margin-top: 20px;">Gracias por confiar en Prestige Goal Motion.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        // Enviar email a la empresa
        await emailTransporter.sendMail({
            from: EMAIL_CONFIG.user,
            to: companyEmail,
            subject: `Nueva Reserva: ${reservationData.car || 'Vehículo'} - ${customerData.name || customerData.fullName || 'Cliente'}`,
            html: companyEmailHtml,
        });
        
        // Enviar email al cliente
        if (customerData.email) {
            await emailTransporter.sendMail({
                from: EMAIL_CONFIG.user,
                to: customerData.email,
                subject: `Reserva Confirmada - Prestige Goal Motion`,
                html: customerEmailHtml,
                replyTo: companyEmail,
            });
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error enviando emails:', error);
        return { success: false, error: error.message };
    }
}

// POST /api/reserve - Crear reserva
router.post('/', async (req, res) => {
    try {
        const data = req.body;

        // Validación básica (similar al código TypeScript proporcionado)
        if (!data.fullName && !data.customerData?.name) {
            return res.status(400).json({ error: 'Missing fullName' });
        }

        if (!data.email && !data.customerData?.email) {
            return res.status(400).json({ error: 'Missing email' });
        }

        if (!data.startDate && !data.reservationData?.startDate) {
            return res.status(400).json({ error: 'Missing startDate' });
        }

        // Log de la nueva reserva
        console.log('NEW RESERVATION:', data);

        // Normalizar datos (soporta ambos formatos: directo o anidado)
        const customerData = data.customerData || {
            name: data.fullName,
            email: data.email,
            phone: data.phone,
            dni: data.passport || data.dni,
            address: data.address,
            city: data.city,
            postalCode: data.postalCode,
            country: data.country,
        };

        const reservationData = data.reservationData || {
            car: data.car || 'Mercedes GLE 53 AMG',
            pricePerDay: data.pricePerDay || 500,
            days: data.days || 1,
            startDate: data.startDate,
            endDate: data.endDate,
            pickupLocation: data.pickupLocation,
        };

        // Calcular total si no viene
        if (!data.amount && !reservationData.total) {
            const start = new Date(reservationData.startDate);
            const end = new Date(reservationData.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            reservationData.days = diffDays;
            reservationData.total = diffDays * reservationData.pricePerDay;
        }

        // Si viene amount, crear PaymentIntent con Stripe
        let paymentIntent = null;
        let customer = null;

        if (data.amount) {
            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerData.email)) {
                return res.status(400).json({ 
                    error: 'Invalid email format' 
                });
            }

            // Crear o recuperar cliente en Stripe
            try {
                const existingCustomers = await stripe.customers.list({
                    email: customerData.email,
                    limit: 1,
                });

                if (existingCustomers.data.length > 0) {
                    customer = existingCustomers.data[0];
                    // Actualizar información del cliente
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
                } else {
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
                }
            } catch (error) {
                console.error('Error creando/actualizando cliente:', error);
                return res.status(500).json({ 
                    error: 'Error processing customer data: ' + error.message 
                });
            }

            // Crear PaymentIntent
            try {
                paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(data.amount),
                    currency: data.currency || 'eur',
                    customer: customer.id,
                    payment_method: data.paymentMethodId,
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
                        pickupLocation: reservationData.pickupLocation || '',
                    },
                    payment_method_types: ['card', 'apple_pay', 'google_pay', 'link'],
                });
            } catch (error) {
                console.error('Error creando PaymentIntent:', error);
                return res.status(500).json({ 
                    error: 'Error creating payment intent: ' + error.message 
                });
            }
        }

        // Enviar emails de confirmación
        try {
            await sendReservationEmail(
                reservationData,
                customerData,
                paymentIntent?.id || null
            );
        } catch (emailError) {
            console.warn('Error enviando emails (no crítico):', emailError);
            // No fallar la reserva si falla el email
        }

        // Aquí puedes guardar en base de datos
        // Ejemplo:
        // await saveReservation({
        //     paymentIntentId: paymentIntent?.id,
        //     customerId: customer?.id,
        //     status: paymentIntent ? 'pending' : 'confirmed',
        //     ...reservationData,
        //     ...customerData
        // });

        // Respuesta
        if (paymentIntent) {
            return res.json({
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                customerId: customer.id,
            });
        } else {
            return res.json({
                success: true,
                message: 'Reservation created successfully',
            });
        }

    } catch (error) {
        console.error('Error en /api/reserve:', error);
        return res.status(500).json({ 
            error: 'Error processing reservation: ' + error.message 
        });
    }
});

// POST /api/reserve/confirm - Confirmar pago y enviar emails
router.post('/confirm', async (req, res) => {
    try {
        const { paymentIntentId, reservationData, customerData } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ 
                error: 'Payment Intent ID is required' 
            });
        }

        // Verificar el estado del pago
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            // Enviar emails de confirmación
            const emailResult = await sendReservationEmail(
                reservationData || {
                    car: paymentIntent.metadata.car,
                    days: parseInt(paymentIntent.metadata.days),
                    startDate: paymentIntent.metadata.startDate,
                    endDate: paymentIntent.metadata.endDate,
                    pricePerDay: parseFloat(paymentIntent.metadata.pricePerDay),
                    pickupLocation: paymentIntent.metadata.pickupLocation,
                },
                customerData || {
                    name: paymentIntent.metadata.customerName,
                    email: paymentIntent.metadata.customerEmail,
                },
                paymentIntentId
            );

            return res.json({
                success: true,
                paymentIntentId: paymentIntent.id,
                status: paymentIntent.status,
                emailSent: emailResult.success,
            });
        } else {
            return res.json({
                success: false,
                paymentIntentId: paymentIntent.id,
                status: paymentIntent.status,
                message: 'Payment has not been completed yet',
            });
        }
    } catch (error) {
        console.error('Error en /api/reserve/confirm:', error);
        return res.status(500).json({ 
            error: 'Error confirming reservation: ' + error.message 
        });
    }
});

// GET /api/reserve/:paymentIntentId - Obtener estado de una reserva
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
        console.error('Error obteniendo reserva:', error);
        return res.status(500).json({ 
            error: 'Error retrieving reservation: ' + error.message 
        });
    }
});

module.exports = router;
