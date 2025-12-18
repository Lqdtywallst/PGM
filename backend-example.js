// Ejemplo de Backend para Stripe - Node.js/Express
// Instala las dependencias: npm install express stripe cors dotenv

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();

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
            
            // Aquí guardarías la reserva como confirmada en tu base de datos
            // y enviarías el email de confirmación al cliente
            
            // Ejemplo:
            // await saveReservationToDatabase({
            //     paymentIntentId: paymentIntent.id,
            //     customerId: paymentIntent.customer,
            //     status: 'confirmed',
            //     ...paymentIntent.metadata
            // });
            // await sendConfirmationEmail(
            //     paymentIntent.metadata.customerEmail, 
            //     paymentIntent.metadata
            // );
            
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



