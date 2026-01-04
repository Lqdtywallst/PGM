# 💳 Tecnología de Pasarela de Pagos - Stripe

## 🎯 Tecnología Principal

### **Stripe** - Pasarela de Pagos

Stripe es la plataforma de pagos que estamos usando. Es una de las más populares y confiables del mundo.

---

## 📦 Librerías y SDKs Utilizados

### Frontend (Cliente)

1. **@stripe/stripe-js** (v2.4.0)
   - SDK oficial de Stripe para JavaScript
   - Se carga desde: `https://js.stripe.com/v3/`
   - Usado para: Inicializar Stripe en el navegador

2. **@stripe/react-stripe-js** (v2.9.0)
   - Componentes React para Stripe (si usas React)
   - En este proyecto se usa principalmente el SDK de JavaScript puro

### Backend (Servidor)

1. **stripe** (v14.25.0)
   - SDK oficial de Stripe para Node.js
   - Usado para: Procesar pagos en el servidor de forma segura

---

## 🔧 Cómo Funciona

### 1. Frontend (Cliente)

```javascript
// Cargar Stripe.js desde CDN
<script src="https://js.stripe.com/v3/"></script>

// Inicializar Stripe con la clave pública
const stripe = Stripe('pk_live_...');

// Crear PaymentIntent en el backend
const response = await fetch('/api/reserve', {
    method: 'POST',
    body: JSON.stringify({...})
});

// Confirmar el pago con Stripe
const result = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
        card: cardElement,
        billing_details: {...}
    }
});
```

### 2. Backend (Servidor)

```javascript
// Inicializar Stripe con la clave secreta
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Crear PaymentIntent
const paymentIntent = await stripe.paymentIntents.create({
    amount: 40000, // €400.00 en centavos
    currency: 'eur',
    customer: customer.id,
    // ...
});

// Confirmar pago
const confirmed = await stripe.paymentIntents.confirm(paymentIntentId);
```

---

## 🔐 Seguridad

### Claves de Stripe

1. **Clave Pública (Publishable Key)**
   - Formato: `pk_live_...` (producción) o `pk_test_...` (pruebas)
   - Se usa en el **frontend** (navegador)
   - Es segura de exponer públicamente
   - Ubicación: `config.js`

2. **Clave Secreta (Secret Key)**
   - Formato: `sk_live_...` (producción) o `sk_test_...` (pruebas)
   - Se usa **SOLO en el backend** (servidor)
   - **NUNCA** debe exponerse en el frontend
   - Ubicación: Variables de entorno en Railway

---

## 🔄 Flujo de Pago

### Paso 1: Cliente Completa el Formulario
- Cliente llena datos de reserva
- Selecciona vehículo y fechas

### Paso 2: Crear PaymentIntent
- Frontend envía datos al backend: `POST /api/reserve`
- Backend crea un `PaymentIntent` en Stripe
- Backend devuelve `clientSecret` al frontend

### Paso 3: Confirmar Pago
- Frontend usa `clientSecret` para confirmar el pago
- Stripe procesa la tarjeta
- Stripe devuelve resultado (éxito o error)

### Paso 4: Confirmar en Backend
- Frontend envía `paymentIntentId` al backend: `POST /api/reserve/confirm`
- Backend verifica el pago con Stripe
- Backend envía emails de confirmación

### Paso 5: Webhook (Opcional)
- Stripe envía notificación al backend: `POST /api/webhook`
- Backend procesa el evento
- Backend actualiza el estado de la reserva

---

## 📍 Endpoints del Backend

### `/api/reserve` (POST)
- Crea una reserva y PaymentIntent
- Devuelve `clientSecret` para el frontend

### `/api/reserve/confirm` (POST)
- Confirma el pago después de que Stripe lo procesa
- Envía emails de confirmación

### `/api/webhook` (POST)
- Recibe notificaciones de Stripe
- Maneja eventos como `payment_intent.succeeded`

---

## 💰 Métodos de Pago Soportados

- ✅ **Tarjetas de crédito/débito** (Visa, Mastercard, etc.)
- ✅ **Stripe Link** (pago rápido con email)
- ✅ **Apple Pay** (si está habilitado)
- ✅ **Google Pay** (si está habilitado)

---

## 🌍 Moneda y País

- **Moneda:** EUR (Euros)
- **País:** ES (España)

---

## 🔒 Cumplimiento de Seguridad

Stripe es **PCI DSS Level 1** compliant, lo que significa:
- ✅ Los datos de tarjetas **NUNCA** pasan por tu servidor
- ✅ Stripe maneja toda la seguridad de pagos
- ✅ Cumples automáticamente con los estándares de seguridad

---

## 📊 Dashboard de Stripe

Puedes ver todos los pagos en:
- **Pruebas:** https://dashboard.stripe.com/test/payments
- **Producción:** https://dashboard.stripe.com/payments

---

## 🧪 Modo de Prueba vs Producción

### Modo Prueba (Test Mode)
- Claves: `pk_test_...` y `sk_test_...`
- Tarjetas de prueba funcionan
- No se cobra dinero real

### Modo Producción (Live Mode)
- Claves: `pk_live_...` y `sk_live_...`
- Se cobra dinero real
- Requiere verificación de cuenta

---

## 📝 Archivos de Configuración

1. **config.js** - Configuración del frontend
   - Clave pública de Stripe
   - URL del backend

2. **backend-example.js** - Servidor backend
   - Procesa pagos con Stripe
   - Maneja webhooks

3. **Variables de entorno en Railway**
   - `STRIPE_SECRET_KEY` - Clave secreta
   - `STRIPE_WEBHOOK_SECRET` - Secret para webhooks (opcional)

---

## ✅ Ventajas de Stripe

1. **Seguridad:** PCI DSS Level 1 compliant
2. **Facilidad:** API simple y bien documentada
3. **Confiabilidad:** Usado por millones de empresas
4. **Soporte:** Excelente documentación y soporte
5. **Internacional:** Soporta múltiples monedas y países
6. **Fraude:** Protección automática contra fraude

---

## 📚 Documentación

- **Stripe Docs:** https://stripe.com/docs
- **Stripe API Reference:** https://stripe.com/docs/api
- **Stripe Dashboard:** https://dashboard.stripe.com

---

## 🎯 Resumen

**Tecnología:** Stripe
**Frontend:** @stripe/stripe-js (JavaScript)
**Backend:** stripe (Node.js SDK)
**Seguridad:** PCI DSS Level 1
**Moneda:** EUR
**País:** ES

