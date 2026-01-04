# 🔐 Cómo Configurar la Clave Secreta de Stripe en Railway

## ⚠️ IMPORTANTE - Seguridad

**NUNCA compartas tu clave secreta:**
- ❌ NO la compartas en chats
- ❌ NO la pongas en el código
- ❌ NO la subas a Git
- ✅ SOLO configúrala en Railway como variable de entorno

## 📋 Pasos para Configurar

### Paso 1: Obtener tu Clave Secreta LIVE

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

### Paso 2: Configurar en Railway

1. Ve a [Railway Dashboard](https://railway.app)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto
4. Selecciona tu servicio **PGM**
5. Ve a la pestaña **Variables** (en el menú lateral)
6. Busca la variable `STRIPE_SECRET_KEY`:
   - Si existe: Haz clic en el valor actual y reemplázalo
   - Si NO existe: Haz clic en **"+ New Variable"** o **"Add Variable"**
7. Configura:
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** Pega tu clave secreta completa (la que copiaste de Stripe)
8. **IMPORTANTE:** 
   - No dejes espacios antes o después del `=`
   - No pongas comillas alrededor del valor
   - Copia la clave completa (es muy larga)
9. Haz clic en **Save** o presiona Enter

### Paso 3: Verificar

Después de guardar, verifica que:
- ✅ El nombre de la variable es exactamente: `STRIPE_SECRET_KEY`
- ✅ El valor empieza con `sk_live_` (no `sk_test_`)
- ✅ No tiene espacios al inicio o final
- ✅ Está completa (es una clave muy larga, más de 100 caracteres)

### Paso 4: Redesplegar (si es necesario)

Railway debería detectar el cambio automáticamente y redesplegar, pero si no:
1. Ve a la pestaña **Deployments**
2. Haz clic en **Redeploy** en el último deployment
3. Espera 1-2 minutos

## ✅ Verificar que Funciona

1. Espera 1-2 minutos para que Railway redesplegue
2. Revisa los logs de Railway
3. Deberías ver:
   ```
   ✅ Servidor corriendo en puerto 8080
   ✅ Rutas de reserva cargadas correctamente
   ```
4. **NO deberías ver:**
   - `Invalid API Key provided: sk_test_...`
   - `STRIPE_SECRET_KEY no está configurada`

## 🆘 Problemas Comunes

### Error: "Invalid API Key provided: sk_test_..."
**Solución:** Estás usando una clave de prueba. Asegúrate de:
- Estar en modo **LIVE** en Stripe Dashboard
- Usar una clave que empiece con `sk_live_` (no `sk_test_`)

### Error: "STRIPE_SECRET_KEY no está configurada"
**Solución:**
- Verifica que la variable existe en Railway → Variables
- Verifica que el nombre es exactamente `STRIPE_SECRET_KEY` (sin espacios)
- Verifica que el valor no está vacío

### El servidor no inicia
**Solución:**
- Revisa los logs de Railway para ver el error específico
- Verifica que la clave no tiene espacios extra
- Verifica que la clave está completa (es muy larga)

## 🔒 Seguridad

- **NUNCA** compartas tu clave secreta públicamente
- **NUNCA** la subas a Git (ya está en `.gitignore`)
- **NUNCA** la expongas en el frontend
- Si crees que tu clave fue comprometida, regenera una nueva en Stripe Dashboard

## 📝 Resumen

1. Obtén tu clave LIVE de Stripe Dashboard
2. Configúrala en Railway → Variables → `STRIPE_SECRET_KEY`
3. Verifica que empieza con `sk_live_`
4. Espera 1-2 minutos para que se aplique
5. Revisa los logs para confirmar que funciona
