# ⚡ Solución Rápida - Backend no Responde en Railway

## 🎯 Problema: Timeout al conectar con `https://pgm-production.up.railway.app`

---

## ✅ Solución Paso a Paso (5 minutos)

### 1️⃣ Verificar Variables de Entorno en Railway

**CRÍTICO:** El backend NO iniciará sin estas variables.

1. Ve a [Railway Dashboard](https://railway.app)
2. Selecciona tu proyecto → Tu servicio
3. Ve a la pestaña **"Variables"**
4. Verifica que tengas estas variables:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_SERVICE=gmail
EMAIL_USER=prestigegoalmotion@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
PORT=3000
NODE_ENV=production
```

**⚠️ IMPORTANTE:**
- `STRIPE_SECRET_KEY` es **OBLIGATORIA** - sin ella el backend no iniciará
- Usa la clave **LIVE** (`sk_live_...`) para producción
- `EMAIL_APP_PASSWORD` debe ser una Contraseña de Aplicación de Gmail

### 2️⃣ Verificar Logs del Backend

1. En Railway → Tu Servicio → **"Deployments"**
2. Haz clic en el deployment más reciente
3. Revisa los **logs** (scroll hacia abajo)

#### ✅ Si ves esto, está funcionando:
```
✅ Servidor corriendo en puerto 3000
✅ Servidor de email configurado correctamente
```

#### ❌ Si ves esto, hay un error:
```
❌ ERROR: STRIPE_SECRET_KEY no está configurada
```
**Solución:** Agrega `STRIPE_SECRET_KEY` en Railway → Variables

### 3️⃣ Forzar un Nuevo Deployment

1. Railway → Tu Servicio → **Settings** → **Deploy**
2. Haz clic en **"Redeploy"** o **"Deploy Latest"**
3. Espera 2-3 minutos
4. Revisa los logs para ver si hay errores

### 4️⃣ Verificar la URL Pública

1. Railway → Tu Servicio → **Settings** → **Networking**
2. Verifica que haya un dominio público
3. Si no hay, haz clic en **"Generate Domain"**
4. Debe ser: `https://pgm-production.up.railway.app`

### 5️⃣ Probar la Conexión

Abre en tu navegador:
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

**Si no funciona:**
- Revisa los logs en Railway
- Verifica las variables de entorno
- Intenta hacer "Redeploy"

---

## 🔍 Errores Comunes y Soluciones

### Error 1: "STRIPE_SECRET_KEY no está configurada"

**Síntoma:** El backend no inicia, logs muestran este error.

**Solución:**
1. Ve a Railway → Variables
2. Agrega: `STRIPE_SECRET_KEY=sk_live_tu_clave_aqui`
3. Haz "Redeploy"

### Error 2: "Cannot find module"

**Síntoma:** Error en los logs sobre módulos faltantes.

**Solución:**
1. Verifica que `package.json` tenga todas las dependencias
2. Railway debería instalar automáticamente
3. Si no, haz "Redeploy"

### Error 3: "Invalid login" (Email)

**Síntoma:** Error de autenticación de email en los logs.

**Solución:**
1. Obtén una nueva Contraseña de Aplicación: https://myaccount.google.com/apppasswords
2. Actualiza `EMAIL_APP_PASSWORD` en Railway → Variables
3. Haz "Redeploy"

### Error 4: Timeout al conectar

**Síntoma:** El frontend no puede conectar con el backend.

**Solución:**
1. Verifica que el backend esté corriendo (logs)
2. Verifica que la URL sea correcta (termina en `.railway.app`)
3. Verifica que no haya errores en los logs
4. Intenta hacer "Redeploy"

---

## 📋 Checklist Rápido

- [ ] Variables de entorno configuradas (todas las 6)
- [ ] `STRIPE_SECRET_KEY` configurada (clave LIVE)
- [ ] Logs muestran "Servidor corriendo"
- [ ] URL pública generada
- [ ] `/api/test` responde en el navegador
- [ ] Sin errores en los logs

---

## 🆘 Si Nada Funciona

1. **Crea un nuevo servicio:**
   - Railway → New Service → Deploy from GitHub
   - Configura las variables de entorno
   - Espera a que se despliegue

2. **Verifica el plan de Railway:**
   - El plan gratuito tiene limitaciones
   - Verifica que no hayas excedido los límites

3. **Revisa la documentación completa:**
   - `DIAGNOSTICO-RAILWAY.md` - Guía detallada
   - `CONFIGURAR-RAILWAY.md` - Configuración completa

---

## 💡 Tip: Verificar desde la Consola del Navegador

1. Abre tu sitio web
2. Presiona **F12** para abrir la consola
3. Busca mensajes como:
   - `✅ Backend conectado correctamente` → Todo bien
   - `⚠️ No se pudo conectar con el backend` → Problema de conexión
   - `❌ Error al enviar mensaje` → Problema específico

Los mensajes en la consola te dirán exactamente qué está fallando.

