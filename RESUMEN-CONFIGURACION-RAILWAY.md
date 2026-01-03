# 🚀 Resumen Rápido - Configurar Railway para Pagos

## ⚡ Pasos Rápidos

### 1️⃣ Crear Proyecto en Railway
- Ve a [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
- Selecciona tu repositorio

### 2️⃣ Configurar Variables de Entorno
En Railway → **Variables**, agrega:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
PORT=3000
NODE_ENV=production
```

### 3️⃣ Obtener URL del Backend
- Railway → **Settings** → **Networking** → **Generate Domain**
- Copia la URL (ej: `https://tu-backend.railway.app`)

### 4️⃣ Actualizar config.js
Abre `config.js` y cambia:

```javascript
const ENVIRONMENT = 'production'; // ⬅️ Cambia a 'production'
```

Y actualiza la URL:

```javascript
const PROD_CONFIG = {
    backendUrl: 'https://tu-backend.railway.app', // ⬅️ Tu URL de Railway
    // ...
};
```

### 5️⃣ Verificar
- Visita: `https://tu-backend.railway.app/api/test`
- Deberías ver: `{"status":"ok",...}`

---

## 📚 Documentación Completa

- **Guía completa**: `CONFIGURAR-RAILWAY.md`
- **Variables de entorno**: `VARIABLES-ENTORNO-RAILWAY.md`
- **Actualizar config.js**: `ACTUALIZAR-CONFIG-PARA-RAILWAY.md`

---

## ✅ Checklist Final

- [ ] Proyecto creado en Railway
- [ ] Variables de entorno configuradas
- [ ] URL del backend obtenida
- [ ] `config.js` actualizado
- [ ] Endpoint `/api/test` funciona
- [ ] Prueba de pago realizada

---

## 🆘 ¿Problemas?

1. Revisa los **logs** en Railway → Deployments
2. Verifica que todas las **variables de entorno** estén configuradas
3. Asegúrate de usar claves **LIVE** de Stripe (`sk_live_...` y `pk_live_...`)
4. Consulta `CONFIGURAR-RAILWAY.md` para troubleshooting detallado

