# Implementación de Stripe - Guía de Configuración

## ✅ Estado de la Implementación

La pasarela de pagos Stripe ha sido completamente implementada con soporte para:

- ✅ **Tarjetas de crédito/débito** (Stripe Elements)
- ✅ **Apple Pay** (en dispositivos compatibles)
- ✅ **Google Pay** (en dispositivos compatibles)
- ✅ **Stripe Link** (pago rápido con email)
- ⚠️ **PayPal** (simulado - requiere integración adicional)
- ⚠️ **Bizum** (simulado - requiere integración adicional)
- ⚠️ **Transferencia bancaria** (simulado - requiere integración adicional)

## 🚀 Pasos para Configurar

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con:

```env
# Clave secreta de Stripe (obténla en https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui

# Secreto del webhook (opcional pero recomendado)
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui

# Puerto del servidor
PORT=3000

# Entorno
NODE_ENV=development
```

### 3. Configurar Frontend

Edita el archivo `config.js` y reemplaza:

```javascript
const STRIPE_CONFIG = {
    publishableKey: 'pk_test_tu_clave_publica_aqui', // ⚠️ REEMPLAZA
    backendUrl: 'http://localhost:3000', // O tu URL de producción
    currency: 'eur',
    country: 'ES'
};
```

### 4. Iniciar el Servidor Backend

```bash
npm start
# o
node backend-example.js
```

El servidor estará disponible en `http://localhost:3000`

### 5. Abrir la Aplicación

Abre `index.html` en tu navegador o sirve los archivos estáticos con un servidor web.

## 🧪 Probar los Pagos

### Modo Prueba (Test Mode)

Usa estas tarjetas de prueba de Stripe:

- **Pago exitoso**: `4242 4242 4242 4242`
- **Pago rechazado**: `4000 0000 0000 0002`
- **Requiere autenticación (3D Secure)**: `4000 0025 0000 3155`

Cualquier fecha futura y cualquier CVC (ej: 123) funcionarán.

### Verificar Pagos en Stripe Dashboard

1. Ve a [Stripe Dashboard - Payments](https://dashboard.stripe.com/test/payments)
2. Verás todos los pagos de prueba procesados
3. Puedes ver los detalles de cada transacción

## 📋 Endpoints del Backend

### POST `/api/create-payment-intent`

Crea un PaymentIntent en Stripe.

**Request:**
```json
{
  "amount": 45000,
  "currency": "eur",
  "paymentMethodId": "pm_...", // Opcional para Link
  "customerData": {
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "+34612345678",
    "dni": "12345678A",
    "address": "Calle Principal 123",
    "city": "Madrid",
    "postalCode": "28001",
    "country": "ES"
  },
  "reservationData": {
    "car": "Mercedes GLE 53 AMG",
    "pricePerDay": 150,
    "days": 3,
    "startDate": "2025-02-01",
    "endDate": "2025-02-04"
  }
}
```

**Response:**
```json
{
  "clientSecret": "pi_..._secret_...",
  "paymentIntentId": "pi_...",
  "customerId": "cus_..."
}
```

### POST `/api/confirm-payment-intent`

Verifica el estado de un PaymentIntent.

**Request:**
```json
{
  "paymentIntentId": "pi_..."
}
```

### POST `/api/webhook`

Endpoint para recibir eventos de Stripe (webhooks).

**Eventos manejados:**
- `payment_intent.succeeded` - Pago exitoso
- `payment_intent.payment_failed` - Pago fallido
- `payment_intent.canceled` - Pago cancelado
- `payment_intent.requires_action` - Requiere acción adicional

### GET `/health`

Endpoint de salud del servidor.

## 🔒 Configurar Webhooks (Recomendado)

1. Ve a [Stripe Dashboard - Webhooks](https://dashboard.stripe.com/webhooks)
2. Haz clic en "Add endpoint"
3. URL: `https://tu-dominio.com/api/webhook`
4. Selecciona los eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `payment_intent.requires_action`
5. Copia el "Signing secret" y úsalo en tu `.env` como `STRIPE_WEBHOOK_SECRET`

## 🎯 Funcionalidades Implementadas

### Tarjeta de Crédito/Débito
- ✅ Formulario seguro con Stripe Elements
- ✅ Validación en tiempo real
- ✅ Soporte para 3D Secure
- ✅ Manejo de errores

### Apple Pay / Google Pay
- ✅ Detección automática de disponibilidad
- ✅ Integración con Payment Request API
- ✅ Confirmación automática

### Stripe Link
- ✅ Autenticación con email
- ✅ Guardado de métodos de pago
- ✅ Pago rápido para clientes recurrentes

## ⚠️ Métodos de Pago Pendientes

Los siguientes métodos están simulados y requieren integración adicional:

### PayPal
- Requiere cuenta de desarrollador de PayPal
- Integración con PayPal SDK
- Endpoint: `/api/create-paypal-payment`

### Bizum
- Requiere integración con proveedor de Bizum
- Envío de SMS con enlace de pago
- Endpoint: `/api/create-bizum-payment`

### Transferencia Bancaria
- Generación de datos bancarios
- Envío de email con instrucciones
- Confirmación manual del pago
- Endpoint: `/api/create-bank-transfer`

## 🐛 Solución de Problemas

### Error: "Stripe is not defined"
- Verifica que el script de Stripe esté cargado: `<script src="https://js.stripe.com/v3/"></script>`
- Verifica que `config.js` esté cargado antes del código de Stripe

### Error: "Invalid API Key"
- Verifica que `STRIPE_SECRET_KEY` esté configurado en `.env`
- Verifica que `publishableKey` en `config.js` sea correcta
- Asegúrate de usar claves del mismo modo (test o live)

### Error: "CORS policy"
- El backend ya tiene CORS habilitado
- Verifica que `backendUrl` en `config.js` sea correcta
- En producción, configura CORS para tu dominio específico

### El pago se procesa pero no se confirma
- Verifica que los webhooks estén configurados
- Revisa los logs del servidor para errores
- Verifica que el `STRIPE_WEBHOOK_SECRET` sea correcto

## 📚 Recursos Adicionales

- [Documentación de Stripe](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Elements](https://stripe.com/docs/stripe-js/elements)

## 🔐 Seguridad

- ✅ Las claves secretas nunca se exponen en el frontend
- ✅ Los pagos se procesan en el backend
- ✅ Validación de datos en servidor y cliente
- ✅ Webhooks verificados con firma de Stripe
- ⚠️ En producción, usa HTTPS obligatoriamente
- ⚠️ Implementa rate limiting en los endpoints
- ⚠️ Guarda los datos de reserva en una base de datos

## 🚀 Pasar a Producción

1. **Cambia las claves** en `config.js` y `.env` a las de producción (`pk_live_...` y `sk_live_...`)
2. **Configura HTTPS** - Stripe requiere HTTPS en producción
3. **Actualiza `backendUrl`** en `config.js` a tu URL de producción
4. **Configura webhooks** con la URL de producción
5. **Implementa base de datos** para guardar reservas
6. **Configura emails** de confirmación
7. **Habilita logging** y monitoreo
8. **Prueba exhaustivamente** antes de lanzar

