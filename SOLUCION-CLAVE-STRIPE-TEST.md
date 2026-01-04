# 🔧 Solución: Error "Invalid API Key provided: sk_test_..."

## ❌ Problema Detectado

El error en los logs muestra:
```
StripeAuthenticationError: Invalid API Key provided: sk_test_*****************i...
```

**Causa:** La variable de entorno `STRIPE_SECRET_KEY` en Railway está configurada con una clave de **PRUEBA** (`sk_test_`) cuando debería usar una clave de **PRODUCCIÓN** (`sk_live_`).

## ✅ Solución: Actualizar Clave en Railway

### Paso 1: Obtener tu Clave LIVE de Stripe

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. **IMPORTANTE:** Asegúrate de estar en modo **LIVE** (toggle en la parte superior izquierda)
   - Debe decir "Live mode" (no "Test mode")
3. Ve a **Developers** → **API keys**
4. Copia tu **Secret key** (debe empezar con `sk_live_...`)

**Ejemplo de clave LIVE:**
```
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
```

### Paso 2: Actualizar Variable en Railway

1. Ve a tu proyecto en [Railway Dashboard](https://railway.app)
2. Selecciona tu servicio **PGM**
3. Ve a la pestaña **Variables**
4. Busca la variable `STRIPE_SECRET_KEY`
5. Haz clic en el valor actual (que probablemente empieza con `sk_test_...`)
6. **Reemplaza** todo el valor con tu clave LIVE (`sk_live_...`)
7. Haz clic en **Save** o presiona Enter

### Paso 3: Verificar que se Guardó Correctamente

Después de guardar, verifica que:
- ✅ El valor empieza con `sk_live_` (no `sk_test_`)
- ✅ No tiene espacios al inicio o final
- ✅ Está completa (es una clave muy larga)

### Paso 4: Redesplegar (si es necesario)

Railway debería detectar el cambio automáticamente, pero si no:
1. Ve a la pestaña **Deployments**
2. Haz clic en **Redeploy** en el último deployment

## 🔍 Verificar que Funciona

Después de actualizar la clave:

1. Espera 1-2 minutos para que Railway redesplegue
2. Revisa los logs de Railway
3. Deberías ver mensajes como:
   ```
   ✅ Servidor corriendo en puerto 8080
   ✅ Rutas de reserva cargadas correctamente
   ```
4. Intenta hacer una reserva de prueba
5. **NO deberías ver** el error `Invalid API Key provided: sk_test_...`

## ⚠️ Importante

- **NUNCA** uses claves de prueba (`sk_test_`) en producción
- **SIEMPRE** usa claves LIVE (`sk_live_`) en Railway
- La clave secreta debe mantenerse **privada** (nunca en Git)

## 📝 Checklist

- [ ] Estoy en modo **LIVE** en Stripe Dashboard
- [ ] Copié la clave que empieza con `sk_live_...`
- [ ] Actualicé `STRIPE_SECRET_KEY` en Railway
- [ ] Verifiqué que no tiene espacios extra
- [ ] Esperé 1-2 minutos para que se aplique
- [ ] Revisé los logs y no hay errores de autenticación

## 🆘 Si Sigue Fallando

1. **Verifica el modo en Stripe:**
   - Debe estar en **Live mode** (no Test mode)
   - La clave debe empezar con `sk_live_`

2. **Verifica en Railway:**
   - Variable `STRIPE_SECRET_KEY` existe
   - Valor empieza con `sk_live_`
   - No tiene espacios al inicio/final

3. **Revisa los logs:**
   - Busca mensajes de error relacionados con Stripe
   - Verifica que el servidor se inició correctamente

4. **Contacta soporte:**
   - Si el problema persiste, revisa los logs completos
   - Verifica que tu cuenta de Stripe esté activa y verificada
