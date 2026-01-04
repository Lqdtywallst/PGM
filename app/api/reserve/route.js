// API Route para Reservas
// Maneja todas las operaciones relacionadas con reservas

require('dotenv').config();
const express = require('express');

// Verificar que STRIPE_SECRET_KEY esté configurada
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('tu_clave')) {
    console.error('[RESERVE ROUTE] ❌ ERROR: STRIPE_SECRET_KEY no está configurada');
    console.error('[RESERVE ROUTE] El módulo se cargará pero las funciones de pago no funcionarán');
}

const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const nodemailer = require('nodemailer');

const router = express.Router();

// Mapeo de nombres de países a códigos ISO de 2 caracteres
const countryNameToCode = {
    'Spain': 'ES',
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

// Función para convertir nombre de país a código ISO
function normalizeCountryCode(country) {
    if (!country) return null;
    // Si ya es un código ISO de 2 caracteres, devolverlo
    if (country.length === 2 && /^[A-Z]{2}$/i.test(country)) {
        return country.toUpperCase();
    }
    // Si es un nombre de país, convertirlo a código
    return countryNameToCode[country] || country;
}

// Configuración de email
const EMAIL_CONFIG = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || 'prestigegoalmotion@gmail.com',
    password: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD,
};

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
    }
});

