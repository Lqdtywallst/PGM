# ✅ Cómo Verificar que el Deployment Funciona

## 🔍 Pasos para Verificar

### 1. Verificar el Estado del Deployment

1. Ve a [Railway Dashboard](https://railway.app)
2. Selecciona tu proyecto "PGM"
3. Ve a la pestaña **"Deployments"**
4. Busca el deployment más reciente

**Estados posibles:**
- ✅ **"Running"** (verde) = Funcionando correctamente
- ⏳ **"Building"** o **"Deploying"** = Aún desplegando
- ❌ **"Crashed"** (rojo) = Hay un error

---

### 2. Verificar los Logs

1. Haz clic en el deployment más reciente
2. Ve a la pestaña **"Deploy Logs"**
3. Busca estos mensajes:

#### ✅ **Si está funcionando:**
```
✅ Servidor corriendo en puerto 8080
✅ Servidor listo para recibir peticiones
```

#### ❌ **Si hay error:**
- Busca mensajes en rojo
- Busca `Error:` o `❌`
- Copia el error completo

---

### 3. Probar la Conexión

Abre en tu navegador estos endpoints:

#### Test 1: Health Check
```
https://pgm-production.up.railway.app/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-03T..."
}
```

#### Test 2: API Test
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

#### Test 3: Root
```
https://pgm-production.up.railway.app/
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "message": "🚗 Prestige Goal Motion - API Server",
  "endpoints": {...}
}
```

---

## 🆘 Si Sigue Dando Error

### Opción 1: Forzar Restart

1. Railway → Tu Servicio
2. Haz clic en el botón **"Restart"** (rojo)
3. Espera 2-3 minutos
4. Verifica los logs

### Opción 2: Verificar Variables de Entorno

1. Railway → Variables
2. Verifica que tengas:
   - `STRIPE_SECRET_KEY` (obligatoria)
   - `EMAIL_SERVICE=gmail`
   - `EMAIL_USER=prestigegoalmotion@gmail.com`
   - `EMAIL_APP_PASSWORD=...`
   - `PORT=3000` (opcional)
   - `NODE_ENV=production`

### Opción 3: Ver Logs en Tiempo Real

1. Railway → Deployments → Logs
2. Los logs se actualizan automáticamente
3. Busca cualquier error en rojo
4. Si ves errores, cópialos y compártelos

---

## 📋 Checklist de Verificación

- [ ] Deployment muestra "Running" (no "Crashed")
- [ ] Logs muestran "Servidor corriendo en puerto X"
- [ ] Logs muestran "Servidor listo para recibir peticiones"
- [ ] `/health` responde correctamente
- [ ] `/api/test` responde correctamente
- [ ] Sin errores en rojo en los logs
- [ ] Variables de entorno configuradas

---

## 💡 Tip: Ver Logs en Tiempo Real

1. Railway → Deployments
2. Haz clic en el deployment más reciente
3. Los logs se actualizan automáticamente
4. Si haces una petición, deberías ver:
   ```
   [2026-01-03...] GET /api/test
   ```

---

## 🎯 Si Todo Está Bien

Si el deployment muestra "Running" y los endpoints responden:

1. **Recarga tu sitio web** (Ctrl + Shift + R)
2. **Prueba hacer una reserva**
3. **El error debería desaparecer**

---

## 🆘 Si Nada Funciona

1. **Comparte los logs** de Railway (especialmente errores en rojo)
2. **Comparte el estado** del deployment (Running/Crashed)
3. **Comparte la respuesta** de `/api/test` si es que responde

Con esta información podré ayudarte a resolver el problema específico.

