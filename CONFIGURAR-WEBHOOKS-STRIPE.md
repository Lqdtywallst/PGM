# 🔗 Configurar Webhooks de Stripe

## ¿Qué es un Webhook Secret?

El **Webhook Secret** es una clave de seguridad que Stripe usa para verificar que los eventos de webhook realmente provienen de Stripe y no de un atacante.

## 📋 Pasos para Obtener el STRIPE_WEBHOOK_SECRET

### Opción 1: Usando Stripe CLI (Recomendado para Desarrollo Local)

#### 1. Instalar Stripe CLI

**Windows:**
```powershell
# Descargar desde: https://github.com/stripe/stripe-cli/releases
# O usar Chocolatey:
choco install stripe
```

**Mac:**
```bash
brew install stripe/stripe-clripe-cli
```

**Linux:**
```bash
# Descargar desde: https://github.com/stripe/stripe-cli/releases
```

#### 2. Autenticarte con Stripe CLI

```bash
stripe login
```

Esto abrirá tu navegador para autenticarte.

#### 3. Escuchar eventos de webhook localmente

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

Esto te dará un **Webhook Signing Secret** que empieza con `whsec_...`

**Ejemplo de salida:**
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef... (^C to quit)
```

Copia ese valor y úsalo en tu `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

### Opción 2: Configurar Webhook en Stripe Dashboard (Para Producción)

#### 1. Ir al Dashboard de Stripe

1. Ve a [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Inicia sesión en tu cuenta
3. Asegúrate de estar en el modo correcto (Test o Live)

#### 2. Crear un Webhook Endpoint

1. Ve a **Developers** → **Webhooks**
2. Haz clic en **"Add endpoint"** o **"Add webhook endpoint"**
3. Completa el formulario:
   - **Endpoint URL**: 
     - Desarrollo: `http://localhost:3000/api/webhook` (usa Stripe CLI)
     - Producción: `https://tu-dominio.com/api/webhook`
   - **Description**: "Prestige Goal Motion - Payment Webhooks"
   - **Events to send**: Selecciona los eventos que necesitas:
     - `payment_intent.succeeded` ✅ (obligatorio)
     - `payment_intent.payment_failed` ✅ (recomendado)
     - `charge.succeeded` (opcional)
     - `charge.failed` (opcional)

4. Haz clic en **"Add endpoint"**

#### 3. Obtener el Webhook Secret

1. Una vez creado el endpoint, haz clic en él
2. En la sección **"Signing secret"**, haz clic en **"Reveal"** o **"Click to reveal"**
3. Copia el secret (empieza con `whsec_...`)
4. Pégalo en tu archivo `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
```

## ⚠️ IMPORTANTE

### Para Desarrollo Local:

- **Usa Stripe CLI** (`stripe listen`) - Es más fácil y seguro
- El webhook secret cambia cada vez que reinicias `stripe listen`
- No necesitas configurar un endpoint en el Dashboard para desarrollo local

### Para Producción:

- **Configura un endpoint en el Dashboard**
- El webhook secret es permanente (a menos que lo regeneres)
- Asegúrate de usar HTTPS en la URL del endpoint
- Verifica que tu servidor esté accesible públicamente

## 🔒 Seguridad

- **NUNCA** subas el `.env` a Git (ya está en `.gitignore`)
- **NUNCA** compartas tu webhook secret públicamente
- Si crees que tu secret fue comprometido, regenera uno nuevo en el Dashboard

## ✅ Verificar que Funciona

Una vez configurado, puedes probar el webhook:

1. Inicia tu servidor: `npm start`
2. Si usas Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`
3. Haz un pago de prueba
4. Verifica los logs del servidor para ver si recibió el webhook

## 📚 Recursos

- [Documentación de Webhooks de Stripe](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)

## 🎯 Resumen Rápido

**Para desarrollo local:**
```bash
stripe listen --forward-to localhost:3000/api/webhook
# Copia el whsec_... que aparece
```

**Para producción:**
1. Dashboard → Developers → Webhooks → Add endpoint
2. Configura la URL: `https://tu-dominio.com/api/webhook`
3. Selecciona eventos: `payment_intent.succeeded`
4. Copia el Signing secret (whsec_...)
5. Pégalo en `.env`

¡Listo! 🎉




