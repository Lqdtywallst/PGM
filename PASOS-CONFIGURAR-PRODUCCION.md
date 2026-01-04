# 🚀 Pasos para Configurar Modo Producción

## 📋 Configuración Completa

### Paso 1: Agregar NODE_ENV en Railway

1. Ve a [Railway Dashboard](https://railway.app)
2. Selecciona tu proyecto "PGM"
3. Haz clic en tu servicio (el que tiene el backend)
4. Ve a la pestaña **"Variables"** (arriba, junto a "Deployments")
5. Haz clic en **"New Variable"**
6. Configura:
   - **Nombre:** `NODE_ENV`
   - **Valor:** `production`
7. Haz clic en **"Add"**

### Paso 2: Verificar Variables Existentes

Asegúrate de que tengas todas estas variables:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
NODE_ENV=production
PORT=3000
```

### Paso 3: Esperar el Redeploy

Después de agregar `NODE_ENV`:
- Railway redesplegará automáticamente
- Espera 2-3 minutos
- Verifica los logs

### Paso 4: Verificar en los Logs

En los Deploy Logs deberías ver:

```
🔧 Modo: production
```

En lugar de:

```
🔧 Modo: development
```

---

## ✅ Checklist de Producción

- [x] `ENVIRONMENT = 'production'` en `config.js`
- [ ] `NODE_ENV=production` en Railway Variables
- [x] Claves Stripe son LIVE (`pk_live_...` y `sk_live_...`)
- [x] `backendUrl` apunta a Railway
- [x] Todas las variables de entorno configuradas
- [ ] Logs muestran "Modo: production"

---

## 🎯 Después de Configurar

1. **Espera 2-3 minutos** para que Railway redespliegue
2. **Verifica los logs** - deberías ver "Modo: production"
3. **El servidor seguirá funcionando** igual de bien

---

## ⚠️ Importante

En modo producción:
- ✅ Los pagos son **REALES** (se cobra dinero de verdad)
- ✅ Usa tarjetas de prueba solo para testing
- ✅ Las claves deben ser **LIVE** (no test)

