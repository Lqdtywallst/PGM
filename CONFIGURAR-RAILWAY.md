# 🚀 Configurar Railway para Pasarela de Pagos - Guía Completa

## 📋 Requisitos Previos

1. ✅ Cuenta de Stripe (modo Live para producción)
2. ✅ Cuenta de Gmail con Contraseña de Aplicación
3. ✅ Repositorio en GitHub (recomendado) o cuenta de Railway
4. ✅ Node.js instalado localmente (para pruebas)

---

## 🔧 Paso 1: Crear Cuenta en Railway

1. Ve a [https://railway.app](https://railway.app)
2. Haz clic en **"Start a New Project"** o **"Login"**
3. Inicia sesión con:
   - **GitHub** (recomendado - más fácil para despliegues automáticos)
   - O con **Email**

---

## 🔧 Paso 2: Crear Nuevo Proyecto

1. En el dashboard de Railway, haz clic en **"New Project"**
2. Selecciona una de estas opciones:

   ### Opción A: Desde GitHub (Recomendado)
   - Selecciona **"Deploy from GitHub repo"**
   - Autoriza Railway para acceder a tu repositorio
   - Selecciona tu repositorio: `Web-PRESTIGE-GOAL-MOTION`
   - Railway detectará automáticamente que es Node.js

   ### Opción B: Desde un Template
   - Selecciona **"Empty Project"**
   - Luego conecta tu repositorio de GitHub

---

## 🔧 Paso 3: Configurar el Proyecto

Railway debería detectar automáticamente que es un proyecto Node.js. Si no lo hace:

1. Ve a **Settings** → **Build & Deploy**
2. Asegúrate de que:
   - **Build Command**: `npm install` (o déjalo vacío, Railway lo detectará)
   - **Start Command**: `node backend-example.js`
   - **Root Directory**: `/` (raíz del proyecto)

El archivo `railway.json` ya está configurado con:
```json
{
  "deploy": {
    "startCommand": "node backend-example.js"
  }
}
```

---

## 🔧 Paso 4: Configurar Variables de Entorno

**⚠️ CRÍTICO**: Estas variables son esenciales para que funcione la pasarela de pagos.

1. En Railway, ve a tu proyecto → **Variables** (pestaña en la parte superior)
2. Haz clic en **"New Variable"** y agrega cada una:

### Variables Requeridas:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ IMPORTANTE**: 
- Usa tu clave **LIVE** (`sk_live_...`) para producción
- **NUNCA** uses claves de prueba (`sk_test_...`) en producción
- Obtén tu clave en: https://dashboard.stripe.com/apikeys (asegúrate de estar en modo **Live**)

```env
EMAIL_SERVICE=gmail
```

```env
EMAIL_USER=prestigegoalmotion@gmail.com
```

```env
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

**⚠️ IMPORTANTE**: 
- Esta debe ser una **Contraseña de Aplicación** de Gmail, NO tu contraseña normal
- Obtén una en: https://myaccount.google.com/apppasswords
- La contraseña tiene 16 caracteres, puedes escribirla con o sin espacios

```env
PORT=3000
```

Railway asignará automáticamente un puerto, pero es bueno tenerlo configurado.

```env
NODE_ENV=production
```

---

## 🔧 Paso 5: Obtener la URL del Backend

1. Una vez que Railway termine de desplegar (verás un check verde ✅)
2. Ve a la pestaña **Settings** → **Networking**
3. Haz clic en **"Generate Domain"** si no tienes uno
4. Railway te dará una URL como:
   ```
   https://prestige-backend-production-xxxx.up.railway.app
   ```
5. **Copia esta URL** - la necesitarás para el siguiente paso

**💡 Tip**: Puedes personalizar el dominio en Settings → Networking → Custom Domain

---

## 🔧 Paso 6: Configurar Webhooks de Stripe (Opcional pero Recomendado)

Para recibir notificaciones de pagos completados:

1. En Railway, copia la URL de tu backend (ej: `https://tu-backend.railway.app`)
2. Ve a [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
3. Haz clic en **"Add endpoint"**
4. Endpoint URL: `https://tu-backend.railway.app/api/webhook`
5. Selecciona eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Copia el **Webhook Signing Secret** (empieza con `whsec_...`)
7. En Railway, agrega otra variable de entorno:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔧 Paso 7: Actualizar config.js en el Frontend

1. Abre el archivo `config.js` en tu proyecto
2. Actualiza la URL del backend:

```javascript
const STRIPE_CONFIG = {
    publishableKey: 'pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Tu clave pública LIVE
    backendUrl: 'https://tu-backend.railway.app', // ⬅️ CAMBIA ESTO
    currency: 'eur',
    country: 'ES'
};
```

**⚠️ IMPORTANTE**: 
- Usa `https://` (no `http://`)
- Usa la URL completa de Railway (sin `/api` al final)
- Asegúrate de que la clave pública también sea **LIVE** (`pk_live_...`)

---

## 🔧 Paso 8: Verificar el Despliegue

### 8.1 Verificar que el Backend esté Corriendo

1. Visita: `https://tu-backend.railway.app/api/test`
2. Deberías ver una respuesta JSON:
   ```json
   {
     "status": "ok",
     "message": "Servidor funcionando correctamente"
   }
   ```

### 8.2 Verificar el Endpoint de Pagos

1. Visita: `https://tu-backend.railway.app/api/create-payment-intent`
2. Debería responder (puede dar error sin datos, pero eso es normal)

### 8.3 Verificar los Logs

1. En Railway, ve a la pestaña **Deployments**
2. Haz clic en el deployment más reciente
3. Verás los logs del servidor
4. Deberías ver: `✅ Servidor corriendo en puerto X`

---

## 🔧 Paso 9: Probar un Pago de Prueba

**⚠️ IMPORTANTE**: En modo LIVE, los pagos son REALES. Para pruebas:

1. Usa una tarjeta de prueba de Stripe:
   - Número: `4242 4242 4242 4242`
   - Fecha: Cualquier fecha futura
   - CVC: Cualquier 3 dígitos
   - ZIP: Cualquier código postal

2. O mejor aún, crea un modo de prueba:
   - En `config.js`, usa claves `pk_test_...` y `sk_test_...`
   - Prueba todo en modo test
   - Cuando esté todo funcionando, cambia a modo LIVE

---

## ✅ Checklist de Verificación

Antes de considerar que está todo configurado:

- [ ] Backend desplegado en Railway y corriendo
- [ ] Variables de entorno configuradas (STRIPE_SECRET_KEY, EMAIL_*, etc.)
- [ ] URL del backend obtenida de Railway
- [ ] `config.js` actualizado con la URL de Railway
- [ ] Claves de Stripe en modo **LIVE** (`sk_live_...` y `pk_live_...`)
- [ ] Endpoint `/api/test` responde correctamente
- [ ] Webhooks configurados (opcional)
- [ ] Prueba de pago realizada exitosamente
- [ ] Logs verificados sin errores críticos

---

## 🆘 Troubleshooting

### Error: "Cannot find module"
- **Solución**: Verifica que `package.json` tenga todas las dependencias
- Railway ejecuta `npm install` automáticamente

### Error: "Stripe key invalid"
- **Solución**: 
  - Verifica que uses la clave **LIVE** (`sk_live_...`) en Railway
  - Asegúrate de que no haya espacios extra en las variables
  - Verifica que estés en modo **Live** en Stripe Dashboard

### Error: "Port already in use"
- **Solución**: Railway asigna el puerto automáticamente
- El código ya usa `process.env.PORT || 3000`, así que debería funcionar

### El backend no responde
- **Solución**:
  1. Verifica los logs en Railway → Deployments
  2. Asegúrate de que el Start Command sea: `node backend-example.js`
  3. Verifica que todas las variables de entorno estén configuradas

### Error de CORS
- **Solución**: El backend ya tiene CORS configurado para aceptar todas las peticiones
- Si persiste, verifica que la URL en `config.js` sea correcta

### Emails no se envían
- **Solución**:
  1. Verifica que `EMAIL_APP_PASSWORD` sea una Contraseña de Aplicación válida
  2. Obtén una nueva en: https://myaccount.google.com/apppasswords
  3. Verifica los logs en Railway para ver el error específico

---

## 📝 Notas Importantes

1. **Modo Live vs Test**: 
   - En producción, usa siempre claves **LIVE** de Stripe
   - Los pagos en modo LIVE son REALES y se cobran de verdad

2. **Seguridad**:
   - ✅ NUNCA expongas `STRIPE_SECRET_KEY` en el frontend
   - ✅ Usa siempre HTTPS en producción (Railway lo proporciona automáticamente)
   - ✅ Mantén las variables de entorno seguras

3. **Actualizaciones**:
   - Cada vez que hagas `git push`, Railway desplegará automáticamente
   - Puedes ver el progreso en Railway → Deployments

4. **Costos**:
   - Railway tiene un plan gratuito generoso
   - Después de $5 gratis, cobra por uso
   - Stripe cobra comisiones por transacción (verifica sus tarifas)

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu pasarela de pagos estará funcionando en producción con Railway.

Si tienes problemas, revisa los logs en Railway y la consola del navegador (F12) para más detalles.

