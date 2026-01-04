# 🚀 Guía de Despliegue del Backend en Producción

## 📋 Opciones de Plataformas

### Opción 1: Railway (Recomendado - Gratis para empezar)
- ✅ Fácil de usar
- ✅ Soporte para Node.js
- ✅ Variables de entorno fáciles
- ✅ HTTPS automático
- ✅ URL gratuita: `*.railway.app`

### Opción 2: Render
- ✅ Gratis con limitaciones
- ✅ Fácil configuración
- ✅ Auto-deploy desde Git
- ✅ URL gratuita: `*.onrender.com`

### Opción 3: Heroku
- ✅ Popular y confiable
- ❌ Ya no tiene plan gratuito
- ⚠️ Requiere tarjeta de crédito

## 🔧 Pasos para Desplegar en Railway

### Paso 1: Crear cuenta en Railway

1. Ve a [https://railway.app](https://railway.app)
2. Haz clic en "Start a New Project"
3. Inicia sesión con GitHub (recomendado) o email

### Paso 2: Crear Nuevo Proyecto

1. Haz clic en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Autoriza Railway para acceder a tu repositorio
4. Selecciona tu repositorio: `PGM` o `Web-PRESTIGE-GOAL-MOTION`

### Paso 3: Configurar el Proyecto

1. Railway detectará automáticamente que es Node.js
2. Si no lo detecta, selecciona "Node.js" como template

### Paso 4: Configurar Variables de Entorno

En Railway, ve a tu proyecto → "Variables" y agrega:

```env
STRIPE_SECRET_KEY=sk_live_tu_clave_secreta_aqui
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=vayd xalk cmlq nvef
PORT=3000
NODE_ENV=production
```

**⚠️ IMPORTANTE:**
- Usa tu clave secreta de Stripe en modo **LIVE** (`sk_live_...`)
- La contraseña de email debe ser una "App Password" de Gmail

### Paso 5: Configurar el Start Command

En Railway → Settings → Deploy → Start Command:
```
node backend-example.js
```

O si tienes un script en package.json:
```
npm start
```

### Paso 6: Obtener la URL del Backend

1. Una vez desplegado, Railway te dará una URL
2. Será algo como: `https://prestige-backend-production-xxxx.up.railway.app`
3. Copia esta URL

### Paso 7: Actualizar config.js en el Frontend

Edita `config.js` y cambia:

```javascript
backendUrl: 'https://tu-backend-url.railway.app',
```

### Paso 8: Desplegar el Frontend Actualizado

1. Haz commit y push de los cambios a Git
2. Si usas Netlify/Vercel, se desplegará automáticamente
3. O haz push manual a tu plataforma de hosting

## 🔧 Pasos para Desplegar en Render

### Paso 1: Crear cuenta en Render

1. Ve a [https://render.com](https://render.com)
2. Crea una cuenta (puedes usar GitHub)

### Paso 2: Crear Nuevo Web Service

1. Haz clic en "New +" → "Web Service"
2. Conecta tu repositorio de GitHub
3. Selecciona tu repositorio

### Paso 3: Configurar el Servicio

- **Name**: `prestige-backend`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node backend-example.js`

### Paso 4: Configurar Variables de Entorno

En "Environment Variables", agrega las mismas variables que en Railway

### Paso 5: Desplegar

1. Haz clic en "Create Web Service"
2. Render construirá y desplegará tu backend
3. Obtendrás una URL como: `https://prestige-backend.onrender.com`

## ✅ Verificación Post-Despliegue

1. **Verificar que el backend esté corriendo:**
   - Visita: `https://tu-backend-url.com/api/test`
   - Deberías ver una respuesta JSON

2. **Probar el endpoint de pagos:**
   - Visita: `https://tu-backend-url.com/api/create-payment-intent`
   - Debería responder (puede dar error sin datos, pero eso es normal)

3. **Verificar logs:**
   - En Railway/Render, ve a "Logs"
   - Deberías ver: "✅ Servidor corriendo en puerto X"

## 🔒 Seguridad en Producción

1. ✅ Usa HTTPS (Railway/Render lo proporcionan automáticamente)
2. ✅ NO expongas `STRIPE_SECRET_KEY` en el frontend
3. ✅ Usa variables de entorno para todas las claves secretas
4. ✅ Considera usar un firewall/WAF para proteger endpoints

## 📝 Checklist Final

- [ ] Backend desplegado y corriendo
- [ ] Variables de entorno configuradas
- [ ] URL del backend obtenida
- [ ] `config.js` actualizado con la URL de producción
- [ ] Frontend actualizado y desplegado
- [ ] Prueba de pago realizada exitosamente
- [ ] Logs verificados sin errores

## 🆘 Troubleshooting

### Error: "Cannot find module"
- Asegúrate de que `package.json` tenga todas las dependencias
- Verifica que el Build Command incluya `npm install`

### Error: "Port already in use"
- Railway/Render asignan el puerto automáticamente
- Usa `process.env.PORT || 3000` en tu código (ya está así)

### Error: "Stripe key invalid"
- Verifica que uses la clave correcta (Live para producción)
- Asegúrate de que no haya espacios extra en las variables

### El backend no responde
- Verifica los logs en Railway/Render
- Asegúrate de que el Start Command sea correcto
- Verifica que el puerto esté configurado correctamente





