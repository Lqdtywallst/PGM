# 🚀 Configurar Pasarela de Pagos Stripe - Guía Paso a Paso

## 📋 Requisitos Previos

1. Cuenta de Stripe (gratuita): [https://stripe.com](https://stripe.com)
2. Node.js instalado
3. Dependencias instaladas: `npm install`

## 🔑 Paso 1: Obtener las Claves de Stripe

### 1.1 Crear cuenta en Stripe (si no tienes una)
1. Ve a [https://stripe.com](https://stripe.com)
2. Haz clic en "Sign up"
3. Completa el registro (es gratuito)

### 1.2 Obtener las Claves de Prueba (Test Mode)
1. Inicia sesión en [Stripe Dashboard](https://dashboard.stripe.com)
2. Asegúrate de estar en **Test mode** (toggle en la parte superior izquierda)
3. Ve a **Developers** → **API keys**
4. Copia tu **Publishable key** (empieza con `pk_test_...`)
5. Copia tu **Secret key** (empieza con `sk_test_...`) - **NUNCA la expongas en el frontend**

## ⚙️ Paso 2: Configurar el Archivo .env

Crea o edita el archivo `.env` en la raíz del proyecto:

```env
# Stripe - Claves de Prueba (Test Mode)
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui

# Stripe - Webhook Secret (opcional para pruebas)
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui

# Email (ya configurado)
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=vayd xalk cmlq nvef

# Puerto del servidor
PORT=3000

# Entorno
NODE_ENV=development
```

**⚠️ IMPORTANTE**: Reemplaza `sk_test_tu_clave_secreta_aqui` con tu clave secreta real de Stripe.

## 🔧 Paso 3: Configurar config.js

Edita el archivo `config.js` y reemplaza:

```javascript
const STRIPE_CONFIG = {
    publishableKey: 'pk_test_tu_clave_publica_aqui', // ⚠️ REEMPLAZA CON TU CLAVE PÚBLICA
    backendUrl: 'http://localhost:3000',
    currency: 'eur',
    country: 'ES'
};
```

**⚠️ IMPORTANTE**: Reemplaza `pk_test_tu_clave_publica_aqui` con tu clave pública real de Stripe.

## 📦 Paso 4: Instalar Dependencias

```bash
npm install
```

Esto instalará:
- `stripe` - SDK de Stripe para Node.js
- `express` - Servidor web
- `cors` - Para permitir peticiones desde el frontend
- `dotenv` - Para cargar variables de entorno
- `nodemailer` - Para enviar emails

## 🚀 Paso 5: Iniciar el Servidor Backend

```bash
npm start
```

Deberías ver:
```
🚀 SERVIDOR PRESTIGE GOAL MOTION
✅ Servidor corriendo en puerto 3000
✅ Email configurado correctamente
```

## ✅ Paso 6: Probar la Pasarela de Pagos

### 6.1 Abrir la Web
1. Abre `index.html` en tu navegador
2. O sirve los archivos con un servidor local

### 6.2 Hacer una Reserva de Prueba
1. Haz clic en "BOOK NOW" en cualquier vehículo
2. Completa el formulario de reserva
3. Selecciona un método de pago (Tarjeta, Apple Pay, etc.)
4. Usa una **tarjeta de prueba de Stripe**:

#### Tarjetas de Prueba de Stripe:
- **Pago exitoso**: `4242 4242 4242 4242`
- **Pago rechazado**: `4000 0000 0000 0002`
- **Requiere autenticación (3D Secure)**: `4000 0025 0000 3155`

**Cualquier fecha futura** (ej: 12/25) y **cualquier CVC** (ej: 123) funcionarán.

### 6.3 Verificar el Pago
1. Ve a [Stripe Dashboard - Payments](https://dashboard.stripe.com/test/payments)
2. Verás todos los pagos de prueba procesados
3. Puedes ver los detalles de cada transacción

## 🔍 Verificar que Todo Funciona

### Verificar Backend
Abre la consola del navegador (F12) y ejecuta:
```javascript
fetch('http://localhost:3000/api/test')
  .then(r => r.json())
  .then(console.log)
```

Deberías ver: `{status: "ok", message: "Servidor funcionando correctamente", ...}`

### Verificar Stripe
En la consola del navegador, verifica que no haya errores relacionados con Stripe.

## 🐛 Solución de Problemas

### Error: "Invalid API Key"
- Verifica que `STRIPE_SECRET_KEY` en `.env` sea correcta
- Verifica que `publishableKey` en `config.js` sea correcta
- Asegúrate de usar claves del mismo modo (test o live)

### Error: "Failed to fetch" o "NetworkError"
- Verifica que el backend esté corriendo: `npm start`
- Verifica que `backendUrl` en `config.js` sea `http://localhost:3000`
- Verifica que no haya firewall bloqueando el puerto 3000

### Error: "CORS policy"
- El backend ya tiene CORS configurado
- Verifica que el backend esté corriendo
- Asegúrate de usar la URL correcta

### El pago se procesa pero no se confirma
- Verifica los logs del servidor backend
- Revisa la consola del navegador para errores
- Verifica que el email esté configurado (para confirmaciones)

## 🎯 Próximos Pasos

Una vez que funcione en modo prueba:

1. **Probar todos los métodos de pago**:
   - Tarjeta de crédito/débito
   - Apple Pay (en dispositivos compatibles)
   - Google Pay (en dispositivos compatibles)
   - Stripe Link

2. **Configurar Webhooks** (opcional pero recomendado):
   - Ve a [Stripe Dashboard - Webhooks](https://dashboard.stripe.com/webhooks)
   - Agrega un endpoint: `https://tu-dominio.com/api/webhook`
   - Copia el "Signing secret" y úsalo en `.env`

3. **Pasar a Producción**:
   - Cambia las claves a modo Live en Stripe Dashboard
   - Actualiza `config.js` y `.env` con claves de producción
   - Configura HTTPS (obligatorio para Stripe en producción)

## 📚 Recursos

- [Documentación de Stripe](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Dashboard](https://dashboard.stripe.com)

## ✅ Checklist de Configuración

- [ ] Cuenta de Stripe creada
- [ ] Claves de API obtenidas (Test mode)
- [ ] Archivo `.env` configurado con `STRIPE_SECRET_KEY`
- [ ] Archivo `config.js` configurado con `publishableKey`
- [ ] Dependencias instaladas (`npm install`)
- [ ] Backend corriendo (`npm start`)
- [ ] Prueba de pago exitosa con tarjeta de prueba
- [ ] Email de confirmación recibido

¡Listo! Tu pasarela de pagos debería estar funcionando. 🎉


