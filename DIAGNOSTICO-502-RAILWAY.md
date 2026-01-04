# 🔍 Diagnóstico: Error 502 en Railway (Backend No Responde)

## ❌ Problema

Railway muestra que todo está bien, pero el backend devuelve **Error 502 Bad Gateway**.

Esto significa:
- ✅ Railway está funcionando
- ✅ El servicio está desplegado
- ❌ El backend no está respondiendo a las peticiones

---

## 🔍 Verificaciones Detalladas

### 1. Verificar que el Backend Realmente Esté Corriendo

En Railway → Logs, busca estos mensajes:

#### ✅ **Si está corriendo:**
```
✅ Servidor corriendo en puerto 3000
🚀 SERVIDOR PRESTIGE GOAL MOTION
```

#### ❌ **Si NO está corriendo:**
- No verás estos mensajes
- O verás errores antes de estos mensajes

---

### 2. Verificar el Puerto

Railway asigna el puerto automáticamente. El código debe usar:

```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    // ...
});
```

**⚠️ IMPORTANTE:** El backend debe escuchar en `0.0.0.0`, no en `localhost` o `127.0.0.1`.

---

### 3. Verificar que Express Esté Configurado Correctamente

El backend debe tener:

```javascript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

---

### 4. Verificar que No Haya Errores Después de Iniciar

A veces el backend inicia pero luego se crashea. Revisa los logs para ver si hay errores después de:
```
✅ Servidor corriendo en puerto X
```

---

## 🔧 Soluciones

### Solución 1: Verificar que el Backend Escuche en 0.0.0.0

Abre `backend-example.js` y verifica que `app.listen` sea:

```javascript
app.listen(PORT, '0.0.0.0', () => {
    // ...
});
```

Si solo dice `app.listen(PORT, ...)`, cámbialo a:

```javascript
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
    // ...
});
```

**¿Por qué?** Railway necesita que el servidor escuche en `0.0.0.0` para aceptar conexiones externas.

---

### Solución 2: Verificar Variables de Entorno

Aunque Railway diga que está bien, verifica manualmente:

1. Railway → Variables
2. Verifica que tengas:
   - `STRIPE_SECRET_KEY` (obligatoria)
   - `EMAIL_SERVICE`
   - `EMAIL_USER`
   - `EMAIL_APP_PASSWORD`
   - `PORT` (opcional, Railway lo asigna)
   - `NODE_ENV=production`

---

### Solución 3: Verificar los Logs en Tiempo Real

1. Railway → Deployments → Logs más recientes
2. Busca errores en rojo
3. Busca mensajes como:
   - `Error:`
   - `Cannot find module`
   - `EADDRINUSE`
   - `ECONNREFUSED`

---

### Solución 4: Probar Endpoints Específicos

Prueba estos endpoints en tu navegador:

1. **Raíz:**
   ```
   https://pgm-production.up.railway.app/
   ```

2. **Health check:**
   ```
   https://pgm-production.up.railway.app/health
   ```

3. **Test:**
   ```
   https://pgm-production.up.railway.app/api/test
   ```

Si todos dan 502, el problema es que el backend no está respondiendo en absoluto.

---

### Solución 5: Verificar el Start Command

1. Railway → Settings → Deploy
2. Verifica que **Start Command** sea:
   ```
   node backend-example.js
   ```

Si es diferente, cámbialo y haz "Redeploy".

---

### Solución 6: Verificar que el Código Esté Actualizado

1. Verifica que el código en GitHub esté actualizado
2. Railway debería desplegar automáticamente
3. Si no, haz "Redeploy" manualmente

---

## 🧪 Prueba Rápida

Ejecuta esto en tu terminal (PowerShell):

```powershell
Invoke-WebRequest -Uri "https://pgm-production.up.railway.app/api/test" -UseBasicParsing
```

**Si funciona:** Verás una respuesta JSON
**Si no funciona:** Verás un error 502

---

## 📋 Checklist de Diagnóstico

- [ ] Logs muestran "Servidor corriendo en puerto X"
- [ ] Backend escucha en `0.0.0.0` (no `localhost`)
- [ ] Variables de entorno configuradas
- [ ] Start Command correcto: `node backend-example.js`
- [ ] Sin errores en los logs después de iniciar
- [ ] Express configurado correctamente
- [ ] CORS configurado correctamente

---

## 🆘 Si Nada Funciona

1. **Crea un endpoint de prueba simple:**
   ```javascript
   app.get('/test-simple', (req, res) => {
       res.json({ message: 'OK' });
   });
   ```

2. **Verifica que el código esté en GitHub:**
   - Haz commit y push de los cambios
   - Railway debería desplegar automáticamente

3. **Contacta con Railway Support:**
   - Si nada funciona, puede ser un problema de Railway
   - Ve a Railway → Help → Support

---

## 💡 Tip: Ver Logs en Tiempo Real

1. Railway → Deployments
2. Haz clic en el deployment más reciente
3. Los logs se actualizan automáticamente
4. Busca cualquier mensaje de error

---

## 🎯 Próximos Pasos

1. **Verifica los logs** para ver si el servidor realmente está corriendo
2. **Verifica que el backend escuche en `0.0.0.0`**
3. **Prueba los endpoints** en el navegador
4. **Comparte los logs** si sigues teniendo problemas

