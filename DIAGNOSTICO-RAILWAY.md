# 🔍 Diagnóstico de Problemas con Railway

## ❌ Problema: Backend no responde (Timeout)

Si el backend en Railway no está respondiendo, sigue estos pasos:

---

## 🔧 Paso 1: Verificar que el Backend esté Desplegado

1. Ve a [Railway Dashboard](https://railway.app)
2. Selecciona tu proyecto
3. Verifica que haya un servicio desplegado
4. Busca el deployment más reciente
5. Debe tener un **check verde ✅** (éxito) o **X rojo ❌** (error)

### Si hay un error (❌):
- Haz clic en el deployment fallido
- Revisa los **logs** para ver el error específico
- Los errores comunes son:
  - `Cannot find module` → Faltan dependencias
  - `STRIPE_SECRET_KEY not configured` → Falta variable de entorno
  - `Port already in use` → Problema de configuración

---

## 🔧 Paso 2: Verificar Variables de Entorno

En Railway → Tu Servicio → **Variables**, verifica que estén configuradas:

### Variables Requeridas:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
PORT=3000
NODE_ENV=production
```

### ⚠️ Errores Comunes:

1. **STRIPE_SECRET_KEY no configurada:**
   - El backend no iniciará sin esta variable
   - Verifica que uses la clave **LIVE** (`sk_live_...`)

2. **EMAIL_APP_PASSWORD incorrecta:**
   - Debe ser una Contraseña de Aplicación de Gmail
   - Obtén una nueva en: https://myaccount.google.com/apppasswords

3. **Variables con espacios extra:**
   - Asegúrate de que no haya espacios antes o después del `=`
   - Ejemplo correcto: `STRIPE_SECRET_KEY=sk_live_xxx`
   - Ejemplo incorrecto: `STRIPE_SECRET_KEY = sk_live_xxx`

---

## 🔧 Paso 3: Revisar los Logs

1. En Railway → Tu Servicio → **Deployments**
2. Haz clic en el deployment más reciente
3. Revisa los **logs** (scroll hacia abajo)

### Logs Esperados (si todo está bien):

```
✅ Servidor corriendo en puerto 3000
✅ Servidor de email configurado correctamente
🌐 URL: http://localhost:3000
```

### Errores Comunes en los Logs:

#### Error: "STRIPE_SECRET_KEY no está configurada"
```
❌ ERROR: STRIPE_SECRET_KEY no está configurada en .env
```
**Solución:** Agrega `STRIPE_SECRET_KEY` en Railway → Variables

#### Error: "Cannot find module"
```
Error: Cannot find module 'express'
```
**Solución:** Railway debería instalar dependencias automáticamente. Si no, verifica que `package.json` tenga todas las dependencias.

#### Error: "Port already in use"
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solución:** Railway asigna el puerto automáticamente. El código ya usa `process.env.PORT || 3000`, así que debería funcionar.

#### Error: "Email authentication failed"
```
❌ Error al verificar conexión con servidor de email: Invalid login
```
**Solución:** Verifica que `EMAIL_APP_PASSWORD` sea una Contraseña de Aplicación válida de Gmail.

---

## 🔧 Paso 4: Verificar la URL Pública

1. En Railway → Tu Servicio → **Settings** → **Networking**
2. Verifica que haya un dominio público configurado
3. Debe ser algo como: `https://pgm-production.up.railway.app`
4. Si no hay dominio, haz clic en **"Generate Domain"**

### Probar la URL:

Abre en tu navegador:
```
https://pgm-production.up.railway.app/api/test
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "message": "Servidor funcionando correctamente"
}
```

---

## 🔧 Paso 5: Forzar un Nuevo Deployment

Si el backend no está funcionando:

1. En Railway → Tu Servicio → **Settings** → **Deploy**
2. Haz clic en **"Redeploy"** o **"Deploy Latest"**
3. Espera a que termine el deployment
4. Revisa los logs para ver si hay errores

---

## 🔧 Paso 6: Verificar el Código del Backend

Asegúrate de que `backend-example.js` tenga:

1. **Puerto configurado correctamente:**
   ```javascript
   const PORT = process.env.PORT || 3000;
   ```

2. **CORS configurado:**
   ```javascript
   app.use(cors({
       origin: '*',
       methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
   }));
   ```

3. **Endpoints configurados:**
   - `/api/test` - Para verificar que funciona
   - `/api/contact` - Para el formulario de contacto
   - `/api/reserve` - Para las reservas

---

## 🔧 Paso 7: Verificar Railway.json

El archivo `railway.json` debe tener:

```json
{
  "deploy": {
    "startCommand": "node backend-example.js"
  }
}
```

---

## 🆘 Soluciones Rápidas

### Solución 1: Reiniciar el Servicio

1. Railway → Tu Servicio → **Settings**
2. Busca **"Restart Service"** o **"Redeploy"**
3. Haz clic y espera a que reinicie

### Solución 2: Verificar el Start Command

1. Railway → Tu Servicio → **Settings** → **Deploy**
2. Verifica que **Start Command** sea: `node backend-example.js`
3. Si no, cámbialo y haz **"Redeploy"**

### Solución 3: Verificar que el Repositorio esté Conectado

1. Railway → Tu Proyecto → **Settings** → **Source**
2. Verifica que el repositorio de GitHub esté conectado
3. Verifica que la rama sea `main` o `master`

---

## 📋 Checklist de Diagnóstico

- [ ] Backend desplegado en Railway (check verde ✅)
- [ ] Variables de entorno configuradas (todas las requeridas)
- [ ] Logs sin errores críticos
- [ ] URL pública generada y funcionando
- [ ] `/api/test` responde correctamente
- [ ] Start Command correcto: `node backend-example.js`
- [ ] Repositorio conectado y actualizado

---

## 🆘 Si Nada Funciona

1. **Crea un nuevo servicio en Railway:**
   - A veces es más rápido empezar de nuevo
   - Railway → New Service → Deploy from GitHub

2. **Verifica el plan de Railway:**
   - El plan gratuito tiene limitaciones
   - Verifica que no hayas excedido los límites

3. **Contacta con Railway Support:**
   - Si nada funciona, puede ser un problema de Railway
   - Ve a Railway → Help → Support

---

## 📝 Información para Debugging

Si necesitas ayuda adicional, proporciona:

1. **Logs del backend** (Railway → Deployments → Logs)
2. **Variables de entorno configuradas** (sin mostrar valores sensibles)
3. **URL del backend** (ej: `https://pgm-production.up.railway.app`)
4. **Error específico** que ves en el navegador (F12 → Console)

