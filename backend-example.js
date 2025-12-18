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
        if (!amount || !paymentMethodId || !customerData || !reservationData) {
            return res.status(400).json({ 
                error: 'Faltan datos requeridos' 
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
            console.error('Error al crear cliente:', customerError);
            return res.status(500).json({ 
                error: 'Error al crear el cliente' 
            });
        }

        // Crear PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // en centavos (ej: 45000 = 450.00 EUR)
            currency: currency || 'eur',
            customer: customer.id,
            payment_method: paymentMethodId,
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
            // Opcional: configurar métodos de pago permitidos
            payment_method_types: ['card'],
        });

        // Aquí podrías guardar la reserva en tu base de datos
        // con estado "pendiente" hasta que se confirme el pago

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            customerId: customer.id,
        });

    } catch (error) {
        console.error('Error al crear PaymentIntent:', error);
        res.status(500).json({ 
            error: error.message || 'Error al procesar el pago' 
        });
    }
});

// Webhook para confirmar pagos exitosos
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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
            console.log('Pago exitoso:', paymentIntent.id);
            
            // Aquí guardarías la reserva como confirmada en tu base de datos
            // y enviarías el email de confirmación al cliente
            
            // Ejemplo:
            // await saveReservationToDatabase(paymentIntent.metadata);
            // await sendConfirmationEmail(paymentIntent.metadata.customerEmail, paymentIntent.metadata);
            
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Pago fallido:', failedPayment.id);
            
            // Aquí podrías notificar al cliente o actualizar el estado de la reserva
            
            break;

        default:
            console.log(`Evento no manejado: ${event.type}`);
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

