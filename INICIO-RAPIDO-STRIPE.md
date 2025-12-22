# ⚡ Inicio Rápido - Hacer Funcional la Pasarela de Pagos

## 🎯 Objetivo
Configurar Stripe para que la pasarela de pagos funcione completamente.

## 📋 Checklist Rápido (5 pasos)

### ✅ Paso 1: Obtener Claves de Stripe

1. Ve a [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Si no tienes cuenta, créala (es gratuita)
3. Asegúrate de estar en **Test mode** (toggle superior izquierdo)
4. Ve a **Developers** → **API keys**
5. Copia:
   - **Publishable key** (empieza con `pk_test_...`)
   - **Secret key** (empieza con `sk_test_...`)

### ✅ Paso 2: Configurar .env

Edita el archivo `.env` y agrega:

```env
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
```

**⚠️ Reemplaza** `sk_test_tu_clave_secreta_aqui` con tu clave secreta real.

### ✅ Paso 3: Configurar config.js

Edita `config.js` y cambia:

```javascript
publishableKey: 'pk_test_tu_clave_publica_aqui', // ⚠️ REEMPLAZA
```

**⚠️ Reemplaza** `pk_test_tu_clave_publica_aqui` con tu clave pública real.

### ✅ Paso 4: Instalar Dependencias

```bash
npm install
```

### ✅ Paso 5: Verificar y Iniciar

**Verificar configuración:**
```bash
npm run verify
```

**Iniciar servidor:**
```bash
npm start
```

Deberías ver:
```
🚀 SERVIDOR PRESTIGE GOAL MOTION
✅ Servidor corriendo en puerto 3000
✅ Email configurado correctamente
```

## 🧪 Probar el Pago

1. Abre `index.html` en tu navegador
2. Haz clic en "BOOK NOW" en cualquier vehículo
3. Completa el formulario
4. Selecciona "Card" como método de pago
5. Usa esta tarjeta de prueba:
   - **Número**: `4242 4242 4242 4242`
   - **Fecha**: Cualquier fecha futura (ej: 12/25)
   - **CVC**: Cualquier número (ej: 123)
6. Completa el pago

## ✅ Verificar que Funcionó

1. Ve a [Stripe Dashboard - Payments](https://dashboard.stripe.com/test/payments)
2. Deberías ver tu pago de prueba
3. Revisa tu email (prestigegoalmotion@gmail.com) - deberías recibir confirmación

## 🐛 Si Algo No Funciona

### Error: "Stripe is not configured"
- Verifica que `publishableKey` en `config.js` sea correcta
- Debe empezar con `pk_test_` o `pk_live_`

### Error: "Failed to fetch"
- Verifica que el backend esté corriendo: `npm start`
- Verifica que `backendUrl` en `config.js` sea `http://localhost:3000`

### Error: "Invalid API Key"
- Verifica que `STRIPE_SECRET_KEY` en `.env` sea correcta
- Debe empezar con `sk_test_` o `sk_live_`
- Asegúrate de usar claves del mismo modo (test o live)

## 📚 Más Información

- Guía completa: `CONFIGURAR-STRIPE.md`
- Documentación Stripe: [https://stripe.com/docs](https://stripe.com/docs)

## 🎉 ¡Listo!

Una vez completados estos pasos, tu pasarela de pagos estará completamente funcional.




