# 🔑 Cómo Obtener tus Claves de Stripe Completas

## ✅ Lo que ya tienes configurado:

**Clave Pública (Publishable Key) - LIVE:**
```
pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti
```
✅ Esta ya está en `config.js` y es correcta.

---

## 🔐 Lo que necesitas obtener:

### 1. Clave Secreta (Secret Key) - `sk_live_...`

**Pasos:**

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. **IMPORTANTE:** Asegúrate de estar en modo **LIVE** (toggle superior izquierdo)
   - Debe decir "Live mode" (NO "Test mode")
3. Ve a **Developers** → **API keys**
4. Busca la sección "Secret key"
5. Haz clic en **"Reveal live key"** o **"Reveal"**
6. Stripe puede pedirte confirmar tu contraseña
7. Copia la clave completa (empieza con `sk_live_...` y es muy larga)

**Ejemplo de formato:**
```
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
```

**Dónde usarla:**
- Variable de entorno en Railway: `STRIPE_SECRET_KEY`

---

### 2. Webhook Secret - `whsec_...`

**Opción A: Para Producción (Recomendado)**

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. Asegúrate de estar en modo **LIVE**
3. Ve a **Developers** → **Webhooks**
4. Haz clic en **"Add endpoint"** o **"Add webhook endpoint"**
5. Completa el formulario:
   - **Endpoint URL:** `https://pgm-production.up.railway.app/api/webhook`
   - **Description:** "Prestige Goal Motion - Payment Webhooks"
   - **Events to send:** Selecciona:
     - ✅ `payment_intent.succeeded`
     - ✅ `payment_intent.payment_failed`
     - ✅ `charge.succeeded` (opcional)
     - ✅ `charge.failed` (opcional)
6. Haz clic en **"Add endpoint"**
7. Una vez creado, haz clic en el endpoint
8. En la sección **"Signing secret"**, haz clic en **"Reveal"** o **"Click to reveal"**
9. Copia el secret (empieza con `whsec_...`)

**Ejemplo de formato:**
```
whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

**Dónde usarla:**
- Variable de entorno en Railway: `STRIPE_WEBHOOK_SECRET`

**Opción B: Para Desarrollo Local (Stripe CLI)**

Si quieres probar localmente primero:

1. Instala Stripe CLI: https://github.com/stripe/stripe-cli/releases
2. Ejecuta: `stripe login`
3. Ejecuta: `stripe listen --forward-to localhost:3000/api/webhook`
4. Copia el `whsec_...` que aparece en la salida

---

## 📝 Configurar en Railway

Una vez que tengas ambas claves:

1. Ve a [Railway Dashboard](https://railway.app)
2. Selecciona tu servicio **PGM**
3. Ve a la pestaña **Variables**
4. Agrega o actualiza estas variables:

```
STRIPE_SECRET_KEY=sk_live_tu_clave_secreta_completa_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
```

**⚠️ IMPORTANTE:**
- No dejes espacios antes o después del `=`
- Copia las claves completas (son muy largas)
- La clave secreta debe empezar con `sk_live_` (NO `sk_test_`)
- El webhook secret debe empezar con `whsec_`

---

## ✅ Verificar que Funciona

Después de configurar:

1. Espera 1-2 minutos para que Railway redesplegue
2. Revisa los logs de Railway
3. Deberías ver:
   ```
   ✅ Servidor corriendo en puerto 8080
   ✅ Rutas de reserva cargadas correctamente
   ```
4. Intenta hacer una reserva de prueba
5. **NO deberías ver** errores de autenticación

---

## 🆘 Problemas Comunes

### Error: "Invalid API Key provided: sk_test_..."
**Solución:** Estás usando una clave de prueba. Asegúrate de:
- Estar en modo **LIVE** en Stripe Dashboard
- Usar una clave que empiece con `sk_live_` (no `sk_test_`)

### No encuentro el webhook secret
**Solución:** 
- Asegúrate de haber creado el endpoint primero
- Haz clic en el endpoint creado para ver el secret
- Si no aparece, haz clic en "Reveal" o "Click to reveal"

### El webhook no funciona
**Solución:**
- Verifica que la URL del endpoint sea correcta: `https://pgm-production.up.railway.app/api/webhook`
- Asegúrate de que tu backend tenga la ruta `/api/webhook` configurada
- Revisa los logs de Railway para ver si llegan los eventos

---

## 🔒 Seguridad

- **NUNCA** compartas tus claves secretas públicamente
- **NUNCA** las subas a Git
- **NUNCA** las expongas en el frontend
- Si crees que una clave fue comprometida, regenera una nueva en Stripe Dashboard
