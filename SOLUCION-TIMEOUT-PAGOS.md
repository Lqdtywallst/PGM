# ⚡ Solución: Timeout en Operaciones de Pago

## 🔍 Problema

Las operaciones de pago tardan mucho y se rechazan. Esto puede deberse a:

1. **Timeout en el frontend** - La petición al backend tarda demasiado
2. **Timeout en el backend** - Stripe tarda en responder
3. **Timeout en Railway** - El servidor tarda en procesar
4. **Problemas de red** - Latencia entre Railway y Stripe

---

## 🛠️ Soluciones

### Solución 1: Aumentar Timeout en el Frontend

En `app/reserve/page.html`, busca las peticiones `fetch` y aumenta el timeout:

```javascript
// Antes
const response = await fetch(`${BACKEND_URL}/api/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// Después - Con timeout más largo
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos

try {
    const response = await fetch(`${BACKEND_URL}/api/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
    });
    clearTimeout(timeoutId);
    // ... resto del código
} catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
        console.error('Timeout: La petición tardó más de 60 segundos');
    }
    throw error;
}
```

### Solución 2: Optimizar Operaciones de Stripe

En `backend-example.js`, las operaciones de Stripe pueden tardar. Asegúrate de:

1. **No hacer múltiples llamadas innecesarias** a Stripe
2. **Usar Promise.all()** para operaciones paralelas cuando sea posible
3. **Evitar crear clientes duplicados**

### Solución 3: Agregar Timeout a Stripe

Stripe tiene un timeout por defecto. Puedes configurarlo:

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    timeout: 30000, // 30 segundos
    maxNetworkRetries: 2
});
```

### Solución 4: Mejorar Manejo de Errores

Agregar mejor logging y manejo de errores para identificar dónde se está tardando:

```javascript
console.time('create-payment-intent');
try {
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    console.timeEnd('create-payment-intent');
} catch (error) {
    console.timeEnd('create-payment-intent');
    console.error('Error en create-payment-intent:', error);
    throw error;
}
```

---

## 🔍 Diagnóstico

Para identificar dónde está el problema:

1. **Revisa los logs de Railway** - Busca cuánto tarda cada operación
2. **Revisa los logs del navegador** - Ve cuánto tarda la petición desde el frontend
3. **Revisa los logs de Stripe** - En el Dashboard de Stripe, ve los tiempos de respuesta

---

## ✅ Implementación Rápida

Voy a implementar las mejoras en el código para aumentar los timeouts y mejorar el manejo de errores.

