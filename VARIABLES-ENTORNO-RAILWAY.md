# 🔐 Variables de Entorno para Railway

Este archivo contiene todas las variables de entorno que necesitas configurar en Railway.

## 📋 Lista de Variables Requeridas

Copia y pega estas variables en Railway → Variables:

```env
# ============================================
# STRIPE - PASARELA DE PAGOS
# ============================================
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ============================================
# EMAIL - CONFIGURACIÓN DE GMAIL
# ============================================
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# ============================================
# SERVIDOR
# ============================================
PORT=3000
NODE_ENV=production

# ============================================
# WEBHOOKS (Opcional pero Recomendado)
# ============================================
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📝 Instrucciones para Obtener cada Variable

### 1. STRIPE_SECRET_KEY

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. **IMPORTANTE**: Asegúrate de estar en modo **LIVE** (toggle en la parte superior)
3. Ve a **Developers** → **API keys**
4. Copia la **Secret key** (empieza con `sk_live_...`)
5. ⚠️ **NUNCA** uses `sk_test_...` en producción

### 2. EMAIL_USER

Ya está configurado: `prestigegoalmotion@gmail.com`

### 3. EMAIL_APP_PASSWORD

1. Ve a [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Inicia sesión con `prestigegoalmotion@gmail.com`
3. Si te pide verificar tu identidad, hazlo
4. Selecciona:
   - **Aplicación**: "Correo"
   - **Dispositivo**: "Otro (nombre personalizado)" → Escribe "Prestige Goal Motion"
5. Haz clic en **"Generar"**
6. Copia la contraseña de 16 caracteres (puedes escribirla con o sin espacios)
7. Ejemplo: `vayd xalk cmlq nvef` o `vaydxalkcmlqnvef`

### 4. STRIPE_WEBHOOK_SECRET (Opcional)

1. En Railway, copia la URL de tu backend (ej: `https://tu-backend.railway.app`)
2. Ve a [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
3. Haz clic en **"Add endpoint"**
4. Endpoint URL: `https://tu-backend.railway.app/api/webhook`
5. Selecciona eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Haz clic en **"Add endpoint"**
7. Copia el **Signing secret** (empieza con `whsec_...`)

---

## ✅ Verificación

Después de configurar todas las variables:

1. En Railway, ve a **Deployments**
2. Verifica que el deployment sea exitoso (check verde ✅)
3. Revisa los logs - deberías ver:
   ```
   ✅ Servidor corriendo en puerto X
   ✅ Servidor de email configurado correctamente
   ```

---

## 🔒 Seguridad

- ✅ **NUNCA** compartas estas variables
- ✅ **NUNCA** las subas a GitHub (ya están en `.gitignore`)
- ✅ Railway las mantiene encriptadas
- ✅ Solo tú y Railway pueden verlas

---

## 🆘 Si Algo No Funciona

1. **Verifica que todas las variables estén configuradas** (sin espacios extra)
2. **Verifica que uses claves LIVE** (no test) para producción
3. **Revisa los logs** en Railway → Deployments
4. **Verifica la URL del backend** en Railway → Settings → Networking

