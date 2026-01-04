# 🔧 Solución: Backend de Railway No Responde

## ❌ Problema Actual

El frontend está configurado correctamente y usa:
```
https://pgm-production.up.railway.app
```

Pero el backend **NO está respondiendo**. Esto significa que:

1. ✅ El frontend está bien configurado
2. ❌ El backend de Railway no está funcionando

---

## 🔍 Diagnóstico Rápido

### Paso 1: Verificar que el Backend esté Desplegado

1. Ve a [Railway Dashboard](https://railway.app)
2. Inicia sesión
3. Selecciona tu proyecto
4. Busca el servicio (probablemente llamado "Web Service" o similar)

**¿Qué buscar?**
- ✅ **Check verde** = Deployment exitoso
- ❌ **X rojo** = Deployment fallido
- ⏳ **En progreso** = Aún desplegando

---

### Paso 2: Verificar los Logs

1. En Railway → Tu Servicio → **Deployments**
2. Haz clic en el deployment más reciente
3. Revisa los **logs** (scroll hacia abajo)

#### ✅ **Si está funcionando, verás:**
```
✅ Servidor corriendo en puerto 3000
✅ Servidor de email configurado correctamente
🌐 URL: http://localhost:3000
```

#### ❌ **Si hay un error, verás algo como:**
```
❌ ERROR: STRIPE_SECRET_KEY no está configurada en .env
```

O:
```
Error: Cannot find module 'express'
```

---

### Paso 3: Verificar Variables de Entorno

**CRÍTICO:** El backend NO iniciará sin estas variables.

1. Railway → Tu Servicio → **Variables**
2. Verifica que tengas estas variables configuradas:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
PORT=3000
NODE_ENV=production
```

**⚠️ IMPORTANTE:**
- `STRIPE_SECRET_KEY` es **OBLIGATORIA**
- Si falta, el backend NO iniciará
- Debe ser una clave **LIVE** (`sk_live_...`)

---

## 🔧 Soluciones

### Solución 1: Agregar Variables de Entorno Faltantes

Si falta `STRIPE_SECRET_KEY`:

1. Ve a [Stripe Dashboard](https://dashboard.stripe.com)
2. Asegúrate de estar en modo **LIVE** (toggle arriba)
3. Ve a **Developers** → **API keys**
4. Copia la **Secret key** (empieza con `sk_live_...`)
5. En Railway → Variables → Agrega:
   ```
   STRIPE_SECRET_KEY=sk_live_tu_clave_aqui
   ```
6. Haz clic en **"Redeploy"** o espera a que se redespliegue automáticamente

### Solución 2: Forzar un Nuevo Deployment

1. Railway → Tu Servicio → **Settings** → **Deploy**
2. Haz clic en **"Redeploy"** o **"Deploy Latest"**
3. Espera 2-3 minutos
4. Revisa los logs para ver si hay errores

### Solución 3: Verificar el Start Command

1. Railway → Tu Servicio → **Settings** → **Deploy**
2. Verifica que **Start Command** sea:
   ```
   node backend-example.js
   ```
3. Si no, cámbialo y haz **"Redeploy"**

---

## 🧪 Probar la Conexión

Una vez que hayas configurado las variables y hecho redeploy:

1. Espera 2-3 minutos a que termine el deployment
2. Abre en tu navegador:
   ```
   https://pgm-production.up.railway.app/api/test
   ```

**Si funciona, verás:**
```json
{
  "status": "ok",
  "message": "Servidor funcionando correctamente"
}
```

**Si NO funciona:**
- Revisa los logs en Railway
- Verifica que todas las variables estén configuradas
- Verifica que no haya errores en los logs

---

## 📋 Checklist de Verificación

- [ ] Backend desplegado en Railway (check verde ✅)
- [ ] Variables de entorno configuradas (todas las 6)
- [ ] `STRIPE_SECRET_KEY` configurada (clave LIVE)
- [ ] Logs muestran "Servidor corriendo"
- [ ] Sin errores en los logs
- [ ] `/api/test` responde en el navegador
- [ ] Start Command correcto: `node backend-example.js`

---

## 🆘 Errores Comunes

### Error: "STRIPE_SECRET_KEY no está configurada"

**Síntoma:** Logs muestran este error y el backend no inicia.

**Solución:**
1. Agrega `STRIPE_SECRET_KEY` en Railway → Variables
2. Usa una clave **LIVE** (`sk_live_...`)
3. Haz "Redeploy"

### Error: "Cannot find module"

**Síntoma:** Error sobre módulos faltantes en los logs.

**Solución:**
1. Verifica que `package.json` tenga todas las dependencias
2. Railway debería instalar automáticamente
3. Si no, haz "Redeploy"

### Error: "Invalid login" (Email)

**Síntoma:** Error de autenticación de email en los logs.

**Solución:**
1. Obtén una nueva Contraseña de Aplicación: https://myaccount.google.com/apppasswords
2. Actualiza `EMAIL_APP_PASSWORD` en Railway → Variables
3. Haz "Redeploy"

---

## 💡 Tip: Ver Logs en Tiempo Real

1. Railway → Tu Servicio → **Deployments**
2. Haz clic en el deployment más reciente
3. Los logs se actualizan en tiempo real
4. Busca errores en rojo o mensajes de error

---

## 🎯 Próximos Pasos

1. **Verifica los logs** en Railway para ver el error específico
2. **Configura las variables de entorno** faltantes
3. **Haz "Redeploy"** del servicio
4. **Prueba la URL** en el navegador: `https://pgm-production.up.railway.app/api/test`

---

## 📝 Información para Debugging

Si necesitas ayuda adicional, proporciona:

1. **Logs del backend** (Railway → Deployments → Logs)
2. **Variables de entorno configuradas** (sin mostrar valores sensibles)
3. **Error específico** que ves en los logs

Con esta información podré ayudarte a resolver el problema específico.

