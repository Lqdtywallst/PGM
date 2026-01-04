# 🚀 Resumen Rápido - Desplegar Backend en Producción

## ⚡ Opción Rápida: Railway (5 minutos)

### 1. Crear cuenta y proyecto
- Ve a: https://railway.app
- Clic en "Start a New Project"
- Inicia sesión con GitHub
- Selecciona "Deploy from GitHub repo"
- Elige tu repositorio

### 2. Configurar Variables de Entorno
En Railway → Tu Proyecto → Variables, agrega:

```
STRIPE_SECRET_KEY=sk_live_tu_clave_secreta_de_stripe
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=vayd xalk cmlq nvef
NODE_ENV=production
```

**⚠️ IMPORTANTE:** Usa tu clave secreta de Stripe en modo **LIVE** (empieza con `sk_live_`)

### 3. Obtener URL del Backend
- Railway te dará una URL automáticamente
- Ejemplo: `https://prestige-backend-production-xxxx.up.railway.app`
- Cópiala

### 4. Actualizar config.js
Edita `config.js` y cambia:

```javascript
backendUrl: 'https://tu-url-railway.railway.app',
```

### 5. Hacer Commit y Push
```bash
git add config.js
git commit -m "Configurar backend URL de producción"
git push
```

### 6. Verificar
- Visita: `https://tu-url-railway.railway.app/api/test`
- Deberías ver: `{"status":"ok","message":"Backend funcionando"}`

## ✅ Listo!

Tu backend estará disponible 24/7 en producción.





