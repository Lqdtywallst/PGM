# Configuración de Stripe - Guía Completa

## 📋 Requisitos Previos

1. **Cuenta de Stripe**: Crea una cuenta en [https://stripe.com](https://stripe.com)
2. **Claves de API**: Obtén tus claves desde el [Dashboard de Stripe](https://dashboard.stripe.com/apikeys)

## 🔑 Paso 1: Obtener las Claves de Stripe

### Claves de Prueba (Test Mode)
1. Ve a [Dashboard de Stripe](https://dashboard.stripe.com/test/apikeys)
2. Copia tu **Publishable key** (empieza con `pk_test_`)
3. Copia tu **Secret key** (empieza con `sk_test_`) - **NUNCA la expongas en el frontend**

### Claves de Producción (Live Mode)
1. Activa tu cuenta de Stripe para producción
2. Ve a [Dashboard de Stripe](https://dashboard.stripe.com/apikeys)
3. Cambia a "Live mode" (toggle en la parte superior)
4. Copia tu **Publishable key** (empieza con `pk_live_`)
5. Copia tu **Secret key** (empieza con `sk_live_`)

## ⚙️ Paso 2: Configurar el Frontend

Edita el archivo `config.js`:

```javascript
const STRIPE_CONFIG = {
    // Reemplaza con tu clave pública (Publishable Key)
    publishableKey: 'pk_test_51TuClaveAqui...',
    
    // URL de tu backend
    backendUrl: 'https://api.tudominio.com', // O 'http://localhost:3000' para desarrollo
    
    currency: 'eur',
    country: 'ES'
};
```

## 🔧 Paso 3: Configurar el Backend

Necesitas crear un endpoint en tu backend que cree el PaymentIntent. Aquí tienes ejemplos:

### Node.js (Express)

```javascript
const express = require('express');
const stripe = require('stripe')('sk_test_TuClaveSecretaAqui...'); // Tu Secret Key
const app = express();

app.use(express.json());

app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency, paymentMethodId, customerData, reservationData } = req.body;

        // Crear o recuperar cliente en Stripe
        const customer = await stripe.customers.create({
            email: customerData.email,
            name: customerData.name,
            phone: customerData.phone,
            address: {
                line1: customerData.address,
                city: customerData.city,
                postal_code: customerData.postalCode,
                country: customerData.country,
            },
        });

        // Crear PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // en centavos
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
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Webhook para confirmar pagos exitosos
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Manejar eventos
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        // Aquí guardarías la reserva en tu base de datos
        console.log('Pago exitoso:', paymentIntent.id);
    }

    res.json({ received: true });
});

app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
});
```

### Python (Flask)

```python
from flask import Flask, request, jsonify
import stripe

stripe.api_key = 'sk_test_TuClaveSecretaAqui...'

app = Flask(__name__)

@app.route('/api/create-payment-intent', methods=['POST'])
def create_payment_intent():
    try:
        data = request.json
        amount = data['amount']
        currency = data.get('currency', 'eur')
        payment_method_id = data['paymentMethodId']
        customer_data = data['customerData']
        reservation_data = data['reservationData']

        # Crear cliente
        customer = stripe.Customer.create(
            email=customer_data['email'],
            name=customer_data['name'],
            phone=customer_data['phone'],
            address={
                'line1': customer_data['address'],
                'city': customer_data['city'],
                'postal_code': customer_data['postalCode'],
                'country': customer_data['country'],
            }
        )

        # Crear PaymentIntent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            customer=customer.id,
            payment_method=payment_method_id,
            confirmation_method='manual',
            confirm=False,
            description=f"Reserva: {reservation_data['car']} - {reservation_data['days']} días",
            metadata={
                'car': reservation_data['car'],
                'days': str(reservation_data['days']),
                'startDate': reservation_data['startDate'],
                'endDate': reservation_data['endDate'],
                'pricePerDay': str(reservation_data['pricePerDay']),
            }
        )

        return jsonify({
            'clientSecret': payment_intent.client_secret,
            'paymentIntentId': payment_intent.id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000)
```

## 🔒 Paso 4: Configurar Webhooks (Opcional pero Recomendado)

Los webhooks permiten que Stripe notifique a tu servidor cuando ocurren eventos importantes.

1. Ve a [Webhooks en Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Haz clic en "Add endpoint"
3. URL: `https://api.tudominio.com/api/webhook`
4. Eventos a escuchar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copia el "Signing secret" y úsalo en tu backend

## ✅ Paso 5: Probar el Sistema

### Modo Prueba
Usa estas tarjetas de prueba de Stripe:

- **Pago exitoso**: `4242 4242 4242 4242`
- **Pago rechazado**: `4000 0000 0000 0002`
- **Requiere autenticación**: `4000 0025 0000 3155`

Cualquier fecha futura y cualquier CVC funcionarán.

### Verificar Pagos
1. Ve a [Payments en Stripe Dashboard](https://dashboard.stripe.com/test/payments)
2. Verás todos los pagos de prueba procesados

## 🚀 Paso 6: Pasar a Producción

1. **Cambia las claves** en `config.js` a las claves de producción (`pk_live_...`)
2. **Actualiza tu backend** para usar `sk_live_...`
3. **Configura webhooks** con la URL de producción
4. **Prueba con una cantidad pequeña** primero
5. **Activa tu cuenta** de Stripe completando la verificación

## 📝 Notas Importantes

- ⚠️ **NUNCA** expongas tu Secret Key en el frontend
- ✅ Siempre valida los pagos en el backend
- ✅ Usa HTTPS en producción
- ✅ Implementa manejo de errores robusto
- ✅ Guarda las reservas en tu base de datos después de confirmar el pago
- ✅ Envía emails de confirmación a los clientes

## 🆘 Soporte

- [Documentación de Stripe](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Stripe Testing](https://stripe.com/docs/testing)



