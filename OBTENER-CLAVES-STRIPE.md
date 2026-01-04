# 🔑 Cómo Obtener tus Claves Secretas de Stripe

## 📍 Dónde Encontrar tus Claves

### Paso 1: Acceder al Dashboard de Stripe

1. Ve a: **https://dashboard.stripe.com**
2. Inicia sesión con tu cuenta de Stripe

### Paso 2: Seleccionar el Modo Correcto

**IMPORTANTE:** Necesitas la clave en modo **LIVE** (Producción) porque tu frontend ya está configurado con `pk_live_...`

1. En la parte superior izquierda del dashboard, verás un toggle que dice "Test mode" o "Live mode"
2. **Asegúrate de estar en "Live mode"** (no en Test mode)
3. Si está en Test mode, haz clic en el toggle para cambiarlo a Live mode

### Paso 3: Obtener la Clave Secreta

1. En el menú lateral izquierdo, haz clic en **"Developers"**
2. Luego haz clic en **"API keys"**
3. Verás dos claves:
   - **Publishable key** (empieza con `pk_live_...`) - Esta es la que ya tienes en `config.js`
   - **Secret key** (empieza con `sk_live_...`) - **Esta es la que necesitas**

### Paso 4: Revelar la Clave Secreta

1. Junto a "Secret key", verás un botón que dice **"Reveal test key"** o **"Reveal live key"**
2. Haz clic en ese botón
3. Stripe puede pedirte confirmar tu contraseña por seguridad
4. Una vez confirmado, verás tu clave secreta completa

### Paso 5: Copiar la Clave

1. Haz clic en el botón de copiar (ícono de copiar) o selecciona y copia toda la clave
2. La clave debería verse algo así: `sk_live_51RsMXQ3DSCa2l71z...` (mucho más larga)

## ⚠️ IMPORTANTE - Seguridad

- **NUNCA** compartas tu clave secreta públicamente
- **NUNCA** la subas a repositorios públicos de Git
- **NUNCA** la expongas en el frontend
- Solo úsala en el backend (variables de entorno)
- Si alguien obtiene tu clave secreta, puede:
  - Ver todos tus pagos
  - Hacer reembolsos
  - Crear cargos
  - Acceder a información sensible

## 🔒 Dónde Usar la Clave Secreta

La clave secreta (`sk_live_...`) solo debe ir en:

✅ **Backend (Railway/Render):**
   - Variables de entorno
   - Archivo `.env` (localmente, nunca en Git)

❌ **NUNCA en:**
   - Frontend (HTML/JavaScript público)
   - Archivos commitados en Git
   - Repositorios públicos

## 📝 Ejemplo de Configuración

Una vez que tengas tu clave secreta, úsala así:

### En Railway/Render (Variables de Entorno):
```
STRIPE_SECRET_KEY=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
```

### En archivo .env (local, NO subir a Git):
```
STRIPE_SECRET_KEY=sk_live_tu_clave_completa_aqui
```

## 🆘 ¿No tienes una cuenta de Stripe?

1. Ve a: **https://stripe.com**
2. Haz clic en "Sign up"
3. Completa el registro (es gratuito)
4. Una vez registrado, sigue los pasos anteriores

## 🔍 Verificar que Funciona

Después de configurar la clave secreta:

1. Verifica que el backend se inicie sin errores
2. Revisa los logs del backend
3. Si hay error sobre la clave, verifica que:
   - Esté en modo Live (no Test)
   - No tenga espacios extra
   - Esté completa (muy larga)