// Función para enviar email de notificación ANTES del pago
async function sendReservationNotificationEmail(reservationData, customerData) {
    const companyEmail = 'prestigegoalmotion@gmail.com';
    
    // Email de notificación para la empresa (reserva pendiente de pago)
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
                    <h1>🔔 Nueva Reserva Pendiente - Prestige Goal Motion</h1>
                </div>
                <div class="content">
                    <div class="status">⏳ RESERVA PENDIENTE DE PAGO</div>
                    <h2>Detalles de la Reserva</h2>
                    <div class="info-row"><span class="label">Vehículo:</span> ${reservationData.car || 'N/A'}</div>
                    <div class="info-row"><span class="label">Fecha de inicio:</span> ${reservationData.startDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">Fecha de fin:</span> ${reservationData.endDate || 'N/A'}</div>
                    <div class="info-row"><span class="label">Días:</span> ${reservationData.days || 'N/A'}</div>
                    <div class="info-row"><span class="label">Precio por día:</span> ${reservationData.pricePerDay || 'N/A'} €</div>
                    <div class="info-row"><span class="label">Total:</span> ${reservationData.total || 'N/A'} €</div>
                    ${reservationData.pickupLocation ? `<div class="info-row"><span class="label">Ubicación de recogida:</span> ${reservationData.pickupLocation}</div>` : ''}
                    <h3>Datos del Cliente</h3>
                    <div class="info-row"><span class="label">Nombre:</span> ${customerData.name || customerData.fullName || 'N/A'}</div>
                    <div class="info-row"><span class="label">Email:</span> ${customerData.email || 'N/A'}</div>
                    <div class="info-row"><span class="label">Teléfono:</span> ${customerData.phone || 'N/A'}</div>
                    ${customerData.dni || customerData.passport ? `<div class="info-row"><span class="label">DNI/Passport:</span> ${customerData.dni || customerData.passport}</div>` : ''}
                    ${customerData.address ? `<div class="info-row"><span class="label">Dirección:</span> ${customerData.address}</div>` : ''}
                    ${customerData.city ? `<div class="info-row"><span class="label">Ciudad:</span> ${customerData.city}</div>` : ''}
                    ${customerData.postalCode ? `<div class="info-row"><span class="label">Código Postal:</span> ${customerData.postalCode}</div>` : ''}
                    ${customerData.country ? `<div class="info-row"><span class="label">País:</span> ${customerData.country}</div>` : ''}
                    <p style="margin-top: 20px; color: #666; font-size: 0.9rem;">Esta reserva está pendiente de pago. El cliente procederá con el pago a continuación.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        await emailTransporter.sendMail({
            from: EMAIL_CONFIG.user,
            to: companyEmail,
            subject: `Nueva Reserva Pendiente: ${reservationData.car || 'Vehículo'} - ${customerData.name || customerData.fullName || 'Cliente'}`,
            html: notificationEmailHtml,
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error enviando email de notificación:', error);
        return { success: false, error: error.message };
    }
}

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
                    <div class="info-row"><span class="label">Precio por día:</span> ${reservationData.pricePerDay || 'N/A'} €</div>
                    <div class="info-row"><span class="label">Total:</span> ${reservationData.total || (reservationData.pricePerDay && reservationData.days ? (parseFloat(reservationData.pricePerDay) * parseInt(reservationData.days)).toFixed(2) + ' €' : 'N/A')}</div>
                    ${reservationData.pickupLocation ? `<div class="info-row"><span class="label">Ubicación de recogida:</span> ${reservationData.pickupLocation}</div>` : ''}
                    <p style="margin-top: 20px;">Gracias por confiar en Prestige Goal Motion.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    try {
        console.log('[EMAIL] ========== INICIANDO ENVÍO DE EMAILS ==========');
        console.log('[EMAIL] Configuración:', {
            from: EMAIL_CONFIG.user,
            service: EMAIL_CONFIG.service,
            hasPassword: !!EMAIL_CONFIG.password
        });
        console.log('[EMAIL] Datos de reserva:', {
            car: reservationData.car,
            days: reservationData.days,
            total: reservationData.total
        });
        console.log('[EMAIL] Datos del cliente:', {
            name: customerData.name || customerData.fullName,
            email: customerData.email,
            hasEmail: !!customerData.email
        });
        
        // Enviar email a la empresa
        console.log('[EMAIL] Enviando email a la empresa:', companyEmail);
        const companyEmailResult = await emailTransporter.sendMail({
            from: EMAIL_CONFIG.user,
            to: companyEmail,
            subject: `Nueva Reserva: ${reservationData.car || 'Vehículo'} - ${customerData.name || customerData.fullName || 'Cliente'}`,
            html: companyEmailHtml,
        });
        console.log('[EMAIL] ✅ Email a empresa enviado:', {
            messageId: companyEmailResult.messageId,
            accepted: companyEmailResult.accepted,
            rejected: companyEmailResult.rejected
        });
        
        // Enviar email al cliente
        if (customerData.email) {
            console.log('[EMAIL] Enviando email al cliente:', customerData.email);
            const customerEmailResult = await emailTransporter.sendMail({
                from: EMAIL_CONFIG.user,
                to: customerData.email,
                subject: `Reserva Confirmada - Prestige Goal Motion`,
                html: customerEmailHtml,
                replyTo: companyEmail,
            });
            console.log('[EMAIL] ✅ Email al cliente enviado:', {
                messageId: customerEmailResult.messageId,
                accepted: customerEmailResult.accepted,
                rejected: customerEmailResult.rejected
            });
        } else {
            console.warn('[EMAIL] ⚠️ No se envió email al cliente: no hay email en customerData');
        }
        
        console.log('[EMAIL] ✅ Todos los emails enviados correctamente');
        return { success: true };
    } catch (error) {
        console.error('[EMAIL] ❌ ERROR ENVIANDO EMAILS:', error);
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

// POST /api/reserve - Crear reserva
router.post('/', async (req, res) => {
    console.log('[API] ========== NUEVA PETICIÓN DE RESERVA ==========');
    console.log('[API] Timestamp:', new Date().toISOString());
    console.log('[API] Headers:', req.headers);
    
    try {
        const data = req.body;
        console.log('[API] Datos recibidos:', JSON.stringify(data, null, 2));

        // Validación básica (similar al código TypeScript proporcionado)
        console.log('[API] Validando datos...');
        if (!data.fullName && !data.customerData?.name) {
            console.error('[API] ❌ Validación fallida: Missing fullName');
            return res.status(400).json({ error: 'Missing fullName' });
        }

        if (!data.email && !data.customerData?.email) {
            console.error('[API] ❌ Validación fallida: Missing email');
            return res.status(400).json({ error: 'Missing email' });
        }

        if (!data.startDate && !data.reservationData?.startDate) {
            console.error('[API] ❌ Validación fallida: Missing startDate');
            return res.status(400).json({ error: 'Missing startDate' });
        }

        console.log('[API] ✅ Validación pasada');
        console.log('[API] NEW RESERVATION:', data);

        // Normalizar datos (soporta ambos formatos: directo o anidado)
        console.log('[API] Normalizando datos...');
        const customerData = data.customerData || {
            name: data.fullName,
            email: data.email,
            phone: data.phone,
            dni: data.passport || data.dni,
            address: data.address,
            city: data.city,
            postalCode: data.postalCode,
            country: normalizeCountryCode(data.country), // Convertir a código ISO
        };

        const reservationData = data.reservationData || {
            car: data.car || 'Mercedes GLE 53 AMG',
            pricePerDay: data.pricePerDay || 500,
            days: data.days || 1,
            startDate: data.startDate,
            endDate: data.endDate,
            pickupLocation: data.pickupLocation,
        };

        console.log('[API] Datos normalizados:', {
            customer: customerData,
            reservation: reservationData
        });

        // Calcular total si no viene
        if (!data.amount && !reservationData.total) {
            console.log('[API] Calculando total...');
            const start = new Date(reservationData.startDate);
            const end = new Date(reservationData.endDate);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            reservationData.days = diffDays;
            reservationData.total = diffDays * reservationData.pricePerDay;
            console.log('[API] Total calculado:', {
                days: diffDays,
                pricePerDay: reservationData.pricePerDay,
                total: reservationData.total
            });
        }

        // Enviar email de notificación ANTES del pago (asíncrono, no bloquea)
        console.log('[API] Enviando email de notificación (asíncrono)...');
        sendReservationNotificationEmail(reservationData, customerData)
            .then((emailResult) => {
                console.log('[API] ✅ Email de notificación enviado (asíncrono):', emailResult);
            })
            .catch((emailError) => {
                console.warn('[API] ⚠️ Error enviando email de notificación (no crítico, asíncrono):', emailError);
                // No fallar la reserva si falla el email
            });

        // Si viene amount, crear PaymentIntent con Stripe
        let paymentIntent = null;
        let customer = null;

        if (data.amount) {
            console.log('[API] Monto recibido:', data.amount);
            console.log('[API] Creando PaymentIntent con Stripe...');
            
            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customerData.email)) {
                console.error('[API] ❌ Email inválido:', customerData.email);
                return res.status(400).json({ 
                    error: 'Invalid email format' 
                });
            }

            // Verificar que Stripe esté configurado
            if (!stripe) {
                console.error('[API] ❌ Stripe no está inicializado');
                return res.status(500).json({ 
                    error: 'Stripe not configured' 
                });
            }

            // Crear o recuperar cliente en Stripe
            console.log('[API] Buscando/creando cliente en Stripe...');
            const customerStartTime = Date.now();
            try {
                const existingCustomers = await stripe.customers.list({
                    email: customerData.email,
                    limit: 1,
                });

                if (existingCustomers.data.length > 0) {
                    customer = existingCustomers.data[0];
                    const customerLookupDuration = Date.now() - customerStartTime;
                    console.log('[API] Cliente existente encontrado:', customer.id, `(${customerLookupDuration}ms)`);
                    // Actualizar información del cliente
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
                    console.log('[API] Cliente actualizado', `(${updateDuration}ms)`);
                } else {
                    console.log('[API] Creando nuevo cliente...');
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
                    console.log('[API] ✅ Cliente creado:', customer.id, `(${createDuration}ms, total: ${totalCustomerDuration}ms)`);
                }
            } catch (error) {
                console.error('[API] ❌ Error creando/actualizando cliente:', error);
                console.error('[API] Error details:', {
                    message: error.message,
                    type: error.type,
                    code: error.code
                });
                return res.status(500).json({ 
                    error: 'Error processing customer data: ' + error.message 
                });
            }

            // Crear PaymentIntent
            console.log('[API] Creando PaymentIntent...');
            const paymentIntentStartTime = Date.now();
            try {
                const paymentIntentData = {
                    amount: Math.round(data.amount),
                    currency: data.currency || 'eur',
                    customer: customer.id,
                    confirmation_method: 'automatic',
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
                };
                
                console.log('[API] Datos del PaymentIntent:', {
                    amount: paymentIntentData.amount,
                    currency: paymentIntentData.currency,
                    customer: paymentIntentData.customer,
                    description: paymentIntentData.description
                });
                
                try {
                    paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
                    const paymentIntentDuration = Date.now() - paymentIntentStartTime;
                    console.log('[API] ✅ PaymentIntent creado:', {
                        id: paymentIntent.id,
                        status: paymentIntent.status,
                        client_secret: paymentIntent.client_secret ? paymentIntent.client_secret.substring(0, 20) + '...' : null,
                        duration: `${paymentIntentDuration}ms`
                    });
                } catch (paymentError) {
                    // Si el error es por métodos de pago no activados (Apple Pay/Google Pay), intentar solo con métodos básicos
                    const errorMessage = paymentError.message || paymentError.toString() || '';
                    const isPaymentMethodError = errorMessage.includes('payment method type') || 
                                                 errorMessage.includes('invalid') ||
                                                 errorMessage.includes('apple_pay') ||
                                                 errorMessage.includes('google_pay');
                    
                    if (isPaymentMethodError) {
                        console.log('[API] ⚠️ Métodos de pago no disponibles, usando solo card y link...');
                        console.log('[API] Error original:', errorMessage);
                        try {
                            paymentIntentData.payment_method_types = ['card', 'link'];
                            paymentIntent = await stripe.paymentIntents.create(paymentIntentData);
                            console.log('[API] ✅ PaymentIntent creado con métodos básicos');
                        } catch (retryError) {
                            console.error('[API] ❌ Error en segundo intento:', retryError);
                            throw retryError;
                        }
                    } else {
                        throw paymentError;
                    }
                }
            } catch (error) {
                console.error('[API] ❌ Error creando PaymentIntent:', error);
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
            console.log('[API] ⚠️ No se recibió amount, no se creará PaymentIntent');
        }

        // Enviar emails de confirmación de forma asíncrona (no bloquea la respuesta)
        // No esperamos la respuesta para evitar timeouts
        // EMAIL DESHABILITADO - Comentado por solicitud del usuario
        // console.log('[API] Enviando emails de confirmación (asíncrono)...');
        // sendReservationEmail(
        //     reservationData,
        //     customerData,
        //     paymentIntent?.id || null
        // ).then((emailResult) => {
        //     console.log('[API] ✅ Emails enviados (asíncrono):', emailResult);
        // }).catch((emailError) => {
        //     console.warn('[API] ⚠️ Error enviando emails (no crítico, asíncrono):', emailError);
        //     // No fallar la reserva si falla el email
        // });
        console.log('[API] ℹ️ Notificación de email deshabilitada');

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
        console.log('[API] Preparando respuesta...');
        if (paymentIntent) {
            const response = {
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                customerId: customer.id,
            };
            console.log('[API] ✅ Respuesta exitosa con PaymentIntent:', {
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
            console.log('[API] ✅ Respuesta exitosa sin PaymentIntent');
            return res.json(response);
        }

    } catch (error) {
        console.error('[API] ❌ ERROR GENERAL:', error);
        console.error('[API] Stack trace:', error.stack);
        return res.status(500).json({ 
            error: 'Error processing reservation: ' + error.message 
        });
    }
});

// POST /api/reserve/confirm - Confirmar pago y enviar emails
router.post('/confirm', async (req, res) => {
    console.log('[API CONFIRM] ========== CONFIRMACIÓN DE RESERVA ==========');
    console.log('[API CONFIRM] Timestamp:', new Date().toISOString());
    
    try {
        const { paymentIntentId, reservationData, customerData } = req.body;
        console.log('[API CONFIRM] Datos recibidos:', {
            paymentIntentId: paymentIntentId,
            hasReservationData: !!reservationData,
            hasCustomerData: !!customerData
        });

        if (!paymentIntentId) {
            console.error('[API CONFIRM] ❌ PaymentIntentId requerido');
            return res.status(400).json({ 
                error: 'Payment Intent ID is required' 
            });
        }

        // Verificar el estado del pago
        console.log('[API CONFIRM] Recuperando PaymentIntent de Stripe...');
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log('[API CONFIRM] PaymentIntent recuperado:', {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
        });

        if (paymentIntent.status === 'succeeded') {
            console.log('[API CONFIRM] ✅ Pago exitoso, enviando emails...');
            
            // Preparar datos de reserva (usar datos enviados o metadatos del PaymentIntent)
            let finalReservationData = reservationData || {
                car: paymentIntent.metadata.car,
                days: parseInt(paymentIntent.metadata.days) || 1,
                startDate: paymentIntent.metadata.startDate,
                endDate: paymentIntent.metadata.endDate,
                pricePerDay: parseFloat(paymentIntent.metadata.pricePerDay) || 0,
                pickupLocation: paymentIntent.metadata.pickupLocation,
            };
            
            // Calcular total si no viene en los datos
            if (!finalReservationData.total && finalReservationData.pricePerDay && finalReservationData.days) {
                const calculatedTotal = (parseFloat(finalReservationData.pricePerDay) * parseInt(finalReservationData.days)).toFixed(2);
                finalReservationData.total = calculatedTotal + ' €';
            }
            
            // Preparar datos del cliente (usar datos enviados o metadatos del PaymentIntent)
            let finalCustomerData = customerData;
            if (!finalCustomerData) {
                finalCustomerData = {
                    name: paymentIntent.metadata.customerName,
                    email: paymentIntent.metadata.customerEmail,
                };
                
                // Intentar obtener datos completos del cliente de Stripe
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
                    console.warn('[API CONFIRM] ⚠️ Error obteniendo datos del cliente:', customerError);
                }
            }
            
            // Enviar emails de confirmación
            // EMAIL DESHABILITADO - Comentado por solicitud del usuario
            // console.log('[API CONFIRM] Llamando a sendReservationEmail con datos:', {
            //     reservationData: finalReservationData,
            //     customerData: {
            //         name: finalCustomerData.name || finalCustomerData.fullName,
            //         email: finalCustomerData.email,
            //         hasEmail: !!finalCustomerData.email
            //     },
            //     paymentIntentId: paymentIntentId
            // });
            
            // const emailResult = await sendReservationEmail(
            //     finalReservationData,
            //     finalCustomerData,
            //     paymentIntentId
            // );

            // console.log('[API CONFIRM] Resultado del envío de emails:', emailResult);
            console.log('[API CONFIRM] ℹ️ Notificación de email deshabilitada');
            console.log('[API CONFIRM] ✅ Confirmación completada');
            return res.json({
                success: true,
                paymentIntentId: paymentIntent.id,
                status: paymentIntent.status,
                emailSent: false,
                emailError: null,
                message: 'Email notifications disabled'
            });
        } else {
            console.log('[API CONFIRM] ⚠️ Pago no completado, estado:', paymentIntent.status);
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
