# 🚀 Configurar Modo Producción - Guía Completa

## 📋 Pasos para Configurar Modo Producción

### 1. Configurar NODE_ENV en Railway

1. Ve a [Railway Dashboard](https://railway.app)
2. Selecciona tu proyecto "PGM"
3. Ve a la pestaña **"Variables"**
4. Busca `NODE_ENV`:
   - Si existe, edítala
   - Si no existe, haz clic en **"New Variable"**
5. Configura:
   - **Nombre:** `NODE_ENV`
   - **Valor:** `production`
6. Haz clic en **"Add"** o **"Save"**

### 2. Verificar config.js

El archivo `config.js` ya debería tener:
```javascript
const ENVIRONMENT = 'production';
```

Si no, cámbialo a `'production'`.

### 3. Verificar Variables de Entorno en Railway

Asegúrate de tener todas estas variables configuradas:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
NODE_ENV=production
PORT=3000
```

**⚠️ IMPORTANTE:**
- `STRIPE_SECRET_KEY` debe ser una clave **LIVE** (`sk_live_...`)
- `NODE_ENV=production` es importante para optimizaciones

### 4. Verificar Claves de Stripe

En `config.js`, verifica que uses claves **LIVE**:

```javascript
const PROD_CONFIG = {
    publishableKey: 'pk_live_...', // ⬅️ Debe ser LIVE
    backendUrl: 'https://pgm-production.up.railway.app',
    // ...
};
```

### 5. Forzar Redeploy

Después de configurar las variables:

1. Railway → Tu Servicio
2. Haz clic en **"Restart"** o **"Redeploy"**
3. Espera 2-3 minutos
4. Verifica los logs

---

## ✅ Verificación

Después de configurar, en los logs deberías ver:

```
🔧 Modo: production
```

En lugar de:

```
🔧 Modo: development
```

---

## 📋 Checklist de Producción

- [ ] `NODE_ENV=production` configurado en Railway
- [ ] `ENVIRONMENT = 'production'` en `config.js`
- [ ] Claves de Stripe son **LIVE** (`sk_live_...` y `pk_live_...`)
- [ ] `backendUrl` apunta a Railway (no localhost)
- [ ] Todas las variables de entorno configuradas
- [ ] Redeploy realizado
- [ ] Logs muestran "Modo: production"

---

## 🎯 Después de Configurar

1. **Espera 2-3 minutos** para que Railway redespliegue
2. **Verifica los logs** - deberías ver "Modo: production"
3. **Prueba la conexión** - `https://pgm-production.up.railway.app/api/test`

---

## ⚠️ Importante

En modo producción:
- ✅ Los pagos son **REALES** (se cobra dinero de verdad)
- ✅ Usa tarjetas de prueba solo para testing
- ✅ Las claves deben ser **LIVE** (no test)
- ✅ El backend debe estar desplegado y funcionando

