# 🌐 Obtener URL Pública de Railway

## ⚠️ Importante: Dominio Interno vs Público

- **`pgm.railway.internal`** = Dominio INTERNO (solo funciona dentro de Railway)
- **`pgm.railway.app`** = Dominio PÚBLICO (accesible desde internet)

Para el frontend, necesitas el dominio **PÚBLICO** (`.railway.app`).

---

## 🔧 Cómo Obtener la URL Pública

### Opción 1: Desde el Dashboard de Railway (Recomendado)

1. Ve a [railway.app](https://railway.app) e inicia sesión
2. Selecciona tu proyecto (el que tiene el servicio `pgm`)
3. Haz clic en el servicio (debería llamarse algo como "Web Service" o "Backend")
4. Ve a la pestaña **"Settings"** (o **"Networking"**)
5. Busca la sección **"Domains"** o **"Public Domain"**
6. Deberías ver algo como:
   ```
   https://pgm-production-xxxx.up.railway.app
   ```
7. **Copia esta URL completa** (debe terminar en `.railway.app`)

### Opción 2: Generar un Dominio Público

Si no ves un dominio público:

1. En Railway → Tu Servicio → **Settings** → **Networking**
2. Haz clic en **"Generate Domain"** o **"Add Domain"**
3. Railway generará automáticamente una URL como:
   ```
   https://pgm-production-xxxx.up.railway.app
   ```
4. **Copia esta URL**

### Opción 3: Desde los Logs

1. En Railway → Tu Servicio → **Deployments**
2. Abre el deployment más reciente
3. En los logs, busca líneas como:
   ```
   ✅ Servidor corriendo en puerto 3000
   🌐 URL: https://pgm-production-xxxx.up.railway.app
   ```
4. **Copia la URL** que aparece en los logs

---

## ✅ Verificar que la URL Funciona

Una vez que tengas la URL pública, verifica que funciona:

1. Abre tu navegador
2. Visita: `https://tu-url.railway.app/api/test`
3. Deberías ver una respuesta JSON:
   ```json
   {
     "status": "ok",
     "message": "Servidor funcionando correctamente"
   }
   ```

Si ves esta respuesta, ✅ la URL es correcta y está funcionando.

---

## 🔄 Actualizar config.js

Una vez que tengas la URL pública, actualiza `config.js`:

```javascript
const PROD_CONFIG = {
    publishableKey: 'pk_live_51RsMXQ3DSCa2l71zZiMkmlBXXpLu1HF0Sy4N4xSsB1TvUWu6wJLlKR5z7HrCa0AIlWQjfZo4tL8d1qcxtgExNHS300EPCAtXti',
    backendUrl: 'https://pgm-production-xxxx.up.railway.app', // ⬅️ TU URL PÚBLICA AQUÍ
    currency: 'eur',
    country: 'ES'
};
```

Y cambia el entorno:

```javascript
const ENVIRONMENT = 'production'; // ⬅️ Cambia a 'production'
```

---

## 🆘 Si No Puedes Encontrar la URL

1. **Verifica que el servicio esté desplegado:**
   - Railway → Deployments → Debe tener un check verde ✅

2. **Verifica que el servicio esté corriendo:**
   - Railway → Logs → Debe mostrar "Servidor corriendo"

3. **Genera un dominio manualmente:**
   - Settings → Networking → Generate Domain

4. **Contacta con Railway:**
   - Si nada funciona, puede que necesites verificar tu plan de Railway

---

## 📝 Ejemplo de URL Correcta

✅ **Correcto:**
```
https://pgm-production-xxxx.up.railway.app
https://prestige-backend-production-xxxx.up.railway.app
```

❌ **Incorrecto (no funcionará desde el navegador):**
```
pgm.railway.internal
http://pgm.railway.internal
```

---

## 🎯 Checklist

- [ ] URL pública obtenida (termina en `.railway.app`)
- [ ] URL verificada en el navegador (`/api/test` responde)
- [ ] `config.js` actualizado con la URL pública
- [ ] `ENVIRONMENT` cambiado a `'production'`
- [ ] Frontend probado y funcionando

